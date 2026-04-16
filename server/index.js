import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  getActivePlayer,
  drawCard,
  submitClue,
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
    io.to(player.id).emit('game_state', state);
  }
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('create_room', ({ playerName }, cb) => {
    let code = generateRoomCode();
    while (rooms[code]) code = generateRoomCode();

    const room = createRoom(code);
    room.players.push({ id: socket.id, name: playerName });
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

    room.players.push({ id: socket.id, name: playerName });
    socket.join(code);

    cb({ ok: true, roomId: code });
    broadcastState(room);
  });

  socket.on('start_game', ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });
    if (room.players.length < 2) return cb({ ok: false, reason: 'Need at least 2 players' });
    if (room.phase !== 'lobby') return cb({ ok: false, reason: 'Game already started' });

    room.phase = 'clue';
    const card = drawCard(room);
    cb({ ok: true });

    broadcastState(room);
    io.to(getActivePlayer(room).id).emit('your_card', { card });
  });

  socket.on('submit_clue', ({ roomId, clue }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });

    const active = getActivePlayer(room);
    if (active.id !== socket.id) return cb({ ok: false, reason: 'Not your turn' });
    if (room.phase !== 'clue') return cb({ ok: false, reason: 'Not in clue phase' });

    const result = submitClue(room, clue);
    if (!result.ok) return cb(result);

    cb({ ok: true });
    io.to(roomId).emit('clue_given', { clue: result.clue, by: active.name });
    broadcastState(room);
  });

  socket.on('make_guess', ({ roomId, cell }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, reason: 'Room not found' });

    const active = getActivePlayer(room);
    if (active.id === socket.id) return cb({ ok: false, reason: 'Active player cannot guess' });
    if (room.phase !== 'guess') return cb({ ok: false, reason: 'Not in guess phase' });

    const correct = resolveGuess(room, cell);
    io.to(roomId).emit('guess_result', { cell, correct, actualCard: correct ? cell : room.discardPile[room.discardPile.length - 1] });

    const ended = advanceTurn(room);
    if (ended) {
      io.to(roomId).emit('game_end', {
        revealedCount: room.revealedCount,
        total: 25,
      });
    } else {
      const nextCard = drawCard(room);
      io.to(getActivePlayer(room).id).emit('your_card', { card: nextCard });
    }

    cb({ ok: true, correct });
    broadcastState(room);
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    for (const [code, room] of Object.entries(rooms)) {
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const playerName = room.players[idx].name;
        room.players.splice(idx, 1);

        if (room.players.length === 0) {
          delete rooms[code];
        } else {
          if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
          }
          io.to(code).emit('player_left', { name: playerName });
          broadcastState(room);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
