import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./join.css";
import { addUser } from "../../../models/users.js";

import default_user from "../../profile_pictures/default-sender.jpg";
import default_sender from "../../profile_pictures/default-vendor.jpg";

const Join = () => {
  const [username, setUsername] = useState("Guest or Customer");
  const [vendorUsername, setVendorUsername] = useState("No Vendor");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState(default_user);
  const [vendorProfilePicture, setVendorProfilePicture] = useState(default_sender);
  const [room, setRoom] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user data from the API
    fetch("http://127.0.0.1:8000/api/chat-user-data/")
      .then((response) => response.json())
      .then((data) => {
        setUsername(data.username || "Guest");
        setVendorUsername(data.vendor_username || "No Vendor");
        setIsAdmin(data.is_admin || false);
        setIsVendor(data.is_vendor || false);
        setUserProfilePicture(data.user_profile_picture || default_user);
        setVendorProfilePicture(data.vendor_profile_picture || default_sender);
        
        // Automatically set room name based on user role
        setRoom(data.is_admin ? "" : "Admin Room");

        console.log("Fetched User Data:", data);

        const userData = {
          name: data.username || "Guest",
          vendorName: data.vendor_username || "No Vendor",
          isAdmin: data.is_admin || false,
          isVendor: data.is_vendor || false,
          profilePicture: data.user_profile_picture || default_user,
          room: data.is_admin ? "Admin Room" : "Admin Room", // Enforce "Admin Room" for non-admins
        };

        const { user, error } = addUser(userData);
        if (error) {
          console.error("Failed to add user:", error.message);
        } else {
          console.log("User added successfully:", user);
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
      });
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    
    if (!room.trim()) {
      alert("Admins must enter a valid room name.");
      return;
    }

    navigate(`/chat?name=${username}&room=${room}`, {
      state: { username, vendorUsername, isVendor, isAdmin, userProfilePicture, vendorProfilePicture },
    });
  };

  return (
    <div className="joinOuterContainer">
      <div className="joinInnerContainer">
        <h1 className="heading">Join Chat</h1>
        
        <div>
          <input
            type="text"
            value={username}
            className="joinInput"
            readOnly
            style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }}
          />
        </div>

        {/* Room Selection */}
        <div>
          <input
            type="text"
            placeholder={isAdmin ? "Enter Room Name" : "Admin Room"}
            className="joinInput"
            value={room}
            onChange={(e) => isAdmin && setRoom(e.target.value)} // Allow only admins to modify room name
            readOnly={!isAdmin} // Lock room selection for vendors & users
            style={{ backgroundColor: isAdmin ? "#ffffff" : "#e9ecef", cursor: isAdmin ? "text" : "not-allowed" }}
          />
        </div>

        <button className="button mt-20" onClick={handleJoin}>
          Join
        </button>

        <div className="userInfo">
          <p>Logged in as: {username}</p>
          <p>Vendor: {vendorUsername}</p>
          <p>Vendor Status: {isVendor ? "Yes" : "No"}</p>
          <p>Admin Status: {isAdmin ? "Yes" : "No"}</p>
          <img src={userProfilePicture || default_user} alt="User Profile" className="profilePicture" />
          <img src={vendorProfilePicture || default_sender} alt="Vendor Profile" className="profilePicture" />
        </div>
      </div>
    </div>
  );
};

export default Join;
