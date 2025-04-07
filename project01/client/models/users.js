const users = []; // Array to manage user data

// Add a user to the users array
const addUser = ({ id, name, room, isAdmin, isVendor, profilePicture }) => {
    // Validate that name and room are provided
    if (!name || !room) {
        console.error('Name and room are required!');
        return { error: 'Name and room are required!' };
    }

    // Normalize name and room (remove excess whitespace and convert to lowercase)
    name = name.trim().toLowerCase();
    room = room.trim().toLowerCase();
    console.log('Adding user with name:', name, 'and room:', room, 'isAdmin:', isAdmin, 'isVendor:', isVendor);

    // Check if the username is already taken in the same room
    const existingUser = users.find((user) => user.room === room && user.name === name);
    if (existingUser) {
        console.error('Username is already taken:', name);
        return { error: 'Username is taken' };
    }

    // Add the new user, including admin and vendor flags
    const user = { id, name, room, isAdmin, isVendor, profilePicture };
    users.push(user);

    return { user }; // Return the added user
};

// Remove a user from the users array
const removeUser = (id) => {
    // Find the index of the user with the matching ID
    const index = users.findIndex((user) => user.id === id);

    if (index !== -1) {
        // Remove the user and return them
        console.log('Removing user with ID:', id);
        return users.splice(index, 1)[0];
    }

    console.warn('User not found for removal with ID:', id);
    return null; // Explicitly return null if no user is found
};

// Get a specific user by ID
const getUser = (id) => {
    const user = users.find((user) => user.id === id);

    if (!user) {
        console.warn('No user found with ID:', id);
        console.log( 'users in the chat', user)
    }
    return user;
};

// Get all users in a specific room
const getUsersInRoom = (room) => {
    if (!room) {
        console.error('Room name is required to get users in a room!');
        return [];
    }

    room = room.trim().toLowerCase();
    const usersInRoom = users.filter((user) => user.room === room);
    console.log('Users in room:', room, usersInRoom);

    return usersInRoom;
};

// Export the functions for external use
export { addUser, removeUser, getUser, getUsersInRoom };
