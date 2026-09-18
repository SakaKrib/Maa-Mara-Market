// ======================
// 📦 Import dependencies
// ======================
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { addUser, removeUser, getUser, getUsersInRoom } from './models/users.js';

const app = express();
const server = http.createServer(app);

// ======================
// ⚡ Socket.IO Config
// ======================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// ======================
// 🧭 Middleware
// ======================
app.use(cors());
app.use(express.json());

// ======================
// 📂 File Upload Handling
// ======================

// Ensure media folder exists
const mediaDir = path.join(path.resolve(), 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// Optional: restrict file types (images only, for example)
const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

const upload = multer({ storage, fileFilter });

// Serve static files
app.use('/media', express.static(mediaDir));

// 📤 File upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/media/${req.file.filename}`;
    res.json({ fileUrl, fileName: req.file.originalname });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// ======================
// 🧑‍🤝‍🧑 User & Room APIs
// ======================
app.get('/api/rooms/:room/users', (req, res) => {
  const { room } = req.params;
  const { isAdmin } = req.query;

  if (!room || typeof room !== 'string') {
    return res.status(400).json({ message: 'Invalid room name!' });
  }

  if (isAdmin !== 'true') {
    return res.status(403).json({ message: 'Access denied. Only admins can view users in this room.' });
  }

  const usersInRoom = getUsersInRoom(room.toLowerCase());
  if (!usersInRoom || usersInRoom.length === 0) {
    return res.status(404).json({ message: `Room "${room}" does not exist or has no users.` });
  }

  res.json(usersInRoom);
});

// ======================
// 💬 Socket Events
// ======================
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins
  socket.on('join', (userData, callback) => {
    if (!userData.name || !userData.room) {
      return callback({ error: 'Name and room are required!' });
    }

    const roomName = userData.room.trim().toLowerCase();
    const { error, user } = addUser({
      id: socket.id,
      name: userData.name,
      room: roomName,
      profilePicture: userData.userProfilePicture,
      isAdmin: userData.isAdmin || false,
      isVendor: userData.isVendor || false,
    });

    if (error) return callback({ error });

    socket.join(user.room);

    socket.emit('message', {
      sender: { name: 'System', user_is_admin: user.isAdmin, user_is_vendor: user.isVendor },
      text: `Welcome, ${user.name}! You have joined ${user.room}.`,
      timestamp: new Date().toISOString(),
    });

    socket.broadcast.to(user.room).emit('message', {
      sender: { name: 'System', user_is_admin: user.isAdmin, user_is_vendor: user.isVendor },
      text: `${user.name} has joined the room!`,
      timestamp: new Date().toISOString(),
    });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    callback();
  });

  // typing users recieced
  socket.on('typing', (data) => {
    const user = getUser(socket.id);
    if (user) {
      console.log(`Broadcast typing from ${user.name} in room ${user.room}`);
      socket.broadcast.to(user.room).emit('typing', { userId: user.id, name: user.name });
    }
  });
  
  socket.on('stopTyping', (data) => {
    const user = getUser(socket.id);
    if (user) {
      console.log(`Broadcast stopTyping from ${user.name} in room ${user.room}`);
      socket.broadcast.to(user.room).emit('stopTyping', { userId: user.id, name: user.name });
    }
  });

  // Public messages
  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
  
    if (!user) {
      if (typeof callback === 'function') {
        return callback({ error: 'User not found.' });
      }
      return;
    }
  
    const roomClients = io.sockets.adapter.rooms.get(user.room);
    if (!roomClients || roomClients.size === 0) {
      if (typeof callback === 'function') {
        return callback({ error: `Room "${user.room}" does not exist or has no users.` });
      }
      return;
    }
  
    const chatMessage = {
      sender: {
        name: user.name,
        profilePicture: user.profilePicture,
        user_is_admin: user.isAdmin,
        user_is_vendor: user.isVendor,
      },
      text: message.text || '',
      timestamp: new Date().toISOString(),
      fileUrl: message.fileUrl || null,
      fileName: message.fileName || null,
    };
  
    io.to(user.room).emit('message', chatMessage);
  
    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });
  
  // Private chat invitation
  socket.on('requestPrivateChat', ({ recipientId }, callback) => {
    const sender = getUser(socket.id);
    const recipient = getUser(recipientId);

    if (!sender || !recipient || !sender.isAdmin) {
      return callback({ error: 'Invalid request or sender not authorized.' });
    }

    const privateRoom = `private-${sender.id}-${recipient.id}`;
    socket.join(privateRoom);
    io.to(recipient.id).emit('privateChatInvitation', { room: privateRoom, senderName: sender.name });

    callback({ success: true, room: privateRoom });
  });

  // Join private chat
  socket.on('joinPrivateChat', ({ room }) => {
    socket.join(room);
    console.log(`${socket.id} joined private chat room: ${room}`);
  });

  // Private messages
  // === FIXED to accept and broadcast fileUrl and fileName ===
  socket.on('sendPrivateMessage', ({ room, text, fileUrl = null, fileName = null }, callback) => {
    const sender = getUser(socket.id);
    if (!sender || !room) return callback({ error: 'Invalid message or room.' });

    const privateMessage = {
      sender: {
        name: sender.name,
        profilePicture: sender.profilePicture,
        user_is_admin: sender.isAdmin ?? false,
        user_is_vendor: sender.isVendor ?? false,
      },
      text,
      fileUrl,
      fileName,
      timestamp: new Date().toISOString(),
    };

    io.to(room).emit('privateMessage', privateMessage);
    callback({ success: true, room, recipientName: sender.name });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }
  });
});

// ======================
// 🚀 Start Server
// ======================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
