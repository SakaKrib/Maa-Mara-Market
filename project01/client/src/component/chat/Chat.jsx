import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom'; // Import useLocation for navigation state
import './Chat.css';

import InfoBar from '../InfoBar/InfoBar';
import Input from '../Input/Input';
import Messages from '../Messages/Messages';

let socket; // Define a global socket variable

const Chat = () => {
  const location = useLocation(); // Access state passed via the router
  const { username, userProfilePicture, isAdmin, isVendor } = location.state || {}; // Extract state data

  // State variables
  const [name, setName] = useState(username || ''); // Set username
  const [room, setRoom] = useState(''); // Initialize chat room
  const [users, setUsers] = useState([]); // List of users in the chat
  const [message, setMessage] = useState(''); // Message input
  const [messages, setMessages] = useState([]); // Array of all chat messages

  useEffect(() => {
    const ENDPOINT = 'http://localhost:5000'; // Backend URL
    const params = new URLSearchParams(window.location.search); // Extract query parameters
    const userRoom = params.get('room') || 'default-room'; // Fallback to default room
    const userName = params.get('name') || username || 'Guest'; // Fallback username

    socket = io(ENDPOINT); // Establish socket connection

    setRoom(userRoom); // Set room name
    setName(userName); // Set username

    // Emit join event with user information
    socket.emit(
      'join',
      { name: userName, room: userRoom, userProfilePicture, isAdmin, isVendor },
      (error) => {
        if (error) {
          alert(error); // Handle any joining errors
        }
      }
    );

    // Cleanup when the component unmounts
    return () => {
      socket.disconnect(); // Disconnect from the server
      socket.off(); // Remove all socket listeners
    };
  }, [username, userProfilePicture, isAdmin, isVendor]); // Dependencies ensure effect is run on dependency change

  useEffect(() => {
    // Listen for new messages
    socket.on('message', (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]); // Append new messages to the state
      localStorage.setItem('messages', JSON.stringify(setMessages));
    });

    // Listen for updated room data
    socket.on('roomData', ({ users }) => {
      setUsers(users); // Update the list of users in the room
    });

    // Cleanup listeners when the component unmounts
    return () => {
      socket.off('message'); // Remove message listener
      socket.off('roomData'); // Remove roomData listener
    };
  }, []);

  // Function to send a message
  const sendMessage = (event) => {
    event.preventDefault(); // Prevent default form behavior

    if (message && socket) {
      socket.emit('sendMessage', message, () => setMessage('')); // Send message and reset input field
    }
  };

  return (
    <div className="outerContainer">
      <div className="innerContainer">
        {/* Display the room name in the InfoBar */}
        <InfoBar room={room} />

        {/* Render Messages component */}
        <Messages
          messages={messages}
          name={name}
          profilePicture={userProfilePicture}
          vendor={isVendor}
          admin={isAdmin}
        />

        {/* Input component for sending messages */}
        <Input
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
};

export default Chat;
