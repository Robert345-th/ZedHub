require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4100;

// ZedEvents API only — NEVER point this at ZedMarket.
const ZEDEVENTS_API =
  process.env.ZEDEVENTS_API || 'https://zedevents-production.up.railway.app';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'ZedHub',
    eventsApi: ZEDEVENTS_API,
    market: 'excluded',
  });
});

/** Proxy health check to ZedEvents (read-only). Does not modify Events code. */
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ZedHub running on http://localhost:${PORT}`);
  console.log(`Events API: ${ZEDEVENTS_API}`);
  console.log('ZedMarket: excluded (not touched)');
});
