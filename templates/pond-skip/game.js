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
  new THREE.CircleGeometry(5.6, 22),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.waterDeep }),
);
deep.rotation.x = -Math.PI / 2;
deep.position.set(0, 0.012, 10.2);
scene.add(deep);

const pad = new THREE.Mesh(
  new THREE.CircleGeometry(CONFIG.pad.radius, 16),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.pad }),
);
pad.rotation.x = -Math.PI / 2;
pad.position.set(CONFIG.pad.x, CONFIG.pad.y, CONFIG.pad.z);
scene.add(pad);

const flower = new THREE.Group();
const petalMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.flower });
for (let i = 0; i < 6; i += 1) {
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), petalMat);
  const a = (i / 6) * Math.PI * 2;
  petal.position.set(Math.cos(a) * 0.28, 0.1, Math.sin(a) * 0.28);
  petal.scale.set(1, 0.42, 0.65);
  flower.add(petal);
}
const heart = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 8, 6),
  new THREE.MeshLambertMaterial({ color: "#f2d34a" }),
);
heart.position.y = 0.16;
flower.add(heart);
flower.position.set(CONFIG.pad.x, CONFIG.pad.y, CONFIG.pad.z);
scene.add(flower);

const reedMat = new THREE.MeshLambertMaterial({ color: "#2f8f4e" });
for (const at of [[-1.7, 0.35], [1.75, 0.2]]) {
  const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 5), reedMat);
  reed.position.set(at[0], 0.4, at[1]);
  scene.add(reed);
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

const DOTS = 26;
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
  const dt = 0.016;
  const pad = CONFIG.pad;
  for (let i = 0; i < 460; i += 1) {
    pts.push({ x: px, y: py, z: pz, skip: skips });
    vy -= CONFIG.gravity * dt;
    px += vx * dt;
    pz += vz * dt;
    py += vy * dt;
    const dx = px - pad.x;
    const dz = pz - pad.z;
    if (dx * dx + dz * dz <= pad.radius * pad.radius && py < 1.15 && py > -0.4) {
      result = "across";
      pts.push({ x: pad.x, y: pad.y + 0.2, z: pad.z, skip: skips });
      break;
    }
    if (pz < pad.z - 0.5 && py <= CONFIG.waterY) {
      if (vy < -CONFIG.sinkSpeed || skips >= CONFIG.maxSkips) {
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
    if (py < -2 || pz > pad.z + 8 || Math.abs(px) > 18) {
      result = "sink";
      break;
    }
  }
  if (result === "fly") result = "sink";
  return { pts, result, skips };
}

let mode = "ready";
let angle = CONFIG.startAngle;
let throws = 0;
let flight = null;
let flightAt = 0;
let heardSkip = 0;
let settle = 0;
let clock = 0;

function homeStone() {
  stone.position.set(CONFIG.start.x, CONFIG.start.y, CONFIG.start.z);
  stone.rotation.set(0, angle, 0);
}

function paintAim() {
  const show = !flight && mode !== "end";
  const sim = simulate(angle);
  const step = Math.max(1, Math.floor(sim.pts.length / DOTS));
  const onPad = sim.result === "across";
  for (let i = 0; i < DOTS; i += 1) {
    const pt = sim.pts[Math.min(sim.pts.length - 1, i * step)];
    const dot = dots[i];
    dot.visible = show && !!pt;
    if (!pt) continue;
    dot.position.set(pt.x, Math.max(pt.y, 0.12), pt.z);
    dot.material.color.set(onPad ? CONFIG.colors.aimOn : CONFIG.colors.aim);
  }
  throwBtn.classList.toggle("ready", show && onPad && mode === "play");
}

function paintScore() {
  scoreEl.textContent = mode === "end" ? "Across" : (throws ? `Throws ${throws}` : "Ready");
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
  throws = 0;
  flight = null;
  flightAt = 0;
  settle = 0;
  pauseBtn.textContent = "Pause";
  homeStone();
  paintAim();
  paintScore();
  showCard(CONFIG.readyTitle, "Go");
}

function begin() {
  hideCard();
  mode = "play";
  paintAim();
}

function aim(dir) {
  if (mode !== "play" || flight) return;
  angle = Math.min(CONFIG.angleMax, Math.max(CONFIG.angleMin, angle + dir * CONFIG.angleStep));
  homeStone();
  paintAim();
}

function doThrow() {
  if (mode !== "play" || flight || settle > 0) return;
  const sim = simulate(angle);
  flight = sim;
  flightAt = 0;
  heardSkip = 0;
  throws += 1;
  playSound("throw");
  paintAim();
  paintScore();
}

function finishAcross() {
  mode = "end";
  flight = null;
  stone.position.set(CONFIG.pad.x, CONFIG.pad.y + 0.2, CONFIG.pad.z);
  paintAim();
  paintScore();
  playSound("across");
  showCard(CONFIG.winTitle, "Again");
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
  flower.rotation.y = clock * 0.4;
  flower.position.y = CONFIG.pad.y + Math.sin(clock * 1.6) * 0.03;
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
      if (flight.result === "across") finishAcross();
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
  else flower.rotation.y += dt * 0.4;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
