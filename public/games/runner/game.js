(function () {
  const KEY = 'nexus_runner_v1';
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const hintEl = document.getElementById('hint');
  const overlay = document.getElementById('overlay');
  const overScore = document.getElementById('overScore');
  const startBtn = document.getElementById('startBtn');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = H - 42;

  let best = 0;
  let running = false;
  let score = 0;
  let speed = 4.2;
  let t = 0;
  let player;
  let obstacles = [];
  let clouds = [];
  let spawnTimer = 0;
  let raf = 0;

  function loadBest() {
    try {
      best = Number(localStorage.getItem(KEY) || 0) || 0;
    } catch (_) {
      best = 0;
    }
    bestEl.textContent = String(best);
  }

  function saveBest() {
    if (score > best) {
      best = Math.floor(score);
      bestEl.textContent = String(best);
      try {
        localStorage.setItem(KEY, String(best));
      } catch (_) {}
    }
  }

  function resetWorld() {
    player = {
      x: 56,
      y: GROUND - 36,
      w: 28,
      h: 36,
      vy: 0,
      onGround: true,
    };
    obstacles = [];
    clouds = [
      { x: 60, y: 36, s: 1 },
      { x: 180, y: 58, s: 0.8 },
      { x: 300, y: 28, s: 1.1 },
    ];
    score = 0;
    speed = 4.2;
    t = 0;
    spawnTimer = 70;
    scoreEl.textContent = '0';
    hintEl.textContent = 'Tap to jump';
  }

  function jump() {
    if (!running) {
      start();
      return;
    }
    if (player.onGround) {
      player.vy = -11.2;
      player.onGround = false;
    }
  }

  function spawnObstacle() {
    const tall = Math.random() < 0.35;
    const h = tall ? 46 + Math.random() * 18 : 28 + Math.random() * 14;
    obstacles.push({
      x: W + 10,
      y: GROUND - h,
      w: 18 + Math.random() * 14,
      h,
    });
  }

  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function draw() {
    // sky already via canvas css; clear with sky gradient each frame
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6ec8ff');
    g.addColorStop(0.55, '#b8e4ff');
    g.addColorStop(0.55, '#7ecf6a');
    g.addColorStop(1, '#4ea34a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // sun
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(W - 48, 42, 22, 0, Math.PI * 2);
    ctx.fill();

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    clouds.forEach((c) => {
      const x = c.x;
      const y = c.y;
      ctx.beginPath();
      ctx.arc(x, y, 12 * c.s, 0, Math.PI * 2);
      ctx.arc(x + 14 * c.s, y - 4 * c.s, 16 * c.s, 0, Math.PI * 2);
      ctx.arc(x + 30 * c.s, y, 12 * c.s, 0, Math.PI * 2);
      ctx.fill();
    });

    // ground line
    ctx.fillStyle = '#3d6b2a';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#2f5420';
    ctx.fillRect(0, GROUND, W, 4);

    // obstacles
    obstacles.forEach((o) => {
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(o.x, o.y, o.w, 6);
    });

    // player
    const bob = player.onGround ? Math.sin(t * 0.35) * 1.5 : 0;
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(player.x, player.y + bob, player.w, player.h);
    ctx.fillStyle = '#ff8a3d';
    ctx.fillRect(player.x + 4, player.y + 8 + bob, player.w - 8, 12);
    // eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x + 16, player.y + 10 + bob, 6, 6);
  }

  function tick() {
    if (!running) return;
    t += 1;
    speed = 4.2 + Math.min(6, score / 180);
    score += 0.12 * (speed / 4.2);
    scoreEl.textContent = String(Math.floor(score));

    // physics
    player.vy += 0.55;
    player.y += player.vy;
    if (player.y + player.h >= GROUND) {
      player.y = GROUND - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // clouds drift
    clouds.forEach((c) => {
      c.x -= speed * 0.15;
      if (c.x < -40) c.x = W + 20;
    });

    // obstacles
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = 55 + Math.random() * 50 - Math.min(25, speed * 2);
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;
      if (o.x + o.w < -10) obstacles.splice(i, 1);
      else if (hit(player, o)) {
        crash();
        return;
      }
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function crash() {
    running = false;
    cancelAnimationFrame(raf);
    saveBest();
    overlay.hidden = false;
    overScore.textContent = 'Score ' + Math.floor(score);
    hintEl.textContent = 'Tap Start to try again';
    startBtn.textContent = 'Start run';
  }

  function start() {
    overlay.hidden = true;
    resetWorld();
    running = true;
    startBtn.textContent = 'Running…';
    hintEl.textContent = 'Tap to jump';
    cancelAnimationFrame(raf);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function onJump(e) {
    e.preventDefault();
    jump();
  }

  canvas.addEventListener('pointerdown', onJump);
  startBtn.addEventListener('click', () => start());
  document.getElementById('againBtn').addEventListener('click', () => start());
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  });

  loadBest();
  resetWorld();
  draw();
})();
