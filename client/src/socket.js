import { io } from 'socket.io-client';

const socket = io('https://crossclues-server.onrender.com');

export default socket;
