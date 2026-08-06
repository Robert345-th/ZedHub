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

  /** 100 levels — starts easy, gets harder */
  function buildLevels() {
    const levels = [];
    for (let i = 0; i < 100; i++) {
      const t = i / 99; // 0 → 1
      const goalType = i % FRUITS.length;
      const goalNeed = Math.round(10 + t * 38 + (i % 5)); // ~10 → ~50
      const moves = Math.max(8, Math.round(26 - t * 16 - (i % 3))); // ~26 → ~8
      const base = 600 + i * 55;
      levels.push({
        moves,
        goalType,
        goalNeed,
        fruitCount: i < 15 ? 4 : i < 40 ? 5 : 6, // more fruit types later = harder
        starScores: [base, Math.round(base * 1.9), Math.round(base * 3.1)],
      });
    }
    return levels;
  }

  const LEVELS = buildLevels();

  // Fruits is Offline-only
  if ((new URLSearchParams(location.search).get('mode') || '') === 'online') {
    location.replace('/games/fruits/?mode=offline');
    return;
  }

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

  els.modePill.textContent = 'OFFLINE';
  els.menuLead.textContent =
    '100 offline levels — smooth matches, combos & power fruits. Each level gets harder.';

  let levelIndex = 0;
  let fruitPool = 6;
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

  function loadProgress() {
    try {
      const raw = localStorage.getItem('zedfruits_offline');
      return raw ? JSON.parse(raw) : { level: 0, stars: {} };
    } catch (_) {
      return { level: 0, stars: {} };
    }
  }

  function saveProgress(data) {
    try {
      localStorage.setItem('zedfruits_offline', JSON.stringify(data));
    } catch (_) {}
  }

  function updateMenuMeta() {
    const p = loadProgress();
    levelIndex = Math.min(Math.max(0, p.level || 0), 99);
    const cleared = Object.keys(p.stars || {}).length;
    els.progressMeta.textContent = `Level ${levelIndex + 1} / 100 · ${cleared} cleared`;
    els.playBtn.textContent = levelIndex === 0 ? 'Start level 1' : `Continue level ${levelIndex + 1}`;
  }

  function randFruit() {
    return Math.floor(Math.random() * fruitPool);
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
        let guard = 0;
        do {
          v = randFruit();
          guard++;
        } while (
          guard < 40 &&
          ((c >= 2 && cell(r, c - 1)?.type === v && cell(r, c - 2)?.type === v) ||
            (r >= 2 && cell(r - 1, c)?.type === v && cell(r - 2, c)?.type === v))
        );
        setCell(r, c, { type: v, special: null });
      }
    }
  }

  function findMatches() {
    const matched = new Set();
    for (let r = 0; r < SIZE; r++) {
      let run = 1;
      for (let c = 1; c <= SIZE; c++) {
        const same =
          c < SIZE && cell(r, c) && cell(r, c - 1) && cell(r, c).type === cell(r, c - 1).type;
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
        const same =
          r < SIZE && cell(r, c) && cell(r - 1, c) && cell(r, c).type === cell(r - 1, c).type;
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
    els.starsBox.querySelectorAll('.star').forEach((el, i) => el.classList.toggle('on', i < n));
  }

  function updateHud(level) {
    els.movesVal.textContent = String(moves);
    els.levelChip.innerHTML = `Lv <span id="levelVal">${levelIndex + 1}</span>`;
    els.goalEmoji.textContent = FRUITS[level.goalType].emoji;
    els.goalCount.textContent = `${collected}/${level.goalNeed}`;
    els.scoreVal.textContent = String(score);
    paintStars(starsFromScore(level, score));
  }

  function renderBoard(opts) {
    const level = LEVELS[levelIndex];
    const fall = opts?.fall || new Set();
    const popping = opts?.pop || new Set();
    const swapping = opts?.swap;

    els.board.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const item = grid[i];
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.i = String(i);
      if (!item) {
        div.classList.add('empty');
      } else {
        div.textContent = FRUITS[item.type].emoji;
        if (item.special) div.classList.add('special');
        if (fall.has(i)) div.classList.add('fall');
        if (popping.has(i)) div.classList.add('pop');
        if (selected === i) div.classList.add('selected');
        if (swapping && (swapping.a === i || swapping.b === i)) div.classList.add('swap');
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
    const level = LEVELS[levelIndex];
    renderBoard({ pop: matched });
    matched.forEach((i) => {
      const item = grid[i];
      if (item && item.type === level.goalType) collected++;
    });

    const gained = matched.size * (35 + Math.floor(levelIndex / 5)) * Math.max(1, combo);
    score += gained;
    if (combo >= 3) flashFx(`SUPER x${combo}`);
    else if (combo === 2) flashFx('COMBO!');
    else if (matched.size >= 5) flashFx('MEGA!');
    else if (matched.size >= 4) flashFx('NICE!');

    await sleep(240);

    let specialSpot = null;
    let specialKind = null;
    if (matched.size >= 5) {
      specialSpot = [...matched][Math.floor(matched.size / 2)];
      specialKind = 'bomb';
    } else if (matched.size === 4) {
      specialSpot = [...matched][0];
      specialKind = 'line';
    }

    matched.forEach((i) => {
      grid[i] = null;
    });
    if (specialSpot != null) {
      grid[specialSpot] = { type: randFruit(), special: specialKind };
    }

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
    const level = LEVELS[levelIndex];

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
    renderBoard({ swap: { a, b } });
    await sleep(160);

    if (!findMatches().size) {
      swap(a, b);
      renderBoard();
      els.hintBar.textContent = 'No match — try another swap';
      els.board.classList.add('shake');
      await sleep(280);
      els.board.classList.remove('shake');
      busy = false;
      return;
    }

    moves--;
    els.hintBar.textContent = 'Great!';
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
    const level = LEVELS[levelIndex];
    const stars = starsFromScore(level, score);
    const p = loadProgress();
    p.stars = p.stars || {};

    if (won) {
      p.stars[levelIndex] = Math.max(p.stars[levelIndex] || 0, stars);
      p.level = Math.max(p.level || 0, Math.min(99, levelIndex + 1));
      saveProgress(p);
      els.resultTitle.textContent = levelIndex >= 99 ? 'You finished all 100!' : 'Level clear!';
      els.resultExtra.textContent =
        stars === 3 ? 'Perfect three stars!' : `Unlocked level ${Math.min(100, levelIndex + 2)}`;
      els.nextBtn.textContent = levelIndex >= 99 ? 'Play again' : 'Next level';
      if (levelIndex < 99) levelIndex++;
    } else {
      els.resultTitle.textContent = 'Out of moves';
      els.resultExtra.textContent = 'Levels get harder — try a cleaner combo path.';
      els.nextBtn.textContent = 'Retry';
    }

    els.resultStars.textContent = '★'.repeat(Math.max(1, stars)) + '☆'.repeat(Math.max(0, 3 - stars));
    els.resultScore.textContent = `Score ${score}`;
    show(els.result);
    busy = false;
  }

  function startLevel() {
    const level = LEVELS[levelIndex];
    fruitPool = level.fruitCount;
    createGridNoMatches();
    // resolve any rare leftover cascades silently
    moves = level.moves;
    score = 0;
    collected = 0;
    selected = null;
    combo = 0;
    busy = false;
    els.hintBar.textContent = `Lv ${levelIndex + 1}: collect ${level.goalNeed} ${FRUITS[level.goalType].emoji} in ${level.moves} moves`;
    renderBoard();
    show(els.play);
  }

  els.playBtn.addEventListener('click', startLevel);
  els.retryBtn.addEventListener('click', startLevel);
  els.nextBtn.addEventListener('click', startLevel);

  let touchStart = null;
  els.board.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const cellEl = el?.closest?.('.cell');
      if (!cellEl || cellEl.classList.contains('empty')) return;
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
