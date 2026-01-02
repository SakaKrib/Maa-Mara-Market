// Import dependencies
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { addUser, removeUser, getUser, getUsersInRoom } from './models/users.js';

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*', 
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/media', express.static(path.join(path.resolve(), 'media')));

// API to fetch users in a specific room (restricted to admins)
app.get('/api/rooms/:room/users', (req, res) => {
  const { room } = req.params;
  const { isAdmin } = req.query;

  console.log("Request received for room:", room);
  console.log("isAdmin query parameter:", isAdmin);

  if (!room || typeof room !== 'string') {
      console.error("Invalid room name.");
      return res.status(400).json({ message: 'Invalid room name!' });
  }

  if (isAdmin !== 'true') {
      console.warn("Access denied: Non-admin attempting to fetch users.");
      return res.status(403).json({ message: 'Access denied. Only admins can view users in this room.' });
  }

  const usersInRoom = getUsersInRoom(room);
  console.log("Users in room:", room, usersInRoom);

  if (!usersInRoom || usersInRoom.length === 0) {
      console.warn(`No users found in room "${room}".`);
      return res.status(404).json({ message: `Room "${room}" does not exist or has no users.` });
  }

  res.json(usersInRoom);
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Handle "join" event
    socket.on('join', (userData, callback) => {
        if (!userData.name || !userData.room) {
            return callback({ error: 'Name and room are required!' });
        }

        const { error, user } = addUser({
            id: socket.id,
            name: userData.name,
            room: userData.room.trim().toLowerCase(),
            profilePicture: userData.userProfilePicture,
            isAdmin: userData.isAdmin || false,
            isVendor: userData.isVendor || false,
        });

        if (error) return callback({ error });

        socket.join(user.room);
        socket.emit('message', { 
            sender: { 
                name: 'System',  
                user_is_admin: user.isAdmin, 
                user_is_vendor: user.isVendor 
            }, 
            text: ` Welcome, ${user.name}! You have joined ${user.room}.`,
            timestamp: new Date().toISOString(),
        });
        socket.broadcast.to(user.room).emit('message', { 
            sender: { 
                name: 'System',  
                user_is_admin: user.isAdmin, 
                user_is_vendor: user.isVendor 
            }, 
            text: `${user.name} has joined the room!`,
            timestamp: new Date().toISOString(),
        });
        
        

        // Notify users of updated room data
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

        callback();
    });

    // Handle public message sending
    socket.on('sendMessage', (messageText, callback) => {
        const user = getUser(socket.id);
        console.log("User Found on Server:", user); // Debugging log
    
        if (!user) return callback({ error: 'User not found.' });
    
        const chatMessage = {
            sender: { 
                name: user.name, 
                profilePicture: user.profilePicture, 
                user_is_admin: user.isAdmin, 
                user_is_vendor: user.isVendor 
            },
            text: messageText,
            timestamp: new Date().toISOString(),
        };
        
    
        console.log("Message Sent from Server:", chatMessage); // Debugging log
    
        io.to(user.room).emit('message', chatMessage);
        callback();
    });
    

    // **Admin initiates private chat invitation**
    socket.on('requestPrivateChat', ({ recipientId }, callback) => {
        const sender = getUser(socket.id);
        const recipient = getUser(recipientId);
    
        if (!sender || !recipient || !sender.isAdmin) {
            return callback({ error: "Invalid request or sender not authorized." });
        }
    
        const privateRoom = `private-${sender.id}-${recipient.id}`;
        console.log("Created private room:", privateRoom);
    
        // Make sure both users join the private chat room
        socket.join(privateRoom);
        io.to(recipient.id).emit("privateChatInvitation", { room: privateRoom, senderName: sender.name });
    
        callback({ success: true, room: privateRoom }); // Return correct room name
    });
    
      

    // **Recipient accepts private chat invitation**
    socket.on('joinPrivateChat', ({ room }) => {
        socket.join(room);
        console.log(`${socket.id} joined private chat room: ${room}`);
    });
    
    // **Private messaging after chat is accepted**
    socket.on('sendPrivateMessage', ({ room, text }, callback) => {
        const sender = getUser(socket.id);
    
        if (!sender || !room) {
            return callback({ error: "Invalid message or room." });
        }
    
        if (!sender.name) {
            console.warn("Skipping message with missing sender details:", sender);
            return callback({ error: "Sender details missing." });
        }
    
        // ✅ Define privateRoom to avoid ReferenceError
        const privateRoom = room;
    
        const privateMessage = {
            sender: { 
                name: sender.name, 
                profilePicture: sender.profilePicture, 
                user_is_admin: sender.isAdmin ?? false,  // Ensure admin status is always present
                user_is_vendor: sender.isVendor ?? false // Ensure vendor status is always present
            },
            text: text,
            timestamp: new Date().toISOString(),
        };
    
        console.log("Private Message Sent:", privateMessage);
    
        io.to(privateRoom).emit("privateMessage", privateMessage);
        callback({ success: true, room: privateRoom, recipientName: sender.name }); // ✅ Fix recipient reference
    });
    
    
    
      

    // Handle disconnect
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});
