import React from 'react';
import './RoomUsers.css'; // Ensure this file has relevant styles.

const RoomUsers = ({ users = [], isAdmin, onSelectUser }) => {
  // Debugging logs to inspect `users` data and ensure the array is passed correctly
  console.log("Users passed to RoomUsers component:", users); // Logs the entire array
  console.log("Number of users in RoomUsers:", users.length); // Logs the array length

  // If the current user isn't an admin, don't render this component
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="roomUsersContainer">
      <h3>Users in Room</h3>

      {users.length === 0 ? (
        // Message displayed when there are no users in the room
        <p>No users currently in this room.</p>
      ) : (
        <ul className="roomUsersList">
          {users.map((user) => (
            <li
              key={user.id}
              onClick={() => onSelectUser && onSelectUser(user)} // Pass user to parent when clicked
              className="roomUserItem"
            >
              <img
                src={user.profilePicture || "default-user.jpg"} // Fallback to a default profile picture
                alt={`${user.name}'s avatar`} // Accessible alt text for the image
                className="userAvatar"
              />
              <div className="userDetails">
                <strong>{user.name}</strong>
                <span
                  className={`badge ${
                    user.isAdmin
                      ? "badge-admin"
                      : user.isVendor
                      ? "badge-vendor"
                      : "badge-user"
                  }`}
                >
                  {user.isAdmin ? "Admin" : user.isVendor ? "Vendor" : "User"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoomUsers;
