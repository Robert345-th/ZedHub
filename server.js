const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { Server } = require('socket.io');
const ludo = require('./lib/ludo');

try {
  require('dotenv').config();
} catch (_) {}

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
const DATA_DIR = path.join(__dirname, 'data');
const STATUSES_FILE = path.join(DATA_DIR, 'statuses.json');
const SHOPS_FILE = path.join(DATA_DIR, 'shop-galleries.json');
const STATUS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SHOP_PHOTO_MIN = 4;
const SHOP_PHOTO_MAX = 10;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) {}
}

function readStatuses() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STATUSES_FILE, 'utf8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeStatuses(list) {
  ensureDataDir();
  fs.writeFileSync(STATUSES_FILE, JSON.stringify(list, null, 2));
}

function readShops() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SHOPS_FILE, 'utf8');
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeShops(obj) {
  ensureDataDir();
  fs.writeFileSync(SHOPS_FILE, JSON.stringify(obj, null, 2));
}

function activeStatuses() {
  const now = Date.now();
  const all = readStatuses();
  const list = all.filter((s) => s && s.expiresAt > now);
  if (list.length !== all.length) writeStatuses(list);
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

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
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Nexus',
    home: 'app-list',
    eventsApi: ZEDEVENTS_API,
    eventsUi: '/events/',
    games: ['ludo', 'fruits', 'words'],
    statuses: true,
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

// —— 24h statuses (Facebook-style) ——
app.get('/api/statuses', (req, res) => {
  res.json(activeStatuses());
});

function safeHexColor(value, fallback) {
  const raw = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw.toUpperCase() : fallback;
}

app.post('/api/statuses', (req, res) => {
  const userId = String(req.body?.userId || '').trim();
  const name = String(req.body?.name || 'Guest').trim().slice(0, 48) || 'Guest';
  const text = String(req.body?.text || '').trim().slice(0, 280);
  const photo = String(req.body?.photo || '').trim().slice(0, 500);
  const shop = String(req.body?.shop || '').trim().slice(0, 80);
  const bgColor = safeHexColor(req.body?.bgColor, '#C2410C');
  const textColor = safeHexColor(req.body?.textColor, '#FFFFFF');
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!text && !photo) return res.status(400).json({ error: 'Add text or a photo' });

  const now = Date.now();
  const status = {
    id: `st_${now}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    name,
    shop,
    text,
    photo: photo || null,
    bgColor,
    textColor,
    createdAt: now,
    expiresAt: now + STATUS_TTL_MS,
  };

  // One active status per user — replace older
  const list = activeStatuses().filter((s) => String(s.userId) !== userId);
  list.unshift(status);
  writeStatuses(list.slice(0, 200));
  res.status(201).json(status);
});

app.delete('/api/statuses/:id', (req, res) => {
  const id = req.params.id;
  const userId = String(req.body?.userId || req.query.userId || '').trim();
  const list = readStatuses();
  const item = list.find((s) => s.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (userId && String(item.userId) !== userId) {
    return res.status(403).json({ error: 'Not your status' });
  }
  writeStatuses(list.filter((s) => s.id !== id));
  res.json({ ok: true });
});

// —— Shop “what they do” gallery (4–10 photos) ——
app.get('/api/shops/:userId/gallery', (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const shops = readShops();
  const shop = shops[userId] || { userId, photos: [], updatedAt: null };
  res.json(shop);
});

app.put('/api/shops/:userId/gallery', (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const bodyUser = String(req.body?.userId || '').trim();
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (bodyUser && bodyUser !== userId) {
    return res.status(403).json({ error: 'Not your shop' });
  }

  let photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
  photos = photos
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .slice(0, SHOP_PHOTO_MAX);

  if (photos.length < SHOP_PHOTO_MIN) {
    return res.status(400).json({
      error: `Add at least ${SHOP_PHOTO_MIN} photos (up to ${SHOP_PHOTO_MAX}).`,
      min: SHOP_PHOTO_MIN,
      max: SHOP_PHOTO_MAX,
    });
  }

  const shops = readShops();
  shops[userId] = {
    userId,
    name: String(req.body?.name || '').trim().slice(0, 80),
    bio: String(req.body?.bio || '').trim().slice(0, 500),
    photos,
    updatedAt: Date.now(),
  };
  writeShops(shops);
  res.json(shops[userId]);
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/events', (req, res) => {
  res.redirect('/events/');
});

app.get('/games/ludo', (req, res) => {
  res.redirect('/games/ludo/');
});

app.get('/games/fruits', (req, res) => {
  res.redirect('/games/fruits/');
});

app.get('/games/words', (req, res) => {
  res.redirect('/games/words/');
});

app.get('/games/ludo/', (req, res) => {
  res.sendFile(path.join(publicDir, 'games', 'ludo', 'index.html'));
});

app.get('/games/fruits/', (req, res) => {
  res.sendFile(path.join(publicDir, 'games', 'fruits', 'index.html'));
});

app.get('/games/words/', (req, res) => {
  res.sendFile(path.join(publicDir, 'games', 'words', 'index.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) return next();
  // Let missing static assets 404; don't force every /events/* onto index
  if (req.path.startsWith('/events/')) {
    return res.status(404).send('Not found');
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
  console.log(`Nexus running on http://localhost:${PORT}`);
  console.log(`Ludo multiplayer ready at /games/ludo/`);
  console.log(`Events API: ${ZEDEVENTS_API}`);
});
