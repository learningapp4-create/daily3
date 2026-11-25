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
const addBtn = document.querySelector("#add");
const takeBtn = document.querySelector("#take");
const sendBtn = document.querySelector("#send");

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
sun.position.set(3, 6, 4);
scene.add(sun);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
const viewHeight = 3.15;

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}
function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
}

const water = box(16, 3.4, 3.2, CONFIG.colors.water);
water.position.set(0, -1.25, 0);
scene.add(water);
const deep = box(6.4, 0.08, 2.6, CONFIG.colors.deep);
deep.position.set(0.15, 0.48, 0);
scene.add(deep);

function dock(x) {
  const group = new THREE.Group();
  const body = box(1.55, 2.05, 1.35, CONFIG.colors.dock);
  body.position.y = 0.95;
  group.add(body);
  const post = box(0.16, 0.7, 0.16, CONFIG.colors.post);
  post.position.set(0, 2.15, 0.35);
  group.add(post);
  group.position.x = x;
  scene.add(group);
  return group;
}
const near = dock(-4.15);
const far = dock(4.15);

const mark = box(0.7, CONFIG.stripe, 1.4, CONFIG.colors.mark);
mark.position.set(-3.05, CONFIG.raftHigh, 0);
scene.add(mark);

const flags = [];
for (let i = 0; i < CONFIG.crossings; i += 1) {
  const pole = box(0.06, 0.55, 0.06, CONFIG.colors.post);
  pole.position.set(3.7 + i * 0.28, 2.15, 0.2);
  scene.add(pole);
  const flag = box(0.22, 0.16, 0.05, CONFIG.colors.flag);
  flag.position.set(3.82 + i * 0.28, 2.32, 0.2);
  flag.visible = false;
  scene.add(flag);
  flags.push(flag);
}

const raft = new THREE.Group();
const hull = box(1.7, 1.2, 1.15, CONFIG.colors.raft);
hull.position.y = -0.48;
raft.add(hull);
const stripe = box(1.78, CONFIG.stripe, 1.22, CONFIG.colors.stripe);
raft.add(stripe);
scene.add(raft);

const crateGeo = new THREE.BoxGeometry(0.62, 0.32, 0.62);
const crateMat = mat(CONFIG.colors.crate);
const crateMeshes = [];

let plan = [];
let lastPlan = "";
let crossing = 0;
let crates = 0;
let met = 0;
let mode = "ready";
let trip = null;

function stripeY(count) {
  return CONFIG.raftHigh - count * CONFIG.crateDrop;
}

function paintLoad() {
  for (const mesh of crateMeshes) raft.remove(mesh);
  crateMeshes.length = 0;
  for (let i = 0; i < crates; i += 1) {
    const mesh = new THREE.Mesh(crateGeo, crateMat);
    mesh.position.y = 0.4 + i * 0.34;
    raft.add(mesh);
    crateMeshes.push(mesh);
  }
  raft.position.y = stripeY(crates);
  const target = plan[crossing] ?? CONFIG.loads[0];
  mark.position.y = stripeY(target);
}

function paintFlags() {
  flags.forEach((flag, index) => {
    flag.visible = index < met;
  });
}

function paintScore() {
  scoreEl.textContent = `Crossings ${met}/${CONFIG.crossings}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function freshPlan(previous) {
  const bag = CONFIG.loads;
  let next = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    next = Array.from({ length: CONFIG.crossings }, () => bag[Math.floor(Math.random() * bag.length)]);
    const varied = next.some((value) => value !== next[0]);
    if (varied && next.join(",") !== previous) return next;
  }
  return next;
}

function resetPlay() {
  heard = false;
  met = 0;
  crossing = 0;
  crates = 0;
  trip = null;
  pauseBtn.textContent = "Pause";
  plan = freshPlan(lastPlan);
  lastPlan = plan.join(",");
  raft.position.x = CONFIG.startX;
  paintLoad();
  paintFlags();
  paintScore();
}

function resetRound() {
  mode = "ready";
  resetPlay();
  showCard(CONFIG.readyTitle, "Go");
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

function addCrate() {
  if (mode !== "play" || trip || crates >= CONFIG.maxCrates) return;
  heard = true;
  crates += 1;
  paintLoad();
  playSound("load");
}

function takeCrate() {
  if (mode !== "play" || trip || crates <= 0) return;
  heard = true;
  crates -= 1;
  paintLoad();
  playSound("load");
}

function sendRaft() {
  if (mode !== "play" || trip) return;
  heard = true;
  const matched = crates === plan[crossing];
  playSound("send");
  trip = {
    phase: matched ? "go" : "out",
    t: 0,
    from: raft.position.x,
    matched,
  };
}

function step(dt) {
  if (!trip) return;
  trip.t += dt;
  const travel = CONFIG.endX - CONFIG.startX;
  if (trip.phase === "out") {
    const dur = CONFIG.sendSeconds * CONFIG.turnBack;
    const k = Math.min(1, trip.t / dur);
    const eased = k * k * (3 - 2 * k);
    raft.position.x = CONFIG.startX + travel * CONFIG.turnBack * eased;
    if (k < 1) return;
    playSound("back");
    trip.phase = "back";
    trip.t = 0;
    trip.from = raft.position.x;
    return;
  }
  if (trip.phase === "back" || trip.phase === "return") {
    const dur = CONFIG.backSeconds;
    const k = Math.min(1, trip.t / dur);
    const eased = k * k * (3 - 2 * k);
    const target = CONFIG.startX;
    raft.position.x = trip.from + (target - trip.from) * eased;
    if (k < 1) return;
    raft.position.x = CONFIG.startX;
    trip = null;
    return;
  }
  if (trip.phase === "go") {
    const k = Math.min(1, trip.t / CONFIG.sendSeconds);
    const eased = k * k * (3 - 2 * k);
    raft.position.x = CONFIG.startX + travel * eased;
    if (k < 1) return;
    raft.position.x = CONFIG.endX;
    met += 1;
    paintScore();
    paintFlags();
    playSound("load");
    if (met >= CONFIG.crossings) {
      trip = null;
      finish();
      return;
    }
    trip = { phase: "hold", t: 0 };
    return;
  }
  if (trip.phase === "hold") {
    if (trip.t < CONFIG.holdSeconds) return;
    crossing += 1;
    crates = 0;
    paintLoad();
    trip = { phase: "return", t: 0, from: raft.position.x };
  }
}

addBtn.addEventListener("click", addCrate);
takeBtn.addEventListener("click", takeCrate);
sendBtn.addEventListener("click", sendRaft);
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
  if (event.code === "ArrowUp" || event.code === "Digit1") addCrate();
  if (event.code === "ArrowDown" || event.code === "Digit2") takeCrate();
  if (event.code === "Enter" || event.code === "Digit3") sendRaft();
});

function placeCamera() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  const aspect = w / Math.max(1, h);
  camera.left = -viewHeight * aspect;
  camera.right = viewHeight * aspect;
  camera.top = viewHeight;
  camera.bottom = -viewHeight;
  camera.position.set(0, 1.15, 12);
  camera.lookAt(0, 1.15, 0);
  camera.updateProjectionMatrix();
}

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  placeCamera();
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
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
