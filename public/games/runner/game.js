import * as THREE from 'three';

const KEY = 'nexus_rush_v2';
const stage = document.getElementById('stage');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const bestEl = document.getElementById('best');
const hintEl = document.getElementById('hint');
const overlay = document.getElementById('overlay');
const overTitle = document.getElementById('overTitle');
const overKicker = document.getElementById('overKicker');
const overLead = document.getElementById('overLead');
const overScores = document.getElementById('overScores');
const overScoreVal = document.getElementById('overScoreVal');
const overCoinsVal = document.getElementById('overCoinsVal');
const startBtn = document.getElementById('startBtn');
const againBtn = document.getElementById('againBtn');

const LANE_X = [-2.15, 0, 2.15];
const TRACK_LEN = 240;
const GROUND_Y = 0.32;
const HERO_H = 1.72;

function makeToonGradient() {
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 230, 230, 230, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
const toonGrad = makeToonGradient();
function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...opts });
}

function windowTex(w = 64, h = 96, wall = '#5a7a9a', lit = '#ffe9a0') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = wall;
  g.fillRect(0, 0, w, h);
  const cols = 3;
  const rows = 5;
  const mw = w / (cols + 1);
  const mh = h / (rows + 1);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g.fillStyle = Math.random() > 0.35 ? lit : '#1a2433';
      g.fillRect(mw * 0.35 + x * mw, mh * 0.35 + y * mh, mw * 0.55, mh * 0.5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function asphaltTex() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4f58';
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
    g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }
  g.strokeStyle = '#f5d76e';
  g.lineWidth = 4;
  g.setLineDash([18, 16]);
  g.beginPath();
  g.moveTo(64, 0);
  g.lineTo(64, 256);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, TRACK_LEN / 12);
  return tex;
}

let best = 0;
let running = false;
let score = 0;
let coins = 0;
let speed = 17;
let distance = 0;
let spawnAt = 40;
let clock = new THREE.Clock();
let entities = [];
let cityChunks = [];
let characterReady = false;
let bobT = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x6ec4ff);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.insertBefore(renderer.domElement, hintEl);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8fd0ff, 35, 95);
scene.background = new THREE.Color(0x6ec4ff);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 180);
camera.position.set(0, 5.1, 10.2);
camera.lookAt(0, 1.5, -12);

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
sun.position.set(8, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -10;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x9ad8ff, 0x6a9a50, 0.55));

const sunBall = new THREE.Mesh(
  new THREE.SphereGeometry(3.4, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xffe066 })
);
sunBall.position.set(16, 18, -45);
scene.add(sunBall);

function makeCloud(x, y, z, s) {
  const g = new THREE.Group();
  const mat = toon(0xffffff);
  [[0, 0, 0.85], [1.15, 0.15, 0.7], [-1.05, 0.1, 0.7], [0.35, 0.5, 0.55]].forEach(([ox, oy, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), mat);
    c.position.set(ox, oy, 0);
    g.add(c);
  });
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}
const clouds = [
  makeCloud(-11, 11, -18, 1.5),
  makeCloud(9, 13, -32, 1.9),
  makeCloud(-5, 12, -52, 1.3),
  makeCloud(13, 10, -68, 1.7),
  makeCloud(-14, 14, -88, 1.4),
];

// —— World ——
const grass = new THREE.Mesh(new THREE.PlaneGeometry(48, TRACK_LEN), toon(0x63c45a));
grass.rotation.x = -Math.PI / 2;
grass.position.set(0, -0.02, -TRACK_LEN / 2 + 12);
grass.receiveShadow = true;
scene.add(grass);

const trackMat = new THREE.MeshToonMaterial({
  map: asphaltTex(),
  gradientMap: toonGrad,
  color: 0xffffff,
});
const track = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.28, TRACK_LEN), trackMat);
track.position.set(0, 0.12, -TRACK_LEN / 2 + 12);
track.receiveShadow = true;
scene.add(track);

const curbMat = toon(0xd9dde6);
[-3.95, 3.95].forEach((x) => {
  const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.42, TRACK_LEN), curbMat);
  curb.position.set(x, 0.2, -TRACK_LEN / 2 + 12);
  curb.receiveShadow = true;
  scene.add(curb);
});

function makeLaneRails(x) {
  const g = new THREE.Group();
  const steel = toon(0xc5d0e0);
  [-0.22, 0.22].forEach((ox) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, TRACK_LEN), steel);
    rail.position.set(ox, 0.3, -TRACK_LEN / 2 + 12);
    g.add(rail);
  });
  const wood = toon(0xa86b3c);
  for (let z = 0; z < TRACK_LEN; z += 1.35) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.22), wood);
    tie.position.set(0, 0.24, -z + 12);
    g.add(tie);
  }
  g.position.x = x;
  scene.add(g);
}
LANE_X.forEach(makeLaneRails);

function makeBuilding(side, i) {
  const g = new THREE.Group();
  const h = 4 + Math.random() * 11;
  const w = 2.2 + Math.random() * 2.4;
  const d = 2.2 + Math.random() * 2.8;
  const walls = ['#ff8fab', '#7dd3fc', '#fde68a', '#c4b5fd', '#86efac', '#fdba74', '#f9a8d4'];
  const wallHex = walls[(i + (side > 0 ? 2 : 0)) % walls.length];
  const tex = windowTex(64, 96, wallHex, Math.random() > 0.5 ? '#ffe9a0' : '#b8e0ff');
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGrad, color: 0xffffff })
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.28, d * 1.08), toon(0xfff7ed));
  roof.position.y = h + 0.12;
  g.add(roof);

  if (Math.random() > 0.55) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.55, 0.12), toon(0xff6a3d));
    sign.position.set(0, h * 0.55, d / 2 + 0.08);
    g.add(sign);
  }

  const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.12, 0.7), toon(0xffffff));
  awning.position.set(0, 2.1, d / 2 + 0.25);
  g.add(awning);

  g.position.set(side * (8.2 + Math.random() * 2.2), 0, -i * 7.2 - Math.random() * 1.5);
  scene.add(g);
  cityChunks.push(g);
}

function buildCity() {
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 28; i++) makeBuilding(side, i);
  }
}
buildCity();

// —— Stylized Nexus hero (no gray mannequin) ——
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
  parts: null,
  hitH: HERO_H,
};
scene.add(player.root);

function addMesh(parent, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.x = rx;
  m.castShadow = true;
  parent.add(m);
  return m;
}

function buildHero() {
  const root = new THREE.Group();
  const skin = 0xffc9a3;
  const hoodie = 0xff6a3d;
  const hoodieDark = 0xe0451a;
  const pants = 0x2d3a55;
  const shoe = 0xf5f5f5;
  const hair = 0x2a1810;

  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  addMesh(torso, new THREE.CapsuleGeometry(0.28, 0.42, 6, 12), hoodie, 0, 0.28, 0);
  addMesh(torso, new THREE.BoxGeometry(0.62, 0.18, 0.52), hoodieDark, 0, 0.02, 0); // hem
  addMesh(torso, new THREE.BoxGeometry(0.22, 0.28, 0.08), 0xffe8d6, 0, 0.42, 0.26); // pocket
  // NX badge
  addMesh(torso, new THREE.BoxGeometry(0.18, 0.14, 0.04), 0xffffff, 0.16, 0.38, 0.27);

  const head = new THREE.Group();
  head.position.y = 0.72;
  torso.add(head);
  addMesh(head, new THREE.SphereGeometry(0.26, 16, 16), skin, 0, 0.08, 0);
  addMesh(head, new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.14, -0.02, 1, 1, 1.05);
  addMesh(head, new THREE.SphereGeometry(0.09, 8, 8), hair, -0.08, 0.3, -0.02);
  addMesh(head, new THREE.SphereGeometry(0.07, 8, 8), hair, 0.1, 0.28, 0.02);
  // eyes
  addMesh(head, new THREE.SphereGeometry(0.055, 10, 10), 0xffffff, -0.08, 0.1, 0.2);
  addMesh(head, new THREE.SphereGeometry(0.055, 10, 10), 0xffffff, 0.08, 0.1, 0.2);
  addMesh(head, new THREE.SphereGeometry(0.028, 8, 8), 0x1a0f0a, -0.08, 0.1, 0.245);
  addMesh(head, new THREE.SphereGeometry(0.028, 8, 8), 0x1a0f0a, 0.08, 0.1, 0.245);
  addMesh(head, new THREE.CapsuleGeometry(0.02, 0.06, 3, 6), 0xe07070, 0, 0.02, 0.24, 1, 1, 1, Math.PI / 2);

  function makeArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.34, 0.48, 0);
    torso.add(arm);
    addMesh(arm, new THREE.CapsuleGeometry(0.09, 0.28, 4, 8), hoodie, 0, -0.18, 0);
    const forearm = new THREE.Group();
    forearm.position.y = -0.38;
    arm.add(forearm);
    addMesh(forearm, new THREE.CapsuleGeometry(0.075, 0.24, 4, 8), skin, 0, -0.14, 0);
    addMesh(forearm, new THREE.SphereGeometry(0.09, 8, 8), skin, 0, -0.32, 0);
    return { arm, forearm };
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  function makeLeg(sign) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.14, 0, 0);
    hips.add(leg);
    addMesh(leg, new THREE.CapsuleGeometry(0.11, 0.28, 4, 8), pants, 0, -0.28, 0);
    const shin = new THREE.Group();
    shin.position.y = -0.52;
    leg.add(shin);
    addMesh(shin, new THREE.CapsuleGeometry(0.09, 0.28, 4, 8), pants, 0, -0.16, 0);
    addMesh(shin, new THREE.BoxGeometry(0.2, 0.12, 0.32), shoe, 0, -0.38, 0.04);
    addMesh(shin, new THREE.BoxGeometry(0.2, 0.05, 0.1), 0xff6a3d, 0, -0.32, 0.14);
    return { leg, shin };
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Face camera-forward is +Z in local; we run toward -Z so rotate PI
  root.rotation.y = Math.PI;

  return {
    root,
    hips,
    torso,
    head,
    leftArm: leftArm.arm,
    rightArm: rightArm.arm,
    leftFore: leftArm.forearm,
    rightFore: rightArm.forearm,
    leftLeg: leftLeg.leg,
    rightLeg: rightLeg.leg,
    leftShin: leftLeg.shin,
    rightShin: rightLeg.shin,
  };
}

function animateHero(dt) {
  const p = player.parts;
  if (!p) return;
  bobT += dt * (player.jumping ? 0 : speed * 0.55);

  const run = !player.jumping && !player.sliding;
  const swing = run ? Math.sin(bobT * 2.2) : 0;
  const bob = run ? Math.abs(Math.sin(bobT * 2.2)) * 0.05 : 0;

  p.hips.position.y = 0.92 + bob + (player.sliding ? -0.35 : 0);
  p.hips.rotation.x = player.sliding ? 1.15 : player.jumping ? -0.15 : 0.08;
  p.torso.rotation.x = player.sliding ? 0.2 : 0.06;
  p.torso.rotation.z = run ? swing * 0.04 : 0;
  p.head.rotation.x = player.sliding ? -0.35 : player.jumping ? 0.1 : -0.05;

  const armAmp = player.jumping ? 0.4 : player.sliding ? 0.15 : 0.85;
  p.leftArm.rotation.x = swing * armAmp + (player.jumping ? -0.8 : 0);
  p.rightArm.rotation.x = -swing * armAmp + (player.jumping ? -0.8 : 0);
  p.leftArm.rotation.z = 0.25;
  p.rightArm.rotation.z = -0.25;
  p.leftFore.rotation.x = run ? -0.6 - swing * 0.3 : -0.4;
  p.rightFore.rotation.x = run ? -0.6 + swing * 0.3 : -0.4;

  const legAmp = player.jumping ? 0.35 : player.sliding ? 0.1 : 0.95;
  p.leftLeg.rotation.x = -swing * legAmp + (player.jumping ? -0.5 : player.sliding ? 0.4 : 0);
  p.rightLeg.rotation.x = swing * legAmp + (player.jumping ? 0.35 : player.sliding ? 0.4 : 0);
  p.leftShin.rotation.x = run ? Math.max(0, -swing) * 0.7 : player.sliding ? 0.5 : 0.2;
  p.rightShin.rotation.x = run ? Math.max(0, swing) * 0.7 : player.sliding ? 0.5 : 0.2;
}

function syncPlayerPose() {
  const baseY = GROUND_Y + player.y;
  if (player.sliding) {
    player.root.position.set(player.x, baseY + 0.05, 0);
    player.hitH = 0.7;
  } else {
    player.root.position.set(player.x, baseY, 0);
    player.hitH = HERO_H;
  }
}

function initHero() {
  player.parts = buildHero();
  player.root.add(player.parts.root);
  syncPlayerPose();
  characterReady = true;
  hintEl.textContent = 'Swipe ← → · ↑ jump · ↓ slide';
  startBtn.disabled = false;
  startBtn.textContent = 'Start run';
  showMenu(true);
}

// —— Obstacles ——
function makeTrain(lane, z) {
  const colors = [0xef4444, 0x2563eb, 0x16a34a, 0x9333ea];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.85, 5.4), toon(color));
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.22, 5.42), toon(0xffffff));
  stripe.position.y = 1.35;
  g.add(stripe);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.4), toon(0x1e293b));
  cabin.position.set(0, 2.15, 1.6);
  g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.08), toon(0x7dd3fc));
  glass.position.set(0, 2.2, 2.32);
  g.add(glass);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.7), toon(0xf8fafc));
  nose.position.set(0, 0.85, 2.95);
  g.add(nose);
  [-0.45, 0.45].forEach((ox) => {
    [-1.6, 0.2, 1.8].forEach((oz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12), toon(0x1f2937));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(ox, 0.28, oz);
      g.add(wheel);
    });
  });
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return { type: 'train', lane, mesh: g, z, must: null, hitTop: 2.2, hitBot: 0 };
}

function makeBarrier(lane, z, tall) {
  const g = new THREE.Group();
  const h = tall ? 1.9 : 1.05;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.55, h, 0.28), toon(0xf59e0b));
  board.position.y = h / 2;
  board.castShadow = true;
  g.add(board);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.14, 0.3), toon(i % 2 ? 0x111827 : 0xf8fafc));
    stripe.position.y = 0.2 + i * 0.28;
    g.add(stripe);
  }
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return {
    type: 'barrier',
    lane,
    mesh: g,
    z,
    tall,
    must: tall ? null : 'slide-ok',
    hitTop: h,
    hitBot: 0,
  };
}

function makeJumpObs(lane, z) {
  const g = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.9), toon(0xdc2626));
  crate.position.y = 0.32;
  crate.castShadow = true;
  g.add(crate);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.1, 0.95), toon(0xfca5a5));
  lid.position.y = 0.62;
  g.add(lid);
  const warn = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), toon(0xfbbf24));
  warn.position.y = 0.7;
  g.add(warn);
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return { type: 'jumpObs', lane, mesh: g, z, must: 'jump', hitTop: 0.7, hitBot: 0 };
}

function makeSlideObs(lane, z) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.45), toon(0x6366f1));
  beam.position.y = 1.55;
  beam.castShadow = true;
  g.add(beam);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.12, 0.47), toon(0xfbbf24));
  stripe.position.y = 1.55;
  g.add(stripe);
  [-0.75, 0.75].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.55, 10), toon(0x312e81));
    post.position.set(x, 0.77, 0);
    g.add(post);
  });
  g.position.set(LANE_X[lane], 0, z);
  scene.add(g);
  return { type: 'slideObs', lane, mesh: g, z, must: 'slide', hitTop: 2.0, hitBot: 1.2 };
}

function makeCoin(lane, z, y) {
  const g = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20), toon(0xffc53d));
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  g.add(coin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 20), toon(0xffe9a0));
  rim.rotation.y = Math.PI / 2;
  g.add(rim);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
  core.position.z = 0.05;
  g.add(core);
  g.position.set(LANE_X[lane], y, z);
  scene.add(g);
  return { type: 'coin', lane, mesh: g, z, y, taken: false };
}

function clearEntities() {
  entities.forEach((e) => scene.remove(e.mesh));
  entities = [];
}

function spawnWave(z) {
  const lane = Math.floor(Math.random() * 3);
  const roll = Math.random();
  if (roll < 0.22) entities.push(makeTrain(lane, z));
  else if (roll < 0.4) entities.push(makeBarrier(lane, z, Math.random() < 0.45));
  else if (roll < 0.58) entities.push(makeJumpObs(lane, z));
  else if (roll < 0.74) entities.push(makeSlideObs(lane, z));
  if (Math.random() < 0.85) {
    const coinLane = Math.random() < 0.55 ? lane : Math.floor(Math.random() * 3);
    const n = 4 + Math.floor(Math.random() * 4);
    const high = Math.random() < 0.28;
    for (let i = 0; i < n; i++) {
      entities.push(makeCoin(coinLane, z + 1.8 + i * 1.05, high ? 1.85 : 1.15));
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

function showMenu(first) {
  overlay.hidden = false;
  overScores.hidden = first;
  startBtn.hidden = !first;
  againBtn.hidden = first;
  if (first) {
    overKicker.textContent = 'Nexus Games';
    overTitle.textContent = 'Rush';
    overLead.textContent = 'Dash three lanes, snag gold, and keep your sneakers off the trains.';
  }
}

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
  bobT = 0;
  syncPlayerPose();
  score = 0;
  coins = 0;
  distance = 0;
  speed = 17;
  spawnAt = 32;
  scoreEl.textContent = '0';
  coinsEl.textContent = '0';
  for (let i = 0; i < 9; i++) spawnWave(-22 - i * 11);
}

function switchLane(dir) {
  if (!running || !player.alive) return;
  player.lane = Math.max(0, Math.min(2, player.lane + dir));
}

function jump() {
  if (!running || !player.alive) return;
  if (!player.jumping && !player.sliding) {
    player.jumping = true;
    player.jumpV = 9.6;
  }
}

function slide() {
  if (!running || !player.alive) return;
  if (!player.jumping && !player.sliding) {
    player.sliding = true;
    player.slideT = 0.7;
  }
}

const CRASH = {
  train: { title: 'Train wreck', lead: 'That carriage wasn’t yielding.' },
  jump: { title: 'Trip hazard', lead: 'Jump the crates — sneakers over wood.' },
  slide: { title: 'Head check', lead: 'Slide under the beam next time.' },
  barrier: { title: 'Roadblock', lead: 'Wrong lane — or wrong height.' },
  default: { title: 'Wiped out', lead: 'Shake it off and go again.' },
};

function crash(kind) {
  if (!player.alive) return;
  player.alive = false;
  running = false;
  saveBest();
  const info = CRASH[kind] || CRASH.default;
  overKicker.textContent = 'Run over';
  overTitle.textContent = info.title;
  overLead.textContent = info.lead;
  overScoreVal.textContent = String(Math.floor(score));
  overCoinsVal.textContent = String(coins);
  overScores.hidden = false;
  startBtn.hidden = true;
  againBtn.hidden = false;
  overlay.hidden = false;
  hintEl.textContent = 'Tap to run again';
}

function start() {
  if (!characterReady) return;
  overlay.hidden = true;
  reset();
  running = true;
  clock.getDelta();
  hintEl.textContent = 'Swipe ← → · ↑ jump · ↓ slide';
}

function playerBodyRange() {
  const base = GROUND_Y + player.y;
  if (player.sliding) return { bot: base, top: base + 0.75 };
  return { bot: base, top: base + player.hitH };
}

function hitsObstacle(e) {
  const body = playerBodyRange();
  const top = e.hitTop ?? 2;
  const bot = e.hitBot ?? 0;
  return body.top > bot + 0.05 && body.bot < top - 0.05;
}

function update(dt) {
  animateHero(dt);
  if (!running || !player.alive) {
    syncPlayerPose();
    return;
  }

  distance += speed * dt;
  score += speed * 0.95 * dt;
  speed = Math.min(38, 17 + distance * 0.03);
  scoreEl.textContent = String(Math.floor(score));

  const targetX = LANE_X[player.lane];
  player.x += (targetX - player.x) * Math.min(1, 16 * dt);

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

  syncPlayerPose();

  const dz = speed * dt;
  entities.forEach((e) => {
    e.z += dz;
    e.mesh.position.z = e.z;
    if (e.type === 'coin') {
      e.mesh.rotation.y += dt * 5;
      e.mesh.position.y = e.y + Math.sin(distance * 0.2 + e.z) * 0.06;
    }
  });
  cityChunks.forEach((b) => {
    b.position.z += dz;
    if (b.position.z > 24) b.position.z -= 28 * 7.2;
  });
  clouds.forEach((c) => {
    c.position.z += dz * 0.22;
    if (c.position.z > 16) c.position.z -= 100;
  });

  spawnAt -= dz;
  while (spawnAt < 0) {
    spawnWave(-72 - Math.random() * 6);
    spawnAt += 9.5 + Math.random() * 4.5;
  }

  entities = entities.filter((e) => {
    if (e.z > 10) {
      scene.remove(e.mesh);
      return false;
    }
    const near = e.z > -1.05 && e.z < 1.25;
    const sameLane = e.lane === player.lane && Math.abs(player.x - LANE_X[e.lane]) < 0.85;

    if (e.type === 'coin' && !e.taken && sameLane && near) {
      const body = playerBodyRange();
      if (e.y < body.top + 0.25 && e.y > body.bot - 0.2) {
        e.taken = true;
        coins += 1;
        coinsEl.textContent = String(coins);
        score += 14;
        scene.remove(e.mesh);
        return false;
      }
    }
    if (!sameLane || !near || e.type === 'coin') return true;

    if (e.must === 'jump') {
      if (!(player.jumping && player.y > 0.55)) crash('jump');
      return true;
    }
    if (e.must === 'slide') {
      if (!player.sliding) crash('slide');
      return true;
    }
    if (e.type === 'barrier' && !e.tall && player.sliding) return true;
    if (!hitsObstacle(e)) return true;
    crash(e.type === 'train' ? 'train' : 'barrier');
    return true;
  });

  camera.position.x += (player.x * 0.42 - camera.position.x) * 0.12;
  camera.position.y = 5.1 + player.y * 0.25;
  camera.lookAt(player.x * 0.5, 1.55 + player.y * 0.3, -12);
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
againBtn.addEventListener('click', start);

loadBest();
initHero();
