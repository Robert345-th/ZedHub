require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4100;

// Live ZedEvents API only — NEVER point this at ZedMarket.
const ZEDEVENTS_API =
  process.env.ZEDEVENTS_API || 'https://zedevents-production.up.railway.app';

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'ZedHub',
    home: 'app-list',
    eventsApi: ZEDEVENTS_API,
    eventsUi: '/events/',
    market: 'excluded',
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

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/events/')) {
    return res.sendFile(path.join(publicDir, 'events', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ZedHub running on http://localhost:${PORT}`);
  console.log(`Home = app list. Events opens from the list only.`);
  console.log(`Events API: ${ZEDEVENTS_API}`);
  console.log('ZedMarket: excluded (not touched)');
});
