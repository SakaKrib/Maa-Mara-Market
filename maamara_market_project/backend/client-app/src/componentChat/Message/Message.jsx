import React from "react";
import './Message.css';

import default_user from '../../profile_pictures/default-sender.jpg';
import default_sender from '../../profile_pictures/default-vendor.jpg';

const Message = ({ message = {}, name = "" }) => {
    // Extract message properties
    const { text, sender, timestamp } = message;

    // Debugging logs
    console.log("Message Object:", message);
    console.log("Sender:", sender?.name, "Current User:", name);

    // Determine if the message was sent by the current user
    const isSentByCurrentUser = sender && sender.name === name;

    // Ensure correct profile picture and user status
    const displayedProfilePicture = sender?.profilePicture ?? default_user;
    const userStatus = sender?.user_is_admin ? "Admin" : sender?.user_is_vendor ? "Vendor" : "Customer";

    // Debug sender data to verify admin/vendor status
    console.log("Sender Data:", sender);
    console.log("User Status Derived:", userStatus);

    // Helper function for timestamps
    const calculateElapsedTime = (timestamp) => {
        if (!timestamp) return "Timestamp not available";
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diff = now - messageTime;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
        if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
        if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
        if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
        return `${years} year${years === 1 ? "" : "s"} ago`;
    };

    const formattedTimestamp = timestamp ? calculateElapsedTime(timestamp) : "Timestamp not available";

    return (
        <div className={`messageContainer ${isSentByCurrentUser ? 'justifyEnd' : 'justifyStart'}`}>
            {!isSentByCurrentUser && (
                <div className="profileInfo">
                    <img src={displayedProfilePicture} alt={`${sender?.name}'s Profile`} className="profilePicture" />
                    <p className="userStatus">{userStatus}</p>
                </div>
            )}
            <div className={`messageBox ${isSentByCurrentUser ? 'backgroundLight' : 'backgroundBlue'}`} data-sender={sender?.name}>
                <p className={`messageText ${isSentByCurrentUser ? 'colorDark' : 'colorWhite'}`}>
                    {typeof message.text === "object" ? JSON.stringify(message.text) : message.text}
                </p>
                <p className="timestamp colorWhite">{formattedTimestamp}</p>
            </div>
            {isSentByCurrentUser && (
                <div className="profileInfo">
                    <img src={sender?.profilePicture || default_sender} alt={`${sender?.name}'s Profile`} className="profilePicture" />
                    <p className="userStatus">{userStatus}</p> {/* ✅ Fix: Ensure sender's status is used */}
                </div>
            )}
        </div>
    );
};

export default Message;
