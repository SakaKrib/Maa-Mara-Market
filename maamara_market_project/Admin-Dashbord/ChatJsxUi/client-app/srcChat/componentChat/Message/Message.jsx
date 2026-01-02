import React from "react";
import './Message.css'; // Keep only if you're using custom spacing or animations

import default_user from '../../profile_pictures/default-sender.jpg';
import default_sender from '../../profile_pictures/default-vendor.jpg';

import { useTheme } from "@mui/material";
import { tokens } from "../../../../../src/theme";

const Message = ({ message = {}, name = "" }) => {
  const { text, sender, timestamp, fileUrl, fileName } = message;

  console.log('Message props:', message);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const isSentByCurrentUser = sender && sender.name === name;

  const displayedProfilePicture = sender?.profilePicture ?? default_user;
  const userStatus = sender?.user_is_admin
    ? "Admin"
    : sender?.user_is_vendor
    ? "Vendor"
    : "Customer";

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

  const formattedTimestamp = timestamp
    ? calculateElapsedTime(timestamp)
    : "Timestamp not available";

    

  return (
    <div
      className={`w-full flex items-start mb-4 ${
        isSentByCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar and Role */}
      {!isSentByCurrentUser && (
        <div className="flex sm:flex-col xxs:flex-col md:flex-row items-center mr-2">
          <img
            src={displayedProfilePicture}
            alt={`${sender?.name}'s Profile`}
            className="profilePicture"
          />
          <p className="text-xs text-gray-500">{userStatus}</p>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className="rounded-lg px-4 py-2 max-w-[80%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[50%] break-words"
        data-sender={sender?.name}
        style={{
          backgroundColor: isSentByCurrentUser
            ? colors.gray[200]
            : colors.primary[600],
          color: isSentByCurrentUser
            ? colors.gray[900]
            : colors.gray[100],
        }}
      >
        {/* Text */}
        {text && (
          <p className="text-sm">
            {typeof text === "object" ? JSON.stringify(text) : text}
          </p>
        )}

        {/* File / Image */}
        {fileUrl && (
          <div className="mt-2">
            <img
              src={fileUrl}
              alt={fileName}
              className="rounded-lg max-w-full object-contain"
              style={{ maxHeight: "300px" }}
            />
            <a
              href={fileUrl}
              download={fileName}
              className="text-xs text-blue-400 underline mt-1 block"
            >
              Download {fileName}
            </a>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs mt-1 text-right" style={{ color: colors.gray[400] }}>
          {formattedTimestamp}
        </p>
      </div>

      {/* Avatar on Right */}
      {isSentByCurrentUser && (
        <div className="flex sm:flex-col xxs:flex-col md:flex-row items-center ml-2">
          <p className="text-xs text-gray-500 px-2">{userStatus}</p>
          <img
            src={sender?.profilePicture || default_sender}
            alt={`${sender?.name}'s Profile`}
            className="profilePicture"
          />
        </div>
      )}
    </div>
  );
};

export default Message;
