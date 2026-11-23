import * as THREE from "three";
import { CONFIG } from "./config.js";

const canvas = document.querySelector("#view");
const titleEl = document.querySelector("#title");
const goalEl = document.querySelector("#goal");
const scoreEl = document.querySelector("#score");
const card = document.querySelector("#card");
const cardTitle = document.querySelector("#card-title");
const cardBody = document.querySelector("#card-body");
const cardGo = document.querySelector("#card-go");
const pauseBtn = document.querySelector("#pause");
const leftBtn = document.querySelector("#left");
const rightBtn = document.querySelector("#right");
const throwBtn = document.querySelector("#throw");
const resetBtn = document.querySelector("#reset");
const soundBtn = document.querySelector("#sound");

titleEl.textContent = CONFIG.title;
goalEl.textContent = CONFIG.goalText || "";
document.title = CONFIG.title;

const clips = new Map();
for (const [name, file] of Object.entries(CONFIG.sounds || {})) {
  if (!file) continue;
  const audio = new Audio(file);
  audio.preload = "auto";
  clips.set(name, audio);
}
let soundOn = true;
let soundUnlocked = false;
function paintSound() {
  soundBtn.textContent = soundOn ? "Sound" : "Quiet";
  soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
}
paintSound();
function unlockSound() {
  if (soundUnlocked) return;
  soundUnlocked = true;
  for (const audio of clips.values()) {
    audio.muted = true;
    const pending = audio.play();
    const release = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    };
    if (pending && pending.then) pending.then(release).catch(release);
    else release();
  }
}
function playSound(name) {
  if (!soundOn) return;
  const audio = clips.get(name);
  if (!audio) return;
  audio.muted = false;
  audio.volume = CONFIG.soundVolume ?? 0.85;
  try { audio.currentTime = 0; } catch { /* replay from the start when the browser allows it */ }
  audio.play().catch(() => {});
}
window.addEventListener("pointerdown", unlockSound, true);
window.addEventListener("keydown", unlockSound, true);
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  paintSound();
  if (!soundOn) {
    for (const audio of clips.values()) audio.pause();
    return;
  }
  playSound("throw");
});

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "low-power",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.sky);
const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
camera.position.set(0, 8.4, -7.6);
camera.lookAt(0, -0.35, 5.4);

scene.add(new THREE.AmbientLight(0xffffff, 0.78));
const sun = new THREE.DirectionalLight(0xfff4d8, 0.85);
sun.position.set(-6, 14, 4);
scene.add(sun);

const sand = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 22),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.sand }),
);
sand.rotation.x = -Math.PI / 2;
sand.position.set(0, 0.015, -2.4);
scene.add(sand);

const water = new THREE.Mesh(
  new THREE.CircleGeometry(9.4, 28),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.water }),
);
water.rotation.x = -Math.PI / 2;
water.position.set(0, 0, 9.8);
scene.add(water);

const deep = new THREE.Mesh(
  new THREE.CircleGeometry(6.6, 24),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.waterDeep }),
);
deep.rotation.x = -Math.PI / 2;
deep.position.set(0, 0.012, 10.4);
scene.add(deep);

const petalMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.flower });
const heartMat = new THREE.MeshLambertMaterial({ color: "#f2d34a" });
const markerMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.stone });
function makeFlower(x, y, z, turn) {
  const group = new THREE.Group();
  for (let i = 0; i < 6; i += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), petalMat);
    const a = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.28, 0.1, Math.sin(a) * 0.28);
    petal.scale.set(1, 0.42, 0.65);
    group.add(petal);
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), heartMat);
  heart.position.y = 0.16;
  group.add(heart);
  group.position.set(x, y, z);
  group.rotation.y = turn;
  scene.add(group);
  return group;
}
const pads = CONFIG.pads.map((spec, index) => {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(spec.radius, 16),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.pad }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(spec.x, spec.y, spec.z);
  scene.add(mesh);
  const flower = makeFlower(spec.x, spec.y, spec.z, index * 0.7);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), markerMat);
  marker.scale.set(1.15, 0.45, 0.9);
  marker.position.set(spec.x, spec.y + 0.22, spec.z - 0.42);
  marker.visible = false;
  scene.add(marker);
  return { ...spec, mesh, flower, marker, reached: false };
});

const leafMat = new THREE.MeshLambertMaterial({ color: "#9aaa52" });
function floatingLeaves(x, z, turn) {
  const clump = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.05, 4), leafMat);
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = i * 0.55;
    leaf.scale.set(0.22, 1, 0.1);
    leaf.position.set((i - 1) * 0.12, 0.03, i * 0.05);
    clump.add(leaf);
  }
  clump.position.set(x, 0.05, z);
  clump.rotation.y = turn;
  scene.add(clump);
}
floatingLeaves(-4.6, 6.2, 0.5);
floatingLeaves(5.3, 7.2, -0.7);
floatingLeaves(-5.2, 11.4, 0.9);

const reedMat = new THREE.MeshLambertMaterial({ color: "#2f8f4e" });
for (const clump of [[-3.6, -0.8], [3.7, -0.45], [-4.1, 0.7]]) {
  for (let i = 0; i < 3; i += 1) {
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.85, 5), reedMat);
    reed.position.set(clump[0] + (i - 1) * 0.16, 0.4, clump[1] + i * 0.07);
    reed.scale.y = 0.75 + i * 0.28;
    scene.add(reed);
  }
}

const rock = new THREE.Mesh(
  new THREE.DodecahedronGeometry(0.26, 0),
  new THREE.MeshLambertMaterial({ color: "#c4b49a" }),
);
rock.position.set(2.7, 0.16, 0.15);
rock.rotation.y = 0.6;
scene.add(rock);

const fish = new THREE.Group();
const fishBody = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 8, 6),
  new THREE.MeshLambertMaterial({ color: "#e07a3d" }),
);
fishBody.scale.set(1.7, 0.5, 0.7);
const fishTail = new THREE.Mesh(
  new THREE.ConeGeometry(0.1, 0.2, 4),
  new THREE.MeshLambertMaterial({ color: "#c45e28" }),
);
fishTail.rotation.z = Math.PI / 2;
fishTail.position.x = -0.3;
fish.add(fishBody, fishTail);
scene.add(fish);

function swimFish(t) {
  const a = t * 0.4;
  fish.position.set(Math.cos(a) * 1.45, 0.12, 7.15 + Math.sin(a * 1.3) * 0.55);
  fish.rotation.y = -a + Math.PI / 2;
  fishTail.rotation.y = Math.sin(t * 6) * 0.4;
}

const stone = new THREE.Group();
const stoneBody = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 10, 8),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.stone }),
);
stoneBody.scale.set(1.15, 0.45, 0.9);
stone.add(stoneBody);
const spot = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 6, 5),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.spot }),
);
spot.position.set(0.06, 0.08, 0.08);
stone.add(spot);
scene.add(stone);

const DOTS = 12;
const dots = [];
const dotGeo = new THREE.SphereGeometry(0.07, 6, 5);
for (let i = 0; i < DOTS; i += 1) {
  const dot = new THREE.Mesh(
    dotGeo,
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.aim }),
  );
  dot.visible = false;
  scene.add(dot);
  dots.push(dot);
}

function livePads() {
  return pads.filter((pad) => !pad.reached);
}

function simulate(angle) {
  const pts = [];
  let px = CONFIG.start.x;
  let pz = CONFIG.start.z;
  let py = CONFIG.start.y;
  let vx = Math.sin(angle) * CONFIG.speed;
  let vz = Math.cos(angle) * CONFIG.speed;
  let vy = CONFIG.lift;
  let skips = 0;
  let result = "fly";
  let landed = null;
  const dt = 0.016;
  const active = livePads();
  const far = active.length ? Math.max(...active.map((pad) => pad.z)) + 1.6 : 6;
  for (let i = 0; i < 520; i += 1) {
    pts.push({ x: px, y: py, z: pz, skip: skips });
    vy -= CONFIG.gravity * dt;
    px += vx * dt;
    pz += vz * dt;
    py += vy * dt;
    for (const pad of active) {
      const dx = px - pad.x;
      const dz = pz - pad.z;
      if (dx * dx + dz * dz <= pad.radius * pad.radius && py < 1.15 && py > -0.4) {
        result = "across";
        landed = pad;
        pts.push({ x: pad.x, y: pad.y + 0.2, z: pad.z, skip: skips });
        break;
      }
    }
    if (result === "across") break;
    if (py <= CONFIG.waterY) {
      if (pz > far || vy < -CONFIG.sinkSpeed || skips >= CONFIG.maxSkips) {
        result = "sink";
        pts.push({ x: px, y: CONFIG.waterY - 0.35, z: pz, skip: skips });
        break;
      }
      py = CONFIG.waterY;
      vy = Math.abs(vy) * CONFIG.bounce;
      vx *= 0.98;
      vz *= 0.98;
      skips += 1;
    }
    if (py < -2 || Math.abs(px) > 16) {
      result = "sink";
      break;
    }
  }
  if (result === "fly") result = "sink";
  return { pts, result, skips, landed };
}

let mode = "ready";
let angle = CONFIG.startAngle;
let met = 0;
let flight = null;
let flightAt = 0;
let heardSkip = 0;
let settle = 0;
let landHold = 0;
let landPad = null;
let clock = 0;

function homeStone() {
  stone.position.set(CONFIG.start.x, CONFIG.start.y, CONFIG.start.z);
  stone.rotation.set(0, angle, 0);
}

function paintAim() {
  const show = !flight && landHold <= 0 && mode !== "end";
  const sim = simulate(angle);
  const preview = [];
  for (const pt of sim.pts) {
    if (pt.z > CONFIG.aimReach) break;
    preview.push(pt);
  }
  const last = Math.max(0, preview.length - 1);
  for (let i = 0; i < DOTS; i += 1) {
    const dot = dots[i];
    const pt = preview.length ? preview[last === 0 ? 0 : Math.round((i / (DOTS - 1)) * last)] : null;
    dot.visible = show && !!pt;
    if (!pt) continue;
    dot.position.set(pt.x, Math.max(pt.y, 0.12), pt.z);
    dot.material.color.set(CONFIG.colors.aim);
  }
}

function paintScore() {
  if (mode === "ready") scoreEl.textContent = "Ready";
  else scoreEl.textContent = `Pads ${met}/${pads.length}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function hideCard() {
  card.hidden = true;
}

function resetRound() {
  mode = "ready";
  angle = CONFIG.startAngle;
  met = 0;
  flight = null;
  flightAt = 0;
  settle = 0;
  landHold = 0;
  landPad = null;
  pauseBtn.textContent = "Pause";
  for (const pad of pads) {
    pad.reached = false;
    pad.marker.visible = false;
  }
  homeStone();
  paintAim();
  paintScore();
  showCard(CONFIG.readyTitle, "Go");
}

function begin() {
  hideCard();
  mode = "play";
  paintAim();
  paintScore();
}

function aim(dir) {
  if (mode !== "play" || flight || landHold > 0) return;
  angle = Math.min(CONFIG.angleMax, Math.max(CONFIG.angleMin, angle + dir * CONFIG.angleStep));
  homeStone();
  paintAim();
}

function doThrow() {
  if (mode !== "play" || flight || settle > 0 || landHold > 0) return;
  const sim = simulate(angle);
  flight = sim;
  flightAt = 0;
  heardSkip = 0;
  playSound("throw");
  paintAim();
}

function finishAcross(pad) {
  flight = null;
  landPad = pad;
  pad.reached = true;
  met += 1;
  landHold = met >= pads.length ? 1.25 : 0.85;
  stone.position.set(pad.x, pad.y + 0.22, pad.z);
  paintAim();
  paintScore();
  playSound("across");
}

function sinkBack() {
  playSound("sink");
  flight = null;
  settle = 0.7;
  paintAim();
  paintScore();
}

function togglePause() {
  if (mode === "play") {
    mode = "paused";
    pauseBtn.textContent = "Play";
  } else if (mode === "paused") {
    mode = "play";
    pauseBtn.textContent = "Pause";
  }
}

leftBtn.addEventListener("click", () => aim(1));
rightBtn.addEventListener("click", () => aim(-1));
throwBtn.addEventListener("click", doThrow);
pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetRound);
cardGo.addEventListener("click", () => {
  if (mode === "end") resetRound();
  else begin();
});

window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowLeft", "ArrowRight", "Enter"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyP") {
    togglePause();
    return;
  }
  if (mode !== "play") return;
  if (e.repeat && (e.code === "Space" || e.code === "Enter")) return;
  if (e.code === "ArrowLeft") aim(1);
  if (e.code === "ArrowRight") aim(-1);
  if (e.code === "Space" || e.code === "Enter") doThrow();
});

function step(dt) {
  clock += dt;
  for (const pad of pads) {
    pad.flower.position.y = pad.y + Math.sin(clock * 1.6 + pad.x) * 0.03;
  }
  swimFish(clock);
  if (landHold > 0 && landPad) {
    landHold -= dt;
    const pad = landPad;
    stone.position.set(
      pad.x,
      pad.y + 0.22 + Math.sin((1.25 - Math.max(landHold, 0)) * 7) * 0.05,
      pad.z,
    );
    if (landHold <= 0) {
      if (met >= pads.length) {
        mode = "end";
        stone.position.set(pad.x, pad.y + 0.22, pad.z);
        paintScore();
        showCard(CONFIG.winTitle, "Again");
      } else {
        pad.marker.visible = true;
        landPad = null;
        settle = 0.7;
        paintAim();
      }
    }
    return;
  }
  if (flight) {
    flightAt += dt / 0.016;
    const last = flight.pts.length - 1;
    const at = Math.min(last, flightAt);
    const i0 = Math.floor(at);
    const i1 = Math.min(last, i0 + 1);
    const t = at - i0;
    const a = flight.pts[i0];
    const b = flight.pts[i1];
    stone.position.set(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
    );
    stone.rotation.x -= dt * 10;
    const skipNow = flight.pts[i0].skip;
    if (skipNow > heardSkip) {
      heardSkip = skipNow;
      playSound("skip");
    }
    if (flightAt >= last) {
      if (flight.result === "across" && flight.landed) finishAcross(flight.landed);
      else sinkBack();
    }
    return;
  }
  if (settle > 0) {
    settle -= dt;
    const t = 1 - Math.max(0, settle) / 0.7;
    stone.position.set(
      CONFIG.start.x,
      CONFIG.start.y + Math.sin(t * Math.PI) * 0.8,
      CONFIG.start.z,
    );
    if (settle <= 0) homeStone();
    return;
  }
  stone.position.y = CONFIG.start.y + Math.sin(clock * 2) * 0.03;
}

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
resetRound();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode === "play") step(dt);
  else {
    for (const pad of pads) pad.flower.rotation.y += dt * 0.4;
    swimFish(performance.now() / 1000);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
