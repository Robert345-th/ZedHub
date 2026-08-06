(function () {
  const COLORS = {
    red: '#e11d48',
    green: '#16a34a',
    yellow: '#ca8a04',
    blue: '#2563eb',
  };

  const START = { red: 0, green: 13, yellow: 26, blue: 39 };
  const MAIN_LEN = 51;

  const els = {
    lobby: document.getElementById('lobbyScreen'),
    wait: document.getElementById('waitScreen'),
    game: document.getElementById('gameScreen'),
    win: document.getElementById('winScreen'),
    name: document.getElementById('nameInput'),
    code: document.getElementById('codeInput'),
    lobbyErr: document.getElementById('lobbyErr'),
    createBtn: document.getElementById('createBtn'),
    joinBtn: document.getElementById('joinBtn'),
    waitCode: document.getElementById('waitCode'),
    waitPlayers: document.getElementById('waitPlayers'),
    startBtn: document.getElementById('startBtn'),
    waitHint: document.getElementById('waitHint'),
    copyBtn: document.getElementById('copyBtn'),
    roomPill: document.getElementById('roomPill'),
    board: document.getElementById('board'),
    diceFace: document.getElementById('diceFace'),
    rollBtn: document.getElementById('rollBtn'),
    statusLine: document.getElementById('statusLine'),
    turnList: document.getElementById('turnList'),
    eventLine: document.getElementById('eventLine'),
    winTitle: document.getElementById('winTitle'),
    againBtn: document.getElementById('againBtn'),
  };

  try {
    const saved = localStorage.getItem('ludo_name');
    if (saved) els.name.value = saved;
  } catch (_) {}

  const socket = io({ transports: ['websocket', 'polling'] });
  let meId = null;
  let state = null;
  let isHost = false;

  function show(screen) {
    [els.lobby, els.wait, els.game, els.win].forEach((s) => {
      s.hidden = s !== screen;
    });
  }

  function err(msg) {
    els.lobbyErr.hidden = !msg;
    els.lobbyErr.textContent = msg || '';
  }

  function saveName() {
    const n = (els.name.value || '').trim();
    try {
      if (n) localStorage.setItem('ludo_name', n);
    } catch (_) {}
    return n || 'Player';
  }

  function trackXY(i) {
    const angle = (i / 52) * Math.PI * 2 - Math.PI / 2;
    const r = 36;
    return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
  }

  function homeXY(color, step) {
    // step 0..4 on home stretch, 5 = finished (center-ish)
    const hubs = {
      red: { x: 50, y: 72 },
      green: { x: 28, y: 50 },
      yellow: { x: 50, y: 28 },
      blue: { x: 72, y: 50 },
    };
    const hub = hubs[color];
    const t = (step + 1) / 6;
    return {
      x: hub.x + (50 - hub.x) * t,
      y: hub.y + (50 - hub.y) * t,
    };
  }

  function yardXY(color, tokenId) {
    const bases = {
      red: { x: 78, y: 78 },
      green: { x: 22, y: 78 },
      yellow: { x: 22, y: 22 },
      blue: { x: 78, y: 22 },
    };
    const b = bases[color];
    const ox = (tokenId % 2) * 8 - 4;
    const oy = (tokenId < 2 ? -4 : 4);
    return { x: b.x + ox, y: b.y + oy };
  }

  function tokenPos(color, pos, tokenId) {
    if (pos < 0) return yardXY(color, tokenId);
    if (pos >= 56) return { x: 50, y: 50 };
    if (pos >= MAIN_LEN) return homeXY(color, pos - MAIN_LEN);
    const abs = (START[color] + pos) % 52;
    return trackXY(abs);
  }

  function drawBoard(s) {
    const legal = new Set((s.legalMoves || []).map((m) => m.tokenId));
    const myTurn = s.turnPlayerId === meId;

    let svg = '';
    // yards
    svg += `<rect x="62" y="62" width="34" height="34" rx="4" fill="#fecdd3"/>`;
    svg += `<rect x="4" y="62" width="34" height="34" rx="4" fill="#bbf7d0"/>`;
    svg += `<rect x="4" y="4" width="34" height="34" rx="4" fill="#fef08a"/>`;
    svg += `<rect x="62" y="4" width="34" height="34" rx="4" fill="#bfdbfe"/>`;
    // center
    svg += `<circle cx="50" cy="50" r="8" fill="#111827"/>`;
    svg += `<text x="50" y="52.5" text-anchor="middle" font-size="4" fill="#fff" font-family="Syne,sans-serif" font-weight="700">HOME</text>`;

    // track dots
    for (let i = 0; i < 52; i++) {
      const p = trackXY(i);
      const safe = [0, 8, 13, 21, 26, 34, 39, 47].includes(i);
      svg += `<circle cx="${p.x}" cy="${p.y}" r="${safe ? 2.2 : 1.6}" fill="${safe ? '#86efac' : '#cbd5e1'}" />`;
    }

    // home lanes
    ['red', 'green', 'yellow', 'blue'].forEach((c) => {
      for (let step = 0; step < 5; step++) {
        const p = homeXY(c, step);
        svg += `<circle cx="${p.x}" cy="${p.y}" r="1.8" fill="${COLORS[c]}" opacity="0.45"/>`;
      }
    });

    // tokens
    (s.players || []).forEach((player) => {
      player.tokens.forEach((token) => {
        const p = tokenPos(player.color, token.pos, token.id);
        const isMine = player.id === meId;
        const canMove = myTurn && isMine && legal.has(token.id);
        const cls = canMove ? 'token legal' : 'token';
        svg += `<circle class="${cls}" data-token="${token.id}" data-mine="${isMine ? 1 : 0}" cx="${p.x}" cy="${p.y}" r="3.3" fill="${COLORS[player.color]}" stroke="#111" stroke-width="0.6"/>`;
        svg += `<text x="${p.x}" y="${p.y + 1.1}" text-anchor="middle" font-size="2.6" fill="#fff" font-weight="700" pointer-events="none">${token.id + 1}</text>`;
      });
    });

    els.board.innerHTML = svg;

    els.board.querySelectorAll('.token.legal').forEach((el) => {
      el.addEventListener('click', () => {
        socket.emit('ludo:move', { tokenId: Number(el.dataset.token) });
      });
    });
  }

  function render(s) {
    state = s;
    if (!s) return;

    els.roomPill.hidden = false;
    els.roomPill.textContent = s.code;

    if (s.status === 'lobby') {
      show(els.wait);
      els.waitCode.textContent = s.code;
      els.waitPlayers.innerHTML = s.players
        .map(
          (p) =>
            `<li><span class="dot ${p.color}"></span><span>${escapeHtml(p.name)}${p.id === meId ? ' (you)' : ''}</span></li>`
        )
        .join('');
      isHost = s.hostId === meId;
      window.__ludoHost = isHost;
      els.startBtn.hidden = !isHost;
      els.waitHint.textContent = isHost
        ? s.players.length < 2
          ? 'Need at least 2 players to start'
          : 'Ready when you are'
        : 'Waiting for host to start…';
      els.startBtn.disabled = s.players.length < 2;
      return;
    }

    if (s.status === 'finished') {
      show(els.win);
      els.winTitle.textContent = s.winner
        ? `${s.winner.name} wins!`
        : 'Game over';
      return;
    }

    show(els.game);
    els.diceFace.textContent = s.dice != null ? s.dice : '—';
    els.eventLine.textContent = s.lastEvent || '';
    const myTurn = s.turnPlayerId === meId;
    els.rollBtn.disabled = !(myTurn && !s.rolled);
    els.statusLine.textContent = myTurn
      ? s.rolled
        ? 'Tap a glowing token to move'
        : 'Your turn — roll'
      : `Waiting for ${s.players.find((p) => p.id === s.turnPlayerId)?.name || '…'}`;

    els.turnList.innerHTML = s.players
      .map((p) => {
        const active = p.id === s.turnPlayerId ? 'active' : '';
        const me = p.id === meId ? 'me' : '';
        return `<div class="${active} ${me}"><span class="dot ${p.color}"></span> ${escapeHtml(p.name)}${p.connected === false ? ' (away)' : ''}</div>`;
      })
      .join('');

    drawBoard(s);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  els.createBtn.addEventListener('click', () => {
    err('');
    window.__ludoHost = true;
    socket.emit('ludo:create', { name: saveName() });
  });

  els.joinBtn.addEventListener('click', () => {
    err('');
    window.__ludoHost = false;
    const code = (els.code.value || '').trim().toUpperCase();
    if (!code) return err('Enter a room code');
    socket.emit('ludo:join', { code, name: saveName() });
  });

  els.startBtn.addEventListener('click', () => socket.emit('ludo:start'));
  els.rollBtn.addEventListener('click', () => socket.emit('ludo:roll'));
  els.copyBtn.addEventListener('click', async () => {
    const code = state?.code || els.waitCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
      els.copyBtn.textContent = 'Copied!';
      setTimeout(() => (els.copyBtn.textContent = 'Copy code'), 1200);
    } catch (_) {
      els.copyBtn.textContent = code;
    }
  });

  els.againBtn.addEventListener('click', () => {
    location.reload();
  });

  socket.on('ludo:joined', ({ playerId, code }) => {
    meId = playerId;
    els.roomPill.hidden = false;
    els.roomPill.textContent = code;
  });

  socket.on('ludo:state', render);
  socket.on('ludo:error', ({ error }) => {
    if (!els.lobby.hidden) err(error);
    else els.eventLine.textContent = error || 'Error';
  });

  socket.on('connect_error', () => err('Could not connect — refresh and try again'));
})();
