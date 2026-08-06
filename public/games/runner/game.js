(function () {
  const KEY = 'nexus_rush_v2';
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const bestEl = document.getElementById('best');
  const hintEl = document.getElementById('hint');
  const overlay = document.getElementById('overlay');
  const overTitle = document.getElementById('overTitle');
  const overScore = document.getElementById('overScore');
  const startBtn = document.getElementById('startBtn');

  const W = canvas.width;
  const H = canvas.height;
  const LANES = [-1, 0, 1];
  const LANE_W = 1.15;
  const HORIZON = 108;
  const FOCAL = 280;
  const CAM_Y = 1.35;

  let best = 0;
  let running = false;
  let score = 0;
  let coins = 0;
  let speed = 0.22;
  let distance = 0;
  let raf = 0;
  let player;
  let entities = [];
  let spawnZ = 28;
  let shake = 0;
  let cityOffset = 0;

  function loadBest() {
    try {
      best = Number(localStorage.getItem(KEY) || 0) || 0;
    } catch (_) {
      best = 0;
    }
    bestEl.textContent = String(best);
  }

  function saveBest() {
    const s = Math.floor(score);
    if (s > best) {
      best = s;
      bestEl.textContent = String(best);
      try {
        localStorage.setItem(KEY, String(best));
      } catch (_) {}
    }
  }

  function project(x, y, z) {
    const zz = Math.max(0.35, z);
    const scale = FOCAL / (FOCAL * 0.08 + zz * 18);
    const px = W / 2 + x * scale * 78;
    const py = HORIZON + (CAM_Y - y) * scale * 90 + zz * 3.2;
    return { x: px, y: py, s: scale };
  }

  function reset() {
    player = {
      lane: 0,
      x: 0,
      y: 0,
      z: 2.2,
      jumpV: 0,
      jumping: false,
      sliding: false,
      slideT: 0,
      runT: 0,
      alive: true,
    };
    entities = [];
    spawnZ = 26;
    score = 0;
    coins = 0;
    distance = 0;
    speed = 0.24;
    shake = 0;
    cityOffset = 0;
    scoreEl.textContent = '0';
    coinsEl.textContent = '0';
    hintEl.textContent = 'Swipe ← → · ↑ jump · ↓ slide';
    // seed track
    for (let i = 0; i < 10; i++) spawnWave(18 + i * 7);
  }

  function spawnWave(z) {
    const roll = Math.random();
    const lane = LANES[Math.floor(Math.random() * 3)];

    if (roll < 0.22) {
      // train blocking one lane
      entities.push({
        type: 'train',
        lane,
        x: lane * LANE_W,
        y: 0,
        z,
        len: 4.2 + Math.random() * 2,
        color: Math.random() < 0.5 ? '#c81e1e' : '#1f4fd6',
      });
    } else if (roll < 0.42) {
      // barrier / gate
      entities.push({
        type: 'barrier',
        lane,
        x: lane * LANE_W,
        y: 0,
        z,
        tall: Math.random() < 0.45,
      });
    } else if (roll < 0.62) {
      // low barrier (must jump) or high (must slide)
      entities.push({
        type: Math.random() < 0.5 ? 'jumpObs' : 'slideObs',
        lane,
        x: lane * LANE_W,
        y: 0,
        z,
      });
    }

    // coins arcs
    if (Math.random() < 0.7) {
      const coinLane = Math.random() < 0.55 ? lane : LANES[Math.floor(Math.random() * 3)];
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        entities.push({
          type: 'coin',
          lane: coinLane,
          x: coinLane * LANE_W,
          y: 0.55 + (Math.random() < 0.25 ? 0.7 : 0),
          z: z + 1.2 + i * 0.85,
          taken: false,
          spin: Math.random() * Math.PI,
        });
      }
    }
  }

  function switchLane(dir) {
    if (!running || !player.alive) return;
    const next = Math.max(-1, Math.min(1, player.lane + dir));
    if (next !== player.lane) player.lane = next;
  }

  function jump() {
    if (!running || !player.alive) return;
    if (!player.jumping && !player.sliding) {
      player.jumping = true;
      player.jumpV = 0.2;
    }
  }

  function slide() {
    if (!running || !player.alive) return;
    if (!player.jumping && !player.sliding) {
      player.sliding = true;
      player.slideT = 0.55;
    }
  }

  function start() {
    overlay.hidden = true;
    reset();
    running = true;
    player.alive = true;
    startBtn.textContent = 'Running…';
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function crash(reason) {
    if (!player.alive) return;
    player.alive = false;
    running = false;
    shake = 10;
    saveBest();
    overlay.hidden = false;
    overTitle.textContent = reason || 'Wrecked!';
    overScore.textContent = `Score ${Math.floor(score)} · Coins ${coins}`;
    startBtn.textContent = 'Start run';
    hintEl.textContent = 'Tap Start to try again';
  }

  function update(dt) {
    if (!running || !player.alive) return;

    distance += speed * 60 * dt;
    score += speed * 55 * dt;
    speed = Math.min(0.58, 0.24 + distance * 0.00045);
    cityOffset += speed * 40 * dt;
    scoreEl.textContent = String(Math.floor(score));

    // lane lerp
    const targetX = player.lane * LANE_W;
    player.x += (targetX - player.x) * Math.min(1, 14 * dt);

    // jump / slide
    if (player.jumping) {
      player.jumpV -= 0.55 * dt;
      player.y += player.jumpV;
      if (player.y <= 0) {
        player.y = 0;
        player.jumping = false;
        player.jumpV = 0;
      }
    }
    if (player.sliding) {
      player.slideT -= dt;
      if (player.slideT <= 0) player.sliding = false;
    }
    player.runT += dt * (8 + speed * 10);

    // move world toward camera
    const dz = speed * 60 * dt;
    for (const e of entities) e.z -= dz;

    // spawn ahead
    spawnZ -= dz;
    while (spawnZ < 55) {
      spawnWave(spawnZ + 8 + Math.random() * 4);
      spawnZ += 6.5 + Math.random() * 3.5;
    }

    // collisions + cleanup
    entities = entities.filter((e) => {
      if (e.z < -1.5) return false;

      const sameLane = Math.abs(e.x - player.x) < 0.55;
      const near = e.z > 1.2 && e.z < 3.1;

      if (e.type === 'coin' && !e.taken && sameLane && near) {
        const py = player.sliding ? 0.25 : player.y + 0.55;
        if (Math.abs(py - e.y) < 0.7) {
          e.taken = true;
          coins += 1;
          coinsEl.textContent = String(coins);
          score += 8;
          return false;
        }
      }

      if (!sameLane || !near) return true;

      if (e.type === 'train' || e.type === 'barrier') {
        if (player.sliding && e.type === 'barrier' && !e.tall) return true;
        crash(e.type === 'train' ? 'Hit a train!' : 'Smashed!');
        return true;
      }
      if (e.type === 'jumpObs') {
        if (!player.jumping || player.y < 0.35) crash('Jump it!');
        return true;
      }
      if (e.type === 'slideObs') {
        if (!player.sliding) crash('Slide under!');
        return true;
      }
      return true;
    });

    if (shake > 0) shake *= 0.85;
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    g.addColorStop(0, '#1a2744');
    g.addColorStop(0.45, '#3a5078');
    g.addColorStop(1, '#7a93b8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // sun glow
    const sg = ctx.createRadialGradient(W * 0.72, 78, 4, W * 0.72, 78, 90);
    sg.addColorStop(0, 'rgba(255, 200, 120, 0.55)');
    sg.addColorStop(1, 'rgba(255, 160, 80, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, HORIZON + 40);
  }

  function drawCity() {
    ctx.save();
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 14; i++) {
        const z = ((i * 7 + cityOffset * 0.04 * side) % 90) + 4;
        const p = project(side * 3.4, 0, z);
        const bw = 46 * p.s;
        const bh = (70 + ((i * 37) % 90)) * p.s;
        ctx.fillStyle = i % 2 ? '#1b2438' : '#141c2e';
        ctx.fillRect(p.x - bw / 2, p.y - bh, bw, bh);
        // windows
        ctx.fillStyle = 'rgba(255, 214, 120, 0.35)';
        for (let wy = 8; wy < bh - 8; wy += 10) {
          for (let wx = 6; wx < bw - 6; wx += 9) {
            if (((i + wx + wy) % 5) === 0) continue;
            ctx.fillRect(p.x - bw / 2 + wx, p.y - bh + wy, 4 * p.s, 4 * p.s);
          }
        }
      }
    }
    ctx.restore();
  }

  function drawTrack() {
    // perspective track quad
    const nearL = project(-1.7, 0, 1.2);
    const nearR = project(1.7, 0, 1.2);
    const farL = project(-1.7, 0, 40);
    const farR = project(1.7, 0, 40);

    const g = ctx.createLinearGradient(0, HORIZON, 0, H);
    g.addColorStop(0, '#3a4558');
    g.addColorStop(1, '#232b3a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(farL.x, farL.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(nearL.x, nearL.y);
    ctx.closePath();
    ctx.fill();

    // lane lines
    for (const laneX of [-0.55, 0.55]) {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let z = 1.2; z < 38; z += 0.8) {
        const dashOn = Math.floor((z + distance * 0.08) * 1.4) % 2 === 0;
        if (!dashOn) continue;
        const a = project(laneX, 0.02, z);
        const b = project(laneX, 0.02, z + 0.45);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }

    // sleepers / stripes for speed feel
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let z = 1.5; z < 36; z += 1.1) {
      const zz = (z + (distance * 0.15) % 1.1);
      const a = project(-1.55, 0, zz);
      const b = project(1.55, 0, zz);
      const c = project(1.55, 0, zz + 0.18);
      const d = project(-1.55, 0, zz + 0.18);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.fill();
    }
  }

  function drawBox(x, y, z, w, h, d, color, topColor) {
    // approximate 3D box facing camera
    const front = [
      project(x - w / 2, y, z),
      project(x + w / 2, y, z),
      project(x + w / 2, y + h, z),
      project(x - w / 2, y + h, z),
    ];
    const back = [
      project(x - w / 2, y, z + d),
      project(x + w / 2, y, z + d),
      project(x + w / 2, y + h, z + d),
      project(x - w / 2, y + h, z + d),
    ];

    // top
    ctx.fillStyle = topColor || '#ffffff55';
    ctx.beginPath();
    ctx.moveTo(front[3].x, front[3].y);
    ctx.lineTo(front[2].x, front[2].y);
    ctx.lineTo(back[2].x, back[2].y);
    ctx.lineTo(back[3].x, back[3].y);
    ctx.fill();

    // front face
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(front[0].x, front[0].y);
    ctx.lineTo(front[1].x, front[1].y);
    ctx.lineTo(front[2].x, front[2].y);
    ctx.lineTo(front[3].x, front[3].y);
    ctx.fill();

    // side
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.moveTo(front[1].x, front[1].y);
    ctx.lineTo(back[1].x, back[1].y);
    ctx.lineTo(back[2].x, back[2].y);
    ctx.lineTo(front[2].x, front[2].y);
    ctx.fill();
  }

  function drawEntities() {
    const sorted = entities.slice().sort((a, b) => b.z - a.z);
    for (const e of sorted) {
      if (e.type === 'coin') {
        if (e.taken) continue;
        e.spin += 0.12;
        const p = project(e.x, e.y, e.z);
        const r = Math.max(3, 10 * p.s);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(0.55 + Math.abs(Math.cos(e.spin)) * 0.45, 1);
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a0';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (e.type === 'train') {
        drawBox(e.x, 0, e.z, 0.95, 1.35, e.len, e.color, '#ffffff33');
        // windows
        const p = project(e.x, 0.85, e.z + 0.4);
        ctx.fillStyle = 'rgba(180,220,255,0.55)';
        ctx.fillRect(p.x - 14 * p.s, p.y - 10 * p.s, 28 * p.s, 14 * p.s);
        continue;
      }

      if (e.type === 'barrier') {
        const h = e.tall ? 1.35 : 0.85;
        drawBox(e.x, 0, e.z, 0.9, h, 0.55, '#8b5a2b', '#c48a4a');
        continue;
      }

      if (e.type === 'jumpObs') {
        drawBox(e.x, 0, e.z, 0.9, 0.42, 0.5, '#ff6a3d', '#ffb089');
        continue;
      }

      if (e.type === 'slideObs') {
        // overhead beam
        drawBox(e.x, 0.75, e.z, 0.95, 0.55, 0.45, '#4b5568', '#9ca3af');
      }
    }
  }

  function drawPlayer() {
    const y = player.y + (player.sliding ? 0 : 0);
    const h = player.sliding ? 0.55 : 1.05;
    const bob = player.jumping ? 0 : Math.sin(player.runT) * 0.04;
    const p = project(player.x, y + bob, player.z);
    const s = p.s;

    // shadow
    const sh = project(player.x, 0.02, player.z);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, 18 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    const bw = 22 * s;
    const bh = (player.sliding ? 28 : 52) * s;
    const x = p.x - bw / 2;
    const yy = p.y - bh;

    // legs
    if (!player.sliding) {
      const swing = Math.sin(player.runT) * 8 * s;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 4 * s, yy + bh - 18 * s, 6 * s, 18 * s + swing);
      ctx.fillRect(x + bw - 10 * s, yy + bh - 18 * s, 6 * s, 18 * s - swing);
    }

    // torso
    const tg = ctx.createLinearGradient(x, yy, x, yy + bh);
    tg.addColorStop(0, '#ff8f5c');
    tg.addColorStop(1, '#e04520');
    ctx.fillStyle = tg;
    ctx.fillRect(x + 2 * s, yy + (player.sliding ? 4 : 12) * s, bw - 4 * s, (player.sliding ? 18 : 26) * s);

    // head
    ctx.fillStyle = '#fbbf8a';
    ctx.beginPath();
    ctx.arc(p.x, yy + 10 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();
    // visor / hair
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p.x - 9 * s, yy + 4 * s, 18 * s, 5 * s);

    // arms
    if (!player.sliding) {
      const swing = Math.sin(player.runT + Math.PI) * 7 * s;
      ctx.fillStyle = '#fbbf8a';
      ctx.fillRect(x - 3 * s, yy + 16 * s + swing, 5 * s, 14 * s);
      ctx.fillRect(x + bw - 2 * s, yy + 16 * s - swing, 5 * s, 14 * s);
    }
  }

  function drawSpeedLines() {
    if (speed < 0.3) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const x = (i * 47 + distance * 2) % W;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.55);
      ctx.lineTo(x - 18, H);
      ctx.stroke();
    }
  }

  function render() {
    ctx.save();
    if (shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawSky();
    drawCity();
    drawTrack();
    drawEntities();
    drawPlayer();
    drawSpeedLines();
    ctx.restore();
  }

  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.033, (ts - last) / 1000);
    last = ts;
    update(dt);
    render();
    if (running && player.alive) raf = requestAnimationFrame(loop);
    else if (shake > 0.4) {
      render();
      raf = requestAnimationFrame(loop);
    }
  }

  // controls
  let sx = 0;
  let sy = 0;
  function onStart(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    sx = t.clientX;
    sy = t.clientY;
  }
  function onEnd(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (!running) {
      start();
      return;
    }
    if (Math.abs(dx) < 28 && Math.abs(dy) < 28) {
      jump();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) switchLane(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
    else slide();
  }

  canvas.addEventListener('touchstart', onStart, { passive: true });
  canvas.addEventListener('touchend', onEnd, { passive: true });
  canvas.addEventListener('mousedown', onStart);
  window.addEventListener('mouseup', onEnd);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') switchLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd') switchLane(1);
    if (e.key === 'ArrowUp' || e.key === 'w' || e.code === 'Space') {
      e.preventDefault();
      if (!running) start();
      else jump();
    }
    if (e.key === 'ArrowDown' || e.key === 's') slide();
  });

  startBtn.addEventListener('click', start);
  document.getElementById('againBtn').addEventListener('click', start);

  loadBest();
  reset();
  render();
})();
