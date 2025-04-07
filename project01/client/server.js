// Import dependencies
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { router } from './router.js';
import { addUser, removeUser, getUser, getUsersInRoom } from './models/users.js';




const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(router);
app.use('/media', express.static(path.join(path.resolve(), 'media')));


// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle "join" event
    socket.on('join', (userData, callback) => {
        console.log("User Data Received:", userData);

        // Validate input data
        if (!userData.name || !userData.room) {
            console.error('Name and room are required!');
            return callback({ error: 'Name and room are required!' });
        }

        // Add the user to the system
        const { error, user } = addUser({
            id: socket.id,
            name: userData.name,
            room: userData.room,
            profilePicture: userData.userProfilePicture,
            isAdmin: userData.isAdmin || false, // Default to false
            isVendor: userData.isVendor || false, // Default to false
        });
        console.log('this is the user dsts', user)

        if (error) {
            return callback({ error }); // Handle error if the user can't join
        }

        // Join the user to their room
        socket.join(user.room);

        // Create welcome message
        const welcomeMessage = {
            user: user.name,
            text: `${user.name} (${user.isAdmin ? 'Admin' : user.isVendor ? 'Vendor' : 'Customer'}) has joined room ${user.room}.`,
            user_is_admin: user.isAdmin, // Include admin status
            user_is_vendor: user.isVendor, // Include vendor status
            profile: user.profilePicture,
            timestamp: new Date().toISOString(),
        };
        console.log('welcomig messages', welcomeMessage)

        // Send welcome message to the user
        socket.emit('message', welcomeMessage);

        // Notify others in the room
        const broadcastMessage = {
            ...welcomeMessage,
            text: `${user.name} has joined the chat.`,
        };
        socket.broadcast.to(user.room).emit('message', broadcastMessage);

        // Update room data
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room),
        });

        console.log(`User ${user.name} added to room ${user.room}`);
        callback(); // Acknowledge the join event
    });

    // Handle "sendMessage" event
    socket.on('sendMessage', (messageText, callback) => {
        const user = getUser(socket.id);

        if (user) {
            const chatMessage = {
                user: user.name,
                text: messageText,
                profilePicture: user.profilePicture, // Include sender's profile picture
                user_is_admin: user.isAdmin,
                user_is_vendor: user.isVendor,
                timestamp: new Date().toISOString(),
            };

            // Broadcast the message to the room
            io.to(user.room).emit('message', chatMessage);
            console.log('message', chatMessage);

            // Update room data
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room),
            });

            console.log(`Message sent by ${user.name} to room ${user.room}: ${messageText}`);
        } else {
            console.warn(`Message could not be sent: User with ID ${socket.id} not found.`);
        }

        callback(); // Acknowledge the sendMessage event
    });

    // Handle "disconnect" event
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            const disconnectMessage = {
                user: 'admin',
                text: `${user.name} has left the room.`,
                timestamp: new Date().toISOString(),
            };

            io.to(user.room).emit('message', disconnectMessage);

            // Update room data
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room),
            });

            console.log(`User ${user.name} disconnected from room ${user.room}`);
        } else {
            console.warn(`Disconnected: No user found with ID ${socket.id}`);
        }

        console.log('A user has disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server has started on port ${PORT}`);
});
