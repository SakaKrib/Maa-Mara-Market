import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import './Chat.css';

import InfoBar from '../InfoBar/InfoBar';
import Input from '../Input/Input';
import Messages from '../Messages/Messages';
import RoomUsers from '../RoomUsers/RoomUsers';

let socket;

const Chat = () => {
  const location = useLocation();
  const { username, userProfilePicture, isAdmin, isVendor } = location.state || {};

  const [name, setName] = useState(username || 'Guest');
  const [room, setRoom] = useState('');
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  // Safely parse chat messages from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error('Error parsing chatMessages from localStorage:', error);
      return [];
    }
  });

  const [privateMessages, setPrivateMessages] = useState(() => {
    try {
      const savedPrivateMessages = localStorage.getItem('privateChatMessages');
      return savedPrivateMessages ? JSON.parse(savedPrivateMessages) : {};
    } catch (error) {
      console.error('Error parsing privateChatMessages from localStorage:', error);
      return {};
    }
  });

  const [selectedUser, setSelectedUser] = useState(null); // Store selected recipient for private chat

  useEffect(() => {
    const ENDPOINT = 'http://localhost:5000';
    const params = new URLSearchParams(window.location.search);
    const userRoom = params.get('room') || 'default-room';
    const userName = params.get('name') || username || 'Guest';

    socket = io(ENDPOINT);

    setRoom(userRoom);
    setName(userName);

    socket.emit('join', { name: userName, room: userRoom, userProfilePicture, isAdmin, isVendor }, (error) => {
      if (error) alert(error);
    });

    return () => {
      socket.disconnect();
      socket.off();
    };
  }, [username, userProfilePicture, isAdmin, isVendor]);

  // Fetch users in the room if the user is an admin
  useEffect(() => {
    if (isAdmin && room) {
      const url = `http://localhost:5000/api/rooms/${encodeURIComponent(room.trim().toLowerCase())}/users?isAdmin=true`;


      console.log("Fetching users for room:", room.trim().toLowerCase()); // Debug room value
      console.log("Fetch URL:", url); // Debug the full fetch URL
      console.log("isAdmin flag:", isAdmin); // Debug isAdmin value

      fetch(url)
        .then((response) => {
          console.log("Response status:", response.status); // Debug response status
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Fetched data:", data); // Debug fetched user data
          setUsers(data);
        })
        .catch((error) => {
          console.error("Detailed fetch error:", error); // Debug the detailed fetch error
          alert(`Failed to fetch users: ${error.message}`);
        });
    }
  }, [room, isAdmin]);

  useEffect(() => {
    socket.on('message', (newMessage) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, newMessage];
        try {
          localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        } catch (error) {
          console.error('Error saving chatMessages to localStorage:', error);
        }
        return updatedMessages;
      });
    });

    socket.on('privateMessage', ({ sender, text }) => {
      setPrivateMessages((prevMessages) => {
        const updatedPrivateMessages = {
          ...prevMessages,
          [sender]: [...(prevMessages[sender] || []), text],
        };
        try {
          localStorage.setItem('privateChatMessages', JSON.stringify(updatedPrivateMessages));
        } catch (error) {
          console.error('Error saving privateChatMessages to localStorage:', error);
        }
        return updatedPrivateMessages;
      });
    });

    socket.on('roomData', ({ users }) => {
      if (isAdmin) setUsers(users);
    });

    return () => {
      socket.off('message');
      socket.off('privateMessage');
      socket.off('roomData');
    };
  }, [isAdmin]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (message && socket) {
      socket.emit('sendMessage', message, () => setMessage(''));
    }
  };

  const sendPrivateMessage = () => {
    if (!selectedUser || !message) return;

    socket.emit(
      'privateMessage',
      {
        recipientId: selectedUser.id,
        messageText: message,
      },
      () => setMessage('')
    );
  };

  const clearChatHistory = () => {
    try {
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('privateChatMessages');
      setMessages([]);
      setPrivateMessages({});
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  return (
    <div className="outerContainer">
      <div className="innerContainer">
        <InfoBar room={room} />

        {/* Main Chat Section */}
        <Messages messages={messages} name={name} profilePicture={userProfilePicture} vendor={isVendor} admin={isAdmin} />

        <Input message={message} setMessage={setMessage} sendMessage={selectedUser ? sendPrivateMessage : sendMessage} />

        {/* Show Room Users for Admins */}
        {isAdmin && (
          users.length > 0 ? (
            <RoomUsers users={users} onSelectUser={setSelectedUser} />
          ) : (
            <p>Loading users...</p>
          )
        )}

        <button className="clearChatButton" onClick={clearChatHistory}>Clear Chat History</button>

        {/* Private Chat Section */}
        {selectedUser && (
          <div className="privateChat">
            <h3>Private Chat with {selectedUser.name}</h3>
            {Array.isArray(privateMessages[selectedUser.name]) &&
              privateMessages[selectedUser.name].map((msg, i) => (
                <p key={i}>{msg}</p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
