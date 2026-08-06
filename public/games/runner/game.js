(function () {
  if (typeof THREE === 'undefined') {
    document.getElementById('hint').textContent = '3D engine failed to load';
    return;
  }

  const KEY = 'nexus_rush3d_v1';
  const stage = document.getElementById('stage');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const bestEl = document.getElementById('best');
  const hintEl = document.getElementById('hint');
  const overlay = document.getElementById('overlay');
  const overTitle = document.getElementById('overTitle');
  const overScore = document.getElementById('overScore');
  const startBtn = document.getElementById('startBtn');

  const LANE_X = [-2.2, 0, 2.2];
  const TRACK_LEN = 220;

  let best = 0;
  let running = false;
  let score = 0;
  let coins = 0;
  let speed = 18;
  let distance = 0;
  let spawnAt = 40;
  let clock = new THREE.Clock();
  let entities = [];
  let buildings = [];
  let rails = [];

  // —— scene ——
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b1220);
  renderer.shadowMap.enabled = true;
  stage.insertBefore(renderer.domElement, hintEl);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a2744, 28, 95);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 4.2, 8.5);
  camera.lookAt(0, 1.2, -12);

  // lights
  scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.15);
  sun.position.set(8, 18, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
  fill.position.set(-10, 6, -4);
  scene.add(fill);

  // sky backdrop
  const skyGeo = new THREE.SphereGeometry(120, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x243556,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // ground / rails area
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, TRACK_LEN),
    new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -TRACK_LEN / 2 + 10;
  ground.receiveShadow = true;
  scene.add(ground);

  // center platform
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.25, TRACK_LEN),
    new THREE.MeshStandardMaterial({ color: 0x3a4256, roughness: 0.9 })
  );
  platform.position.set(0, 0.05, -TRACK_LEN / 2 + 10);
  platform.receiveShadow = true;
  scene.add(platform);

  function makeRail(x) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8c0d0, metalness: 0.7, roughness: 0.35 });
    [-0.18, 0.18].forEach((ox) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, TRACK_LEN), mat);
      rail.position.set(ox, 0.2, -TRACK_LEN / 2 + 10);
      rail.castShadow = true;
      group.add(rail);
    });
    // ties
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x5c4030 });
    for (let z = 0; z < TRACK_LEN; z += 1.4) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.25), tieMat);
      tie.position.set(0, 0.14, -z + 10);
      group.add(tie);
    }
    group.position.x = x;
    scene.add(group);
    return group;
  }
  LANE_X.forEach((x) => rails.push(makeRail(x)));

  // city buildings
  function buildCity() {
    const colors = [0x151c2c, 0x1b2438, 0x10182a, 0x222b40];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 28; i++) {
        const h = 4 + Math.random() * 14;
        const w = 2.2 + Math.random() * 2.4;
        const d = 2 + Math.random() * 3;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.85 })
        );
        mesh.position.set(side * (7.5 + Math.random() * 3), h / 2, -i * 7 - Math.random() * 3);
        mesh.castShadow = true;
        scene.add(mesh);
        buildings.push(mesh);

        // lit windows
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.7, h * 0.7),
          new THREE.MeshBasicMaterial({
            color: 0xffd28a,
            transparent: true,
            opacity: 0.18 + Math.random() * 0.2,
          })
        );
        win.position.set(side * (7.5 + Math.random() * 3) - side * 0.01, h * 0.55, mesh.position.z);
        win.lookAt(0, h * 0.55, mesh.position.z);
        scene.add(win);
        buildings.push(win);
      }
    }
  }
  buildCity();

  // player
  const player = {
    lane: 1,
    x: 0,
    y: 0,
    jumpV: 0,
    jumping: false,
    sliding: false,
    slideT: 0,
    alive: true,
    mesh: null,
  };

  function makePlayer() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xff6a3d, roughness: 0.55 })
    );
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf8a })
    );
    head.position.y = 1.85;
    head.castShadow = true;
    g.add(head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    visor.position.set(0, 1.9, 0.18);
    g.add(visor);

    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.5, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    pack.position.set(0, 1.15, -0.28);
    g.add(pack);

    g.position.set(0, 0, 0);
    scene.add(g);
    player.mesh = g;
    player.body = body;
  }
  makePlayer();

  // entity factories
  function makeTrain(lane, z) {
    const color = Math.random() < 0.5 ? 0xc81e1e : 0x1f4fd6;
    const g = new THREE.Group();
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.1, 5.5),
      new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.55 })
    );
    car.position.y = 1.15;
    car.castShadow = true;
    g.add(car);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.15, 5.5),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    roof.position.y = 2.25;
    g.add(roof);
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.55, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xa8d8ff, emissive: 0x335566, emissiveIntensity: 0.3 })
    );
    win.position.set(0, 1.45, 2.75);
    g.add(win);
    g.position.set(LANE_X[lane], 0, z);
    scene.add(g);
    return { type: 'train', lane, mesh: g, z, hitY: [0, 2.2], must: null };
  }

  function makeBarrier(lane, z, tall) {
    const g = new THREE.Group();
    const h = tall ? 2.1 : 1.15;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, h, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    box.position.y = h / 2;
    box.castShadow = true;
    g.add(box);
    g.position.set(LANE_X[lane], 0, z);
    scene.add(g);
    return { type: 'barrier', lane, mesh: g, z, tall, hitY: [0, h], must: tall ? null : 'slide-ok' };
  }

  function makeJumpObs(lane, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.55, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xff6a3d })
    );
    mesh.position.set(LANE_X[lane], 0.28, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return { type: 'jumpObs', lane, mesh, z, hitY: [0, 0.6], must: 'jump' };
  }

  function makeSlideObs(lane, z) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.55, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x64748b })
    );
    beam.position.y = 1.55;
    beam.castShadow = true;
    g.add(beam);
    const postL = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.55, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    postL.position.set(-0.7, 0.77, 0);
    const postR = postL.clone();
    postR.position.x = 0.7;
    g.add(postL, postR);
    g.position.set(LANE_X[lane], 0, z);
    scene.add(g);
    return { type: 'slideObs', lane, mesh: g, z, hitY: [1.1, 2.1], must: 'slide' };
  }

  function makeCoin(lane, z, y) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffd24a,
        metalness: 0.7,
        roughness: 0.25,
        emissive: 0xaa7700,
        emissiveIntensity: 0.25,
      })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(LANE_X[lane], y, z);
    scene.add(mesh);
    return { type: 'coin', lane, mesh, z, y, taken: false };
  }

  function clearEntities() {
    entities.forEach((e) => scene.remove(e.mesh));
    entities = [];
  }

  function spawnWave(z) {
    const lane = Math.floor(Math.random() * 3);
    const roll = Math.random();
    if (roll < 0.24) entities.push(makeTrain(lane, z));
    else if (roll < 0.42) entities.push(makeBarrier(lane, z, Math.random() < 0.4));
    else if (roll < 0.58) entities.push(makeJumpObs(lane, z));
    else if (roll < 0.72) entities.push(makeSlideObs(lane, z));

    if (Math.random() < 0.75) {
      const coinLane = Math.random() < 0.5 ? lane : Math.floor(Math.random() * 3);
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        entities.push(makeCoin(coinLane, z + 2 + i * 1.1, 1.0 + (Math.random() < 0.3 ? 0.8 : 0)));
      }
    }
  }

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

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  function reset() {
    clearEntities();
    player.lane = 1;
    player.x = LANE_X[1];
    player.y = 0;
    player.jumpV = 0;
    player.jumping = false;
    player.sliding = false;
    player.slideT = 0;
    player.alive = true;
    player.mesh.position.set(player.x, 0, 0);
    player.mesh.scale.set(1, 1, 1);
    player.mesh.rotation.x = 0;
    score = 0;
    coins = 0;
    distance = 0;
    speed = 18;
    spawnAt = 35;
    scoreEl.textContent = '0';
    coinsEl.textContent = '0';
    hintEl.textContent = 'Swipe ← → · ↑ jump · ↓ slide';
    for (let i = 0; i < 8; i++) spawnWave(-25 - i * 12);
  }

  function switchLane(dir) {
    if (!running || !player.alive) return;
    player.lane = Math.max(0, Math.min(2, player.lane + dir));
  }

  function jump() {
    if (!running || !player.alive) return;
    if (!player.jumping && !player.sliding) {
      player.jumping = true;
      player.jumpV = 9.5;
    }
  }

  function slide() {
    if (!running || !player.alive) return;
    if (!player.jumping && !player.sliding) {
      player.sliding = true;
      player.slideT = 0.7;
    }
  }

  function crash(msg) {
    if (!player.alive) return;
    player.alive = false;
    running = false;
    saveBest();
    overlay.hidden = false;
    overTitle.textContent = msg || 'Wrecked!';
    overScore.textContent = `Score ${Math.floor(score)} · Coins ${coins}`;
    startBtn.textContent = 'Start 3D run';
    hintEl.textContent = 'Tap Start to try again';
  }

  function start() {
    overlay.hidden = true;
    reset();
    running = true;
    clock.getDelta();
    startBtn.textContent = 'Running…';
  }

  function update(dt) {
    if (!running || !player.alive) return;

    distance += speed * dt;
    score += speed * 0.9 * dt;
    speed = Math.min(42, 18 + distance * 0.035);
    scoreEl.textContent = String(Math.floor(score));

    // lane lerp
    const targetX = LANE_X[player.lane];
    player.x += (targetX - player.x) * Math.min(1, 12 * dt);

    // jump / slide
    if (player.jumping) {
      player.jumpV -= 28 * dt;
      player.y += player.jumpV * dt;
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

    const scaleY = player.sliding ? 0.45 : 1;
    player.mesh.scale.set(1, scaleY, 1);
    player.mesh.rotation.x = player.sliding ? 0.35 : Math.sin(distance * 0.4) * 0.04;
    player.mesh.position.set(player.x, player.y, 0);

    // move world toward player (entities + recycle buildings)
    const dz = speed * dt;
    entities.forEach((e) => {
      e.z += dz;
      e.mesh.position.z = e.z;
      if (e.type === 'coin') e.mesh.rotation.z += dt * 6;
    });

    buildings.forEach((b) => {
      b.position.z += dz;
      if (b.position.z > 20) b.position.z -= 28 * 7;
    });

    // spawn
    spawnAt -= dz;
    while (spawnAt < 0) {
      spawnWave(-70 - Math.random() * 8);
      spawnAt += 10 + Math.random() * 5;
    }

    // collisions
    const pz = 0;
    entities = entities.filter((e) => {
      if (e.z > 8) {
        scene.remove(e.mesh);
        return false;
      }

      const near = e.z > -1.2 && e.z < 1.4;
      const sameLane = e.lane === player.lane && Math.abs(player.x - LANE_X[e.lane]) < 0.85;

      if (e.type === 'coin' && !e.taken && sameLane && near) {
        const py = player.y + (player.sliding ? 0.4 : 1.1);
        if (Math.abs(py - e.y) < 0.9) {
          e.taken = true;
          coins += 1;
          coinsEl.textContent = String(coins);
          score += 10;
          scene.remove(e.mesh);
          return false;
        }
      }

      if (!sameLane || !near || e.type === 'coin') return true;

      if (e.must === 'jump') {
        if (!(player.jumping && player.y > 0.45)) crash('Jump it!');
        return true;
      }
      if (e.must === 'slide') {
        if (!player.sliding) crash('Slide under!');
        return true;
      }
      if (e.type === 'barrier' && !e.tall && player.sliding) return true;
      crash(e.type === 'train' ? 'Hit a train!' : 'Smashed!');
      return true;
    });

    // camera follow
    camera.position.x += (player.x * 0.35 - camera.position.x) * 0.08;
    camera.position.y = 4.2 + player.y * 0.25;
    camera.lookAt(player.x * 0.5, 1.2 + player.y * 0.3, -14);
  }

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, clock.getDelta());
    update(dt);
    renderer.render(scene, camera);
  }
  loop();

  // controls
  let sx = 0;
  let sy = 0;
  const el = renderer.domElement;

  function onDown(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    sx = t.clientX;
    sy = t.clientY;
  }
  function onUp(e) {
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

  el.addEventListener('touchstart', onDown, { passive: true });
  el.addEventListener('touchend', onUp, { passive: true });
  el.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);

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
})();
