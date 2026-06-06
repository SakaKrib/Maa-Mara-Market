import React from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import Message from "../Message/Message";
import "./Messages.css";

const Messages = ({
  messages = [],
  privateMessages = {},
  selectedUser = null,
  onSelectUser,
  name = "",
  profilePicture,
  vendor,
  admin,
  users = [],
}) => {
  // Debugging: Ensure messages are correctly received
  console.log("Messages array in Messages.jsx:", messages);

  return (
    <div className="messagesContainer">
      {/* Sidebar for User List (Only for Admins) */}
      {admin && (
        <div className="userSidebar">
          <h3>Users in Room</h3>
          {Array.isArray(users) && users.length > 0 ? (
            <ul className="userList">
              {users.map((user) => (
                <li
                  key={user.id}
                  onClick={() => onSelectUser && onSelectUser(user)}
                  className="roomUserItem"
                >
                  <img
                    src={user.profilePicture || "default-user.jpg"}
                    alt={`${user.name}'s avatar`}
                    className="userAvatar"
                  />
                  <span>{user.name}</span>
                  <div className="userDetails">
                    <span className={`badge ${user.isAdmin ? "badge-admin" : user.isVendor ? "badge-vendor" : "badge-user"}`}>
                      {user.isAdmin ? "Admin" : user.isVendor ? "Vendor" : "User"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No users in the room.</p>
          )}
        </div>
      )}

      {/* Main Chat Area */}
      <ScrollToBottom className="messagesBox">
        {Array.isArray(messages) && messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index}>
              {/* Debugging: Ensure message structure is correct */}
              <Message
                message={message}
                name={name}
                profile={profilePicture}
                profilePicture={profilePicture}
                user_is_vendor={vendor}
                user_is_admin={admin}
              />
            </div>
          ))
        ) : (
          <p>No messages available.</p>
        )}
      </ScrollToBottom>

      {/* Private Chat Section (Visible Only If Admin Selects a User) */}
      {selectedUser && (
        <div className="privateChat">
          <h3>Private Chat with {selectedUser?.name || "Admin"}</h3>
          {console.log("Selected User:", selectedUser)
          }
          <ScrollToBottom className="privateMessagesBox">
            {Array.isArray(privateMessages[selectedUser.name]) && privateMessages[selectedUser.name].length > 0 ? (
              privateMessages[selectedUser.name].map((msg, i) => (
                <div key={i} className="privateMessage">
                  <p>{msg}</p>
                </div>
              ))
            ) : (
              <p>No private messages available.</p>
            )}
          </ScrollToBottom>
        </div>
      )}
    </div>
  );
};

export default Messages;
