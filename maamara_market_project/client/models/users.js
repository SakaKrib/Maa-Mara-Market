import { Socket } from "socket.io";

const users = []; // Array to manage user data

// Add a user to the users array
const addUser = ({ id, name, room, profilePicture, isAdmin, isVendor }) => {
    if (!id || !name || !room) {
        console.error("Missing required fields to add user:", { id, name, room });
        return { error: 'User ID, name, and room are required!' };
    }

    console.log("Adding user with ID:", id, "Name:", name, "Room:", room);

    room = room.trim().toLowerCase();

    const existingUser = users.find(user => user.room === room && user.name === name);

    if (existingUser) {
        return { error: 'Username is already taken in this room.' };
    }

    const user = {
        id ,
        name,
        room,
        profilePicture: profilePicture || '/default-profile.png', // Default profile picture
        isAdmin: !!isAdmin, // Ensure boolean
        isVendor: !!isVendor,
    };
    users.push(user);
    console.log("Added user:", user);
    console.log("Current user list:", users);
    return { user };
};

// Remove a user from the users array
const removeUser = (id) => {
    console.log("Attempting to remove user with ID:", id);
    const index = users.findIndex(user => user.id === id);
    if (index === -1) {
        console.warn(`No user found with ID: ${id}`);
        console.log("Current users:", users);
        return null;
    }
    const removedUser = users.splice(index, 1)[0];
    console.log("Removed user:", removedUser);
    console.log("Updated user list after removal:", users);
    return removedUser;
};

// Get a specific user by ID
const getUser = (id) => {
    const user = users.find((user) => user.id === id);
    if (!user) {
        console.warn(`No user found with ID: ${id}. Total users: ${users.length}`);
    }
    return user || null;
};

// Get all users in a specific room
const getUsersInRoom = (room) => {
    if (typeof room !== 'string' || !room.trim()) {
        console.error('Invalid room name provided:', room);
        return [];
    }

    room = room.trim().toLowerCase();
    const usersInRoom = users.filter((user) => user.room === room);
    console.log(`Found ${usersInRoom.length} user(s) in room "${room}"`);
    return usersInRoom;
};

// Export the functions for external use
export { addUser, removeUser, getUser, getUsersInRoom };
