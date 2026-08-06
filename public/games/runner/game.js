import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  const data = new Uint8Array([55, 55, 55, 255, 120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
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
function toonMap(map, color = 0xffffff, opts = {}) {
  return new THREE.MeshToonMaterial({ map, color, gradientMap: toonGrad, ...opts });
}

function canvasTex(draw, w = 128, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function windowTex(w = 128, h = 192, wall = '#5a7a9a', lit = '#ffe9a0') {
  return canvasTex((g, W, H) => {
    g.fillStyle = wall;
    g.fillRect(0, 0, W, H);
    // subtle plaster noise
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    const cols = 4;
    const rows = 6;
    const mw = W / (cols + 0.6);
    const mh = H / (rows + 0.8);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const on = Math.random() > 0.32;
        g.fillStyle = '#1a2433';
        g.fillRect(mw * 0.28 + x * mw, mh * 0.35 + y * mh, mw * 0.55, mh * 0.48);
        g.fillStyle = on ? lit : '#243044';
        g.fillRect(mw * 0.32 + x * mw, mh * 0.4 + y * mh, mw * 0.47, mh * 0.38);
        if (on) {
          g.fillStyle = 'rgba(255,255,220,0.35)';
          g.fillRect(mw * 0.32 + x * mw, mh * 0.4 + y * mh, mw * 0.47, mh * 0.12);
        }
      }
    }
  }, w, h);
}

function asphaltTex() {
  const tex = canvasTex((g, W, H) => {
    g.fillStyle = '#3f4550';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1200; i++) {
      const n = Math.random();
      g.fillStyle = n > 0.5 ? `rgba(255,255,255,${n * 0.04})` : `rgba(0,0,0,${n * 0.14})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // lane edges
    g.strokeStyle = '#e8ecf2';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(10, H);
    g.moveTo(W - 10, 0);
    g.lineTo(W - 10, H);
    g.stroke();
    // dashed center
    g.strokeStyle = '#f5d76e';
    g.lineWidth = 5;
    g.setLineDash([22, 18]);
    g.beginPath();
    g.moveTo(W / 2, 0);
    g.lineTo(W / 2, H);
    g.stroke();
  }, 128, 256);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, TRACK_LEN / 14);
  return tex;
}

function grassTex() {
  const tex = canvasTex((g, W, H) => {
    g.fillStyle = '#4fb24a';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2000; i++) {
      g.fillStyle = Math.random() > 0.5 ? '#63c45a' : '#3d9a42';
      g.fillRect(Math.random() * W, Math.random() * H, 2, 3 + Math.random() * 4);
    }
  }, 128, 128);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, TRACK_LEN / 8);
  return tex;
}

/** Cartoon fabric / skin maps for the runner (not a flat gray dummy). */
function hoodieTex() {
  return canvasTex((g, W, H) => {
    g.fillStyle = '#ff6a3d';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    g.fillStyle = '#e0451a';
    g.fillRect(0, H * 0.72, W, H * 0.28);
    g.fillStyle = '#fff4e8';
    g.font = 'bold 42px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('NX', W * 0.55, H * 0.42);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 3;
    g.strokeRect(W * 0.18, H * 0.18, W * 0.64, H * 0.48);
  }, 128, 128);
}
function skinTex() {
  return canvasTex((g, W, H) => {
    const grd = g.createRadialGradient(W * 0.4, H * 0.35, 8, W * 0.5, H * 0.5, W * 0.7);
    grd.addColorStop(0, '#ffd7b8');
    grd.addColorStop(1, '#f0a888');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(232, 120, 100, 0.18)';
    g.beginPath();
    g.ellipse(W * 0.32, H * 0.55, 14, 10, 0, 0, Math.PI * 2);
    g.ellipse(W * 0.68, H * 0.55, 14, 10, 0, 0, Math.PI * 2);
    g.fill();
  }, 64, 64);
}
function pantsTex() {
  return canvasTex((g, W, H) => {
    g.fillStyle = '#2a3650';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1, 3);
    }
    g.fillStyle = '#1a2238';
    g.fillRect(W * 0.45, 0, W * 0.1, H);
  }, 64, 64);
}
function shoeTex() {
  return canvasTex((g, W, H) => {
    g.fillStyle = '#f7f7f7';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff6a3d';
    g.fillRect(0, H * 0.55, W, H * 0.2);
    g.fillStyle = '#1a0f0a';
    g.fillRect(0, H * 0.82, W, H * 0.18);
  }, 64, 32);
}
function hairTex() {
  return canvasTex((g, W, H) => {
    g.fillStyle = '#2a1810';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 200; i++) {
      g.strokeStyle = `rgba(80,40,20,${0.15 + Math.random() * 0.25})`;
      g.beginPath();
      g.moveTo(Math.random() * W, Math.random() * H);
      g.lineTo(Math.random() * W, Math.random() * H);
      g.stroke();
    }
  }, 64, 64);
}

function damp(a, b, lambda, dt) {
  return THREE.MathUtils.damp(a, b, lambda, dt);
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
// Visual-only blend weights (does not change jump/slide gameplay flags)
const animBlend = { slide: 0, jump: 0, runAmp: 1, lean: 0, stretch: 0 };

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x79c8ff);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.insertBefore(renderer.domElement, hintEl);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x79c8ff, 42, 105);
scene.background = new THREE.Color(0x79c8ff);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 180);
camera.position.set(0, 5.1, 10.2);
camera.lookAt(0, 1.5, -12);

scene.add(new THREE.AmbientLight(0xfff5ea, 0.55));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.55);
sun.position.set(6, 24, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.035;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -8;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xa8d9ff, 0x6aaa4a, 0.7));
const fill = new THREE.DirectionalLight(0xb8d4ff, 0.35);
fill.position.set(-10, 8, -4);
scene.add(fill);

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
const grass = new THREE.Mesh(new THREE.PlaneGeometry(48, TRACK_LEN), toonMap(grassTex()));
grass.rotation.x = -Math.PI / 2;
grass.position.set(0, -0.02, -TRACK_LEN / 2 + 12);
grass.receiveShadow = true;
scene.add(grass);

const track = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.28, TRACK_LEN), toonMap(asphaltTex()));
track.position.set(0, 0.12, -TRACK_LEN / 2 + 12);
track.receiveShadow = true;
scene.add(track);

const curbMat = toon(0xd9dde6);
[-3.95, 3.95].forEach((x) => {
  const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.42, TRACK_LEN), curbMat);
  curb.position.set(x, 0.2, -TRACK_LEN / 2 + 12);
  curb.receiveShadow = true;
  curb.castShadow = true;
  scene.add(curb);
});

function makeLaneRails(x) {
  const g = new THREE.Group();
  const steel = toon(0xc5d0e0);
  [-0.22, 0.22].forEach((ox) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, TRACK_LEN), steel);
    rail.position.set(ox, 0.3, -TRACK_LEN / 2 + 12);
    rail.castShadow = true;
    rail.receiveShadow = true;
    g.add(rail);
  });
  const wood = toon(0xa86b3c);
  for (let z = 0; z < TRACK_LEN; z += 1.35) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.22), wood);
    tie.position.set(0, 0.24, -z + 12);
    tie.receiveShadow = true;
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
  const tex = windowTex(128, 192, wallHex, Math.random() > 0.5 ? '#ffe9a0' : '#b8e0ff');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toonMap(tex));
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.28, d * 1.08), toon(0xfff7ed));
  roof.position.y = h + 0.12;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  if (Math.random() > 0.55) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.55, 0.12), toon(0xff6a3d));
    sign.position.set(0, h * 0.55, d / 2 + 0.08);
    sign.castShadow = true;
    g.add(sign);
  }

  const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.12, 0.7), toon(0xffffff));
  awning.position.set(0, 2.1, d / 2 + 0.25);
  awning.castShadow = true;
  awning.receiveShadow = true;
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
  glb: false,
};
scene.add(player.root);

function addMesh(parent, geo, matOrColor, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) {
  const mat = typeof matOrColor === 'number' ? toon(matOrColor) : matOrColor;
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.x = rx;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildHero() {
  const root = new THREE.Group();
  const matHoodie = toonMap(hoodieTex());
  const matHoodieDark = toon(0xe0451a);
  const matSkin = toonMap(skinTex());
  const matPants = toonMap(pantsTex());
  const matShoe = toonMap(shoeTex());
  const matHair = toonMap(hairTex());
  const matWhite = toon(0xffffff);
  const matInk = toon(0x1a0f0a);
  const matCheek = toon(0xe07070);

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  addMesh(torso, new THREE.CapsuleGeometry(0.29, 0.44, 8, 14), matHoodie, 0, 0.28, 0);
  addMesh(torso, new THREE.BoxGeometry(0.64, 0.16, 0.54), matHoodieDark, 0, 0.02, 0);
  addMesh(torso, new THREE.BoxGeometry(0.24, 0.3, 0.08), toon(0xffe8d6), 0, 0.42, 0.27);
  addMesh(torso, new THREE.BoxGeometry(0.2, 0.15, 0.05), matWhite, 0.17, 0.38, 0.28);
  // hood
  addMesh(torso, new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matHoodie, 0, 0.62, -0.12, 1.05, 0.85, 1);

  const head = new THREE.Group();
  head.position.y = 0.74;
  torso.add(head);
  addMesh(head, new THREE.SphereGeometry(0.27, 18, 18), matSkin, 0, 0.08, 0);
  addMesh(head, new THREE.SphereGeometry(0.29, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), matHair, 0, 0.15, -0.03, 1, 1, 1.06);
  addMesh(head, new THREE.SphereGeometry(0.1, 10, 10), matHair, -0.09, 0.32, -0.02);
  addMesh(head, new THREE.SphereGeometry(0.08, 10, 10), matHair, 0.11, 0.3, 0.02);
  addMesh(head, new THREE.SphereGeometry(0.058, 12, 12), matWhite, -0.085, 0.1, 0.21);
  addMesh(head, new THREE.SphereGeometry(0.058, 12, 12), matWhite, 0.085, 0.1, 0.21);
  addMesh(head, new THREE.SphereGeometry(0.03, 10, 10), matInk, -0.085, 0.1, 0.255);
  addMesh(head, new THREE.SphereGeometry(0.03, 10, 10), matInk, 0.085, 0.1, 0.255);
  addMesh(head, new THREE.CapsuleGeometry(0.02, 0.07, 4, 8), matCheek, 0, 0.02, 0.25, 1, 1, 1, Math.PI / 2);

  function makeArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.36, 0.5, 0);
    torso.add(arm);
    addMesh(arm, new THREE.CapsuleGeometry(0.095, 0.3, 6, 10), matHoodie, 0, -0.2, 0);
    const forearm = new THREE.Group();
    forearm.position.y = -0.4;
    arm.add(forearm);
    addMesh(forearm, new THREE.CapsuleGeometry(0.08, 0.26, 6, 10), matSkin, 0, -0.15, 0);
    addMesh(forearm, new THREE.SphereGeometry(0.095, 10, 10), matSkin, 0, -0.34, 0);
    return { arm, forearm };
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  function makeLeg(sign) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.15, 0, 0);
    hips.add(leg);
    addMesh(leg, new THREE.CapsuleGeometry(0.115, 0.3, 6, 10), matPants, 0, -0.3, 0);
    const shin = new THREE.Group();
    shin.position.y = -0.55;
    leg.add(shin);
    addMesh(shin, new THREE.CapsuleGeometry(0.095, 0.28, 6, 10), matPants, 0, -0.16, 0);
    // Slight lift so soles clear the asphalt (visual only)
    addMesh(shin, new THREE.BoxGeometry(0.22, 0.12, 0.34), matShoe, 0, -0.36, 0.05);
    addMesh(shin, new THREE.BoxGeometry(0.22, 0.05, 0.1), toon(0xff6a3d), 0, -0.3, 0.16);
    return { leg, shin };
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

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

  animBlend.slide = damp(animBlend.slide, player.sliding ? 1 : 0, 12, dt);
  animBlend.jump = damp(animBlend.jump, player.jumping ? 1 : 0, 10, dt);
  const grounded = 1 - Math.max(animBlend.slide, animBlend.jump * 0.85);
  animBlend.runAmp = damp(animBlend.runAmp, grounded, 9, dt);

  // Lean into lane changes (visual only — player.x / collision unchanged)
  const laneDelta = LANE_X[player.lane] - player.x;
  animBlend.lean = damp(animBlend.lean, THREE.MathUtils.clamp(laneDelta * 0.42, -0.5, 0.5), 11, dt);

  // Jump stretch from vertical velocity (visual only)
  const stretchTarget = player.jumping
    ? THREE.MathUtils.clamp(player.jumpV * 0.035, -0.12, 0.14)
    : 0;
  animBlend.stretch = damp(animBlend.stretch, stretchTarget, 14, dt);

  const pace = player.jumping ? 0 : speed * 0.58;
  bobT += dt * pace;

  const swing = Math.sin(bobT * 2.2) * animBlend.runAmp;
  const bob = Math.abs(Math.sin(bobT * 2.2)) * 0.055 * animBlend.runAmp;
  const s = animBlend.slide;
  const j = animBlend.jump;
  const lean = animBlend.lean;

  // Meshy mesh is a static dancer — bob, lean, jump & slide as one body
  if (player.glb) {
    const rig = p.rig;
    const bodyBob = bob * 1.35 + 0.025 * Math.sin(bobT * 4.4) * animBlend.runAmp;
    const yTarget = bodyBob - 0.1 * s + 0.08 * j + animBlend.stretch * 0.15;
    const rxTarget = 0.12 * animBlend.runAmp + 1.05 * s - 0.22 * j;
    const rzTarget = swing * 0.14 + lean;
    const ryTarget = lean * 0.55;
    const syTarget = 1 - 0.18 * s + 0.06 * j + animBlend.stretch;
    const sxTarget = 1 + 0.1 * s - animBlend.stretch * 0.5 + Math.abs(lean) * 0.08;
    const szTarget = 1 + 0.06 * s - animBlend.stretch * 0.35;

    rig.position.y = damp(rig.position.y, yTarget, 16, dt);
    rig.rotation.x = damp(rig.rotation.x, rxTarget, 12, dt);
    rig.rotation.y = damp(rig.rotation.y, ryTarget, 12, dt);
    rig.rotation.z = damp(rig.rotation.z, rzTarget, 12, dt);
    rig.scale.y = damp(rig.scale.y, syTarget, 13, dt);
    rig.scale.x = damp(rig.scale.x, sxTarget, 13, dt);
    rig.scale.z = damp(rig.scale.z, szTarget, 13, dt);
    return;
  }

  const hipsY = 0.95 + bob - 0.32 * s + 0.04 * j;
  const hipsRx = 0.06 * animBlend.runAmp + 1.05 * s - 0.12 * j;
  const torsoRx = 0.05 * animBlend.runAmp + 0.18 * s + 0.04 * j;
  const torsoRz = swing * 0.045 + lean * 0.6;
  const headRx = -0.04 * animBlend.runAmp - 0.32 * s + 0.08 * j;

  p.hips.position.y = damp(p.hips.position.y, hipsY, 18, dt);
  p.hips.rotation.x = damp(p.hips.rotation.x, hipsRx, 16, dt);
  p.torso.rotation.x = damp(p.torso.rotation.x, torsoRx, 16, dt);
  p.torso.rotation.z = damp(p.torso.rotation.z, torsoRz, 14, dt);
  p.head.rotation.x = damp(p.head.rotation.x, headRx, 14, dt);

  const armAmp = 0.9 * animBlend.runAmp + 0.35 * j + 0.12 * s;
  const armJump = -0.75 * j;
  p.leftArm.rotation.x = damp(p.leftArm.rotation.x, swing * armAmp + armJump, 16, dt);
  p.rightArm.rotation.x = damp(p.rightArm.rotation.x, -swing * armAmp + armJump, 16, dt);
  p.leftArm.rotation.z = damp(p.leftArm.rotation.z, 0.22 + 0.15 * s, 12, dt);
  p.rightArm.rotation.z = damp(p.rightArm.rotation.z, -0.22 - 0.15 * s, 12, dt);
  p.leftFore.rotation.x = damp(p.leftFore.rotation.x, -0.55 * animBlend.runAmp - swing * 0.28 * animBlend.runAmp - 0.25 * j - 0.15 * s, 14, dt);
  p.rightFore.rotation.x = damp(p.rightFore.rotation.x, -0.55 * animBlend.runAmp + swing * 0.28 * animBlend.runAmp - 0.25 * j - 0.15 * s, 14, dt);

  const legAmp = 0.92 * animBlend.runAmp + 0.3 * j;
  p.leftLeg.rotation.x = damp(p.leftLeg.rotation.x, -swing * legAmp - 0.45 * j + 0.35 * s, 16, dt);
  p.rightLeg.rotation.x = damp(p.rightLeg.rotation.x, swing * legAmp + 0.3 * j + 0.35 * s, 16, dt);
  p.leftShin.rotation.x = damp(p.leftShin.rotation.x, Math.max(0, -swing) * 0.65 * animBlend.runAmp + 0.45 * s + 0.15 * j, 14, dt);
  p.rightShin.rotation.x = damp(p.rightShin.rotation.x, Math.max(0, swing) * 0.65 * animBlend.runAmp + 0.45 * s + 0.15 * j, 14, dt);
}

/**
 * Meshy "Neon City Dancers" packs 3 figures in one mesh.
 * Keep only the center dancer by clustering triangle centroids on X.
 */
function extractSingleDancer(geometry) {
  const src = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = src.attributes.position;
  const triCount = pos.count / 3;
  if (triCount < 3) return geometry;

  const centroids = new Float32Array(triCount);
  let xmin = Infinity;
  let xmax = -Infinity;
  for (let t = 0; t < triCount; t++) {
    const i = t * 3;
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    centroids[t] = cx;
    if (cx < xmin) xmin = cx;
    if (cx > xmax) xmax = cx;
  }

  // 3-means on X
  let c0 = xmin + (xmax - xmin) * 0.2;
  let c1 = (xmin + xmax) * 0.5;
  let c2 = xmin + (xmax - xmin) * 0.8;
  for (let iter = 0; iter < 10; iter++) {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let t = 0; t < triCount; t++) {
      const x = centroids[t];
      const d0 = Math.abs(x - c0);
      const d1 = Math.abs(x - c1);
      const d2 = Math.abs(x - c2);
      if (d0 <= d1 && d0 <= d2) {
        s0 += x;
        n0++;
      } else if (d1 <= d2) {
        s1 += x;
        n1++;
      } else {
        s2 += x;
        n2++;
      }
    }
    if (n0) c0 = s0 / n0;
    if (n1) c1 = s1 / n1;
    if (n2) c2 = s2 / n2;
  }

  const centers = [
    { c: c0, i: 0 },
    { c: c1, i: 1 },
    { c: c2, i: 2 },
  ].sort((a, b) => a.c - b.c);
  const midId = centers[1].i;
  const midC = centers[1].c;

  const keep = [];
  for (let t = 0; t < triCount; t++) {
    const x = centroids[t];
    const d0 = Math.abs(x - c0);
    const d1 = Math.abs(x - c1);
    const d2 = Math.abs(x - c2);
    let id = 2;
    if (d0 <= d1 && d0 <= d2) id = 0;
    else if (d1 <= d2) id = 1;
    if (id === midId) keep.push(t);
  }

  // Fallback: keep triangles near median center if clustering failed
  if (keep.length < triCount * 0.15) {
    keep.length = 0;
    for (let t = 0; t < triCount; t++) {
      if (Math.abs(centroids[t] - midC) < (xmax - xmin) * 0.18) keep.push(t);
    }
  }
  if (!keep.length) return geometry;

  const newPos = new Float32Array(keep.length * 9);
  for (let k = 0; k < keep.length; k++) {
    const t = keep[k];
    const srcI = t * 9;
    const dstI = k * 9;
    for (let j = 0; j < 9; j++) newPos[dstI + j] = pos.array[srcI + j];
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
  out.computeVertexNormals();
  out.computeBoundingBox();
  // Center on X/Z so the single dancer sits in-lane
  const bb = out.boundingBox;
  const ox = (bb.min.x + bb.max.x) * 0.5;
  const oz = (bb.min.z + bb.max.z) * 0.5;
  const arr = out.attributes.position.array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i] -= ox;
    arr[i + 2] -= oz;
  }
  out.attributes.position.needsUpdate = true;
  out.computeBoundingBox();
  out.computeVertexNormals();
  return out;
}

/** Paint neon vertex colors on Meshy geometry (export has no materials/UVs). */
function styleMeshyMesh(mesh) {
  mesh.geometry = extractSingleDancer(mesh.geometry);
  const geo = mesh.geometry;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(0.001, maxY - minY);
  const cA = new THREE.Color(0xff2d95);
  const cB = new THREE.Color(0x7c3aed);
  const cC = new THREE.Color(0x22d3ee);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / span;
    if (t < 0.55) tmp.copy(cA).lerp(cB, t / 0.55);
    else tmp.copy(cB).lerp(cC, (t - 0.55) / 0.45);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: toonGrad,
    emissive: new THREE.Color(0x3b0764),
    emissiveIntensity: 0.4,
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

function fitGlbToTrack(model) {
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const targetH = HERO_H;
  const s = targetH / Math.max(0.001, size.y);
  model.scale.setScalar(s);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  model.position.y = -box.min.y + 0.02;
  model.rotation.y = Math.PI;
}

function mountProceduralHero() {
  player.glb = false;
  player.parts = buildHero();
  player.root.clear();
  player.root.add(player.parts.root);
}

function mountGlbHero(sceneRoot) {
  const rig = new THREE.Group();
  const wrap = new THREE.Group();
  // Only keep / style the first mesh (single dancer after extract)
  let used = false;
  sceneRoot.traverse((c) => {
    if (!c.isMesh) return;
    if (used) {
      c.visible = false;
      return;
    }
    styleMeshyMesh(c);
    used = true;
  });
  wrap.add(sceneRoot);
  fitGlbToTrack(wrap);
  rig.add(wrap);
  player.root.clear();
  player.root.add(rig);
  player.glb = true;
  player.parts = { root: wrap, rig, mesh: sceneRoot };
}

function syncPlayerPose() {
  const baseY = GROUND_Y + player.y;
  // Soft visual settle into slide height without changing hit logic abruptly
  const slideLift = 0.05 * animBlend.slide;
  player.root.position.set(player.x, baseY + slideLift, 0);
  player.hitH = player.sliding ? 0.7 : HERO_H;
}

function finishHeroReady() {
  syncPlayerPose();
  characterReady = true;
  hintEl.textContent = 'Swipe ← → · ↑ jump · ↓ slide';
  startBtn.disabled = false;
  startBtn.textContent = 'Start run';
  showMenu(true);
}

async function initHero() {
  hintEl.textContent = 'Loading dancer…';
  startBtn.disabled = true;
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('./models/runner.glb');
    mountGlbHero(gltf.scene);
  } catch (err) {
    console.warn('GLB load failed, using procedural hero', err);
    mountProceduralHero();
  }
  finishHeroReady();
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
  animBlend.slide = 0;
  animBlend.jump = 0;
  animBlend.runAmp = 1;
  animBlend.lean = 0;
  animBlend.stretch = 0;
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
  // Same lane targeting — damp feels smoother than a hard lerp factor
  player.x = damp(player.x, targetX, 14, dt);

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
initHero().catch((err) => {
  console.error(err);
  hintEl.textContent = 'Could not load character';
  startBtn.textContent = 'Load failed';
});
