require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { Server } = require('socket.io');
const ludo = require('./lib/ludo');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 4100;

// Live ZedEvents API only — NEVER point this at ZedMarket.
const ZEDEVENTS_API =
  process.env.ZEDEVENTS_API || 'https://zedevents-production.up.railway.app';

const rooms = new Map(); // code -> room

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  if (rooms.has(code)) return makeCode();
  return code;
}

function emitRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit('ludo:state', ludo.publicState(room));
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'ZedHub',
    home: 'app-list',
    eventsApi: ZEDEVENTS_API,
    eventsUi: '/events/',
    games: ['ludo'],
    market: 'link-only',
  });
});

app.get('/api/events/status', async (req, res) => {
  try {
    const response = await fetch(ZEDEVENTS_API, { timeout: 10000 });
    const text = await response.text();
    res.json({
      connected: response.ok,
      status: response.status,
      message: text.slice(0, 200),
    });
  } catch (err) {
    res.status(502).json({
      connected: false,
      error: 'Could not reach ZedEvents API',
      detail: err.message,
    });
  }
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/events', (req, res) => {
  res.redirect('/events/');
});

app.get('/games/ludo', (req, res) => {
  res.redirect('/games/ludo/');
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) return next();
  if (req.path.startsWith('/events/')) {
    return res.sendFile(path.join(publicDir, 'events', 'index.html'));
  }
  if (req.path.startsWith('/games/')) {
    return res.status(404).send('Game not found');
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

io.on('connection', (socket) => {
  socket.data.roomCode = null;

  socket.on('ludo:create', ({ name } = {}) => {
    const code = makeCode();
    const room = ludo.createRoom(code, socket.id, name);
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('ludo:joined', { playerId: socket.id, code });
    emitRoom(code);
  });

  socket.on('ludo:join', ({ code, name } = {}) => {
    const key = String(code || '')
      .trim()
      .toUpperCase();
    const room = rooms.get(key);
    if (!room) return socket.emit('ludo:error', { error: 'Room not found' });
    const result = ludo.addPlayer(room, socket.id, name);
    if (!result.ok) return socket.emit('ludo:error', { error: result.error });
    socket.join(key);
    socket.data.roomCode = key;
    socket.emit('ludo:joined', { playerId: socket.id, code: key });
    emitRoom(key);
  });

  socket.on('ludo:start', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const result = ludo.startGame(room, socket.id);
    if (!result.ok) return socket.emit('ludo:error', { error: result.error });
    emitRoom(code);
  });

  socket.on('ludo:roll', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const result = ludo.rollDice(room, socket.id);
    if (!result.ok) return socket.emit('ludo:error', { error: result.error });
    emitRoom(code);
  });

  socket.on('ludo:move', ({ tokenId } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const result = ludo.applyMove(room, socket.id, Number(tokenId));
    if (!result.ok) return socket.emit('ludo:error', { error: result.error });
    emitRoom(code);
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.connected = false;
      room.lastEvent = `${player.name} left`;
    }

    // Remove from lobby if still waiting
    if (room.status === 'lobby') {
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(code);
        return;
      }
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
      }
    }

    emitRoom(code);

    // Cleanup empty finished/abandoned rooms after a while is fine; delete if none connected
    if (room.players.every((p) => !p.connected)) {
      rooms.delete(code);
    }
  });
});

// Cleanup stale rooms (2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) rooms.delete(code);
  }
}, 15 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`ZedHub running on http://localhost:${PORT}`);
  console.log(`Ludo multiplayer ready at /games/ludo/`);
  console.log(`Events API: ${ZEDEVENTS_API}`);
});
