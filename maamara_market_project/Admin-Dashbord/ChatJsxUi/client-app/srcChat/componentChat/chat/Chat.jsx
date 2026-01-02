import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import './Chat.css';

import InfoBar from '../InfoBar/InfoBar';
import Input from '../Input/InpuChat';
import Messages from '../Messages/Messages';
import RoomUsers from '../RoomUsers/RoomUsers';

import default_user from '../../profile_pictures/default-sender.jpg';
import default_sender from '../../profile_pictures/default-vendor.jpg';
import { useTheme } from '@mui/material';
import { tokens } from '../../../../../src/theme';

const Chat = () => {
  const location = useLocation();
  const { username, userProfilePicture, isVendor } = location.state || {};

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // User info states (with localStorage persistence)
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
  const [privateRoom, setPrivateRoom] = useState(null);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState([]);
  console.log("this is the typing user", typingUsers)

  // To manage typing timeout
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  // Socket ref
  const socketRef = useRef(null);

  // Initialize socket and join room
  useEffect(() => {
    const ENDPOINT = 'http://localhost:5000';
    const params = new URLSearchParams(window.location.search);
    const userRoom = params.get('room') || 'default-room';
    const userName = params.get('name') || name;

    socketRef.current = io(ENDPOINT);

    setRoom(userRoom);
    setName(userName);

    socketRef.current.emit(
      'join',
      { name: userName, room: userRoom, userProfilePicture, isAdmin, isVendor },
      (error) => {
        if (error) alert(typeof error === 'string' ? error : JSON.stringify(error, null, 2));
      }
    );

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected:', socketRef.current.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected.');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off();
      }
    };
  }, [name, profilePicture, isAdmin, isVendor]);

  // Persist user data to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    localStorage.setItem('username', name);
    localStorage.setItem('userProfilePicture', profilePicture);
  }, [isAdmin, name, profilePicture]);

  // Fetch users if admin
  useEffect(() => {
    if (isAdmin && room) {
      const url = `http://localhost:5000/api/rooms/${encodeURIComponent(
        room.trim().toLowerCase()
      )}/users?isAdmin=true`;

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setUsers(data || []);
        })
        .catch((error) => {
          alert(`Failed to fetch users: ${error.message}`);
        });
    }
  }, [room, isAdmin]);

  // Listen for public messages
  useEffect(() => {
    if (!socketRef.current) return;

    const messageHandler = (newMessage) => {
      console.log('Received new message:', newMessage); 
      setMessages((prevMessages) => {
        const updated = [...prevMessages, newMessage];
        localStorage.setItem('chatMessages', JSON.stringify(updated));
        return updated;
      });
    };

    socketRef.current.on('message', messageHandler);

    return () => {
      if (socketRef.current) socketRef.current.off('message', messageHandler);
    };
  }, []);

  // Listen for private messages
  useEffect(() => {
    if (!socketRef.current) return;

    const privateMessageHandler = (newMessage) => {
      if (!newMessage.sender || !newMessage.sender.name) {
        console.warn('Skipping message with undefined sender:', newMessage);
        return;
      }

      setPrivateMessages((prevMessages) => {
        if (prevMessages.some((msg) => msg.timestamp === newMessage.timestamp)) {
          return prevMessages;
        }

        const updated = [...prevMessages, newMessage];
        localStorage.setItem(`privateChat_${privateRoom}`, JSON.stringify(updated));
        return updated;
      });
    };

    socketRef.current.on('privateMessage', privateMessageHandler);

    return () => {
      if (socketRef.current) socketRef.current.off('privateMessage', privateMessageHandler);
    };
  }, [privateRoom]);

  // Load private messages on privateRoom change
  useEffect(() => {
    if (privateRoom) {
      const storedMessages = JSON.parse(localStorage.getItem(`privateChat_${privateRoom}`)) || [];
      setPrivateMessages(storedMessages);
    }
  }, [privateRoom]);

  // Handle private chat invitations
  useEffect(() => {
    if (!socketRef.current) return;

    const invitationHandler = ({ room, senderName }) => {
      const accept = window.confirm(`${senderName} wants to start a private chat. Do you accept?`);
      if (accept) {
        socketRef.current.emit('joinPrivateChat', { room });
        setPrivateRoom(room);
        setSelectedUser({ name: senderName });
      }
    };

    socketRef.current.on('privateChatInvitation', invitationHandler);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('privateChatInvitation', invitationHandler);
        socketRef.current.off('message');
        socketRef.current.off('privateMessage');
      }
    };
  }, []);

  // Admin initiates private chat
  const requestPrivateChat = (user) => {
    if (!isAdmin || !socketRef.current) return;

    const recipientId = user?.id;
    setSelectedUser(user);

    socketRef.current.emit('requestPrivateChat', { recipientId }, (response) => {
      if (response.success) {
        socketRef.current.emit('joinPrivateChat', { room: response.room });
        setPrivateRoom(response.room);
      } else {
        alert('Failed to start private chat.');
      }
    });
  };

  // Send message (public or private)
  const sendMessage = ({ text, fileUrl, fileName }) => {
  console.log("Sending message with file:", { text, fileUrl, fileName });

  if (!socketRef.current) return;
  if (!text && !fileUrl) return;

  const messageData = {
    text: text || "",
    fileUrl: fileUrl || null,
    fileName: fileName || null,
    sender: { name, profilePicture, user_is_admin: isAdmin, user_is_vendor: isVendor },
    timestamp: new Date().toISOString(),
    room: privateRoom || null,
  };

  if (privateRoom) {
    socketRef.current.emit("sendPrivateMessage", messageData);
  } else {
    socketRef.current.emit("sendMessage", messageData);
  }

  setMessage("");
};


  // Typing handlers
  const handleTyping = (value) => {
    setMessage(value);
  
    if (!socketRef.current) return;
    

  
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { userId: socketRef.current.id, name, room });
    }
  
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { userId: socketRef.current.id, name, room });
    }, 1000);
  };
  
  
  useEffect(() => {
  if (!socketRef.current) return;
  console.log('chat initiated');

  // 🔹 Log to confirm typing events are actually received
  socketRef.current.on('typing', data => console.log('Someone is typing:', data));
  socketRef.current.on('stopTyping', data => console.log('Stopped typing:', data));

  const typingHandler = ({ userId, name: typingUserName }) => {
    setTypingUsers((prev) => {
      if (!prev.includes(typingUserName)) return [...prev, typingUserName];
      return prev;
    });
  };

  const stopTypingHandler = ({ userId, name: stoppedUserName }) => {
    setTypingUsers((prev) => prev.filter((u) => u !== stoppedUserName));
  };

  socketRef.current.on('typing', typingHandler);
  socketRef.current.on('stopTyping', stopTypingHandler);

  return () => {
    if (socketRef.current) {
      socketRef.current.off('typing', typingHandler);
      socketRef.current.off('stopTyping', stopTypingHandler);
    }
  };
}, []);


  const clearChatHistory = () => {
    localStorage.removeItem('chatMessages');
    localStorage.removeItem(`privateChat_${privateRoom}`);
    setMessages([]);
    setPrivateMessages([]);
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full min-h-screen backdrop-blur-md"
      style={{ backgroundColor: colors.primary[600] }}
    >
      <div className="flex flex-col w-full h-full px-4 md:px-10 py-6 overflow-y-auto">
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
          onSelectUser={requestPrivateChat}
        />

        {/* Show typing indicator */}
        {typingUsers.length > 0 && (
          <p style={{ color: colors.greenAccent[500], marginBottom: '8px' }}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </p>
        )}

        <Input
          message={message}
          setMessage={setMessage}
          sendMessage={() => sendMessage({ text: message })}
          onTyping={handleTyping} 
        />

        {isAdmin && (users.length > 0 ? (
          <RoomUsers users={users} onSelectUser={requestPrivateChat} />
        ) : (
          <p>Loading users...</p>
        ))}

        <div className="flex justify-center mt-4 mb-4">
          <button className="secondary-button" onClick={clearChatHistory}>
            Clear Chat History
          </button>
        </div>

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
