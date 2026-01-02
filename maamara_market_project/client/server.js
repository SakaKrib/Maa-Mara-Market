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
        origin: process.env.FRONTEND_URL || '*', // Use environment variable for frontend origin
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
        console.log(`Processing join event for socket ${socket.id}:`, userData);

        if (!userData.name || !userData.room) {
            console.error("Join failed: Name and room are required!");
            if (typeof callback === 'function') {
                return callback({ error: 'Name and room are required!' });
            }
            return;
        }

        const { error, user } = addUser({
            id: socket.id,
            name: userData.name,
            room: userData.room.trim().toLowerCase(),
            profilePicture: userData.userProfilePicture,
            isAdmin: userData.isAdmin || false,
            isVendor: userData.isVendor || false,
        });

        if (error) {
            console.error("Add user failed:", error);
            if (typeof callback === 'function') {
                return callback({ error });
            }
            return;
        }

        socket.join(user.room);

        // Notify all users about the updated room data
        console.log(`${user.name} joined the room: ${user.room}`);
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

        if (typeof callback === 'function') {
            callback(); // Safely call the callback if it exists
        }
    });

    // Handle public message sending
    socket.on('sendMessage', (messageText, callback) => {
        const user = getUser(socket.id);

        if (!user) {
            console.error("Message send failed: User not found.");
            if (typeof callback === 'function') {
                return callback({ error: 'User not found.' });
            }
            return;
        }

        const chatMessage = {
            user: user.name,
            text: messageText,
            profilePicture: user.profilePicture,
            user_is_admin: user.isAdmin,
            user_is_vendor: user.isVendor,
            timestamp: new Date().toISOString(),
        };

        console.log(`Message from ${user.name} in room ${user.room}:`, messageText);
        io.to(user.room).emit('message', chatMessage);

        if (typeof callback === 'function') {
            callback(); // Notify the sender that the message was sent
        }
    });

    // Handle private messaging (Admin to user/vendor)
    socket.on('privateMessage', ({ recipientId, messageText }, callback) => {
        const sender = getUser(socket.id);
        const recipient = getUser(recipientId);

        if (!sender || !recipient) {
            console.error("Private message failed: Sender or recipient not found.");
            if (typeof callback === 'function') {
                return callback({ error: 'Sender or recipient not found.' });
            }
            return;
        }

        console.log(`Private message sent from ${sender.name} to ${recipient.name}:`, messageText);
        io.to(recipient.id).emit('privateMessage', {
            user: sender.name,
            text: messageText,
            isPrivate: true,
            timestamp: new Date().toISOString(),
        });

        if (typeof callback === 'function') {
            callback(); // Notify the sender that the private message was sent
        }
    });

    // Handle "disconnect" event
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            console.log(`${user.name} disconnected from room: ${user.room}`);
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
        }
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server has started on port ${PORT}`);
});
