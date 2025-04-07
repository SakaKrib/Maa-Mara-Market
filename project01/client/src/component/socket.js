import { io } from 'socket.io-client';

// Replace with the correct URL where your server is running
const SOCKET_URL = 'http://127.0.0.1:5000';

const socket = io(SOCKET_URL);

export default socket;
