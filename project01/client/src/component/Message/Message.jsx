import React from "react";
import './Message.css';

import default_user from '../../profile_pictures/default-sender.jpg'; // Default user image
import default_sender from '../../profile_pictures/default-vendor.jpg'; // Default vendor image

const Message = ({ message, name, profile }) => {
    // Determine if the message was sent by the current user
    const isSentByCurrentUser = message.user === name.trim().toLowerCase();

    // Determine user status: vendor, admin, or customer
    const userStatus = message.user_is_admin
        ? "admin"
        : message.user_is_vendor
        ? "vendor"
        : "customer";

    // Ensure the correct profile picture is shown
    const displayedProfilePicture = isSentByCurrentUser 
        ? profile || default_sender // Show current user's profile
        : message.profilePicture || default_user; // Show sender's profile

    // Helper function: Calculate elapsed time (e.g., "X minutes ago")
    const calculateElapsedTime = (timestamp) => {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const differenceInMilliseconds = now - messageTime; // Time difference in milliseconds
        const minutesElapsed = Math.floor(differenceInMilliseconds / (1000 * 60)); // Convert to minutes

        if (minutesElapsed < 1) return "Just now";
        if (minutesElapsed === 1) return "1 minute ago";
        return `${minutesElapsed} minutes ago`;
    };

    // Format the timestamp
    const formattedTimestamp = message.timestamp
        ? calculateElapsedTime(message.timestamp) // Use "X minutes ago"
        : "Invalid time"; // Fallback for undefined or invalid timestamps

    // CSS classes for conditional styling
    const messageBoxClass = isSentByCurrentUser ? 'backgroundBlue' : 'backgroundLight';
    const messageTextClass = isSentByCurrentUser ? 'colorWhite' : 'colorDark';

    return (
        <div className={`messageContainer ${isSentByCurrentUser ? 'justifyEnd' : 'justifyStart'}`}>
            {!isSentByCurrentUser && (
                <div className="profileInfo">
                    <img 
                        src={displayedProfilePicture} 
                        alt={`${message.user || "Unknown User"}'s Profile`} 
                        className="profilePicture" 
                    />
                    <p className="userStatus">{userStatus}</p>
                </div>
            )}
            <div className={`messageBox ${messageBoxClass}`}>
                <p className={`messageText ${messageTextClass}`}>
                    {message.text || "No message content available"}
                </p>
                <p className="timestamp colorWhite">{formattedTimestamp}</p>
            </div>
            {isSentByCurrentUser && (
                <div className="profileInfo">
                    <img 
                        src={displayedProfilePicture || default_sender} 
                        alt={`${name || "You"}'s Profile`} 
                        className="profilePicture" 
                    />
                    <p className="userStatus">{userStatus}</p>
                </div>
            )}
        </div>
    );
};

export default Message;
