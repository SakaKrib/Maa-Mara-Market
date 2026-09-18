import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addUser } from "../../../models/users.js";
import { useAuth } from "../../../../../src/cmponents/Auth/AuthContext/Context.jsx"; // adjust path

import default_user from "../../profile_pictures/default-sender.jpg";
import default_sender from "../../profile_pictures/default-vendor.jpg";
import useProfile from "../Hooks/ChatProfileHook.jsx";
import { baseUrl } from "../../../../../src/cmponents/Constant/Constant.jsx";
import { useTheme } from "@mui/material";
import {tokens} from "../../../../../src/theme.jsx"
import { useCustomerAccessGuard } from "../../../../../src/cmponents/Hooks/AccessCRF/CustomerAccess.jsx";


const Join = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = useProfile()

  

  const [username, setUsername] = useState("Guest or Customer");
  const [vendorUsername, setVendorUsername] = useState("No Vendor");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState(default_user);
  const [vendorProfilePicture, setVendorProfilePicture] = useState(default_sender);
  const [room, setRoom] = useState("");
  const theme = useTheme();
  const colors = tokens(theme.palette.mode)


  useEffect(() => {
    if (user) {
      console.log("🧩 Auth User:", user);
      console.log("🧠 Loaded Profile:", profile);
  
      const userPic = profile?.profile?.profile_picture
        ? `${baseUrl}${profile.profile.profile_picture}`
        : default_user;
  
      const vendorPic = profile?.profile?.vendor_profile_picture
        ? `${baseUrl}${profile.profile.vendor_profile_picture}`
        : default_sender;
  
      setUsername(user.username || "Guest");
      setVendorUsername(user.vendor_username || "No Vendor");
      setIsAdmin(user.role === "admin");
      setIsVendor(user.role === "vendor");
      setUserProfilePicture(userPic);
      setVendorProfilePicture(vendorPic);
      setRoom((prev) => prev || (user.role === "admin" ? "" : "Admin Room"));

  
      const userData = {
        name: user.username || "Guest",
        vendorName: user.vendor_username || "No Vendor",
        isAdmin: user.role === "admin",
        isVendor: user.role === "vendor",
        profilePicture: userPic,
        room: user.role === "admin" ? "Admin Room" : "Admin Room",
        id: user.id,
      };
  
      const { user: addedUser, error } = addUser(userData);
      if (error) {
        console.error("❌ Failed to add user:", error.message);
      } else {
        console.log("✅ User added successfully:", addedUser);
      }
    }
  }, [user, profile]);
  

  const handleJoin = (e) => {
    e.preventDefault();

    if (!room.trim()) {
      alert("Admins must enter a valid room name.");
      return;
    }

    navigate(`/chat?name=${username}&room=${room}`, {
      state: { username, vendorUsername, isVendor, isAdmin, userProfilePicture, vendorProfilePicture }
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen px-4">
      <div className="shadow-md rounded-lg p-8 w-full max-w-md p-4" 
      style={{backgroundColor:colors.primary[600] }}>
        <h1 className="text-3xl font-bold text-center mb-10 border-b pb-2" style={{color:colors.gray[100] }}>Join Chat</h1>

        <div className="mb-4">
          <input
            type="text"
            value={username}
            className="w-full px-4 py-2 border rounded cursor-not-allowed"
            style={{color:colors.gray[100], backgroundColor:colors.primary[400]}}
            readOnly
          />
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder={isAdmin ? "Enter Room Name" : "Admin Room"}
            className={`w-full px-4 py-2 border rounded ${isAdmin ? "bg-white cursor-text" : "bg-gray-200 cursor-not-allowed"}`}
            value={room}
            onChange={(e) => isAdmin && setRoom(e.target.value)}
            readOnly={!isAdmin}
            // style={{color:colors.gray[100], backgroundColor:colors.primary[400]}}
          />
        </div>

        <div className="w-full flex justify-center mt-4">
          <button
            onClick={handleJoin}
            onKeyPress={(event) => event.key === 'Enter' ? handleJoin(event) : null}
            className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-900 transition"
          >
            Join
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-700 space-y-1">
          <p style={{color:colors.gray[100], backgroundColor:colors.primary[400]}} className="flex justify-between items-center p-2 text-center font-semiblod"><strong >Logged in as:</strong> {username}</p>
          <p style={{color:colors.gray[100], backgroundColor:colors.primary[400]}} className="flex justify-between items-center p-2 text-center font-semiblod"><strong>Vendor:</strong> {vendorUsername}</p>
          <p style={{color:colors.gray[100], backgroundColor:colors.primary[400]}} className="flex justify-between items-center p-2 text-center font-semiblod"><strong>Vendor Status:</strong> {isVendor ? "Yes" : "No"}</p>
          <p style={{color:colors.gray[100], backgroundColor:colors.primary[400]}} className="flex justify-between items-center p-2 text-center font-semiblod"><strong>Admin Status:</strong> {isAdmin ? "Yes" : "No"}</p>

          <div className="flex justify-center mt-4">
          <>
            {user.role === "admin" &&  (
              <img
                src={userProfilePicture || default_user}
                alt="Admin Profile"
                className="w-16 h-16 object-cover rounded-full border"
              />
            )}

            {user.role === "vendor" && (
              <img
                src={vendorProfilePicture || default_sender}
                alt="Vendor Profile"
                className="w-16 h-16 object-cover rounded-full border"
              />
            )}
            
            {user.role === 'customer' && (
              <img
                src={userProfilePicture || default_user}
                alt="Admin Profile"
                className="w-16 h-16 object-cover rounded-full border"
              />
            )}
          </>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Join;
