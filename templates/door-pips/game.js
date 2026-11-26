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
const turnBtn = document.querySelector("#turn");
const tryBtn = document.querySelector("#try");

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
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const sun = new THREE.DirectionalLight(0xfff6e8, 0.65);
sun.position.set(3, 7, 4);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
camera.position.set(0, 1.55, 6.6);
camera.lookAt(0, 1.25, 0);

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}
function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
}

const leftWall = box(2.7, 3.5, 0.42, CONFIG.colors.wall);
leftWall.position.set(-2.35, 1.65, -0.45);
scene.add(leftWall);
const rightWall = box(2.7, 3.5, 0.42, CONFIG.colors.wall);
rightWall.position.set(2.35, 1.65, -0.45);
scene.add(rightWall);
const lintel = box(2.3, 0.85, 0.42, CONFIG.colors.wall);
lintel.position.set(0, 2.95, -0.45);
scene.add(lintel);
const cap = box(6.8, 0.28, 0.55, CONFIG.colors.stone);
cap.position.set(0, 3.55, -0.4);
scene.add(cap);

const garden = new THREE.Group();
const lawn = box(1.7, 2.2, 0.08, CONFIG.colors.garden);
lawn.position.set(0, 1.35, -1.05);
garden.add(lawn);
const bush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mat(CONFIG.colors.leaf));
bush.position.set(0.38, 1.55, -0.95);
garden.add(bush);
const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(CONFIG.colors.bloom));
bloom.position.set(-0.22, 1.75, -0.92);
garden.add(bloom);
scene.add(garden);

const hinge = new THREE.Group();
hinge.position.set(-1.08, 1.35, 0.06);
scene.add(hinge);
const door = box(2.24, 2.45, 0.14, CONFIG.colors.door);
door.position.set(1.12, 0, 0);
hinge.add(door);

const key = new THREE.Group();
const bow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 6, 10), mat(CONFIG.colors.key));
key.add(bow);
const shaft = box(0.08, 0.34, 0.06, CONFIG.colors.key);
shaft.position.y = -0.28;
key.add(shaft);
key.position.set(1.12, 0.05, 0.14);
hinge.add(key);

const pipBoard = box(2.05, 0.62, 0.08, CONFIG.colors.stone);
pipBoard.position.set(0, 3.18, 0.22);
scene.add(pipBoard);
const pipGeo = new THREE.TorusGeometry(0.18, 0.045, 6, 12);
const fillGeo = new THREE.SphereGeometry(0.13, 8, 6);
const pipMat = mat(CONFIG.colors.pip);
const fillMat = mat(CONFIG.colors.fill);
const pips = [];
const fills = [];
for (let i = 0; i < 3; i += 1) {
  const ring = new THREE.Mesh(pipGeo, pipMat);
  ring.position.set(0, 3.18, 0.34);
  scene.add(ring);
  pips.push(ring);
  const dot = new THREE.Mesh(fillGeo, fillMat);
  dot.position.set(0, 3.18, 0.4);
  dot.visible = false;
  scene.add(dot);
  fills.push(dot);
}

let plan = [];
let lastPlan = "";
let doorIndex = 0;
let filled = 0;
let met = 0;
let mode = "ready";
let trip = null;

function paintScore() {
  scoreEl.textContent = `Doors ${met}/${CONFIG.doors}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function paintPips() {
  const need = plan[doorIndex] ?? 1;
  const gap = 0.46;
  const start = -((need - 1) * gap) / 2;
  for (let i = 0; i < pips.length; i += 1) {
    const show = i < need;
    pips[i].visible = show;
    fills[i].visible = show && i < filled;
    if (!show) continue;
    pips[i].position.x = start + i * gap;
    fills[i].position.x = start + i * gap;
  }
  key.rotation.z = -filled * (Math.PI / 2);
}

function freshPlan(previous) {
  const rest = CONFIG.needs.filter((count) => count > 1);
  const bag = rest.length ? rest : CONFIG.needs;
  let next = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    next = [1];
    for (let i = 1; i < CONFIG.doors; i += 1) next.push(bag[Math.floor(Math.random() * bag.length)]);
    const varied = next.some((value) => value !== next[0]);
    if (varied && next.join(",") !== previous) return next;
  }
  return next;
}

function resetPlay() {
  heard = false;
  met = 0;
  doorIndex = 0;
  filled = 0;
  trip = null;
  pauseBtn.textContent = "Pause";
  plan = freshPlan(lastPlan);
  lastPlan = plan.join(",");
  hinge.rotation.y = 0;
  paintPips();
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

function turnKey() {
  if (mode !== "play" || trip) return;
  const need = plan[doorIndex];
  if (filled >= need) return;
  heard = true;
  filled += 1;
  paintPips();
  playSound("turn");
  if (filled !== need) return;
  playSound("open");
  trip = { phase: "open", t: 0, scored: false };
}

function tryDoor() {
  if (mode !== "play" || trip) return;
  if (filled === plan[doorIndex]) return;
  heard = true;
  playSound("shut");
  trip = { phase: "crack", t: 0 };
}

function step(dt) {
  if (!trip) return;
  trip.t += dt;
  if (trip.phase === "crack") {
    const k = Math.min(1, trip.t / CONFIG.crackSeconds);
    hinge.rotation.y = Math.sin(k * Math.PI) * CONFIG.crackAngle;
    if (k < 1) return;
    hinge.rotation.y = 0;
    trip = null;
    return;
  }
  if (trip.phase === "open") {
    const k = Math.min(1, trip.t / CONFIG.openSeconds);
    const eased = k * k * (3 - 2 * k);
    hinge.rotation.y = CONFIG.openAngle * eased;
    if (k < 1) return;
    hinge.rotation.y = CONFIG.openAngle;
    if (!trip.scored) {
      met += 1;
      paintScore();
      trip.scored = true;
    }
    if (met >= CONFIG.doors) {
      trip = null;
      finish();
      return;
    }
    trip = { phase: "hold", t: 0 };
    return;
  }
  if (trip.t < CONFIG.holdSeconds) return;
  doorIndex += 1;
  filled = 0;
  hinge.rotation.y = 0;
  paintPips();
  trip = null;
}

turnBtn.addEventListener("click", turnKey);
tryBtn.addEventListener("click", tryDoor);
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
  if (event.code === "ArrowRight" || event.code === "Digit1") turnKey();
  if (event.code === "Enter" || event.code === "Digit2") tryDoor();
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
  const teach = mode === "play" && met === 0 && !trip;
  turnBtn.classList.toggle("hint", teach);
  if (teach && filled === 0) key.rotation.z = Math.sin(performance.now() * 0.005) * 0.45;
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
