(function () {
  const SIZE = 8;
  const FRUITS = [
    { id: 0, emoji: '🍓' },
    { id: 1, emoji: '🍋' },
    { id: 2, emoji: '🍇' },
    { id: 3, emoji: '🍉' },
    { id: 4, emoji: '🍊' },
    { id: 5, emoji: '🫐' },
  ];
  const MAX_LIVES = 5;
  const LIFE_MS = 20 * 60 * 1000;

  if ((new URLSearchParams(location.search).get('mode') || '') === 'online') {
    location.replace('/games/fruits/');
    return;
  }

  const params = new URLSearchParams(location.search);
  const startMode = ['campaign', 'daily', 'versus'].includes(params.get('mode'))
    ? params.get('mode')
    : 'campaign';
  const startLevelNum = Math.min(100, Math.max(1, parseInt(params.get('level') || '1', 10) || 1));

  function shapeMask(level) {
    // 1 = playable, 0 = hole
    const mask = Array(SIZE * SIZE).fill(1);
    const kind = level % 5;
    if (kind === 1) {
      // corners missing
      [0, 1, 6, 7, 8, 15, 48, 55, 56, 57, 62, 63].forEach((i) => (mask[i] = 0));
    } else if (kind === 2) {
      // plus cutouts
      for (let i = 0; i < SIZE; i++) {
        if (i < 2 || i > 5) {
          mask[i * SIZE + 0] = 0;
          mask[i * SIZE + 7] = 0;
          mask[0 * SIZE + i] = 0;
          mask[7 * SIZE + i] = 0;
        }
      }
    } else if (kind === 3) {
      // checker holes on edges
      for (let c = 0; c < SIZE; c += 2) {
        mask[c] = 0;
        mask[56 + c] = 0;
      }
    } else if (kind === 4) {
      // diamond-ish: kill far corners more
      [0, 7, 56, 63, 1, 6, 8, 15, 48, 55, 57, 62].forEach((i) => (mask[i] = 0));
    }
    return mask;
  }

  function buildLevels() {
    const levels = [];
    for (let i = 0; i < 100; i++) {
      const t = i / 99;
      levels.push({
        moves: Math.max(12, Math.round(20 - t * 8)),
        goalType: i % FRUITS.length,
        goalNeed: Math.min(40, Math.round(12 + t * 28 + (i % 5))),
        fruitCount: i < 5 ? 5 : 6,
        iceChance: Math.min(0.28, 0.04 + t * 0.22),
        starScores: [800 + i * 55, Math.round((800 + i * 55) * 2), Math.round((800 + i * 55) * 3.2)],
        mask: shapeMask(i),
      });
    }
    return levels;
  }

  const LEVELS = buildLevels();

  const els = {
    play: document.getElementById('playScreen'),
    result: document.getElementById('resultScreen'),
    livesVal: document.getElementById('livesVal'),
    board: document.getElementById('board'),
    fx: document.getElementById('fx'),
    flyLayer: document.getElementById('flyLayer'),
    movesVal: document.getElementById('movesVal'),
    levelChip: document.getElementById('levelChip'),
    goalEmoji: document.getElementById('goalEmoji'),
    goalCount: document.getElementById('goalCount'),
    goalBox: document.getElementById('goalBox'),
    scoreVal: document.getElementById('scoreVal'),
    turnLine: document.getElementById('turnLine'),
    starsBox: document.getElementById('starsBox'),
    hintBar: document.getElementById('hintBar'),
    resultTitle: document.getElementById('resultTitle'),
    resultStars: document.getElementById('resultStars'),
    resultScore: document.getElementById('resultScore'),
    resultExtra: document.getElementById('resultExtra'),
    nextBtn: document.getElementById('nextBtn'),
    retryBtn: document.getElementById('retryBtn'),
    continueLifeBtn: document.getElementById('continueLifeBtn'),
    boostHammer: document.getElementById('boostHammer'),
    boostShuffle: document.getElementById('boostShuffle'),
    boostMoves: document.getElementById('boostMoves'),
  };

  let progress = loadProgress();
  let levelIndex = startLevelNum - 1;
  let mode = startMode;
  let fruitPool = 6;
  let mask = Array(SIZE * SIZE).fill(1);
  let grid = [];
  let moves = 0;
  let score = 0;
  let collected = 0;
  let busy = false;
  let selected = null;
  let combo = 0;
  let advanceOnNext = false;
  let boosterMode = null; // hammer
  let pScores = [0, 0];
  let pTurn = 0;
  let audioCtx = null;

  function defaultProgress() {
    return {
      level: 0,
      stars: {},
      lives: MAX_LIVES,
      lifeAt: Date.now(),
      boosters: { hammer: 3, shuffle: 2, moves: 2 },
      theme: 'meadow',
      daily: {},
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem('fruits_offline_v2') || localStorage.getItem('fruits_offline');
      return raw ? { ...defaultProgress(), ...JSON.parse(raw) } : defaultProgress();
    } catch (_) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem('fruits_offline_v2', JSON.stringify(progress));
    } catch (_) {}
  }

  function refreshLives() {
    let lives = progress.lives ?? MAX_LIVES;
    let lifeAt = progress.lifeAt || Date.now();
    if (lives < MAX_LIVES) {
      const gained = Math.floor((Date.now() - lifeAt) / LIFE_MS);
      if (gained > 0) {
        lives = Math.min(MAX_LIVES, lives + gained);
        lifeAt += gained * LIFE_MS;
        progress.lives = lives;
        progress.lifeAt = lives >= MAX_LIVES ? Date.now() : lifeAt;
        saveProgress();
      }
    }
    els.livesVal.textContent = String(progress.lives);
  }

  function spendLife() {
    refreshLives();
    if (progress.lives <= 0) return false;
    progress.lives -= 1;
    if (progress.lives < MAX_LIVES && !progress.lifeAt) progress.lifeAt = Date.now();
    saveProgress();
    refreshLives();
    return true;
  }

  function show(screen) {
    [els.play, els.result].forEach((s) => {
      if (s) s.hidden = s !== screen;
    });
  }

  function goStages() {
    location.href = './';
  }

  function goPlay(opts) {
    const q = new URLSearchParams();
    q.set('mode', opts.mode || 'campaign');
    if (opts.level != null) q.set('level', String(opts.level));
    location.href = 'play.html?' + q.toString();
  }

  function applyTheme(theme) {
    document.body.className = 'page-play theme-' + (theme || 'meadow');
    progress.theme = theme || 'meadow';
    saveProgress();
  }

  function updateBoostUi() {
    const b = progress.boosters || { hammer: 0, shuffle: 0, moves: 0 };
    const set = (el, n, active) => {
      if (!el) return;
      el.querySelector('span').textContent = String(n || 0);
      el.classList.toggle('active', !!active);
      el.disabled = (n || 0) <= 0 && !active;
      el.style.opacity = el.disabled ? '0.45' : '1';
    };
    set(els.boostHammer, b.hammer, boosterMode === 'hammer');
    set(els.boostShuffle, b.shuffle, false);
    set(els.boostMoves, b.moves, false);
    const boosters = document.getElementById('boosters');
    if (boosters) boosters.hidden = mode === 'versus';
  }

  function beep(freq, dur, type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  function haptic(ms) {
    try {
      navigator.vibrate && navigator.vibrate(ms || 12);
    } catch (_) {}
  }

  function soundMatch(n) {
    beep(420 + n * 40, 0.08, 'triangle');
    haptic(10);
  }

  function soundWin() {
    beep(520, 0.1);
    setTimeout(() => beep(680, 0.12), 90);
    haptic([20, 40, 20]);
  }

  function soundFail() {
    beep(180, 0.18, 'sawtooth');
    haptic(40);
  }

  function randFruit() {
    return Math.floor(Math.random() * fruitPool);
  }

  function playable(i) {
    return mask[i] === 1;
  }

  function cell(r, c) {
    return grid[r * SIZE + c];
  }

  function setCell(r, c, v) {
    grid[r * SIZE + c] = v;
  }

  function createGrid(level) {
    mask = level.mask || Array(SIZE * SIZE).fill(1);
    fruitPool = level.fruitCount;
    grid = new Array(SIZE * SIZE).fill(null);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const i = r * SIZE + c;
        if (!playable(i)) continue;
        let v;
        let guard = 0;
        do {
          v = randFruit();
          guard++;
        } while (
          guard < 40 &&
          ((c >= 2 &&
            playable(i - 1) &&
            playable(i - 2) &&
            cell(r, c - 1)?.type === v &&
            cell(r, c - 2)?.type === v) ||
            (r >= 2 &&
              playable(i - SIZE) &&
              playable(i - 2 * SIZE) &&
              cell(r - 1, c)?.type === v &&
              cell(r - 2, c)?.type === v))
        );
        const ice =
          Math.random() < (level.iceChance || 0) ? (Math.random() < 0.35 ? 2 : 1) : 0;
        setCell(r, c, { type: v, special: null, ice });
      }
    }
  }

  function findMatches() {
    const matched = new Set();
    for (let r = 0; r < SIZE; r++) {
      let run = 1;
      for (let c = 1; c <= SIZE; c++) {
        const i = r * SIZE + c;
        const prev = r * SIZE + (c - 1);
        const same =
          c < SIZE &&
          playable(i) &&
          playable(prev) &&
          grid[i] &&
          grid[prev] &&
          grid[i].type === grid[prev].type;
        if (same) run++;
        else {
          if (run >= 3) for (let k = 0; k < run; k++) matched.add(r * SIZE + (c - 1 - k));
          run = 1;
        }
      }
    }
    for (let c = 0; c < SIZE; c++) {
      let run = 1;
      for (let r = 1; r <= SIZE; r++) {
        const i = r * SIZE + c;
        const prev = (r - 1) * SIZE + c;
        const same =
          r < SIZE &&
          playable(i) &&
          playable(prev) &&
          grid[i] &&
          grid[prev] &&
          grid[i].type === grid[prev].type;
        if (same) run++;
        else {
          if (run >= 3) for (let k = 0; k < run; k++) matched.add((r - 1 - k) * SIZE + c);
          run = 1;
        }
      }
    }
    return matched;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function flashFx(text) {
    els.fx.textContent = text;
    els.fx.classList.remove('show');
    void els.fx.offsetWidth;
    els.fx.classList.add('show');
  }

  function starsFromScore(level, sc) {
    const [a, b, c] = level.starScores;
    if (sc >= c) return 3;
    if (sc >= b) return 2;
    if (sc >= a) return 1;
    return 0;
  }

  function paintStars(n) {
    els.starsBox.querySelectorAll('.star').forEach((el, i) => el.classList.toggle('on', i < n));
  }

  function updateHud(level) {
    els.movesVal.textContent = String(moves);
    if (mode === 'daily') els.levelChip.textContent = 'Daily';
    else if (mode === 'versus') els.levelChip.textContent = '2P';
    else els.levelChip.textContent = 'Lv ' + (levelIndex + 1);
    els.goalEmoji.textContent = FRUITS[level.goalType].emoji;
    els.goalCount.textContent = `${collected}/${level.goalNeed}`;
    els.scoreVal.textContent = String(score);
    paintStars(starsFromScore(level, score));
    if (mode === 'versus') {
      els.turnLine.hidden = false;
      els.turnLine.textContent = `P${pTurn + 1} · ${pScores[0]}–${pScores[1]}`;
    } else {
      els.turnLine.hidden = true;
    }
    updateBoostUi();
  }

  function neighborIndexes(i) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const out = [];
    if (r > 0 && playable(i - SIZE)) out.push(i - SIZE);
    if (r < SIZE - 1 && playable(i + SIZE)) out.push(i + SIZE);
    if (c > 0 && playable(i - 1)) out.push(i - 1);
    if (c < SIZE - 1 && playable(i + 1)) out.push(i + 1);
    return out;
  }

  function paintSelection() {
    const nodes = els.board.querySelectorAll('.cell');
    nodes.forEach((el) => el.classList.remove('selected', 'neighbor', 'pressed'));
    if (selected == null) return;
    nodes[selected]?.classList.add('selected');
    neighborIndexes(selected).forEach((ni) => nodes[ni]?.classList.add('neighbor'));
  }

  function renderBoard(opts) {
    const level = currentLevel();
    const fall = opts?.fall || new Set();
    const popping = opts?.pop || new Set();
    els.board.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.i = String(i);
      if (!playable(i)) {
        div.classList.add('hole');
      } else {
        const item = grid[i];
        if (!item) {
          div.classList.add('empty');
        } else {
          div.textContent = FRUITS[item.type].emoji;
          if (item.special) div.classList.add('special');
          if (item.ice) {
            div.classList.add('ice');
            div.dataset.ice = String(item.ice);
          }
          if (fall.has(i)) div.classList.add('fall');
          if (popping.has(i)) div.classList.add('pop');
        }
      }
      div.addEventListener('pointerdown', () => {
        if (!busy && playable(i) && grid[i]) div.classList.add('pressed');
      });
      div.addEventListener('pointerup', () => div.classList.remove('pressed'));
      div.addEventListener('pointercancel', () => div.classList.remove('pressed'));
      div.addEventListener('click', (e) => {
        e.preventDefault();
        onCellTap(i);
      });
      els.board.appendChild(div);
    }
    paintSelection();
    updateHud(level);
  }

  function currentLevel() {
    if (mode === 'daily') return dailyLevel();
    return LEVELS[levelIndex];
  }

  function dailyLevel() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const idx = seed % 100;
    const base = LEVELS[idx];
    return {
      ...base,
      moves: Math.max(10, base.moves - 1),
      goalNeed: Math.min(42, base.goalNeed + 4),
      iceChance: Math.min(0.32, base.iceChance + 0.06),
      dailyKey: String(seed),
    };
  }

  function neighbors(a, b) {
    return neighborIndexes(a).includes(b);
  }

  function swap(a, b) {
    const t = grid[a];
    grid[a] = grid[b];
    grid[b] = t;
  }

  async function slideSwap(a, b, reverse) {
    const nodes = els.board.querySelectorAll('.cell');
    const elA = nodes[a];
    const elB = nodes[b];
    if (!elA || !elB) return;
    const ra = elA.getBoundingClientRect();
    const rb = elB.getBoundingClientRect();
    const mx = rb.left - ra.left;
    const my = rb.top - ra.top;
    elA.classList.add('sliding');
    elB.classList.add('sliding');
    if (!reverse) {
      elA.style.transform = 'translate(0,0)';
      elB.style.transform = 'translate(0,0)';
      void elA.offsetWidth;
      elA.style.transform = `translate(${mx}px,${my}px) scale(1.08)`;
      elB.style.transform = `translate(${-mx}px,${-my}px) scale(1.08)`;
      await sleep(240);
    } else {
      elA.style.transform = `translate(${mx}px,${my}px) scale(1.08)`;
      elB.style.transform = `translate(${-mx}px,${-my}px) scale(1.08)`;
      void elA.offsetWidth;
      elA.style.transform = 'translate(0,0)';
      elB.style.transform = 'translate(0,0)';
      await sleep(240);
      elA.classList.remove('sliding');
      elB.classList.remove('sliding');
      elA.style.transform = '';
      elB.style.transform = '';
    }
  }

  function flyToGoal(fromIndex, emoji) {
    const node = els.board.querySelectorAll('.cell')[fromIndex];
    const goal = els.goalBox;
    if (!node || !goal || !els.flyLayer) return;
    const a = node.getBoundingClientRect();
    const b = goal.getBoundingClientRect();
    const layer = els.flyLayer.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'fly-fruit';
    span.textContent = emoji;
    span.style.left = a.left + a.width / 2 - layer.left + 'px';
    span.style.top = a.top + a.height / 2 - layer.top + 'px';
    els.flyLayer.appendChild(span);
    requestAnimationFrame(() => {
      span.style.left = b.left + b.width / 2 - layer.left + 'px';
      span.style.top = b.top + b.height / 2 - layer.top + 'px';
      span.style.transform = 'scale(0.4)';
      span.style.opacity = '0';
    });
    setTimeout(() => span.remove(), 450);
  }

  async function clearAndDrop(matched) {
    const level = currentLevel();
    const stillIce = new Set();
    const clearSet = new Set();

    matched.forEach((i) => {
      const item = grid[i];
      if (!item) return;
      if (item.ice && item.ice > 0) {
        item.ice -= 1;
        stillIce.add(i);
        haptic(8);
      } else {
        clearSet.add(i);
      }
    });

    renderBoard({ pop: clearSet });
    clearSet.forEach((i) => {
      const item = grid[i];
      if (item && item.type === level.goalType) {
        collected++;
        flyToGoal(i, FRUITS[item.type].emoji);
      }
    });

    const gained = clearSet.size * (35 + Math.floor(levelIndex / 5)) * Math.max(1, combo);
    score += gained;
    if (mode === 'versus') pScores[pTurn] += gained;
    soundMatch(combo);
    if (combo >= 3) flashFx('SUPER x' + combo);
    else if (combo === 2) flashFx('COMBO!');
    else if (clearSet.size >= 5) flashFx('MEGA!');

    await sleep(260);

    let specialSpot = null;
    let specialKind = null;
    if (clearSet.size >= 5) {
      specialSpot = [...clearSet][Math.floor(clearSet.size / 2)];
      specialKind = 'bomb';
    } else if (clearSet.size === 4) {
      specialSpot = [...clearSet][0];
      specialKind = 'line';
    }

    clearSet.forEach((i) => {
      grid[i] = null;
    });
    if (specialSpot != null && playable(specialSpot)) {
      grid[specialSpot] = { type: randFruit(), special: specialKind, ice: 0 };
    }

    const fell = new Set();
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) {
        const i = r * SIZE + c;
        if (!playable(i)) continue;
        if (grid[i]) col.push(grid[i]);
        grid[i] = null;
      }
      for (let r = SIZE - 1; r >= 0; r--) {
        const i = r * SIZE + c;
        if (!playable(i)) continue;
        if (col.length) {
          grid[i] = col.pop();
          fell.add(i);
        }
      }
      for (let r = SIZE - 1; r >= 0; r--) {
        const i = r * SIZE + c;
        if (!playable(i) || grid[i]) continue;
        grid[i] = { type: randFruit(), special: null, ice: 0 };
        fell.add(i);
      }
    }

    renderBoard({ fall: fell });
    await sleep(280);
  }

  async function resolveBoard() {
    combo = 0;
    while (true) {
      let matched = findMatches();
      if (matched.size) {
        const extra = new Set(matched);
        matched.forEach((i) => {
          const item = grid[i];
          if (!item || !item.special) return;
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          if (item.special === 'line') {
            for (let cc = 0; cc < SIZE; cc++) if (playable(r * SIZE + cc)) extra.add(r * SIZE + cc);
            for (let rr = 0; rr < SIZE; rr++) if (playable(rr * SIZE + c)) extra.add(rr * SIZE + c);
          }
          if (item.special === 'bomb') {
            for (let rr = r - 1; rr <= r + 1; rr++) {
              for (let cc = c - 1; cc <= c + 1; cc++) {
                const j = rr * SIZE + cc;
                if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && playable(j)) extra.add(j);
              }
            }
          }
        });
        matched = extra;
      }
      if (!matched.size) break;
      combo++;
      await clearAndDrop(matched);
    }
  }

  async function onCellTap(i) {
    if (busy || !playable(i) || !grid[i]) return;
    const level = currentLevel();

    if (boosterMode === 'hammer') {
      busy = true;
      const item = grid[i];
      if (item.type === level.goalType) {
        collected++;
        flyToGoal(i, FRUITS[item.type].emoji);
      }
      grid[i] = null;
      progress.boosters.hammer = Math.max(0, (progress.boosters.hammer || 0) - 1);
      boosterMode = null;
      saveProgress();
      beep(300, 0.07);
      haptic(15);
      await resolveBoard();
      renderBoard();
      if (mode !== 'versus' && collected >= level.goalNeed) return finish(true);
      busy = false;
      els.hintBar.textContent = 'Tap a fruit to pick it up';
      return;
    }

    if (selected == null) {
      selected = i;
      paintSelection();
      els.hintBar.textContent = 'Selected — tap a neighbor';
      beep(500, 0.04);
      return;
    }
    if (selected === i) {
      selected = null;
      paintSelection();
      return;
    }
    if (!neighbors(selected, i)) {
      selected = i;
      paintSelection();
      return;
    }

    const a = selected;
    const b = i;
    selected = null;
    busy = true;
    paintSelection();
    await slideSwap(a, b, false);
    swap(a, b);
    if (!findMatches().size) {
      swap(a, b);
      await slideSwap(a, b, true);
      els.hintBar.textContent = 'No match — bounced back';
      beep(160, 0.08, 'square');
      busy = false;
      return;
    }

    moves--;
    els.hintBar.textContent = 'Great!';
    await resolveBoard();
    updateHud(level);

    if (mode === 'versus') pTurn = 1 - pTurn;

    // Versus is score-only — don't end early on collect goal
    if (mode !== 'versus' && collected >= level.goalNeed) return finish(true);
    if (moves <= 0) return finish(mode === 'versus' ? true : false);
    els.hintBar.textContent = 'Tap a fruit to pick it up';
    busy = false;
  }

  async function finish(won) {
    busy = true;
    const level = currentLevel();
    const stars = starsFromScore(level, score);
    els.continueLifeBtn.hidden = true;
    advanceOnNext = false;
    // Track whether this result already spent a life (avoid double charge on retry)
    finish._spentLife = false;

    if (mode === 'versus') {
      const winner =
        pScores[0] === pScores[1] ? 'Draw!' : pScores[0] > pScores[1] ? 'Player 1 wins!' : 'Player 2 wins!';
      els.resultTitle.textContent = winner;
      els.resultStars.textContent = '⚔️';
      els.resultScore.textContent = `P1 ${pScores[0]} · P2 ${pScores[1]}`;
      els.resultExtra.textContent = 'Pass & play complete';
      els.nextBtn.textContent = 'Play again';
      soundWin();
      show(els.result);
      busy = false;
      return;
    }

    if (won) {
      soundWin();
      if (mode === 'campaign') {
        progress.stars[levelIndex] = Math.max(progress.stars[levelIndex] || 0, stars);
        progress.level = Math.max(progress.level || 0, Math.min(99, levelIndex + 1));
        progress.boosters.hammer = (progress.boosters.hammer || 0) + (stars >= 2 ? 1 : 0);
        progress.boosters.shuffle = (progress.boosters.shuffle || 0) + (stars >= 3 ? 1 : 0);
        progress.boosters.moves = (progress.boosters.moves || 0) + 1;
        advanceOnNext = levelIndex < 99;
        saveProgress();
        els.resultTitle.textContent = levelIndex >= 99 ? 'All 100 cleared!' : 'Level clear!';
        els.resultExtra.textContent = stars === 3 ? 'Perfect! Boosters earned' : 'Boosters topped up';
        els.nextBtn.textContent = levelIndex >= 99 ? 'Stages' : 'Next level';
      } else {
        const key = level.dailyKey;
        progress.daily[key] = Math.max(progress.daily[key] || 0, score);
        saveProgress();
        els.resultTitle.textContent = 'Daily cleared!';
        els.resultExtra.textContent = 'Come back tomorrow for a new board';
        els.nextBtn.textContent = 'Stages';
      }
      const shown = Math.max(0, Math.min(3, stars));
      els.resultStars.textContent = '★'.repeat(shown) + '☆'.repeat(3 - shown);
    } else {
      soundFail();
      if (mode === 'campaign' || mode === 'daily') {
        spendLife();
        finish._spentLife = true;
      }
      els.resultTitle.textContent = 'Out of moves';
      els.resultExtra.textContent = progress.lives > 0 ? 'Retry free, or continue (−1 ♥ for +5 moves)' : 'Lives empty — wait to refill';
      els.resultStars.textContent = '💔';
      els.nextBtn.textContent = 'Stages';
      if (progress.lives > 0) els.continueLifeBtn.hidden = false;
      advanceOnNext = false;
    }

    els.resultScore.textContent = `Score ${score}`;
    show(els.result);
    busy = false;
  }

  function startLevel() {
    const level = currentLevel();
    createGrid(level);
    moves = level.moves;
    score = 0;
    collected = 0;
    selected = null;
    combo = 0;
    busy = false;
    boosterMode = null;
    pScores = [0, 0];
    pTurn = 0;
    els.hintBar.textContent =
      mode === 'versus'
        ? 'Pass & play — highest score wins'
        : `Collect ${level.goalNeed} ${FRUITS[level.goalType].emoji}`;
    renderBoard();
    updateBoostUi();
    show(els.play);
    beep(440, 0.05);
  }

  async function useBooster(type) {
    if (busy || mode === 'versus') return;
    const b = progress.boosters || {};
    if (type === 'hammer') {
      if ((b.hammer || 0) <= 0) return;
      boosterMode = boosterMode === 'hammer' ? null : 'hammer';
      els.hintBar.textContent = boosterMode ? 'Hammer: tap a fruit to smash' : 'Tap a fruit';
      updateBoostUi();
      return;
    }
    if (type === 'shuffle') {
      if ((b.shuffle || 0) <= 0) return;
      const items = [];
      for (let i = 0; i < SIZE * SIZE; i++) if (playable(i) && grid[i]) items.push(grid[i]);
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = items[i];
        items[i] = items[j];
        items[j] = t;
      }
      let k = 0;
      for (let i = 0; i < SIZE * SIZE; i++) if (playable(i) && grid[i]) grid[i] = items[k++];
      progress.boosters.shuffle -= 1;
      saveProgress();
      renderBoard();
      flashFx('SHUFFLE');
      beep(360, 0.1);
      updateBoostUi();
      busy = true;
      await resolveBoard();
      busy = false;
      return;
    }
    if (type === 'moves') {
      if ((b.moves || 0) <= 0) return;
      moves += 5;
      progress.boosters.moves -= 1;
      saveProgress();
      updateHud(currentLevel());
      flashFx('+5 MOVES');
      beep(600, 0.08);
      updateBoostUi();
    }
  }

  // —— UI wiring ——
  els.retryBtn.addEventListener('click', () => {
    if ((mode === 'campaign' || mode === 'daily') && progress.lives <= 0) {
      goStages();
      return;
    }
    startLevel();
  });
  els.continueLifeBtn.addEventListener('click', () => {
    if (!spendLife()) return;
    moves += 5;
    busy = false;
    els.hintBar.textContent = '+5 moves — keep going!';
    updateHud(currentLevel());
    show(els.play);
  });
  els.nextBtn.addEventListener('click', () => {
    if (mode === 'versus') {
      startLevel();
      return;
    }
    if (mode === 'daily') {
      goStages();
      return;
    }
    if (advanceOnNext) {
      const next = Math.min(99, levelIndex + 1);
      advanceOnNext = false;
      goPlay({ mode: 'campaign', level: next + 1 });
      return;
    }
    goStages();
  });

  els.boostHammer.addEventListener('click', () => useBooster('hammer'));
  els.boostShuffle.addEventListener('click', () => useBooster('shuffle'));
  els.boostMoves.addEventListener('click', () => useBooster('moves'));

  // swipe
  let touchStart = null;
  els.board.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY)?.closest?.('.cell');
      if (!el || el.classList.contains('hole') || el.classList.contains('empty')) return;
      touchStart = { i: Number(el.dataset.i), x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );
  els.board.addEventListener(
    'touchend',
    (e) => {
      if (!touchStart || busy) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
        touchStart = null;
        return;
      }
      const i = touchStart.i;
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      let j = i;
      if (Math.abs(dx) > Math.abs(dy)) {
        const nc = c + (dx > 0 ? 1 : -1);
        if (nc >= 0 && nc < SIZE) j = r * SIZE + nc;
      } else {
        const nr = r + (dy > 0 ? 1 : -1);
        if (nr >= 0 && nr < SIZE) j = nr * SIZE + c;
      }
      touchStart = null;
      if (j !== i && playable(j)) {
        selected = i;
        onCellTap(j);
      }
    },
    { passive: true }
  );

  if (mode === 'campaign' && levelIndex > (progress.level || 0)) {
    goStages();
    return;
  }

  applyTheme(progress.theme || 'meadow');
  refreshLives();
  startLevel();
})();
