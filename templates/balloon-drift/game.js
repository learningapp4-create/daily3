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
const higherBtn = document.querySelector("#higher");
const lowerBtn = document.querySelector("#lower");
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
  playSound("rise");
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
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);

scene.add(new THREE.AmbientLight(0xffffff, 0.82));
const sun = new THREE.DirectionalLight(0xfff6e0, 0.7);
sun.position.set(4, 12, 6);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 70),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.ground }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0, 24);
scene.add(ground);

const bushMat = new THREE.MeshLambertMaterial({ color: "#5ea85a" });
for (const bush of [[-4.2, 1.5], [-3.6, 9.2], [-4.5, 22]]) {
  const clump = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), bushMat);
  clump.position.set(bush[0], 0.28, bush[1]);
  scene.add(clump);
}

const cloudMat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.cloud });
function makeCloud(x, y, z, scale) {
  const cloud = new THREE.Group();
  for (const puff of [[0, 0, 0, 0.7], [0.7, 0.15, 0, 0.5], [-0.65, 0.05, 0.1, 0.46]]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(puff[3], 8, 6), cloudMat);
    ball.position.set(puff[0], puff[1], puff[2]);
    cloud.add(ball);
  }
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
  return cloud;
}
const clouds = [
  makeCloud(-4, 5.2, 4, 1),
  makeCloud(-5, 4.4, 14, 0.8),
  makeCloud(-3.5, 5.6, 24, 1.1),
];

const gardens = CONFIG.gardens.map((spec) => {
  const group = new THREE.Group();
  const shelfMat = new THREE.MeshLambertMaterial({ color: spec.color });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 1.45), shelfMat);
  group.add(shelf);
  const flowerMat = new THREE.MeshLambertMaterial({ color: spec.color });
  const blooms = [];
  for (let i = 0; i < 3; i += 1) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.32, 5),
      new THREE.MeshLambertMaterial({ color: "#3f8f4a" }),
    );
    stem.position.set(0, 0.24, (i - 1) * 0.38);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 6), flowerMat);
    head.position.y = 0.24;
    stem.add(head);
    group.add(stem);
    blooms.push(head);
  }
  group.position.set(-2.35, spec.y, spec.z);
  scene.add(group);
  return { ...spec, group, shelfMat, blooms, got: false };
});

const balloon = new THREE.Group();
const envelope = new THREE.Mesh(
  new THREE.SphereGeometry(0.52, 14, 12),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.balloon }),
);
balloon.add(envelope);
const knot = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 6, 5),
  new THREE.MeshLambertMaterial({ color: "#b42332" }),
);
knot.position.y = -0.5;
balloon.add(knot);
const stringMat = new THREE.MeshLambertMaterial({ color: "#f4efe4" });
for (const side of [-0.12, 0.12]) {
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4), stringMat);
  line.position.set(side, -0.78, 0);
  balloon.add(line);
}
const basket = new THREE.Mesh(
  new THREE.BoxGeometry(0.36, 0.22, 0.36),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.basket }),
);
basket.position.y = -1.12;
balloon.add(basket);
scene.add(balloon);

let mode = "ready";
let height = CONFIG.startHeight;
let target = CONFIG.startHeight;
let along = 0;
let met = 0;
let clock = 0;

function paintScore() {
  scoreEl.textContent = `Gardens ${met}/${gardens.length}`;
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

function resetPlay() {
  height = CONFIG.startHeight;
  target = CONFIG.startHeight;
  along = 0;
  met = 0;
  clock = 0;
  pauseBtn.textContent = "Pause";
  for (const garden of gardens) {
    garden.got = false;
    for (const bloom of garden.blooms) bloom.scale.setScalar(1);
  }
  balloon.position.set(0, height, along);
  paintGardens();
  paintScore();
  placeCamera();
}

function resetRound() {
  mode = "ready";
  resetPlay();
  showCard(CONFIG.readyTitle, "Go");
}

function begin() {
  hideCard();
  mode = "play";
}

function paintGardens() {
  for (const garden of gardens) {
    const near = Math.abs(height - garden.y) <= CONFIG.band;
    garden.shelfMat.color.set(garden.got || near ? garden.bright : garden.color);
  }
}

function placeCamera() {
  camera.position.set(11.2, 3.15, along - 1.1);
  camera.lookAt(-1.3, 2.2, along + 2.4);
}

function changeHeight(dir) {
  if (mode !== "play") return;
  const next = Math.min(
    CONFIG.maxHeight,
    Math.max(CONFIG.minHeight, target + dir * CONFIG.heightStep),
  );
  if (next === target) return;
  target = next;
  playSound("rise");
}

function finish(won) {
  mode = "end";
  if (won) playSound("meet");
  showCard(won ? CONFIG.winTitle : CONFIG.waitTitle, "Again");
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

higherBtn.addEventListener("click", () => changeHeight(1));
lowerBtn.addEventListener("click", () => changeHeight(-1));
pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetRound);
cardGo.addEventListener("click", () => {
  if (mode === "end") resetPlay();
  begin();
});

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyP") {
    togglePause();
    return;
  }
  if (mode !== "play") return;
  if (e.code === "ArrowUp") changeHeight(1);
  if (e.code === "ArrowDown") changeHeight(-1);
});

function step(dt) {
  clock += dt;
  height += (target - height) * (1 - Math.exp(-6 * dt));
  along += CONFIG.drift * dt;
  balloon.position.set(0, height + Math.sin(clock * 1.8) * 0.04, along);
  envelope.rotation.z = Math.sin(clock * 1.2) * 0.06;
  paintGardens();
  for (const garden of gardens) {
    if (garden.got) {
      const s = 1.35 + Math.sin(clock * 3 + garden.z) * 0.06;
      for (const bloom of garden.blooms) bloom.scale.setScalar(s);
      continue;
    }
    const dz = along - garden.z;
    if (Math.abs(height - garden.y) <= CONFIG.band && dz > -0.35 && dz < CONFIG.reach) {
      garden.got = true;
      met += 1;
      playSound("bloom");
      paintScore();
      if (met >= gardens.length) {
        finish(true);
        return;
      }
    }
  }
  placeCamera();
  if (along > CONFIG.endZ) finish(met >= gardens.length);
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
    clock += dt;
    balloon.position.y = height + Math.sin(clock * 1.8) * 0.04;
    for (const cloud of clouds) cloud.position.x += Math.sin(clock + cloud.position.z) * 0.0008;
    placeCamera();
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
