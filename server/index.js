import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  initializeGame,
  getActivePlayer,
  drawCard,
  submitClue,
  selectCell,
  submitVote,
  allVotesIn,
  tallyVotes,
  resolveGuess,
  advanceTurn,
  getPublicState,
} from './game.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function broadcastState(room) {
  for (const player of room.players) {
    const isActive = getActivePlayer(room)?.id === player.id;
    const state = getPublicState(room, isActive);
    state.myVote = room.votes[player.id] ?? null;
    state.mySelection = room.selections[player.id] ?? null;
    io.to(player.id).emit('game_state', state);
  }
}

function handleVoteResolution(room) {
  if (!allVotesIn(room)) return;

  const majorityCell = tallyVotes(room);
  resolveGuess(room, majorityCell);

  const ended = advanceTurn(room);
  if (ended) {
    broadcastState(room);
    return;
  }

  drawCard(room);
  broadcastState(room);
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('create_room', ({ playerName }, cb) => {
    let code = generateRoomCode();
    while (rooms[code]) code = generateRoomCode();

    const room = createRoom(code, socket.id);
    room.players.push({ id: socket.id, name: playerName, isReady: false });
    rooms[code] = room;
    socket.join(code);

    cb({ ok: true, roomId: code });
    broadcastState(room);
  });

  socket.on('join_room', ({ roomId, playerName }, cb) => {
    const code = roomId.toUpperCase();
    const room = rooms[code];

    if (!room) return cb({ ok: false, reason: 'Room not found' });
    if (room.phase !== 'lobby') return cb({ ok: false, reason: 'Game already started' });
    if (room.players.length >= 4) return cb({ ok: false, reason: 'Room is full' });
    if (room.players.some((p) => p.name === playerName))
      return cb({ ok: false, reason: 'Name already taken' });

    room.players.push({ id: socket.id, name: playerName, isReady: false });
    socket.join(code);

    cb({ ok: true, roomId: code });
    broadcastState(room);
  });

  socket.on('toggle_ready', ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });
    if (room.phase !== 'lobby') return cb({ ok: false, reason: 'Game already started' });

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return cb({ ok: false, reason: 'Player not found' });

    player.isReady = !player.isReady;
    cb({ ok: true, isReady: player.isReady });
    broadcastState(room);
  });

  socket.on('start_game', ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });
    if (room.phase !== 'lobby') return cb({ ok: false, reason: 'Game already started' });
    if (socket.id !== room.hostId) return cb({ ok: false, reason: 'Only the host can start the game' });
    if (room.players.length < 2) return cb({ ok: false, reason: 'Need at least 2 players' });
    if (!room.players.every((p) => p.id === room.hostId || p.isReady))
      return cb({ ok: false, reason: 'All players must be ready' });

    initializeGame(room);
    drawCard(room);
    cb({ ok: true });
    broadcastState(room);
  });

  socket.on('submit_clue', ({ roomId, clue }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });

    const active = getActivePlayer(room);
    if (active.id !== socket.id) return cb({ ok: false, reason: 'Not your turn' });
    if (room.phase !== 'clue') return cb({ ok: false, reason: 'Not in clue phase' });

    const result = submitClue(room, clue);
    if (!result.ok) return cb(result);

    room.lastGuessResult = null;
    cb({ ok: true });
    broadcastState(room);
  });

  socket.on('select_cell', ({ roomId, cell }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });

    const active = getActivePlayer(room);
    if (active.id === socket.id) return cb({ ok: false, reason: 'Active player cannot select' });
    if (room.phase !== 'guess') return cb({ ok: false, reason: 'Not in guess phase' });
    if (room.votes[socket.id]) return cb({ ok: false, reason: 'Already voted' });

    selectCell(room, socket.id, cell);
    cb({ ok: true });
    broadcastState(room);
  });

  socket.on('submit_vote', ({ roomId, cell }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });

    const active = getActivePlayer(room);
    if (active.id === socket.id) return cb({ ok: false, reason: 'Active player cannot vote' });
    if (room.phase !== 'guess') return cb({ ok: false, reason: 'Not in guess phase' });
    if (room.votes[socket.id]) return cb({ ok: false, reason: 'Already voted' });

    const voteCell = cell || room.selections[socket.id];
    if (!voteCell) return cb({ ok: false, reason: 'No cell selected' });

    submitVote(room, socket.id, voteCell);
    cb({ ok: true });
    broadcastState(room);

    handleVoteResolution(room);
  });

  socket.on('send_chat_message', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const text = message.trim().slice(0, 300);
    if (!text) return;

    const msg = {
      id: Date.now() + '-' + socket.id,
      sender: player.name,
      text,
      timestamp: Date.now(),
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 200) room.chatMessages.shift();

    broadcastState(room);
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    for (const [code, room] of Object.entries(rooms)) {
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const playerName = room.players[idx].name;
        room.players.splice(idx, 1);
        delete room.votes[socket.id];
        delete room.selections[socket.id];

        if (room.players.length === 0) {
          delete rooms[code];
        } else {
          if (room.hostId === socket.id) {
            room.hostId = room.players[0].id;
          }

          if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
          }
          io.to(code).emit('player_left', { name: playerName });
          broadcastState(room);

          if (room.phase === 'guess') {
            handleVoteResolution(room);
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
