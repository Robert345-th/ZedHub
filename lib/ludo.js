'use strict';

const COLORS = ['red', 'green', 'yellow', 'blue'];
const START = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const MAIN_LEN = 51; // steps 0..50 on main track, then home
const HOME_LEN = 5; // 51..55 home stretch, 56 = finished

function makeTokens() {
  return [0, 1, 2, 3].map((id) => ({ id, pos: -1 })); // -1 = yard
}

function createRoom(code, hostId, hostName) {
  return {
    code,
    hostId,
    status: 'lobby', // lobby | playing | finished
    players: [
      {
        id: hostId,
        name: cleanName(hostName),
        color: COLORS[0],
        tokens: makeTokens(),
        connected: true,
      },
    ],
    turn: 0,
    dice: null,
    rolled: false,
    winner: null,
    lastEvent: 'Room created',
    createdAt: Date.now(),
  };
}

function cleanName(name) {
  const n = String(name || 'Player')
    .trim()
    .slice(0, 16);
  return n || 'Player';
}

function publicState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      tokens: p.tokens,
      connected: p.connected,
    })),
    turn: room.turn,
    turnColor: room.players[room.turn]?.color || null,
    turnPlayerId: room.players[room.turn]?.id || null,
    dice: room.dice,
    rolled: room.rolled,
    winner: room.winner,
    lastEvent: room.lastEvent,
    legalMoves: room.status === 'playing' ? legalMoves(room) : [],
  };
}

function absolutePos(color, pos) {
  if (pos < 0 || pos >= MAIN_LEN) return null;
  return (START[color] + pos) % 52;
}

function isFinished(player) {
  return player.tokens.every((t) => t.pos === 56);
}

function legalMoves(room) {
  if (!room.rolled || room.dice == null) return [];
  const player = room.players[room.turn];
  if (!player) return [];
  const roll = room.dice;
  const moves = [];

  for (const token of player.tokens) {
    if (token.pos === 56) continue;

    if (token.pos === -1) {
      if (roll === 6) moves.push({ tokenId: token.id });
      continue;
    }

    const next = token.pos + roll;
    if (next > 56) continue; // must land exactly on finish
    moves.push({ tokenId: token.id });
  }
  return moves;
}

function nextTurn(room) {
  const n = room.players.length;
  for (let i = 0; i < n; i++) {
    room.turn = (room.turn + 1) % n;
    if (room.players[room.turn].connected !== false) break;
  }
  room.dice = null;
  room.rolled = false;
}

function applyMove(room, playerId, tokenId) {
  if (room.status !== 'playing') return { ok: false, error: 'Game not started' };
  const player = room.players[room.turn];
  if (!player || player.id !== playerId) return { ok: false, error: 'Not your turn' };
  if (!room.rolled || room.dice == null) return { ok: false, error: 'Roll first' };

  const legal = legalMoves(room);
  if (!legal.some((m) => m.tokenId === tokenId)) {
    return { ok: false, error: 'Illegal move' };
  }

  const token = player.tokens.find((t) => t.id === tokenId);
  const roll = room.dice;
  const gotSix = roll === 6;
  let captured = false;

  if (token.pos === -1) {
    token.pos = 0;
    room.lastEvent = `${player.name} entered the board`;
  } else {
    token.pos += roll;
    if (token.pos === 56) {
      room.lastEvent = `${player.name} got a token home!`;
    } else if (token.pos >= MAIN_LEN) {
      room.lastEvent = `${player.name} moved into home stretch`;
    } else {
      // capture check on main track
      const abs = absolutePos(player.color, token.pos);
      if (abs != null && !SAFE.has(abs)) {
        for (const other of room.players) {
          if (other.id === player.id) continue;
          for (const ot of other.tokens) {
            if (ot.pos < 0 || ot.pos >= MAIN_LEN) continue;
            if (absolutePos(other.color, ot.pos) === abs) {
              ot.pos = -1;
              captured = true;
              room.lastEvent = `${player.name} captured ${other.name}!`;
            }
          }
        }
      }
      if (!captured && token.pos < MAIN_LEN) {
        room.lastEvent = `${player.name} moved ${roll}`;
      }
    }
  }

  if (isFinished(player)) {
    room.status = 'finished';
    room.winner = { id: player.id, name: player.name, color: player.color };
    room.lastEvent = `${player.name} wins!`;
    room.rolled = false;
    return { ok: true };
  }

  // Extra turn on 6 or capture
  if (gotSix || captured) {
    room.dice = null;
    room.rolled = false;
    room.lastEvent += ' — roll again';
  } else {
    nextTurn(room);
  }

  return { ok: true };
}

function rollDice(room, playerId) {
  if (room.status !== 'playing') return { ok: false, error: 'Game not started' };
  const player = room.players[room.turn];
  if (!player || player.id !== playerId) return { ok: false, error: 'Not your turn' };
  if (room.rolled) return { ok: false, error: 'Already rolled' };

  const value = 1 + Math.floor(Math.random() * 6);
  room.dice = value;
  room.rolled = true;
  room.lastEvent = `${player.name} rolled ${value}`;

  const moves = legalMoves(room);
  if (moves.length === 0) {
    // No moves — pass (unless 6, still pass if nothing to do)
    room.lastEvent += ' — no moves';
    if (value === 6) {
      // Classic: if 6 but no move, still end? Usually rare. Pass turn.
      nextTurn(room);
    } else {
      nextTurn(room);
    }
  }

  return { ok: true, value };
}

function startGame(room, playerId) {
  if (room.hostId !== playerId) return { ok: false, error: 'Only host can start' };
  if (room.players.length < 2) return { ok: false, error: 'Need at least 2 players' };
  if (room.status !== 'lobby') return { ok: false, error: 'Already started' };

  room.status = 'playing';
  room.turn = 0;
  room.dice = null;
  room.rolled = false;
  room.winner = null;
  room.players.forEach((p, i) => {
    p.color = COLORS[i % COLORS.length];
    p.tokens = makeTokens();
  });
  room.lastEvent = 'Game started — ' + room.players[0].name + ' rolls first';
  return { ok: true };
}

function addPlayer(room, id, name) {
  if (room.status !== 'lobby') return { ok: false, error: 'Game already started' };
  if (room.players.length >= 4) return { ok: false, error: 'Room full (4 players)' };
  if (room.players.some((p) => p.id === id)) return { ok: true };

  room.players.push({
    id,
    name: cleanName(name),
    color: COLORS[room.players.length % COLORS.length],
    tokens: makeTokens(),
    connected: true,
  });
  room.lastEvent = `${cleanName(name)} joined`;
  return { ok: true };
}

module.exports = {
  COLORS,
  START,
  SAFE,
  MAIN_LEN,
  createRoom,
  publicState,
  rollDice,
  applyMove,
  startGame,
  addPlayer,
  absolutePos,
  legalMoves,
  cleanName,
};
