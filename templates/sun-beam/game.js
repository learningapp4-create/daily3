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
const resetBtn = document.querySelector("#reset");
const soundBtn = document.querySelector("#sound");
const leftBtn = document.querySelector("#left");
const rightBtn = document.querySelector("#right");

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
let heard = false;
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
      audio.muted = false;
      if (heard) return;
      audio.pause();
      audio.currentTime = 0;
    };
    if (pending && pending.then) pending.then(release).catch(release);
    else release();
  }
}
function playSound(name) {
  if (!soundOn || !heard) return;
  const audio = clips.get(name);
  if (!audio) return;
  audio.muted = false;
  audio.volume = CONFIG.soundVolume ?? 0.85;
  try { audio.currentTime = 0; } catch { /* replay when the browser allows it */ }
  audio.play().catch(() => {});
}
window.addEventListener("pointerdown", unlockSound, true);
window.addEventListener("keydown", unlockSound, true);
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  paintSound();
  if (!soundOn) {
    for (const audio of clips.values()) audio.pause();
  }
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.sky);
scene.add(new THREE.AmbientLight(0xffffff, 0.88));
const sun = new THREE.DirectionalLight(0xfff6e8, 0.7);
sun.position.set(4, 8, 3);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
camera.position.set(0, 3.5, 8.4);
camera.lookAt(0, 0.7, 0);

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

const grass = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 8), mat(CONFIG.colors.grass));
grass.position.y = -0.1;
scene.add(grass);

function spotX(index) {
  const mid = (CONFIG.spots - 1) / 2;
  return (index - mid) * CONFIG.span;
}

const rail = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.span * CONFIG.spots + 0.6, 0.12, 0.12), mat(CONFIG.colors.rail));
rail.position.y = 2.35;
scene.add(rail);
for (let i = 0; i < CONFIG.spots; i += 1) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), mat(CONFIG.colors.post));
  post.position.set(spotX(i), 1.1, -0.35);
  scene.add(post);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.12, 8), mat(CONFIG.colors.pad));
  pad.position.set(spotX(i), 0.06, 0.35);
  scene.add(pad);
}

const lamp = new THREE.Group();
const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.34, 8), mat(CONFIG.colors.lamp));
shade.position.y = 1.85;
lamp.add(shade);
const cord = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), mat(CONFIG.colors.rail));
cord.position.y = 2.2;
lamp.add(cord);
scene.add(lamp);

const beamMat = new THREE.MeshBasicMaterial({
  color: CONFIG.colors.pool,
  transparent: true,
  opacity: 0.38,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const beam = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.55, 8, 1, true), beamMat);
beam.position.y = 1.02;
lamp.add(beam);
const pool = new THREE.Mesh(
  new THREE.CircleGeometry(CONFIG.poolRadius, 16),
  new THREE.MeshBasicMaterial({ color: CONFIG.colors.pool, transparent: true, opacity: 0.9, depthWrite: false }),
);
pool.rotation.x = -Math.PI / 2;
pool.position.y = 0.08;
scene.add(pool);

const stemGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6);
const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
const stemMat = mat(CONFIG.colors.post);
const paleMat = mat(CONFIG.colors.flower);
const litMat = mat(CONFIG.colors.lit);

function makeFlower(lit) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.4;
  group.add(stem);
  const head = new THREE.Mesh(headGeo, lit ? litMat : paleMat);
  head.position.y = 0.86;
  group.add(head);
  return group;
}

const kept = [];
let active = makeFlower(false);
scene.add(active);

let plan = [];
let lastPlan = "";
let bloomIndex = 0;
let spot = CONFIG.startSpot;
let met = 0;
let mode = "ready";
let trip = null;

function paintScore() {
  scoreEl.textContent = `Blooms ${met}/${CONFIG.blooms}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function placeLamp(index) {
  const x = spotX(index);
  lamp.position.x = x;
  pool.position.x = x;
  pool.position.z = 0.35;
}

function placeActive() {
  const index = plan[bloomIndex];
  active.position.set(spotX(index), 0, 0.35);
}

function freshPlan(previous) {
  let next = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    next = [];
    let at = CONFIG.startSpot;
    const first = at + 1 < CONFIG.spots ? at + 1 : at - 1;
    next.push(first);
    at = first;
    for (let i = 1; i < CONFIG.blooms; i += 1) {
      const bag = [];
      for (let s = 0; s < CONFIG.spots; s += 1) if (s !== at) bag.push(s);
      next.push(bag[Math.floor(Math.random() * bag.length)]);
      at = next[next.length - 1];
    }
    if (next.join(",") !== previous) return next;
  }
  return next;
}

function clearKept() {
  for (const flower of kept) scene.remove(flower);
  kept.length = 0;
}

function resetPlay() {
  heard = false;
  met = 0;
  bloomIndex = 0;
  spot = CONFIG.startSpot;
  trip = null;
  pauseBtn.textContent = "Pause";
  clearKept();
  plan = freshPlan(lastPlan);
  lastPlan = plan.join(",");
  placeLamp(spot);
  placeActive();
  paintScore();
}

function resetRound() {
  mode = "ready";
  resetPlay();
  begin();
}

function begin() {
  card.hidden = true;
  mode = "play";
}

function finish() {
  mode = "end";
  playSound("done");
  showCard(CONFIG.winTitle, "Again");
}

function move(dir) {
  if (mode !== "play" || trip) return;
  const next = spot + dir;
  if (next < 0 || next >= CONFIG.spots) return;
  heard = true;
  playSound("step");
  trip = { from: spot, to: next, t: 0 };
}

function step(dt) {
  if (!trip) return;
  trip.t += dt;
  const k = Math.min(1, trip.t / CONFIG.slideSeconds);
  const eased = k * k * (3 - 2 * k);
  const x = spotX(trip.from) + (spotX(trip.to) - spotX(trip.from)) * eased;
  lamp.position.x = x;
  pool.position.x = x;
  if (k < 1) return;
  spot = trip.to;
  placeLamp(spot);
  trip = null;
  if (spot !== plan[bloomIndex]) return;
  playSound("bloom");
  scene.remove(active);
  const lit = makeFlower(true);
  lit.position.set(spotX(spot), 0, 0.35);
  lit.scale.setScalar(1.18);
  scene.add(lit);
  kept.push(lit);
  active = makeFlower(false);
  scene.add(active);
  met += 1;
  paintScore();
  if (met >= CONFIG.blooms) {
    active.visible = false;
    finish();
    return;
  }
  bloomIndex += 1;
  placeActive();
}

leftBtn.addEventListener("click", () => move(-1));
rightBtn.addEventListener("click", () => move(1));
pauseBtn.addEventListener("click", () => {
  if (mode === "play") {
    mode = "paused";
    pauseBtn.textContent = "Play";
  } else if (mode === "paused") {
    mode = "play";
    pauseBtn.textContent = "Pause";
  }
});
resetBtn.addEventListener("click", resetRound);
cardGo.addEventListener("click", () => {
  if (mode === "end") {
    resetRound();
    return;
  }
  begin();
});
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP") {
    pauseBtn.click();
    return;
  }
  if (mode !== "play") return;
  if (event.code === "ArrowLeft") move(-1);
  if (event.code === "ArrowRight") move(1);
});

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

function paintHint() {
  const target = plan[bloomIndex];
  const teach = mode === "play" && met === 0 && !trip && target != null;
  rightBtn.classList.toggle("hint", Boolean(teach && target > spot));
  leftBtn.classList.toggle("hint", Boolean(teach && target < spot));
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode === "play") step(dt);
  paintHint();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
