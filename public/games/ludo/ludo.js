(function () {
  const START = window.LudoEngine.START;
  const MAIN_LEN = window.LudoEngine.MAIN_LEN;
  const Board = window.LudoBoard;

  const params = new URLSearchParams(location.search);
  const mode = (params.get('mode') || 'online').toLowerCase();
  const isOffline = mode === 'offline';

  const els = {
    lobby: document.getElementById('lobbyScreen'),
    offlineSetup: document.getElementById('offlineSetup'),
    wait: document.getElementById('waitScreen'),
    game: document.getElementById('gameScreen'),
    win: document.getElementById('winScreen'),
    name: document.getElementById('nameInput'),
    offlineName: document.getElementById('offlineName'),
    botCount: document.getElementById('botCount'),
    code: document.getElementById('codeInput'),
    lobbyErr: document.getElementById('lobbyErr'),
    createBtn: document.getElementById('createBtn'),
    joinBtn: document.getElementById('joinBtn'),
    offlineStart: document.getElementById('offlineStart'),
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
    if (saved) {
      if (els.name) els.name.value = saved;
      if (els.offlineName) els.offlineName.value = saved;
    }
  } catch (_) {}

  let meId = isOffline ? 'you' : null;
  let state = null;
  let offlineRoom = null;
  let socket = null;
  let botTimer = null;

  function show(screen) {
    [els.lobby, els.offlineSetup, els.wait, els.game, els.win].forEach((s) => {
      if (s) s.hidden = s !== screen;
    });
  }

  function err(msg) {
    els.lobbyErr.hidden = !msg;
    els.lobbyErr.textContent = msg || '';
  }

  function saveName(fromEl) {
    const n = ((fromEl && fromEl.value) || '').trim();
    try {
      if (n) localStorage.setItem('ludo_name', n);
    } catch (_) {}
    return n || 'Player';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function drawBoard(s) {
    const legal = new Set((s.legalMoves || []).map((m) => m.tokenId));
    const myTurn = s.turnPlayerId === meId;

    let svg = Board.drawStaticBoard();

    (s.players || []).forEach((player) => {
      player.tokens.forEach((token) => {
        if (token.pos === 56) return; // finished — in center triangle
        const p = Board.tokenXY(player.color, token.pos, token.id);
        const isMine = player.id === meId;
        const canMove = myTurn && isMine && legal.has(token.id);
        svg += Board.pawn(p.x, p.y, player.color, canMove, token.id);
      });
    });

    // finished tokens stacked in center slightly offset
    (s.players || []).forEach((player) => {
      const done = player.tokens.filter((t) => t.pos === 56);
      done.forEach((token, i) => {
        const ox = (i % 2) * 0.35 - 0.15;
        const oy = (i < 2 ? -0.2 : 0.25);
        svg += Board.pawn(7.5 + ox, 7.5 + oy, player.color, false, token.id);
      });
    });

    els.board.innerHTML = svg;
    els.board.querySelectorAll('.token.legal').forEach((el) => {
      el.addEventListener('click', () => {
        if (isOffline) offlineMove(Number(el.dataset.token));
        else socket.emit('ludo:move', { tokenId: Number(el.dataset.token) });
      });
    });
  }

  function render(s) {
    state = s;
    if (!s) return;

    els.roomPill.hidden = false;
    els.roomPill.textContent = isOffline ? 'OFFLINE' : s.code;

    if (s.status === 'lobby') {
      show(els.wait);
      els.waitCode.textContent = s.code;
      els.waitPlayers.innerHTML = s.players
        .map((p) => {
          const color = Board.FILL[p.color] || '#fff';
          return `<li><span class="dot" style="background:${color}"></span><span>${escapeHtml(p.name)}${p.id === meId ? ' (you)' : ''}</span></li>`;
        })
        .join('');
      const isHost = s.hostId === meId;
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
      els.winTitle.textContent = s.winner ? `${s.winner.name} wins!` : 'Game over';
      return;
    }

    show(els.game);
    els.diceFace.innerHTML = Board.dicePips(s.dice);
    if (s.dice) els.diceFace.classList.add('rolled');
    else els.diceFace.classList.remove('rolled');
    els.eventLine.textContent = s.lastEvent || '';
    const myTurn = s.turnPlayerId === meId;
    els.rollBtn.disabled = !(myTurn && !s.rolled);
    els.statusLine.textContent = myTurn
      ? s.rolled
        ? 'Tap a glowing piece to move'
        : 'Your turn — roll the dice'
      : `Waiting for ${s.players.find((p) => p.id === s.turnPlayerId)?.name || '…'}`;

    els.turnList.innerHTML = s.players
      .map((p) => {
        const active = p.id === s.turnPlayerId ? 'active' : '';
        const me = p.id === meId ? 'me' : '';
        const color = Board.FILL[p.color] || '#fff';
        return `<div class="${active} ${me}"><span class="dot" style="background:${color}"></span> ${escapeHtml(p.name)}${p.bot ? ' · bot' : ''}${p.connected === false ? ' (away)' : ''}</div>`;
      })
      .join('');

    drawBoard(s);
    if (isOffline) scheduleBot();
  }

  function publishOffline() {
    render(window.LudoEngine.publicState(offlineRoom));
  }

  function scheduleBot() {
    clearTimeout(botTimer);
    if (!offlineRoom || offlineRoom.status !== 'playing') return;
    const current = offlineRoom.players[offlineRoom.turn];
    if (!current || !current.bot) return;

    botTimer = setTimeout(() => {
      if (!offlineRoom.rolled) {
        window.LudoEngine.rollDice(offlineRoom, current.id);
        publishOffline();
        return;
      }
      const tokenId = window.LudoEngine.pickBotMove(offlineRoom);
      if (tokenId != null) window.LudoEngine.applyMove(offlineRoom, current.id, tokenId);
      publishOffline();
    }, 700);
  }

  function offlineMove(tokenId) {
    if (!offlineRoom) return;
    const result = window.LudoEngine.applyMove(offlineRoom, meId, tokenId);
    if (!result.ok) {
      els.eventLine.textContent = result.error;
      return;
    }
    publishOffline();
  }

  function startOffline() {
    const name = saveName(els.offlineName);
    const bots = Number(els.botCount.value || 3);
    offlineRoom = window.LudoEngine.createOfflineGame(name, bots);
    meId = 'you';
    publishOffline();
  }

  // —— mode bootstrap ——
  if (isOffline) {
    show(els.offlineSetup);
    els.offlineStart.addEventListener('click', startOffline);
    els.againBtn.addEventListener('click', () => {
      location.href = '/games/ludo/?mode=offline';
    });
    els.rollBtn.addEventListener('click', () => {
      if (!offlineRoom) return;
      const result = window.LudoEngine.rollDice(offlineRoom, meId);
      if (!result.ok) els.eventLine.textContent = result.error;
      publishOffline();
    });
    return;
  }

  // Online
  show(els.lobby);
  socket = io({ transports: ['websocket', 'polling'] });

  els.createBtn.addEventListener('click', () => {
    err('');
    socket.emit('ludo:create', { name: saveName(els.name) });
  });

  els.joinBtn.addEventListener('click', () => {
    err('');
    const code = (els.code.value || '').trim().toUpperCase();
    if (!code) return err('Enter a room code');
    socket.emit('ludo:join', { code, name: saveName(els.name) });
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
    location.href = '/games/ludo/?mode=online';
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
