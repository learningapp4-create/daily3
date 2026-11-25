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
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
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
scene.add(new THREE.AmbientLight(0xffffff, 0.92));
const sun = new THREE.DirectionalLight(0xffffff, 0.55);
sun.position.set(2, 6, 4);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const grass = new THREE.Mesh(
  new THREE.BoxGeometry(24, 0.4, 10),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.grass }),
);
grass.position.y = -0.2;
scene.add(grass);

const stump = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.62, 0.45, 8),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.stump }),
);
stump.position.set(0, 0.28, 3.35);
scene.add(stump);

function eggGeometry(shape) {
  if (shape === "point") return new THREE.ConeGeometry(0.46, 0.86, 4);
  if (shape === "square") return new THREE.BoxGeometry(0.74, 0.74, 0.74);
  return new THREE.SphereGeometry(0.42, 14, 12);
}

const nestXs = [-3.3, 0, 3.3];
const parked = [];
const nests = CONFIG.nests.map((spec, index) => {
  const group = new THREE.Group();
  const x = nestXs[index] ?? (index - 1) * 3.3;
  group.position.set(x, 0, -1.8);
  const bowl = new THREE.Mesh(
    spec.shape === "square"
      ? new THREE.BoxGeometry(1.15, 0.7, 1.15)
      : spec.shape === "point"
        ? new THREE.ConeGeometry(0.85, 0.55, 4)
        : new THREE.CylinderGeometry(0.78, 0.7, 0.32, 12),
    new THREE.MeshLambertMaterial({ color: spec.color }),
  );
  bowl.position.y = spec.shape === "point" ? 0.28 : 0.2;
  group.add(bowl);
  const bird = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.bird }),
  );
  body.position.y = 0.55;
  bird.add(body);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.16, 4),
    new THREE.MeshLambertMaterial({ color: spec.color }),
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.55, 0.22);
  bird.add(beak);
  bird.position.set(0, 0.15, -0.55);
  group.add(bird);
  scene.add(group);
  const button = document.querySelector(`#nest-${index}`);
  button.textContent = spec.mark;
  button.style.background = spec.color;
  button.style.color = spec.ink;
  button.setAttribute("aria-label", spec.name);
  return { ...spec, index, x, group, bird, button };
});

const eggMeshes = nests.map((nest) => {
  const mesh = new THREE.Mesh(
    eggGeometry(nest.shape),
    new THREE.MeshLambertMaterial({ color: nest.color }),
  );
  mesh.position.set(0, CONFIG.eggY, 3.2);
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
});

let queue = [];
let eggIndex = 0;
let met = 0;
let mode = "ready";
let clock = 0;
let trip = null;

function paintScore() {
  scoreEl.textContent = `Eggs ${met}/${CONFIG.eggCount}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function deal() {
  const bag = [];
  for (let i = 0; i < CONFIG.eggCount; i += 1) bag.push(i % nests.length);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  queue = bag;
  eggIndex = 0;
}

function showEgg() {
  eggMeshes.forEach((mesh, index) => {
    mesh.visible = index === queue[eggIndex];
    mesh.position.set(0, CONFIG.eggY, 3.2);
    mesh.scale.setScalar(1);
  });
}

function clearParked() {
  for (const mesh of parked) scene.remove(mesh);
  parked.length = 0;
}

function placeCamera() {
  camera.position.set(0, 5.4, 9.2);
  camera.lookAt(0, 0.4, 0);
}

function resetPlay() {
  heard = false;
  met = 0;
  clock = 0;
  trip = null;
  pauseBtn.textContent = "Pause";
  clearParked();
  deal();
  showEgg();
  paintScore();
  placeCamera();
  for (const nest of nests) nest.bird.position.y = 0.15;
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

function currentEgg() {
  return eggMeshes[queue[eggIndex]];
}

function choose(index) {
  if (mode !== "play" || trip || eggIndex >= queue.length) return;
  heard = true;
  const nest = nests[index];
  playSound("send");
  trip = {
    nest,
    match: index === queue[eggIndex],
    phase: "go",
    t: 0,
    from: currentEgg().position.x,
    to: nest.x,
  };
}

function step(dt) {
  clock += dt;
  const egg = currentEgg();
  if (!trip && egg) egg.position.y = CONFIG.eggY + Math.sin(clock * 3) * 0.05;
  if (!trip) return;
  trip.t += dt;
  const going = trip.phase === "go";
  const dur = going ? CONFIG.sendSeconds : CONFIG.backSeconds;
  const k = Math.min(1, trip.t / dur);
  const eased = k * k * (3 - 2 * k);
  if (going) {
    const along = trip.match ? eased : Math.min(eased, CONFIG.turnBack);
    egg.position.x = trip.from + (trip.to - trip.from) * along;
    egg.position.z = 3.2 + (trip.nest.group.position.z - 3.2) * along;
    const crest = trip.match ? along : along / CONFIG.turnBack;
    const lift = trip.match ? 0.7 : 0.18;
    egg.position.y = CONFIG.eggY + Math.sin(crest * Math.PI) * lift;
    if (!trip.match && eased >= CONFIG.turnBack) {
      playSound("back");
      trip.phase = "back";
      trip.t = 0;
      trip.from = egg.position.x;
      trip.fromZ = egg.position.z;
      trip.fromY = egg.position.y;
      trip.to = 0;
      return;
    }
    if (k < 1) return;
    playSound("home");
    const kept = egg.clone();
    kept.position.set(trip.nest.x, 0.78, trip.nest.group.position.z);
    kept.scale.setScalar(0.7);
    kept.visible = true;
    scene.add(kept);
    parked.push(kept);
    trip.nest.bird.position.y = 0.32;
    met += 1;
    paintScore();
    eggIndex += 1;
    trip = null;
    if (eggIndex >= queue.length) finish();
    else showEgg();
    return;
  }
  egg.position.x = trip.from + (trip.to - trip.from) * eased;
  egg.position.z = trip.fromZ + (3.2 - trip.fromZ) * eased;
  egg.position.y = trip.fromY + (CONFIG.eggY - trip.fromY) * eased;
  if (k < 1) return;
  trip = null;
  egg.position.set(0, CONFIG.eggY, 3.2);
}

nests.forEach((nest) => nest.button.addEventListener("click", () => choose(nest.index)));
canvas.addEventListener("pointerdown", (event) => {
  if (mode !== "play") return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nests.map((nest) => nest.group), true);
  if (!hits.length) return;
  let node = hits[0].object;
  let nest = null;
  while (node && !nest) {
    nest = nests.find((item) => item.group === node) || null;
    node = node.parent;
  }
  if (nest) choose(nest.index);
});
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
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "Digit1", "Digit2", "Digit3"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "KeyP") {
    pauseBtn.click();
    return;
  }
  if (mode !== "play") return;
  if (event.code === "ArrowLeft" || event.code === "Digit1") choose(0);
  if (event.code === "ArrowDown" || event.code === "Digit2") choose(1);
  if (event.code === "ArrowRight" || event.code === "Digit3") choose(2);
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
  clock += mode === "play" ? 0 : dt;
  if (mode === "play") step(dt);
  else if (currentEgg()) currentEgg().position.y = CONFIG.eggY + Math.sin(clock * 3) * 0.05;
  placeCamera();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
