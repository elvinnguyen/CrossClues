import { io } from 'socket.io-client';

const url = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://crossclues-server.onrender.com';

const socket = io(url);

export default socket;
