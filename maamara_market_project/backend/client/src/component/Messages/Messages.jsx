import React from "react";
import ScrollToBottom from 'react-scroll-to-bottom';
import Message from "../Message/Message";
import './Messages.css';

const Messages = ({ messages, privateMessages, selectedUser, name, profilePicture, vendor, admin, users }) => {
    return (
        <div className="messagesContainer">

            {/* Sidebar for User List (Only for Admins) */}
            {admin && (
                <div className="userSidebar">
                    <h3>Users in Room</h3>
                    {Array.isArray(users) && users.length > 0 ? (
                        <ul>
                            {users.map(user => (
                                <li key={user.id} onClick={() => selectedUser(user)}>
                                    <img src={user.profilePicture || "default-user.jpg"} alt={user.name} className="userAvatar" />
                                    <span>{user.name}</span>
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
                    messages.map((message, i) => (
                        <div key={i}>
                            <Message 
                                message={message} 
                                name={name} 
                                profile={profilePicture}
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
                    <h3>Private Chat with {selectedUser.name}</h3>
                    <ScrollToBottom className="privateMessagesBox">
                        {Array.isArray(privateMessages[selectedUser.name]) ? (
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
