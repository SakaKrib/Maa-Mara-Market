import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import './Chat.css';

import InfoBar from '../InfoBar/InfoBar';
import Input from '../Input/Input';
import Messages from '../Messages/Messages';
import RoomUsers from '../RoomUsers/RoomUsers';

import default_user from '../../profile_pictures/default-sender.jpg'; // Default user image
import default_sender from '../../profile_pictures/default-vendor.jpg'; // Default vendor image

let socket;

const Chat = () => {
  const location = useLocation();
  const { username, userProfilePicture, isVendor } = location.state || {};

  // Persist user state and admin status from localStorage or props
  const [isAdmin, setIsAdmin] = useState(() => {
    const savedAdminStatus = localStorage.getItem('isAdmin');
    return savedAdminStatus === 'true' || location.state?.isAdmin || false;
  });
  const [name, setName] = useState(() => {
    const savedName = localStorage.getItem('username');
    return savedName || username || 'Guest';
  });
  const [profilePicture, setProfilePicture] = useState(() => {
    const savedProfilePicture = localStorage.getItem('userProfilePicture');
    return savedProfilePicture || userProfilePicture || default_user;
  });

  const [room, setRoom] = useState('');
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error('Error parsing chatMessages from localStorage:', error);
      return [];
    }
  });
  const [privateMessages, setPrivateMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateRoom, setPrivateRoom] = useState(null); // Track private room name

  useEffect(() => {
    const ENDPOINT = 'http://localhost:5000';
    const params = new URLSearchParams(window.location.search);
    const userRoom = params.get('room') || 'default-room';
    const userName = params.get('name') || name;

    socket = io(ENDPOINT);

    setRoom(userRoom);
    setName(userName);

    socket.emit('join', { name: userName, room: userRoom, userProfilePicture, isAdmin, isVendor }, (error) => {
      if (error) alert(error);
    });

    socket.on('connect', () => {
      console.log("WebSocket connected:", socket.id);
    });

    socket.on('disconnect', () => {
      console.log("WebSocket disconnected.");
    });

    return () => {
      socket.disconnect();
      socket.off();
    };
  }, [name, profilePicture, isAdmin, isVendor]);

  // Persist user data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    localStorage.setItem('username', name);
    localStorage.setItem('userProfilePicture', profilePicture);
    console.log("Saved user data to localStorage:", { isAdmin, name, profilePicture });
  }, [isAdmin, name, profilePicture]);

  useEffect(() => {
    if (isAdmin && room) {
      const url = `http://localhost:5000/api/rooms/${encodeURIComponent(room.trim().toLowerCase())}/users?isAdmin=true`;

      fetch(url)
        .then((response) => {
          console.log("Response status:", response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Fetched users:", data);
          setUsers(data || []);
        })
        .catch((error) => {
          console.error("Error fetching users:", error);
          alert(`Failed to fetch users: ${error.message}`);
        });
    }
  }, [room, isAdmin]);

  // Handle receiving private messages
  useEffect(() => {
    socket.on("privateMessage", (newMessage) => {
      console.log("Private Message Received:", newMessage);

      setPrivateMessages((prevMessages) => {
          // ✅ Filter out messages with undefined sender data
          if (!newMessage.sender || !newMessage.sender.name) {
              console.warn("Skipping message with undefined sender:", newMessage);
              return prevMessages;
          }

          // ✅ Prevent duplicate messages
          if (prevMessages.some(msg => msg.timestamp === newMessage.timestamp)) {
              return prevMessages;
          }

          // ✅ Save updated messages to local storage
          const updatedMessages = [...prevMessages, newMessage];
            localStorage.setItem(`privateChat_${privateRoom}`, JSON.stringify(updatedMessages));
            return updatedMessages;
      });
  });

  return () => socket.off("privateMessage");
}, []);

// display sent messages when the page is reloaded
useEffect(() => {
  if (privateRoom) {
      const storedMessages = JSON.parse(localStorage.getItem('privateMessages')) || [];
      setPrivateMessages(storedMessages);
  }
}, [privateRoom]);


    // Handle private chat invitations
    // **Handle private chat invitation**
    useEffect(() => {
    socket.on('privateChatInvitation', ({ room, senderName }) => {
      const accept = window.confirm(`${senderName} wants to start a private chat. Do you accept?`);
      if (accept) {
        socket.emit('joinPrivateChat', { room });
        setPrivateRoom(room);
        setSelectedUser({ name: senderName }); // ✅ Store sender name correctly
        console.log(`Joined private chat room: ${room}`);

      } else {
        console.log("Private chat invitation declined.");
      }
    });

    return () => {
      socket.off('message');
      socket.off('privateMessage');
      socket.off('privateChatInvitation');
    };
  }, []);

  // **Admin initiates private chat request**
  const requestPrivateChat = (user) => {
    if (!isAdmin) return;
  
    const recipientId = user?.id; // Ensure only the ID is passed
    setSelectedUser(user); // Save selected user for reference
  
    console.log("Attempting private chat with recipient ID:", recipientId);
  
    socket.emit('requestPrivateChat', { recipientId }, (response) => {
      if (response.success) {
        console.log("Admin joining private chat room:", response.room);
        
        // Admin should join the private chat room
        socket.emit('joinPrivateChat', { room: response.room }); 
        
        setPrivateRoom(response.room); // Ensure state updates
      } else {
        console.error("Failed to start private chat:", response.error);
        alert("Failed to start private chat.");
      }
    });
  };
  
  

  useEffect(() => {
    socket.on('message', (newMessage) => {
      console.log("Received message:", newMessage); // Debugging log
        setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages, newMessage];
            localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
            return updatedMessages;
        });
    });

    return () => socket.off('message'); // Cleanup on unmount
}, []);


  

  const sendMessage = (event) => {
    event.preventDefault();
    console.log("sendMessage triggered:", message);

    if (!message.trim()) return;

    if (privateRoom) {
      sendPrivateMessage();

    } else {
        socket.emit('sendMessage', message.trim(), () => {
            console.log("Message sent:", message.trim());
        });
    }
    setMessage('');
};

  console.log('type of message ', messages)
  
  
  
  useEffect(() => {
    console.log("Admin's Private Room:", privateRoom);
  }, [privateRoom]);
  
    // Send public or private message based on context
  
  

    const sendPrivateMessage = () => {
      if (!privateRoom || !message.trim()) return;
  
      const privateMsg = { 
          text: message.trim(), 
          sender: { name, profilePicture }, 
          room: privateRoom,
          timestamp: new Date().toISOString(),
      };
  
      console.log("Sending private message:", privateMsg);
  
      socket.emit("sendPrivateMessage", privateMsg, (ack) => {
          console.log("Server acknowledged private message:", ack);
      });
  
      setMessage(""); // ✅ Prevent unnecessary re-rendering
  };
  
  
  
    
    

  const clearChatHistory = () => {
    try {
      localStorage.removeItem('chatMessages');
      setMessages([]);
      setPrivateMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };
  console.log("Messages array:", messages);

  

  return (
    <div className="outerContainer">
      <div className="innerContainer">
        <InfoBar room={room} />

        <Messages
          messages={messages}
          name={name}
          privateMessages={privateMessages}
          profilePicture={profilePicture}
          vendor={isVendor}
          admin={isAdmin}
          users={users}
          selectedUser={selectedUser}
          onSelectUser={requestPrivateChat} // Initiate private chat when selecting a user
        />

        <Input
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage} // Unified sendMessage function
        />

        {isAdmin && (
          users.length > 0 ? (
            <RoomUsers users={users} onSelectUser={requestPrivateChat} />
          ) : (
            <p>Loading users...</p>
          )
        )}

        <button className="clearChatButton" onClick={clearChatHistory}>
          Clear Chat History
        </button>

        {privateRoom && (
          <div className="privateChat">
            <h3>Private Chat with {selectedUser?.name}</h3>
            <Messages messages={privateMessages} name={name} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
