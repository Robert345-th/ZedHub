'use strict';

(function (global) {
  const COLORS = ['red', 'green', 'yellow', 'blue'];
  const START = { red: 0, green: 13, yellow: 26, blue: 39 };
  const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const MAIN_LEN = 51;

  function makeTokens() {
    return [0, 1, 2, 3].map((id) => ({ id, pos: -1 }));
  }

  function cleanName(name) {
    const n = String(name || 'Player').trim().slice(0, 16);
    return n || 'Player';
  }

  function createOfflineGame(playerName, botCount) {
    const bots = Math.min(3, Math.max(1, botCount || 3));
    const players = [
      {
        id: 'you',
        name: cleanName(playerName),
        color: COLORS[0],
        tokens: makeTokens(),
        connected: true,
        bot: false,
      },
    ];
    for (let i = 0; i < bots; i++) {
      players.push({
        id: 'bot' + (i + 1),
        name: 'Bot ' + (i + 1),
        color: COLORS[i + 1],
        tokens: makeTokens(),
        connected: true,
        bot: true,
      });
    }
    return {
      code: 'OFFLINE',
      hostId: 'you',
      status: 'playing',
      players,
      turn: 0,
      dice: null,
      rolled: false,
      winner: null,
      lastEvent: 'Offline game started — you roll first',
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
      if (token.pos + roll <= 56) moves.push({ tokenId: token.id });
    }
    return moves;
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
        tokens: p.tokens.map((t) => ({ ...t })),
        connected: p.connected,
        bot: !!p.bot,
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

  function nextTurn(room) {
    const n = room.players.length;
    room.turn = (room.turn + 1) % n;
    room.dice = null;
    room.rolled = false;
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

    if (legalMoves(room).length === 0) {
      room.lastEvent += ' — no moves';
      nextTurn(room);
    }
    return { ok: true, value };
  }

  function applyMove(room, playerId, tokenId) {
    if (room.status !== 'playing') return { ok: false, error: 'Game not started' };
    const player = room.players[room.turn];
    if (!player || player.id !== playerId) return { ok: false, error: 'Not your turn' };
    if (!room.rolled || room.dice == null) return { ok: false, error: 'Roll first' };
    if (!legalMoves(room).some((m) => m.tokenId === tokenId)) {
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

    if (gotSix || captured) {
      room.dice = null;
      room.rolled = false;
      room.lastEvent += ' — roll again';
    } else {
      nextTurn(room);
    }
    return { ok: true };
  }

  /** Simple bot: prefer capture / enter / advance farthest */
  function pickBotMove(room) {
    const moves = legalMoves(room);
    if (!moves.length) return null;
    const player = room.players[room.turn];
    let best = moves[0];
    let score = -1;
    for (const m of moves) {
      const token = player.tokens.find((t) => t.id === m.tokenId);
      let s = token.pos;
      if (token.pos === -1) s = 100;
      if (token.pos >= MAIN_LEN) s = 200 + token.pos;
      if (s > score) {
        score = s;
        best = m;
      }
    }
    return best.tokenId;
  }

  global.LudoEngine = {
    START,
    MAIN_LEN,
    createOfflineGame,
    publicState,
    rollDice,
    applyMove,
    legalMoves,
    pickBotMove,
  };
})(typeof window !== 'undefined' ? window : global);
