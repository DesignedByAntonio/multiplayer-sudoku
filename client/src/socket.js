// client/src/socket.js
import { io } from 'socket.io-client';

// point this at your server URL
const SERVER_URL = 'http://localhost:4000';

// auto-connect
const socket = io(SERVER_URL, {
  autoConnect: false,  // we’ll manually connect
});

export default socket;
