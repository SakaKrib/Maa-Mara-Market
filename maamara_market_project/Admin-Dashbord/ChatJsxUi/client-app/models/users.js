const users = [];

export function addUser({ id, name, room, profilePicture, isAdmin = false, isVendor = false }) {
  name = name.trim();
  room = room.trim().toLowerCase();

  console.log(`Adding user with ID: ${id} Name: ${name} Room: ${room}`);

  const existingUserIndex = users.findIndex(user => user.id === id);
  if (existingUserIndex !== -1) {
    console.log(`User with ID ${id} already exists. Removing old entry.`);
    users.splice(existingUserIndex, 1);
  }

  const user = { id, name, room, profilePicture, isAdmin, isVendor };
  users.push(user);

  console.log('User added:', user);
  console.log('Current users:', users);

  return { user };
}

export function removeUser(id) {
  console.log(`Removing user with ID: ${id}`);

  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    const user = users[index];
    users.splice(index, 1);

    console.log('User removed:', user);
    console.log('Remaining users:', users);

    return user;
  }

  console.log(`User with ID ${id} not found for removal.`);
  return null;
}

export function getUser(id) {
  const user = users.find(user => user.id === id);
  console.log(`getUser called for ID: ${id}. Found:`, user);
  return user;
}

export function getUsersInRoom(room) {
  room = room.trim().toLowerCase();
  const usersInRoom = users.filter(user => user.room === room);
  console.log(`getUsersInRoom called for Room: ${room}. Users found:`, usersInRoom.length);
  return usersInRoom;
}
