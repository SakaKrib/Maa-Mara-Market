import React from 'react';
import './RoomUsers.css'; // Add styling here.

const RoomUsers = ({ users = [], isAdmin, onSelectUser }) => {
    console.log("Users in RoomUsers component:", users); // Debugging: Log users to ensure data is correct.

    // Hide component if the user is not an admin.
    if (!isAdmin) {
        return null; // No UI shown for non-admins.
    }

    return (
        <div className="roomUsersContainer">
            <h3>Users in Room</h3>
            {users.length === 0 ? (
                // Message displayed if there are no users in the room.
                <p>No users currently in this room.</p>
            ) : (
                <ul>
                    {users.map((user) => (
                        <li
                            key={user.id}
                            onClick={() => onSelectUser && onSelectUser(user)} // Safeguard against missing onSelectUser.
                            className="roomUserItem"
                        >
                            <img
                                src={user.profilePicture || "default-user.jpg"} // Fallback to default profile picture if missing.
                                alt={`${user.name}'s avatar`} // Improve accessibility with descriptive alt text.
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
