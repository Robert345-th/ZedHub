import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const KEY = 'nexus_rush_mixamo_v1';
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
const CHAR_SCALE = 0.012;

function makeToonGradient() {
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
const toonGrad = makeToonGradient();
function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGrad });
}

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
let characterReady = false;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x7ec8ff);
renderer.shadowMap.enabled = true;
stage.insertBefore(renderer.domElement, hintEl);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa8dfff, 40, 110);
scene.background = new THREE.Color(0x7ec8ff);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
camera.position.set(0, 4.6, 9.2);
camera.lookAt(0, 1.4, -14);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const sun = new THREE.DirectionalLight(0xfff2cc, 1.2);
sun.position.set(6, 20, 8);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x9ad0ff, 0x88c070, 0.55));

const sunBall = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe566 }));
sunBall.position.set(14, 16, -40);
scene.add(sunBall);

function makeCloud(x, y, z, s) {
  const g = new THREE.Group();
  const mat = toon(0xffffff);
  [[0, 0], [1.2, 0.2], [-1.1, 0.15], [0.4, 0.55]].forEach(([ox, oy], i) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.7 + i * 0.08, 10, 10), mat);
    c.position.set(ox, oy, 0);
    g.add(c);
  });
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}
const clouds = [
  makeCloud(-10, 10, -20, 1.4),
  makeCloud(8, 12, -35, 1.8),
  makeCloud(-4, 11, -55, 1.2),
  makeCloud(12, 9, -70, 1.6),
];

const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, TRACK_LEN), toon(0x6ecf5a));
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.05, -TRACK_LEN / 2 + 10);
ground.receiveShadow = true;
scene.add(ground);

const platform = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.35, TRACK_LEN), toon(0xf0c27a));
platform.position.set(0, 0.1, -TRACK_LEN / 2 + 10);
platform.receiveShadow = true;
scene.add(platform);

function makeRail(x) {
  const g = new THREE.Group();
  const railMat = toon(0xe8eef8);
  [-0.2, 0.2].forEach((ox) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, TRACK_LEN), railMat);
    rail.position.set(ox, 0.3, -TRACK_LEN / 2 + 10);
    g.add(rail);
  });
  const tieMat = toon(0xc48a4a);
  for (let z = 0; z < TRACK_LEN; z += 1.5) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.28), tieMat);
    tie.position.set(0, 0.22, -z + 10);
    g.add(tie);
  }
  g.position.x = x;
  scene.add(g);
}
LANE_X.forEach(makeRail);

function buildCity() {
  const colors = [0xff8fab, 0x7dd3fc, 0xfde68a, 0xc4b5fd, 0x86efac, 0xfdba74];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 26; i++) {
      const h = 3.5 + Math.random() * 10;
      const w = 2 + Math.random() * 2.2;
      const d = 2 + Math.random() * 2.5;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(colors[(i + (side > 0 ? 3 : 0)) % colors.length]));
      mesh.position.set(side * (7.8 + Math.random() * 2.5), h / 2, -i * 7.5 - Math.random() * 2);
      mesh.castShadow = true;
      scene.add(mesh);
      buildings.push(mesh);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.35, d * 1.08), toon(0xffffff));
      roof.position.set(mesh.position.x, h + 0.15, mesh.position.z);
      scene.add(roof);
      buildings.push(roof);
    }
  }
}
buildCity();

// —— player (Mixamo) ——
const player = {
  lane: 1,
  x: 0,
  y: 0,
  jumpV: 0,
  jumping: false,
  sliding: false,
  slideT: 0,
  alive: true,
  root: new THREE.Group(),
  model: null,
  mixer: null,
  actions: {},
  current: null,
};
scene.add(player.root);

function playAnim(name, fade = 0.2) {
  if (!player.mixer || !player.actions[name]) return;
  const next = player.actions[name];
  if (player.current === next) return;
  if (player.current) player.current.fadeOut(fade);
  next.reset().fadeIn(fade).play();
  player.current = next;
}

async function loadCharacter() {
  const loader = new FBXLoader();
  hintEl.textContent = 'Loading character…';

  const runObj = await loader.loadAsync('./models/run.fbx');
  runObj.scale.setScalar(CHAR_SCALE);
  runObj.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  // Face away from camera / down the track (-Z)
  runObj.rotation.y = Math.PI;
  player.model = runObj;
  player.root.add(runObj);

  player.mixer = new THREE.AnimationMixer(runObj);
  if (runObj.animations && runObj.animations.length) {
    const clip = runObj.animations[0];
    player.actions.run = player.mixer.clipAction(clip);
    player.actions.run.setLoop(THREE.LoopRepeat);
  }

  // Jump clips from other FBX (same Mixamo character)
  try {
    const jumpObj = await loader.loadAsync('./models/jump.fbx');
    if (jumpObj.animations && jumpObj.animations.length) {
      const clip = jumpObj.animations[0];
      clip.name = 'jump';
      player.actions.jump = player.mixer.clipAction(clip);
      player.actions.jump.setLoop(THREE.LoopOnce);
      player.actions.jump.clampWhenFinished = true;
    }
  } catch (_) {}

  try {
    const bigObj = await loader.loadAsync('./models/bigjump.fbx');
    if (bigObj.animations && bigObj.animations.length && !player.actions.jump) {
      const clip = bigObj.animations[0];
      clip.name = 'jump';
      player.actions.jump = player.mixer.clipAction(clip);
      player.actions.jump.setLoop(THREE.LoopOnce);
      player.actions.jump.clampWhenFinished = true;
    }
  } catch (_) {}

  playAnim('run', 0);
  characterReady = true;
  hintEl.textContent = 'Swipe ← → · ↑ jump · ↓ slide';
  startBtn.disabled = false;
  startBtn.textContent = 'Start cartoon run';
}

function makeTrain(lane, z) {
  const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xa855f7];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const g = new THREE.Group();
  const car = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 5.2), toon(color));
  car.position.y = 1.15;
  car.castShadow = true;
  g.add(car);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.8), toon(0xf8fafc));
  nose.position.set(0, 0.9, 2.9);
  g.add(nose);
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return { type: 'train', lane, mesh: g, z, must: null };
}

function makeBarrier(lane, z, tall) {
  const g = new THREE.Group();
  const h = tall ? 2.0 : 1.1;
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.65, h, 0.7), toon(0xf59e0b));
  box.position.y = h / 2;
  box.castShadow = true;
  g.add(box);
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return { type: 'barrier', lane, mesh: g, z, tall, must: tall ? null : 'slide-ok' };
}

function makeJumpObs(lane, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 0.7), toon(0xef4444));
  mesh.position.set(LANE_X[lane], 0.28, z);
  mesh.castShadow = true;
  scene.add(mesh);
  return { type: 'jumpObs', lane, mesh, z, must: 'jump' };
}

function makeSlideObs(lane, z) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.5, 0.7), toon(0x6366f1));
  beam.position.y = 1.55;
  g.add(beam);
  [-0.7, 0.7].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.55, 8), toon(0x4338ca));
    post.position.set(x, 0.77, 0);
    g.add(post);
  });
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return { type: 'slideObs', lane, mesh: g, z, must: 'slide' };
}

function makeCoin(lane, z, y) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 18), toon(0xffd24a));
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
  if (Math.random() < 0.8) {
    const coinLane = Math.random() < 0.5 ? lane : Math.floor(Math.random() * 3);
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      entities.push(makeCoin(coinLane, z + 2 + i * 1.1, 1.05 + (Math.random() < 0.3 ? 0.85 : 0)));
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
  player.root.position.set(player.x, 0, 0);
  player.root.scale.set(1, 1, 1);
  player.root.rotation.set(0, 0, 0);
  score = 0;
  coins = 0;
  distance = 0;
  speed = 18;
  spawnAt = 35;
  scoreEl.textContent = '0';
  coinsEl.textContent = '0';
  playAnim('run', 0.1);
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
    player.jumpV = 10.2;
    playAnim('jump', 0.08);
  }
}

function slide() {
  if (!running || !player.alive) return;
  if (!player.jumping && !player.sliding) {
    player.sliding = true;
    player.slideT = 0.75;
    // no slide anim file — crouch scale
  }
}

function crash(msg) {
  if (!player.alive) return;
  player.alive = false;
  running = false;
  saveBest();
  overlay.hidden = false;
  overTitle.textContent = msg || 'Bonk!';
  overScore.textContent = `Score ${Math.floor(score)} · Coins ${coins}`;
  startBtn.textContent = 'Start cartoon run';
  hintEl.textContent = 'Tap Start to try again';
}

function start() {
  if (!characterReady) return;
  overlay.hidden = true;
  reset();
  running = true;
  clock.getDelta();
  startBtn.textContent = 'Running…';
}

function update(dt) {
  if (player.mixer) player.mixer.update(dt);
  if (!running || !player.alive) return;

  distance += speed * dt;
  score += speed * 0.9 * dt;
  speed = Math.min(40, 18 + distance * 0.032);
  scoreEl.textContent = String(Math.floor(score));

  const targetX = LANE_X[player.lane];
  player.x += (targetX - player.x) * Math.min(1, 14 * dt);

  if (player.jumping) {
    player.jumpV -= 30 * dt;
    player.y += player.jumpV * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.jumping = false;
      player.jumpV = 0;
      playAnim('run', 0.12);
    }
  }
  if (player.sliding) {
    player.slideT -= dt;
    if (player.slideT <= 0) {
      player.sliding = false;
      player.root.scale.set(1, 1, 1);
      player.root.rotation.x = 0;
    } else {
      player.root.scale.set(1, 0.55, 1);
      player.root.rotation.x = 0.45;
    }
  }

  player.root.position.set(player.x, player.y, 0);

  const dz = speed * dt;
  entities.forEach((e) => {
    e.z += dz;
    e.mesh.position.z = e.z;
    if (e.type === 'coin') e.mesh.rotation.z += dt * 7;
  });
  buildings.forEach((b) => {
    b.position.z += dz;
    if (b.position.z > 22) b.position.z -= 26 * 7.5;
  });
  clouds.forEach((c, i) => {
    c.position.z += dz * 0.25;
    if (c.position.z > 15) c.position.z -= 90;
  });

  spawnAt -= dz;
  while (spawnAt < 0) {
    spawnWave(-70 - Math.random() * 8);
    spawnAt += 10 + Math.random() * 5;
  }

  entities = entities.filter((e) => {
    if (e.z > 9) {
      scene.remove(e.mesh);
      return false;
    }
    const near = e.z > -1.2 && e.z < 1.45;
    const sameLane = e.lane === player.lane && Math.abs(player.x - LANE_X[e.lane]) < 0.9;

    if (e.type === 'coin' && !e.taken && sameLane && near) {
      const py = player.y + (player.sliding ? 0.35 : 1.15);
      if (Math.abs(py - e.y) < 0.95) {
        e.taken = true;
        coins += 1;
        coinsEl.textContent = String(coins);
        score += 12;
        scene.remove(e.mesh);
        return false;
      }
    }
    if (!sameLane || !near || e.type === 'coin') return true;
    if (e.must === 'jump') {
      if (!(player.jumping && player.y > 0.5)) crash('Jump!');
      return true;
    }
    if (e.must === 'slide') {
      if (!player.sliding) crash('Slide!');
      return true;
    }
    if (e.type === 'barrier' && !e.tall && player.sliding) return true;
    crash(e.type === 'train' ? 'Train!' : 'Bonk!');
    return true;
  });

  camera.position.x += (player.x * 0.4 - camera.position.x) * 0.1;
  camera.position.y = 4.6 + player.y * 0.28;
  camera.lookAt(player.x * 0.55, 1.4 + player.y * 0.35, -14);
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, clock.getDelta());
  update(dt);
  renderer.render(scene, camera);
}
loop();

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
loadCharacter().catch((err) => {
  console.error(err);
  hintEl.textContent = 'Could not load character files';
  startBtn.textContent = 'Load failed';
});
