import React from "react";

import ScrollToBottom from 'react-scroll-to-bottom';
import Message from "../Message/Message";

import './Messages.css';

const Messages = ({ messages, name, profilePicture, vendor, admin }) => (
    
    
    <ScrollToBottom className="messages">
        {messages.map((message, i) => (
            <div key={i}>
                <Message 
                    message={message} 
                    name={name} 
                    profile = {profilePicture} // Pass profilePicture for the current user
                    user_is_vendor={vendor}
                    user_is_admin = {admin}
                    
                />
                
                
            </div>
        ))}
    </ScrollToBottom>
);


export default Messages;

