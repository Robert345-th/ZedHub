(function () {
  const SIZE = 8;
  const FRUITS = [
    { id: 0, emoji: '🍓', name: 'strawberry' },
    { id: 1, emoji: '🍋', name: 'lemon' },
    { id: 2, emoji: '🍇', name: 'grape' },
    { id: 3, emoji: '🍉', name: 'melon' },
    { id: 4, emoji: '🍊', name: 'orange' },
    { id: 5, emoji: '🫐', name: 'berry' },
  ];

  const LEVELS = [
    { moves: 22, goalType: 0, goalNeed: 12, starScores: [800, 1600, 2600] },
    { moves: 20, goalType: 1, goalNeed: 14, starScores: [900, 1800, 2800] },
    { moves: 20, goalType: 2, goalNeed: 16, starScores: [1000, 2000, 3200] },
    { moves: 18, goalType: 3, goalNeed: 16, starScores: [1100, 2200, 3400] },
    { moves: 18, goalType: 4, goalNeed: 18, starScores: [1200, 2400, 3600] },
    { moves: 16, goalType: 5, goalNeed: 18, starScores: [1300, 2600, 3800] },
    { moves: 16, goalType: 0, goalNeed: 22, starScores: [1500, 3000, 4500] },
    { moves: 15, goalType: 2, goalNeed: 24, starScores: [1600, 3200, 4800] },
    { moves: 14, goalType: 1, goalNeed: 24, starScores: [1700, 3400, 5000] },
    { moves: 14, goalType: 3, goalNeed: 26, starScores: [1800, 3600, 5400] },
  ];

  const params = new URLSearchParams(location.search);
  const mode = (params.get('mode') || 'offline').toLowerCase();
  const isOnline = mode === 'online';

  const els = {
    menu: document.getElementById('menuScreen'),
    play: document.getElementById('playScreen'),
    result: document.getElementById('resultScreen'),
    modePill: document.getElementById('modePill'),
    menuLead: document.getElementById('menuLead'),
    progressMeta: document.getElementById('progressMeta'),
    playBtn: document.getElementById('playBtn'),
    board: document.getElementById('board'),
    fx: document.getElementById('fx'),
    movesVal: document.getElementById('movesVal'),
    levelChip: document.getElementById('levelChip'),
    levelVal: document.getElementById('levelVal'),
    goalEmoji: document.getElementById('goalEmoji'),
    goalCount: document.getElementById('goalCount'),
    scoreVal: document.getElementById('scoreVal'),
    starsBox: document.getElementById('starsBox'),
    hintBar: document.getElementById('hintBar'),
    resultTitle: document.getElementById('resultTitle'),
    resultStars: document.getElementById('resultStars'),
    resultScore: document.getElementById('resultScore'),
    resultExtra: document.getElementById('resultExtra'),
    nextBtn: document.getElementById('nextBtn'),
    retryBtn: document.getElementById('retryBtn'),
  };

  els.modePill.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
  if (isOnline) {
    els.menuLead.textContent =
      'Daily challenge — same board for everyone today. Beat your best score and climb higher tomorrow.';
  }

  let rng = Math.random;
  let levelIndex = 0;
  let grid = [];
  let moves = 0;
  let score = 0;
  let collected = 0;
  let busy = false;
  let selected = null;
  let combo = 0;

  function show(screen) {
    [els.menu, els.play, els.result].forEach((s) => {
      s.hidden = s !== screen;
    });
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todaySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(isOnline ? 'zedfruits_daily' : 'zedfruits_prog');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress(data) {
    try {
      localStorage.setItem(isOnline ? 'zedfruits_daily' : 'zedfruits_prog', JSON.stringify(data));
    } catch (_) {}
  }

  function updateMenuMeta() {
    const p = loadProgress();
    if (isOnline) {
      const best = p[todaySeed()]?.best || 0;
      els.progressMeta.textContent = best
        ? `Today’s best: ${best}`
        : 'No score yet today — be the first on your phone.';
      levelIndex = todaySeed() % LEVELS.length;
    } else {
      levelIndex = Math.min(p.level || 0, LEVELS.length - 1);
      els.progressMeta.textContent = `Campaign level ${levelIndex + 1} of ${LEVELS.length}`;
    }
  }

  function randFruit() {
    return Math.floor(rng() * FRUITS.length);
  }

  function cell(r, c) {
    return grid[r * SIZE + c];
  }

  function setCell(r, c, v) {
    grid[r * SIZE + c] = v;
  }

  function createGridNoMatches() {
    grid = new Array(SIZE * SIZE).fill(0);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let v;
        do {
          v = randFruit();
        } while (
          (c >= 2 && cell(r, c - 1) === v && cell(r, c - 2) === v) ||
          (r >= 2 && cell(r - 1, c) === v && cell(r - 2, c) === v)
        );
        setCell(r, c, { type: v, special: null });
      }
    }
  }

  function findMatches() {
    const matched = new Set();
    // horizontal
    for (let r = 0; r < SIZE; r++) {
      let run = 1;
      for (let c = 1; c <= SIZE; c++) {
        const same =
          c < SIZE &&
          cell(r, c) &&
          cell(r, c - 1) &&
          cell(r, c).type === cell(r, c - 1).type;
        if (same) run++;
        else {
          if (run >= 3) {
            for (let k = 0; k < run; k++) matched.add(r * SIZE + (c - 1 - k));
          }
          run = 1;
        }
      }
    }
    // vertical
    for (let c = 0; c < SIZE; c++) {
      let run = 1;
      for (let r = 1; r <= SIZE; r++) {
        const same =
          r < SIZE &&
          cell(r, c) &&
          cell(r - 1, c) &&
          cell(r, c).type === cell(r - 1, c).type;
        if (same) run++;
        else {
          if (run >= 3) {
            for (let k = 0; k < run; k++) matched.add((r - 1 - k) * SIZE + c);
          }
          run = 1;
        }
      }
    }
    return matched;
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
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
    const stars = els.starsBox.querySelectorAll('.star');
    stars.forEach((el, i) => el.classList.toggle('on', i < n));
  }

  function updateHud(level) {
    els.movesVal.textContent = String(moves);
    if (isOnline) {
      els.levelChip.textContent = 'Daily';
    } else {
      els.levelChip.innerHTML = `Lv <span id="levelVal">${levelIndex + 1}</span>`;
      els.levelVal = document.getElementById('levelVal');
    }
    els.goalEmoji.textContent = FRUITS[level.goalType].emoji;
    els.goalCount.textContent = `${collected}/${level.goalNeed}`;
    els.scoreVal.textContent = String(score);
    paintStars(starsFromScore(level, score));
  }

  function renderBoard(animFallIdx) {
    const level = LEVELS[levelIndex % LEVELS.length];
    els.board.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const item = grid[i];
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.i = String(i);
      if (!item) {
        div.style.visibility = 'hidden';
      } else {
        div.textContent = FRUITS[item.type].emoji;
        if (item.special) div.classList.add('special');
        if (animFallIdx && animFallIdx.has(i)) div.classList.add('fall');
        if (selected === i) div.classList.add('selected');
      }
      div.addEventListener('click', () => onCellTap(i));
      els.board.appendChild(div);
    }
    updateHud(level);
  }

  function neighbors(a, b) {
    const ar = Math.floor(a / SIZE);
    const ac = a % SIZE;
    const br = Math.floor(b / SIZE);
    const bc = b % SIZE;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  function swap(a, b) {
    const t = grid[a];
    grid[a] = grid[b];
    grid[b] = t;
  }

  async function clearAndDrop(matched) {
    const level = LEVELS[levelIndex % LEVELS.length];
    const nodes = els.board.querySelectorAll('.cell');
    matched.forEach((i) => {
      const item = grid[i];
      if (item && item.type === level.goalType) collected++;
      nodes[i]?.classList.add('pop');
    });

    const gained = matched.size * 40 * Math.max(1, combo);
    score += gained;
    if (combo >= 2) flashFx(combo >= 3 ? `SUPER x${combo}` : `COMBO x${combo}`);
    else if (matched.size >= 5) flashFx('MEGA!');
    else if (matched.size >= 4) flashFx('NICE!');

    await sleep(260);

    // create specials for long matches before clearing
    const specialSpots = [];
    matched.forEach((i) => {
      // count run length roughly via matched size groups — simple: 4+ gets line, 5+ bomb at first cell
    });
    if (matched.size >= 5) {
      const first = [...matched][0];
      specialSpots.push({ i: first, special: 'bomb' });
    } else if (matched.size === 4) {
      const first = [...matched][0];
      specialSpots.push({ i: first, special: 'line' });
    }

    matched.forEach((i) => {
      grid[i] = null;
    });
    specialSpots.forEach(({ i, special }) => {
      // keep a fruit there as special power piece
      grid[i] = { type: randFruit(), special };
    });

    // gravity
    const fell = new Set();
    for (let c = 0; c < SIZE; c++) {
      let write = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        const item = cell(r, c);
        if (item) {
          if (write !== r) {
            setCell(write, c, item);
            setCell(r, c, null);
            fell.add(write * SIZE + c);
          }
          write--;
        }
      }
      for (let r = write; r >= 0; r--) {
        setCell(r, c, { type: randFruit(), special: null });
        fell.add(r * SIZE + c);
      }
    }

    renderBoard(fell);
    await sleep(220);
  }

  async function resolveBoard() {
    combo = 0;
    while (true) {
      let matched = findMatches();

      // expand specials if matched includes special
      if (matched.size) {
        const extra = new Set(matched);
        matched.forEach((i) => {
          const item = grid[i];
          if (!item || !item.special) return;
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          if (item.special === 'line') {
            for (let cc = 0; cc < SIZE; cc++) extra.add(r * SIZE + cc);
            for (let rr = 0; rr < SIZE; rr++) extra.add(rr * SIZE + c);
          }
          if (item.special === 'bomb') {
            for (let rr = r - 1; rr <= r + 1; rr++) {
              for (let cc = c - 1; cc <= c + 1; cc++) {
                if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) extra.add(rr * SIZE + cc);
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
    if (busy || !grid[i]) return;
    const level = LEVELS[levelIndex % LEVELS.length];

    if (selected == null) {
      selected = i;
      renderBoard();
      return;
    }

    if (selected === i) {
      selected = null;
      renderBoard();
      return;
    }

    if (!neighbors(selected, i)) {
      selected = i;
      renderBoard();
      return;
    }

    const a = selected;
    const b = i;
    selected = null;
    busy = true;

    swap(a, b);
    renderBoard();
    await sleep(120);

    const matched = findMatches();
    if (!matched.size) {
      // revert
      swap(a, b);
      renderBoard();
      els.hintBar.textContent = 'No match — try another swap';
      busy = false;
      return;
    }

    moves--;
    els.hintBar.textContent = 'Nice move!';
    await resolveBoard();

    updateHud(level);

    if (collected >= level.goalNeed) {
      await finish(true);
      return;
    }
    if (moves <= 0) {
      await finish(false);
      return;
    }

    busy = false;
  }

  async function finish(won) {
    busy = true;
    const level = LEVELS[levelIndex % LEVELS.length];
    const stars = starsFromScore(level, score);
    const p = loadProgress();

    if (isOnline) {
      const key = String(todaySeed());
      const prev = p[key]?.best || 0;
      p[key] = { best: Math.max(prev, score), stars: Math.max(p[key]?.stars || 0, stars) };
      saveProgress(p);
      els.resultTitle.textContent = won ? 'Daily cleared!' : 'Out of moves';
      els.resultExtra.textContent =
        score >= prev ? 'New best for today!' : `Best today stays ${Math.max(prev, score)}`;
      els.nextBtn.textContent = 'Play again';
    } else {
      if (won) {
        p.level = Math.max(p.level || 0, levelIndex + 1);
        p.stars = p.stars || {};
        p.stars[levelIndex] = Math.max(p.stars[levelIndex] || 0, stars);
        saveProgress(p);
      }
      els.resultTitle.textContent = won ? 'Level clear!' : 'Almost — try again';
      els.resultExtra.textContent = won
        ? stars === 3
          ? 'Perfect three stars!'
          : 'Goal reached'
        : 'Collect the goal fruit before moves run out';
      els.nextBtn.textContent = won ? (levelIndex >= LEVELS.length - 1 ? 'Replay max' : 'Next level') : 'Retry level';
      if (won && levelIndex < LEVELS.length - 1) levelIndex++;
    }

    els.resultStars.textContent = '★'.repeat(Math.max(1, stars)) + '☆'.repeat(Math.max(0, 3 - stars));
    els.resultScore.textContent = `Score ${score}`;
    show(els.result);
    busy = false;
  }

  function startLevel() {
    const level = LEVELS[levelIndex % LEVELS.length];
    if (isOnline) rng = mulberry32(todaySeed() * 997 + 13);
    else rng = Math.random;

    createGridNoMatches();
    moves = level.moves;
    score = 0;
    collected = 0;
    selected = null;
    combo = 0;
    busy = false;
    els.hintBar.textContent = `Collect ${level.goalNeed} ${FRUITS[level.goalType].emoji} in ${level.moves} moves`;
    renderBoard();
    show(els.play);
  }

  els.playBtn.addEventListener('click', startLevel);
  els.retryBtn.addEventListener('click', () => {
    if (!isOnline) {
      /* stay on same level */
    }
    startLevel();
  });
  els.nextBtn.addEventListener('click', () => {
    if (isOnline) startLevel();
    else startLevel();
  });

  // swipe support
  let touchStart = null;
  els.board.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const cellEl = el?.closest?.('.cell');
      if (!cellEl) return;
      touchStart = { i: Number(cellEl.dataset.i), x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );
  els.board.addEventListener(
    'touchend',
    (e) => {
      if (touchStart == null || busy) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        touchStart = null;
        return;
      }
      const i = touchStart.i;
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      let j = i;
      if (Math.abs(dx) > Math.abs(dy)) j = c + (dx > 0 ? 1 : -1) >= 0 && c + (dx > 0 ? 1 : -1) < SIZE ? r * SIZE + (c + (dx > 0 ? 1 : -1)) : i;
      else j = r + (dy > 0 ? 1 : -1) >= 0 && r + (dy > 0 ? 1 : -1) < SIZE ? (r + (dy > 0 ? 1 : -1)) * SIZE + c : i;
      touchStart = null;
      if (j !== i) {
        selected = i;
        onCellTap(j);
      }
    },
    { passive: true }
  );

  updateMenuMeta();
  show(els.menu);
})();
