(function () {
  const MAX_LIVES = 5;
  const LIFE_MS = 20 * 60 * 1000;
  const KEY = 'fruits_offline_v2';

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
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem('fruits_offline');
      return raw ? { ...defaultProgress(), ...JSON.parse(raw) } : defaultProgress();
    } catch (_) {
      return defaultProgress();
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch (_) {}
  }

  const progress = loadProgress();
  const mapGrid = document.getElementById('mapGrid');
  const progressMeta = document.getElementById('progressMeta');
  const livesVal = document.getElementById('livesVal');

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
        saveProgress(progress);
      }
    }
    livesVal.textContent = String(progress.lives);
  }

  function playUrl(opts) {
    const q = new URLSearchParams();
    q.set('mode', opts.mode || 'campaign');
    if (opts.level != null) q.set('level', String(opts.level));
    return 'play.html?' + q.toString();
  }

  refreshLives();
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

  requestAnimationFrame(() => {
    currentBtn?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
})();
