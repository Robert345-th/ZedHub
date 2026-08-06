const KEY = 'nexus_words_v1';
const DIRS = [
  [0, 1], [1, 0], [1, 1], [1, -1],
  [0, -1], [-1, 0], [-1, -1], [-1, 1],
];
const HIGHLIGHTS = ['#60a5fa', '#f472b6', '#fbbf24', '#4ade80', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];

const DIFF = {
  easy: { size: 6, words: 5, label: 'Easy' },
  medium: { size: 8, words: 7, label: 'Medium' },
  hard: { size: 10, words: 9, label: 'Hard' },
  pro: { size: 12, words: 11, label: 'Pro' },
};

const THEMES = [
  { id: 'animals', name: 'Animals', icon: '🐾', color: '#8b5cf6', free: true, price: 0, pool: ['DOG', 'CAT', 'LION', 'BEAR', 'WOLF', 'BIRD', 'FISH', 'FROG', 'DEER', 'DUCK', 'GOAT', 'PONY'] },
  { id: 'colors', name: 'Colors', icon: '🎨', color: '#ec4899', free: true, price: 0, pool: ['RED', 'BLUE', 'GREEN', 'PINK', 'GOLD', 'TEAL', 'CORAL', 'IVORY', 'AMBER', 'OLIVE', 'NAVY', 'PLUM'] },
  { id: 'cities', name: 'Cities', icon: '🏙️', color: '#f97316', free: true, price: 0, pool: ['PARIS', 'TOKYO', 'ROME', 'CAIRO', 'OSLO', 'SEOUL', 'LAGOS', 'DUBAI', 'MIAMI', 'BERLIN', 'LIMA', 'ACCRA'] },
  { id: 'nature', name: 'Nature', icon: '🌿', color: '#22c55e', free: true, price: 0, pool: ['TREE', 'LEAF', 'RIVER', 'STONE', 'CLOUD', 'MOSS', 'PEAK', 'LAKE', 'SEED', 'BLOOM', 'VALLEY', 'WAVE'] },
  { id: 'house', name: 'House', icon: '🏠', color: '#3b82f6', free: true, price: 0, pool: ['DOOR', 'LAMP', 'CHAIR', 'TABLE', 'ROOF', 'WALL', 'SOFA', 'OVEN', 'SINK', 'BED', 'RUG', 'SHELF'] },
  { id: 'adjectives', name: 'Adjectives', icon: '◇', color: '#a855f7', free: true, price: 0, pool: ['GRIM', 'SWEET', 'FROZEN', 'SUNNY', 'STURDY', 'SHY', 'BRAVE', 'QUIET', 'CRISP', 'BOLD', 'CALM', 'WARM'] },
  { id: 'space', name: 'Space', icon: '🚀', color: '#0ea5e9', free: false, price: 50, pool: ['MOON', 'MARS', 'STAR', 'ORBIT', 'COMET', 'SHIP', 'RING', 'LEO', 'NOVA', 'DUST', 'BEAM', 'PHOBOS'] },
  { id: 'tv', name: 'TV Shows', icon: '📺', color: '#f59e0b', free: false, price: 50, pool: ['SCENE', 'PILOT', 'DRAMA', 'CAST', 'SHOW', 'CLIP', 'HOST', 'SEAT', 'LIVE', 'STAGE', 'CUE', 'SET'] },
  { id: 'countries', name: 'Countries', icon: '🗺️', color: '#ef4444', free: false, price: 100, pool: ['ITALY', 'KENYA', 'CHINA', 'SPAIN', 'INDIA', 'CHILE', 'JAPAN', 'GHANA', 'NEPAL', 'EGYPT', 'PERU', 'MALI'] },
  { id: 'monuments', name: 'Monuments', icon: '🏛️', color: '#ea580c', free: false, price: 100, pool: ['TEMPLE', 'TOWER', 'ARCH', 'WALL', 'DOME', 'GATE', 'OBELISK', 'RUINS', 'BRIDGE', 'PALACE', 'FORT', 'SPIRE'] },
  { id: 'actors', name: 'Actors', icon: '🎭', color: '#fb923c', free: false, price: 125, pool: ['STAGE', 'ROLE', 'MASK', 'ACT', 'CUE', 'TAKE', 'STAR', 'SCENE', 'CAST', 'PLAY', 'DRAMA', 'LINE'] },
  { id: 'writers', name: 'Writers', icon: '✒️', color: '#dc2626', free: false, price: 125, pool: ['INK', 'PAGE', 'STORY', 'POEM', 'NOVEL', 'VERSE', 'PLOT', 'HERO', 'QUILL', 'BOOK', 'DRAFT', 'TALE'] },
  { id: 'history', name: 'History', icon: '📜', color: '#7c3aed', free: false, price: 150, pool: ['EMPIRE', 'CROWN', 'ERA', 'RELIC', 'MAP', 'QUEEN', 'SIEGE', 'COIN', 'TORCH', 'SCROLL', 'AGE', 'LEGEND'] },
  { id: 'food', name: 'Food', icon: '🍜', color: '#e11d48', free: false, price: 75, pool: ['RICE', 'SOUP', 'BREAD', 'APPLE', 'MANGO', 'SPICE', 'BEAN', 'CORN', 'CAKE', 'HONEY', 'STEW', 'FISH'] },
  { id: 'sports', name: 'Sports', icon: '⚽', color: '#16a34a', free: false, price: 75, pool: ['GOAL', 'BALL', 'RACE', 'TEAM', 'SWIM', 'JUMP', 'KICK', 'MATCH', 'COURT', 'TRACK', 'COACH', 'WIN'] },
];

const LEVELS_PER = 30;

const hubScreen = document.getElementById('hubScreen');
const playScreen = document.getElementById('playScreen');
const themeGrid = document.getElementById('themeGrid');
const boardEl = document.getElementById('board');
const wordBank = document.getElementById('wordBank');
const themeBanner = document.getElementById('themeBanner');
const praise = document.getElementById('praise');
const toast = document.getElementById('toast');
const unlockModal = document.getElementById('unlockModal');
const winModal = document.getElementById('winModal');
const bg = document.getElementById('bg');

let state = loadState();
let difficulty = state.diff || 'medium';
let pendingUnlock = null;
let puzzle = null;
let selecting = false;
let selStart = null;
let selCells = [];

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}
function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (_) {}
}
function ensureState() {
  if (typeof state.coins !== 'number') state.coins = 80;
  if (!state.unlocked) state.unlocked = THEMES.filter((t) => t.free).map((t) => t.id);
  if (!state.progress) state.progress = {};
  if (!state.diff) state.diff = 'medium';
  if (typeof state.streak !== 'number') state.streak = 0;
  if (!state.lastDaily) state.lastDaily = '';
  if (!state.dailyDone) state.dailyDone = '';
  THEMES.forEach((t) => {
    if (typeof state.progress[t.id] !== 'number') state.progress[t.id] = 0;
  });
}
ensureState();

function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setCoinsUI() {
  document.querySelectorAll('#hubCoins strong, #playCoins strong').forEach((el) => {
    el.textContent = String(state.coins);
  });
  const streakStrong = document.querySelector('#streakBadge strong');
  if (streakStrong) streakStrong.textContent = String(state.streak || 0);
  const dailyMeta = document.getElementById('dailyMeta');
  if (dailyMeta) {
    dailyMeta.textContent =
      state.dailyDone === dayKey()
        ? `Done today · streak ${state.streak}`
        : `One shared grid · streak ${state.streak || 0}`;
  }
}

function toastMsg(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastMsg._t);
  toastMsg._t = setTimeout(() => { toast.hidden = true; }, 1800);
}

function isUnlocked(id) {
  return state.unlocked.includes(id);
}

function renderHub() {
  setCoinsUI();
  document.querySelectorAll('.diff').forEach((b) => {
    b.classList.toggle('active', b.dataset.diff === difficulty);
  });
  themeGrid.innerHTML = '';
  THEMES.forEach((t) => {
    const done = Math.min(LEVELS_PER, state.progress[t.id] || 0);
    const unlocked = isUnlocked(t.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card' + (unlocked ? '' : ' locked');
    btn.innerHTML = unlocked
      ? `<div class="prog"><i style="width:${(done / LEVELS_PER) * 100}%"></i><span class="prog-label">${done}/${LEVELS_PER}</span></div>
         <div class="icon" style="color:${t.color}">${t.icon}</div>
         <div class="name">${t.name}</div>`
      : `<div class="price"><span>🪙</span>${t.price}</div>
         <div class="icon">${t.icon}</div>
         <div class="name">${t.name}</div>`;
    btn.addEventListener('click', () => onThemeTap(t));
    themeGrid.appendChild(btn);
  });
}

function onThemeTap(t) {
  if (!isUnlocked(t.id)) {
    pendingUnlock = t;
    document.getElementById('unlockTitle').textContent = `Unlock ${t.name}`;
    document.getElementById('unlockLead').textContent = `Spend ${t.price} coins to unlock this theme.`;
    unlockModal.hidden = false;
    return;
  }
  startPuzzle(t.id);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWords(theme, count, size) {
  const pool = shuffle(theme.pool).filter((w) => w.length <= size);
  return pool.slice(0, Math.min(count, pool.length));
}

function emptyGrid(n) {
  return Array.from({ length: n }, () => Array(n).fill(''));
}

function canPlace(grid, word, r, c, dr, dc) {
  const n = grid.length;
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (rr < 0 || cc < 0 || rr >= n || cc >= n) return false;
    const ch = grid[rr][cc];
    if (ch && ch !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word) {
  const n = grid.length;
  const tries = shuffle(
    DIRS.flatMap(([dr, dc]) => {
      const spots = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) spots.push({ r, c, dr, dc });
      }
      return spots;
    })
  );
  for (const t of tries) {
    if (!canPlace(grid, word, t.r, t.c, t.dr, t.dc)) continue;
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      const rr = t.r + t.dr * i;
      const cc = t.c + t.dc * i;
      grid[rr][cc] = word[i];
      cells.push([rr, cc]);
    }
    return { word, cells, dir: [t.dr, t.dc] };
  }
  return null;
}

function fillGrid(grid) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
}

function buildPuzzle(themeId, opts) {
  const theme = THEMES.find((t) => t.id === themeId);
  const cfg = opts?.cfg || DIFF[difficulty];
  const rand = opts?.rand || Math.random;
  const seeded = !!opts?.rand;
  let placed = [];
  let grid;
  let words;
  for (let attempt = 0; attempt < 40; attempt++) {
    grid = emptyGrid(cfg.size);
    const pool = seeded
      ? seededShuffle(theme.pool.filter((w) => w.length <= cfg.size), rand)
      : shuffle(theme.pool.filter((w) => w.length <= cfg.size));
    words = pool.slice(0, Math.min(cfg.words, pool.length));
    placed = [];
    let ok = true;
    for (const w of words) {
      const p = placeWordSeeded(grid, w, rand);
      if (!p) { ok = false; break; }
      placed.push(p);
    }
    if (ok) break;
  }
  fillGridSeeded(grid, rand);
  return {
    themeId,
    theme,
    size: cfg.size,
    grid,
    words: placed.map((p) => p.word),
    placements: placed,
    found: {},
    hlIndex: 0,
    daily: !!opts?.daily,
    dailyKey: opts?.dailyKey || '',
  };
}

function placeWordSeeded(grid, word, rand) {
  const n = grid.length;
  const dirs = seededShuffle(DIRS.slice(), rand);
  const spots = [];
  for (const [dr, dc] of dirs) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) spots.push({ r, c, dr, dc });
    }
  }
  const tries = seededShuffle(spots, rand);
  for (const t of tries) {
    if (!canPlace(grid, word, t.r, t.c, t.dr, t.dc)) continue;
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      const rr = t.r + t.dr * i;
      const cc = t.c + t.dc * i;
      grid[rr][cc] = word[i];
      cells.push([rr, cc]);
    }
    return { word, cells, dir: [t.dr, t.dc] };
  }
  return null;
}

function fillGridSeeded(grid, rand) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(rand() * letters.length)];
    }
  }
}

function startPuzzle(themeId) {
  puzzle = buildPuzzle(themeId);
  hubScreen.hidden = true;
  playScreen.hidden = false;
  winModal.hidden = true;
  themeBanner.textContent = puzzle.theme.name;
  document.getElementById('modePill').textContent =
    difficulty === 'easy' ? 'Learn new words' : difficulty === 'pro' ? 'Train your brain' : 'Find every word';
  document.getElementById('btnShuffle').disabled = false;
  document.getElementById('btnShuffle').style.opacity = '1';
  setBg(puzzle.themeId);
  setCoinsUI();
  renderBoard();
  renderWords();
}

function startDaily() {
  const key = dayKey();
  const seed = Number(key.replace(/-/g, ''));
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const theme = THEMES[Math.floor(rand() * THEMES.length)];
  const cfg = { size: 8, words: 7, label: 'Daily' };
  puzzle = buildPuzzle(theme.id, { rand, cfg, daily: true, dailyKey: key });
  hubScreen.hidden = true;
  playScreen.hidden = false;
  winModal.hidden = true;
  themeBanner.textContent = 'Daily · ' + puzzle.theme.name;
  document.getElementById('modePill').textContent = 'Daily puzzle';
  document.getElementById('btnShuffle').disabled = true;
  document.getElementById('btnShuffle').style.opacity = '0.4';
  setBg(puzzle.themeId);
  setCoinsUI();
  renderBoard();
  renderWords();
  if (state.dailyDone === key) toastMsg('Already cleared today — practice run');
}

function setBg(themeId) {
  const map = {
    animals: 'linear-gradient(160deg,#86efac,#4ade80 40%,#fde68a)',
    colors: 'linear-gradient(160deg,#f9a8d4,#c4b5fd 45%,#93c5fd)',
    cities: 'linear-gradient(160deg,#fdba74,#fb923c 40%,#7dd3fc)',
    nature: 'linear-gradient(160deg,#86efac,#34d399 40%,#67e8f9)',
    house: 'linear-gradient(160deg,#93c5fd,#60a5fa 40%,#fcd34d)',
    adjectives: 'linear-gradient(160deg,#f9a8d4,#fb7185 40%,#fdba74)',
    space: 'linear-gradient(160deg,#312e81,#7c3aed 40%,#22d3ee)',
    tv: 'linear-gradient(160deg,#fdba74,#f97316 45%,#f472b6)',
    countries: 'linear-gradient(160deg,#fca5a5,#ef4444 40%,#fde68a)',
    monuments: 'linear-gradient(160deg,#fdba74,#ea580c 40%,#a8a29e)',
    actors: 'linear-gradient(160deg,#fdba74,#fb923c 40%,#f9a8d4)',
    writers: 'linear-gradient(160deg,#fecaca,#dc2626 40%,#fde68a)',
    history: 'linear-gradient(160deg,#c4b5fd,#7c3aed 40%,#fbbf24)',
    food: 'linear-gradient(160deg,#fda4af,#fb7185 40%,#fde68a)',
    sports: 'linear-gradient(160deg,#86efac,#16a34a 40%,#67e8f9)',
  };
  bg.style.background = `linear-gradient(180deg,rgba(20,10,6,.2),rgba(20,10,6,.5)), ${map[themeId] || map.nature}`;
}

function renderWords() {
  wordBank.innerHTML = '';
  puzzle.words.forEach((w) => {
    const s = document.createElement('span');
    s.textContent = w;
    s.dataset.word = w;
    if (puzzle.found[w]) s.classList.add('found');
    wordBank.appendChild(s);
  });
}

function renderBoard() {
  const n = puzzle.size;
  boardEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${n}, 1fr)`;
  boardEl.innerHTML = '';
  // highlights layer recreated after cells
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.textContent = puzzle.grid[r][c];
      boardEl.appendChild(cell);
    }
  }
  Object.values(puzzle.found).forEach((f) => drawHighlight(f.cells, f.color));
}

function cellAt(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !el.classList.contains('cell')) return null;
  return { r: +el.dataset.r, c: +el.dataset.c, el };
}

function lineCells(a, b) {
  const dr = Math.sign(b.r - a.r);
  const dc = Math.sign(b.c - a.c);
  const stepsR = Math.abs(b.r - a.r);
  const stepsC = Math.abs(b.c - a.c);
  if (stepsR && stepsC && stepsR !== stepsC) return [a];
  if (!stepsR && !stepsC) return [a];
  const steps = Math.max(stepsR, stepsC);
  const out = [];
  for (let i = 0; i <= steps; i++) out.push({ r: a.r + dr * i, c: a.c + dc * i });
  return out;
}

function clearSelecting() {
  boardEl.querySelectorAll('.cell.selecting').forEach((c) => c.classList.remove('selecting'));
  selCells = [];
}

function markSelecting(cells) {
  clearSelecting();
  selCells = cells;
  cells.forEach(({ r, c }) => {
    const el = boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (el) el.classList.add('selecting');
  });
}

function cellsToWord(cells) {
  return cells.map(({ r, c }) => puzzle.grid[r][c]).join('');
}

function drawHighlight(cells, color) {
  if (cells.length < 2) return;
  const first = boardEl.querySelector(`.cell[data-r="${cells[0].r}"][data-c="${cells[0].c}"]`);
  const last = boardEl.querySelector(`.cell[data-r="${cells[cells.length - 1].r}"][data-c="${cells[cells.length - 1].c}"]`);
  if (!first || !last) return;
  const br = boardEl.getBoundingClientRect();
  const a = first.getBoundingClientRect();
  const b = last.getBoundingClientRect();
  const x1 = a.left + a.width / 2 - br.left;
  const y1 = a.top + a.height / 2 - br.top;
  const x2 = b.left + b.width / 2 - br.left;
  const y2 = b.top + b.height / 2 - br.top;
  const len = Math.hypot(x2 - x1, y2 - y1) + a.width * 0.72;
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  const hl = document.createElement('div');
  hl.className = 'hl';
  hl.style.width = `${len}px`;
  hl.style.height = `${a.height * 0.72}px`;
  hl.style.background = color;
  hl.style.left = `${(x1 + x2) / 2}px`;
  hl.style.top = `${(y1 + y2) / 2}px`;
  hl.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
  boardEl.appendChild(hl);
}

function showPraise() {
  const words = ['Amazing', 'Awesome', 'Great', 'Nice', 'Brilliant'];
  praise.textContent = words[Math.floor(Math.random() * words.length)];
  praise.hidden = false;
  clearTimeout(showPraise._t);
  showPraise._t = setTimeout(() => { praise.hidden = true; }, 700);
}

function tryCommitSelection() {
  if (!selCells.length) return;
  const forward = cellsToWord(selCells);
  const backward = forward.split('').reverse().join('');
  const match = puzzle.words.find((w) => w === forward || w === backward);
  if (match && !puzzle.found[match]) {
    const color = HIGHLIGHTS[puzzle.hlIndex++ % HIGHLIGHTS.length];
    const cells = forward === match ? selCells.slice() : selCells.slice().reverse();
    // normalize to placement order of letters in match
    const placed = puzzle.placements.find((p) => p.word === match);
    puzzle.found[match] = { cells: placed ? placed.cells.map(([r, c]) => ({ r, c })) : cells.map(({ r, c }) => ({ r, c })), color };
    drawHighlight(puzzle.found[match].cells, color);
    renderWords();
    showPraise();
    if (Object.keys(puzzle.found).length >= puzzle.words.length) onWin();
  }
  clearSelecting();
}

function onWin() {
  const themeId = puzzle.themeId;
  let reward = difficulty === 'pro' ? 35 : difficulty === 'hard' ? 28 : difficulty === 'easy' ? 12 : 20;
  let streakNote = '';

  if (puzzle.daily) {
    const key = puzzle.dailyKey || dayKey();
    if (state.dailyDone !== key) {
      if (state.lastDaily === yesterdayKey()) state.streak = (state.streak || 0) + 1;
      else state.streak = 1;
      state.lastDaily = key;
      state.dailyDone = key;
      const bonus = Math.min(40, 10 + state.streak * 5);
      reward = 30 + bonus;
      streakNote = ` · streak ${state.streak} (+${bonus})`;
    } else {
      reward = 8;
      streakNote = ' · practice';
    }
  } else {
    const prev = state.progress[themeId] || 0;
    if (prev < LEVELS_PER) state.progress[themeId] = prev + 1;
  }

  state.coins += reward;
  saveState();
  setCoinsUI();
  const progressLine = puzzle.daily
    ? `Daily clear${streakNote}`
    : `${state.progress[themeId]}/${LEVELS_PER} in ${puzzle.theme.name}`;
  document.getElementById('winLead').textContent = `+${reward} coins · ${progressLine}`;
  winModal.hidden = false;
}

function hintFlash() {
  const left = puzzle.words.filter((w) => !puzzle.found[w]);
  if (!left.length) return;
  const COST = 5;
  if (state.coins < COST) { toastMsg(`Need ${COST} coins for a hint`); return; }
  state.coins -= COST;
  saveState();
  setCoinsUI();
  const w = left[Math.floor(Math.random() * left.length)];
  const p = puzzle.placements.find((x) => x.word === w);
  if (!p) return;
  const [r, c] = p.cells[0];
  const el = boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!el) return;
  el.classList.add('hint-flash');
  setTimeout(() => el.classList.remove('hint-flash'), 1400);
  toastMsg(`Hint: starts with ${w[0]} (−${COST}🪙)`);
}

function revealWord() {
  const left = puzzle.words.filter((w) => !puzzle.found[w]);
  if (!left.length) return;
  const COST = 15;
  if (state.coins < COST) { toastMsg(`Need ${COST} coins to reveal`); return; }
  state.coins -= COST;
  saveState();
  setCoinsUI();
  const w = left[0];
  const p = puzzle.placements.find((x) => x.word === w);
  const color = HIGHLIGHTS[puzzle.hlIndex++ % HIGHLIGHTS.length];
  puzzle.found[w] = { cells: p.cells.map(([r, c]) => ({ r, c })), color };
  drawHighlight(puzzle.found[w].cells, color);
  renderWords();
  showPraise();
  toastMsg(`Revealed ${w} (−${COST}🪙)`);
  if (Object.keys(puzzle.found).length >= puzzle.words.length) onWin();
}

// Pointer selection
boardEl.addEventListener('pointerdown', (e) => {
  if (!puzzle) return;
  const cell = cellAt(e.clientX, e.clientY);
  if (!cell) return;
  selecting = true;
  selStart = { r: cell.r, c: cell.c };
  markSelecting([selStart]);
  boardEl.setPointerCapture(e.pointerId);
});
boardEl.addEventListener('pointermove', (e) => {
  if (!selecting || !selStart) return;
  const cell = cellAt(e.clientX, e.clientY);
  if (!cell) return;
  markSelecting(lineCells(selStart, cell));
});
function endSelect(e) {
  if (!selecting) return;
  selecting = false;
  try {
    boardEl.releasePointerCapture(e.pointerId);
  } catch (_) {}
  tryCommitSelection();
  selStart = null;
}
boardEl.addEventListener('pointerup', endSelect);
boardEl.addEventListener('pointercancel', endSelect);

// Hub events
document.getElementById('diffRow').addEventListener('click', (e) => {
  const b = e.target.closest('.diff');
  if (!b) return;
  difficulty = b.dataset.diff;
  state.diff = difficulty;
  saveState();
  renderHub();
});
document.getElementById('explorePill').addEventListener('click', () => {
  themeGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('backHub').addEventListener('click', () => {
  playScreen.hidden = true;
  hubScreen.hidden = false;
  renderHub();
});
document.getElementById('btnHome').addEventListener('click', () => {
  playScreen.hidden = true;
  hubScreen.hidden = false;
  winModal.hidden = true;
  renderHub();
});
document.getElementById('btnShuffle').addEventListener('click', () => {
  if (!puzzle || puzzle.daily) {
    toastMsg('Daily puzzle can’t be reshuffled');
    return;
  }
  startPuzzle(puzzle.themeId);
});
document.getElementById('btnHint').addEventListener('click', hintFlash);
document.getElementById('btnReveal').addEventListener('click', revealWord);
document.getElementById('dailyBtn').addEventListener('click', startDaily);

document.getElementById('unlockNo').addEventListener('click', () => {
  unlockModal.hidden = true;
  pendingUnlock = null;
});
document.getElementById('unlockYes').addEventListener('click', () => {
  if (!pendingUnlock) return;
  if (state.coins < pendingUnlock.price) {
    toastMsg('Not enough coins');
    return;
  }
  state.coins -= pendingUnlock.price;
  state.unlocked.push(pendingUnlock.id);
  saveState();
  unlockModal.hidden = true;
  const id = pendingUnlock.id;
  pendingUnlock = null;
  renderHub();
  toastMsg('Theme unlocked!');
  startPuzzle(id);
});

document.getElementById('winNext').addEventListener('click', () => {
  winModal.hidden = true;
  if (puzzle?.daily) {
    playScreen.hidden = true;
    hubScreen.hidden = false;
    renderHub();
    return;
  }
  startPuzzle(puzzle.themeId);
});
document.getElementById('winHub').addEventListener('click', () => {
  winModal.hidden = true;
  playScreen.hidden = true;
  hubScreen.hidden = false;
  renderHub();
});

window.addEventListener('resize', () => {
  if (!puzzle) return;
  // redraw highlights after layout
  boardEl.querySelectorAll('.hl').forEach((h) => h.remove());
  Object.values(puzzle.found).forEach((f) => drawHighlight(f.cells, f.color));
});

renderHub();
