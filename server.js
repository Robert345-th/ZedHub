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
    defaultApp: 'events',
    eventsApi: ZEDEVENTS_API,
    eventsUi: '/events/',
    market: 'excluded',
  });
});

/** Read-only connectivity check to live ZedEvents API. */
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

// Opening the site / installed app lands in the real Events app
app.get('/', (req, res) => {
  res.redirect(302, '/events/');
});

app.use(express.static(publicDir));

app.get('/events', (req, res) => {
  res.redirect('/events/');
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/events/')) {
    return res.sendFile(path.join(publicDir, 'events', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'apps.html'));
});

app.listen(PORT, () => {
  console.log(`ZedHub running on http://localhost:${PORT}`);
  console.log(`Default app: Events → http://localhost:${PORT}/events/`);
  console.log(`Events API: ${ZEDEVENTS_API}`);
  console.log('ZedMarket: excluded (not touched)');
});
