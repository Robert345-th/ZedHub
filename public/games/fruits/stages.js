(function () {
  const MAX_LIVES = 5;
  const LIFE_MS = 20 * 60 * 1000;
  const KEY = 'fruits_offline_v2';

  const WEEKLY = [
    { id: 'ice', name: 'Ice Week', desc: 'Boards packed with ice' },
    { id: 'mono', name: 'Berry Rush', desc: 'Only one fruit type on the board' },
    { id: 'speed', name: 'Speed Clear', desc: 'Fewer moves — play sharp' },
    { id: 'mega', name: 'Mega Goal', desc: 'Huge collect target' },
  ];

  if ((new URLSearchParams(location.search).get('mode') || '') === 'online') {
    location.replace('/games/fruits/?mode=offline');
    return;
  }

  function defaultProgress() {
    return {
      level: 0,
      stars: {},
      lives: MAX_LIVES,
      lifeAt: Date.now(),
      boosters: { hammer: 3, shuffle: 2, moves: 2 },
      theme: 'meadow',
      daily: {},
      coins: 0,
      playerName: 'You',
      leaderboard: {},
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem('fruits_offline');
      const p = raw ? { ...defaultProgress(), ...JSON.parse(raw) } : defaultProgress();
      if (!p.leaderboard) p.leaderboard = {};
      if (!p.playerName) p.playerName = 'You';
      if (!p.boosters) p.boosters = { hammer: 3, shuffle: 2, moves: 2 };
      p.coins = window.NexusWallet ? NexusWallet.getCoins() : (typeof p.coins === 'number' ? p.coins : 120);
      return p;
    } catch (_) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      if (window.NexusWallet) {
        progress.coins = NexusWallet.getCoins();
      }
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch (_) {}
  }

  function getCoins() {
    return window.NexusWallet ? NexusWallet.getCoins() : (progress.coins || 0);
  }

  function setCoins(n) {
    if (window.NexusWallet) {
      progress.coins = NexusWallet.setCoins(n);
    } else {
      progress.coins = Math.max(0, Math.floor(n || 0));
    }
  }

  function addCoins(n) {
    if (window.NexusWallet) {
      progress.coins = NexusWallet.add(n);
    } else {
      progress.coins = (progress.coins || 0) + n;
    }
  }

  function spendCoins(n) {
    if (window.NexusWallet) {
      const ok = NexusWallet.spend(n);
      if (ok) progress.coins = NexusWallet.getCoins();
      return ok;
    }
    if ((progress.coins || 0) < n) return false;
    progress.coins -= n;
    return true;
  }

  function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }

  function weekEvent() {
    const w = isoWeek(new Date());
    return WEEKLY[w % WEEKLY.length];
  }

  function dailyKey() {
    const d = new Date();
    return String(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
  }

  const progress = loadProgress();
  const mapGrid = document.getElementById('mapGrid');
  const progressMeta = document.getElementById('progressMeta');
  const livesVal = document.getElementById('livesVal');
  const coinsVal = document.getElementById('coinsVal');
  const toast = document.getElementById('toast');
  const shopModal = document.getElementById('shopModal');
  const boardModal = document.getElementById('boardModal');

  function toastMsg(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastMsg._t);
    toastMsg._t = setTimeout(() => { toast.hidden = true; }, 1800);
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
    livesVal.textContent = String(progress.lives);
  }

  function refreshCoins() {
    progress.coins = getCoins();
    coinsVal.textContent = String(progress.coins || 0);
    const shopCoins = document.getElementById('shopCoins');
    if (shopCoins) shopCoins.textContent = String(progress.coins || 0);
  }

  function playUrl(opts) {
    const q = new URLSearchParams();
    q.set('mode', opts.mode || 'campaign');
    if (opts.level != null) q.set('level', String(opts.level));
    return 'play.html?' + q.toString();
  }

  const event = weekEvent();
  document.getElementById('eventName').textContent = event.name;
  document.getElementById('eventDesc').textContent = event.desc;
  document.getElementById('eventCard').href = playUrl({ mode: 'weekly' });

  refreshLives();
  refreshCoins();
  const unlocked = Math.max(0, progress.level || 0);
  const cleared = Object.keys(progress.stars || {}).length;
  progressMeta.textContent = `${unlocked + 1}/100 · ${cleared}★`;

  let currentBtn = null;
  mapGrid.innerHTML = '';
  for (let i = 0; i < 100; i++) {
    const a = document.createElement('a');
    a.className = 'map-node';
    const stars = progress.stars[i] || 0;
    const lock = i > unlocked;
    if (lock) a.classList.add('locked');
    if (stars > 0) a.classList.add('cleared');
    if (i === unlocked) {
      a.classList.add('current');
      currentBtn = a;
    }
    a.innerHTML = `<span class="n">${i + 1}</span><span class="s">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
    if (lock) {
      a.href = '#';
      a.addEventListener('click', (e) => e.preventDefault());
    } else {
      a.href = playUrl({ mode: 'campaign', level: i + 1 });
    }
    mapGrid.appendChild(a);
  }

  const versus = document.getElementById('versusBtn');
  if (versus) {
    versus.href = playUrl({
      mode: 'versus',
      level: Math.min(41, (progress.level || 20) + 1),
    });
  }

  const SHOP = {
    hammer: { cost: 40, apply: () => { progress.boosters.hammer = (progress.boosters.hammer || 0) + 1; } },
    shuffle: { cost: 35, apply: () => { progress.boosters.shuffle = (progress.boosters.shuffle || 0) + 1; } },
    moves: { cost: 30, apply: () => { progress.boosters.moves = (progress.boosters.moves || 0) + 1; } },
    pack: {
      cost: 90,
      apply: () => {
        progress.boosters.hammer = (progress.boosters.hammer || 0) + 1;
        progress.boosters.shuffle = (progress.boosters.shuffle || 0) + 1;
        progress.boosters.moves = (progress.boosters.moves || 0) + 1;
      },
    },
  };

  document.getElementById('shopBtn').addEventListener('click', () => {
    refreshCoins();
    shopModal.hidden = false;
  });
  document.getElementById('shopClose').addEventListener('click', () => { shopModal.hidden = true; });
  shopModal.addEventListener('click', (e) => {
    if (e.target === shopModal) shopModal.hidden = true;
    const row = e.target.closest('[data-buy]');
    if (!row) return;
    const item = SHOP[row.dataset.buy];
    if (!item) return;
    if (!spendCoins(item.cost)) {
      toastMsg('Not enough coins');
      return;
    }
    item.apply();
    saveProgress();
    refreshCoins();
    toastMsg('Purchased!');
  });

  function renderBoard() {
    const key = dailyKey();
    const list = (progress.leaderboard[key] || []).slice().sort((a, b) => b.score - a.score).slice(0, 10);
    const ol = document.getElementById('scoreList');
    ol.innerHTML = '';
    if (!list.length) {
      ol.innerHTML = '<li class="empty">No daily scores yet — play Daily!</li>';
    } else {
      list.forEach((row, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${i + 1}. ${row.name}</span><strong>${row.score}</strong>`;
        ol.appendChild(li);
      });
    }
    document.getElementById('playerName').value = progress.playerName || 'You';
    document.getElementById('boardLead').textContent = `Today · ${key}`;
  }

  document.getElementById('boardBtn').addEventListener('click', () => {
    renderBoard();
    boardModal.hidden = false;
  });
  document.getElementById('boardClose').addEventListener('click', () => {
    const name = (document.getElementById('playerName').value || 'You').trim().slice(0, 16) || 'You';
    progress.playerName = name;
    saveProgress();
    boardModal.hidden = true;
  });
  boardModal.addEventListener('click', (e) => {
    if (e.target === boardModal) boardModal.hidden = true;
  });

  requestAnimationFrame(() => {
    currentBtn?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
})();
