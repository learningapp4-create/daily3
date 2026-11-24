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
sun.position.set(4, 8, 2);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(18, 0.4, 40),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.grass }),
);
ground.position.set(0, -0.2, 12);
scene.add(ground);
const path = new THREE.Mesh(
  new THREE.BoxGeometry(1.7, 0.08, 36),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.path }),
);
path.position.set(0, 0.04, 14);
scene.add(path);

const treeMat = new THREE.MeshLambertMaterial({ color: "#3e8c45" });
for (const spot of [[-3.2, 4], [3.1, 9], [-3.4, 16]]) {
  const tree = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.5, 6), treeMat);
  tree.position.set(spot[0], 0.9, spot[1]);
  scene.add(tree);
}

const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.15, 6);
const postMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.post });
const barGeo = new THREE.BoxGeometry(2.55, 0.22, 0.28);
const gates = CONFIG.gates.map((spec) => {
  const group = new THREE.Group();
  group.position.z = spec.z;
  for (const side of [-1.15, 1.15]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(side, 0.58, 0);
    group.add(post);
  }
  const bar = new THREE.Mesh(
    barGeo,
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.bar }),
  );
  bar.position.y = 0.72;
  group.add(bar);
  scene.add(group);
  return { ...spec, group, bar, angle: 0, dir: 1, passed: false, waiting: false };
});

const barStarts = [
  { angle: 0, dir: 1, need: 2 },
  { angle: 0, dir: -1, need: 2 },
  { angle: Math.PI / 4, dir: 1, need: 1 },
  { angle: -Math.PI / 4, dir: -1, need: 1 },
];
let lastGatePlan = "";

const wagon = new THREE.Group();
const bed = new THREE.Mesh(
  new THREE.BoxGeometry(0.95, 0.28, 1.25),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.wood }),
);
bed.position.y = 0.38;
wagon.add(bed);
const cover = new THREE.Mesh(
  new THREE.BoxGeometry(0.72, 0.42, 0.78),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.wagon }),
);
cover.position.set(0, 0.68, -0.05);
wagon.add(cover);
const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
const wheelMat = new THREE.MeshLambertMaterial({ color: "#3a2a22" });
for (const spot of [[-0.48, 0.4], [0.48, 0.4], [-0.48, -0.4], [0.48, -0.4]]) {
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(spot[0], 0.18, spot[1]);
  wagon.add(wheel);
}
scene.add(wagon);

const barn = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(2.3, 1.5, 1.8),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.barn }),
);
body.position.y = 0.85;
barn.add(body);
const roof = new THREE.Mesh(
  new THREE.ConeGeometry(1.7, 0.9, 4),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.roof }),
);
roof.position.y = 1.9;
roof.rotation.y = Math.PI / 4;
barn.add(roof);
const door = new THREE.Mesh(
  new THREE.BoxGeometry(0.55, 0.75, 0.08),
  new THREE.MeshLambertMaterial({ color: "#6b3a22" }),
);
door.position.set(0, 0.45, 0.92);
barn.add(door);
barn.position.set(0, 0, CONFIG.barnZ + 1.6);
scene.add(barn);

let wagonZ = CONFIG.startZ;
let met = 0;
let mode = "ready";
let clock = 0;

function blocks(gate) {
  return Math.abs(Math.cos(gate.angle)) > 0.5;
}

function paintScore() {
  scoreEl.textContent = `Gates ${met}/${gates.length}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function placeCamera() {
  camera.position.set(0, 4.4, wagonZ - 7.4);
  camera.lookAt(0, 1.15, wagonZ + 5);
}

function layGates() {
  const plans = [];
  for (const first of barStarts) {
    for (const second of barStarts) {
      for (const third of barStarts) {
        const starts = [first, second, third];
        const key = starts.map((start) => `${start.need}${start.dir > 0 ? "R" : "L"}`).join(",");
        if (starts[0].need === 2 && starts[1].need === 1 && starts[2].need === 2) continue;
        plans.push({ key, starts });
      }
    }
  }
  const choices = plans.filter((plan) => plan.key !== lastGatePlan);
  const plan = choices[Math.floor(Math.random() * choices.length)] || plans[0];
  lastGatePlan = plan.key;
  gates.forEach((gate, index) => {
    const start = plan.starts[index];
    gate.angle = start.angle;
    gate.dir = start.dir;
    gate.need = start.need;
    gate.bar.rotation.y = gate.angle;
    gate.passed = false;
    gate.waiting = false;
  });
}

function resetPlay() {
  heard = false;
  wagonZ = CONFIG.startZ;
  met = 0;
  clock = 0;
  pauseBtn.textContent = "Pause";
  layGates();
  wagon.position.set(0, 0, wagonZ);
  paintScore();
  placeCamera();
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

function pressTurn() {
  if (mode !== "play") return;
  const gate = gates.find((item) => !item.passed);
  if (!gate) return;
  heard = true;
  gate.angle += gate.dir * CONFIG.turnStep;
  gate.bar.rotation.y = gate.angle;
  playSound("turn");
}

function step(dt) {
  clock += dt;
  const next = gates.find((gate) => !gate.passed);
  const stopped = Boolean(next && blocks(next) && wagonZ >= next.z - CONFIG.stopGap - 0.02);
  if (stopped) {
    wagonZ = next.z - CONFIG.stopGap;
    if (!next.waiting) {
      next.waiting = true;
      playSound("bump");
    }
  } else if (next) {
    next.waiting = false;
    wagonZ += CONFIG.speed * dt;
    if (wagonZ > next.z + 0.45) {
      next.passed = true;
      met += 1;
      paintScore();
      playSound("roll");
    }
  } else {
    wagonZ += CONFIG.speed * dt;
  }
  wagon.position.z = wagonZ;
  wagon.position.y = Math.abs(Math.sin(clock * 8)) * 0.015;
  placeCamera();
  if (wagonZ > CONFIG.barnZ) finish();
}

turnBtn.addEventListener("click", pressTurn);
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
  if (event.code === "Space" || event.code === "ArrowRight") event.preventDefault();
  if (event.code === "KeyP") {
    pauseBtn.click();
    return;
  }
  if (mode !== "play") return;
  if (event.code === "Space" || event.code === "ArrowRight") pressTurn();
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

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode === "play") step(dt);
  else {
    clock += dt;
    wagon.position.z = wagonZ;
    placeCamera();
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
