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
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 17);

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

const gapBushMat = new THREE.MeshLambertMaterial({ color: "#3e8c45" });
function gapBush(x, z) {
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), gapBushMat);
  bush.scale.set(1.25, 0.7, 1.05);
  bush.position.set(x, 0.38, z);
  scene.add(bush);
}
const rockMat = new THREE.MeshLambertMaterial({ color: "#b7aa96" });
function gapRock(x, z) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), rockMat);
  rock.position.set(x, 0.18, z);
  rock.rotation.y = x * 0.4;
  scene.add(rock);
}
const birds = [];
function gapBird(x, y, z) {
  const bird = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#f6f3ea" }),
  );
  body.scale.set(1.45, 0.7, 0.85);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.16, 4),
    new THREE.MeshLambertMaterial({ color: "#e0a04a" }),
  );
  beak.rotation.z = -Math.PI / 2;
  beak.position.x = 0.22;
  const wing = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.32, 4),
    new THREE.MeshLambertMaterial({ color: "#d7d0c2" }),
  );
  wing.rotation.z = Math.PI / 2;
  wing.position.set(0, 0.04, 0.14);
  bird.add(body, beak, wing);
  bird.position.set(x, y, z);
  bird.userData.baseY = y;
  scene.add(bird);
  birds.push(bird);
}
gapBush(-3.6, 17.2);
gapRock(-0.8, 18.4);
gapBird(-2.0, 1.15, 16.4);
gapBush(-3.4, 32.4);
gapRock(-0.6, 33.6);
gapBird(-1.8, 1.1, 31.6);

function bobBirds() {
  for (const bird of birds) {
    bird.position.y = bird.userData.baseY + Math.sin(clock * 2.4 + bird.position.z) * 0.08;
    bird.rotation.z = Math.sin(clock * 3.1 + bird.position.x) * 0.18;
  }
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
  const stems = [];
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
    stems.push(stem);
  }
  group.position.set(-2.35, spec.y, spec.z);
  scene.add(group);
  return { ...spec, group, shelfMat, blooms, stems, got: false, missed: false };
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

let lastGardenPlan = "";

function shuffleGardens() {
  const step = CONFIG.heightStep;
  const start = CONFIG.startHeight;
  const offset = Math.min(CONFIG.band * 0.45, Math.max(0.04, (step - CONFIG.band) * 0.3));
  const valid = (score) => score - step >= CONFIG.minHeight - 1e-6 && score + step <= CONFIG.maxHeight + 1e-6;
  const options = (from, first) => {
    const list = [];
    for (const dir of [-1, 1]) {
      for (const count of (first ? [2] : [1, 2])) {
        const next = Math.round((from + dir * count * step) * 100) / 100;
        if (valid(next)) list.push({ dir, count, next });
      }
    }
    return list;
  };
  const plans = [];
  for (const first of options(start, true)) {
    for (const second of options(first.next, false)) {
      for (const third of options(second.next, false)) {
        const moves = [first, second, third];
        const key = moves.map((move) => (move.dir > 0 ? "H" : "L").repeat(move.count)).join(",");
        const ys = moves.map((move) => Math.round((move.next + move.dir * offset) * 100) / 100);
        plans.push({ key, ys });
      }
    }
  }
  const choices = plans.filter((plan) => plan.key !== lastGardenPlan);
  const plan = choices[Math.floor(Math.random() * choices.length)] || plans[0];
  if (!plan) return;
  lastGardenPlan = plan.key;
  gardens.forEach((garden, index) => {
    garden.y = plan.ys[index];
  });
}

function resetPlay() {
  shuffleGardens();
  height = CONFIG.startHeight;
  target = CONFIG.startHeight;
  along = 0;
  met = 0;
  clock = 0;
  pauseBtn.textContent = "Pause";
  for (const garden of gardens) {
    garden.got = false;
    garden.missed = false;
    garden.group.rotation.x = 0;
    garden.group.rotation.z = 0;
    garden.group.position.y = garden.y;
    garden.shelfMat.color.set(garden.color);
    for (const stem of garden.stems) {
      stem.rotation.x = 0;
      stem.rotation.z = 0;
      stem.material.color.set("#3f8f4a");
    }
    for (const bloom of garden.blooms) {
      bloom.material.color.set(garden.color);
      bloom.scale.setScalar(1);
    }
  }
  balloon.position.set(0, height, along);
  showGardens();
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
    if (garden.missed) {
      garden.shelfMat.color.set("#6e4b34");
      continue;
    }
    const near = Math.abs(height - garden.y) <= CONFIG.band;
    garden.shelfMat.color.set(garden.got || near ? garden.bright : garden.color);
  }
}

function markMissed(garden) {
  garden.missed = true;
  garden.group.rotation.z = 0.42;
  garden.group.position.y = garden.y - 0.06;
  for (const stem of garden.stems) {
    stem.material.color.set("#6b3e2a");
    stem.rotation.z = 1.15;
  }
  for (const bloom of garden.blooms) {
    bloom.material.color.set("#7a4328");
    bloom.scale.setScalar(1.2);
  }
}

function placeCamera() {
  camera.position.set(4.6, height, along - 5.4);
  camera.lookAt(-1.6, height, along + 2.4);
}

function showGardens() {
  let open = true;
  for (const garden of gardens) {
    const behind = along > garden.z + 2.4;
    const show = open && !behind;
    garden.group.visible = show;
    if (show || !behind) open = false;
  }
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
  height += (target - height) * (1 - Math.exp(-3.4 * dt));
  along += CONFIG.drift * dt;
  balloon.position.set(0, height + Math.sin(clock * 1.8) * 0.04, along);
  envelope.rotation.z = Math.sin(clock * 1.2) * 0.06;
  bobBirds();
  showGardens();
  paintGardens();
  for (const garden of gardens) {
    if (garden.got) {
      const s = 1.35 + Math.sin(clock * 3 + garden.z) * 0.06;
      for (const bloom of garden.blooms) bloom.scale.setScalar(s);
      continue;
    }
    if (garden.missed) continue;
    const dz = along - garden.z;
    const aligned = Math.abs(height - garden.y) <= CONFIG.band;
    const aimed = Math.abs(target - garden.y) <= CONFIG.band;
    if (aligned && dz > -4.6 && dz < CONFIG.reach) {
      garden.got = true;
      met += 1;
      playSound("bloom");
      paintScore();
      if (met >= gardens.length) {
        finish(true);
        return;
      }
    } else if (!aligned && !aimed && dz > -1.15) {
      markMissed(garden);
    } else if (!aligned && dz > -0.2) {
      markMissed(garden);
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
    bobBirds();
    for (const cloud of clouds) cloud.position.x += Math.sin(clock + cloud.position.z) * 0.0008;
    placeCamera();
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
