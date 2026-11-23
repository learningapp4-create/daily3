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
  playSound("take");
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
const camera = new THREE.OrthographicCamera(-6, 6, 4, -4, 0.1, 50);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xfff4d2, 0.75);
sun.position.set(6, 12, 4);
scene.add(sun);

const grass = new THREE.Mesh(
  new THREE.CircleGeometry(18, 24),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.grass }),
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.08;
scene.add(grass);

const postR = 0.24;
let cursorX = -4.6;
const postXs = [cursorX];
const gaps = CONFIG.gaps.map((spec, index) => {
  const start = cursorX;
  cursorX = start + postR * 2 + spec.need;
  postXs.push(cursorX);
  return {
    index,
    need: spec.need,
    x: (start + cursorX) / 2,
    filled: false,
  };
});
const midX = (postXs[0] + cursorX) / 2;

const waterMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.water });
const gapTargets = gaps.map((gap) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(gap.need, 0.16, 1.25), waterMat);
  mesh.position.set(gap.x, 0.08, 0);
  mesh.userData.kind = "gap";
  mesh.userData.index = gap.index;
  scene.add(mesh);
  return mesh;
});

const postMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.post });
const postGeo = new THREE.CylinderGeometry(postR, postR * 1.08, 0.72, 8);
for (const x of postXs) {
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(x, 0.36, 0);
  scene.add(post);
}

const planks = CONFIG.planks.map((spec, index) => {
  const mat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.plank });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.length, 0.16, 0.48), mat);
  const home = {
    x: midX + (index - (CONFIG.planks.length - 1) / 2) * 2.9,
    y: 0.2,
    z: 1.7,
  };
  mesh.position.set(home.x, home.y, home.z);
  mesh.userData.kind = "plank";
  mesh.userData.index = index;
  scene.add(mesh);
  return {
    index,
    length: spec.length,
    mesh,
    mat,
    home,
    selected: false,
    placed: false,
    hop: 0,
    gapX: 0,
  };
});

const duck = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 12, 10),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.duck }),
);
body.scale.set(1, 0.78, 1.25);
duck.add(body);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 10, 8),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.duck }),
);
head.position.set(0, 0.24, 0.22);
duck.add(head);
const beak = new THREE.Mesh(
  new THREE.ConeGeometry(0.06, 0.18, 6),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.beak }),
);
beak.rotation.x = Math.PI / 2;
beak.position.set(0, 0.22, 0.4);
duck.add(beak);
scene.add(duck);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.34, 0.045, 6, 18),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.focus }),
);
ring.rotation.x = Math.PI / 2;
scene.add(ring);

camera.position.set(midX, 14, 7.2);
camera.lookAt(midX, 0, 0.15);

const bushMat = new THREE.MeshLambertMaterial({ color: "#3e8a48" });
function bush(x, z, scale) {
  const clump = new THREE.Group();
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), bushMat);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 5), bushMat);
  b.position.set(0.26, 0.04, 0.08);
  clump.add(a, b);
  clump.position.set(x, 0.26, z);
  clump.scale.setScalar(scale);
  scene.add(clump);
}
bush(midX - 3.6, -1.65, 1);
bush(midX + 3.8, -1.8, 0.8);
const bankRock = new THREE.Mesh(
  new THREE.DodecahedronGeometry(0.34, 0),
  new THREE.MeshLambertMaterial({ color: "#b7b1a4" }),
);
bankRock.position.set(midX + 2.4, 0.18, 2.7);
scene.add(bankRock);
const bankFlower = new THREE.Mesh(
  new THREE.ConeGeometry(0.16, 0.28, 6),
  new THREE.MeshLambertMaterial({ color: "#e56b8a" }),
);
bankFlower.position.set(midX - 2.5, 0.18, 2.7);
scene.add(bankFlower);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const focusOrder = [
  ...planks.map((plank) => ({ kind: "plank", index: plank.index })),
  ...gaps.map((gap) => ({ kind: "gap", index: gap.index })),
];

let mode = "ready";
let focusAt = 0;
let selected = -1;
let placed = 0;
let walking = false;
let walkT = 0;
let clock = 0;

function paintScore() {
  scoreEl.textContent = `Planks ${placed}/${gaps.length}`;
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

function duckHome() {
  duck.position.set(postXs[0] - 0.78, 0.46, 0);
  duck.rotation.y = -Math.PI / 2;
}

function resetRound() {
  mode = "ready";
  focusAt = 0;
  selected = -1;
  placed = 0;
  walking = false;
  walkT = 0;
  pauseBtn.textContent = "Pause";
  for (const gap of gaps) gap.filled = false;
  for (const plank of planks) {
    plank.selected = false;
    plank.placed = false;
    plank.hop = 0;
    plank.mat.color.set(CONFIG.colors.plank);
    plank.mesh.position.set(plank.home.x, plank.home.y, plank.home.z);
  }
  ring.visible = false;
  duckHome();
  paintScore();
  showCard(CONFIG.readyTitle, "Go");
}

function begin() {
  hideCard();
  mode = "play";
}

function selectPlank(index) {
  const plank = planks[index];
  if (!plank || plank.placed || walking) return;
  selected = index;
  for (const other of planks) {
    other.selected = other.index === index;
    if (!other.placed) other.mat.color.set(other.selected ? CONFIG.colors.plankOn : CONFIG.colors.plank);
  }
  playSound("take");
}

function tryGap(index) {
  if (selected < 0 || walking) return;
  const plank = planks[selected];
  const gap = gaps[index];
  if (!plank || plank.placed || !gap || gap.filled) return;
  if (Math.abs(plank.length - gap.need) <= CONFIG.fitSlack) {
    plank.placed = true;
    plank.selected = false;
    plank.gapX = gap.x;
    plank.mat.color.set(CONFIG.colors.plank);
    gap.filled = true;
    selected = -1;
    placed += 1;
    playSound("fit");
    paintScore();
    if (placed >= gaps.length) {
      walking = true;
      walkT = 0;
    }
    return;
  }
  plank.hop = 0.4;
  playSound("back");
}

function activateFocus() {
  const item = focusOrder[focusAt];
  if (!item || mode !== "play" || walking) return;
  if (item.kind === "plank") selectPlank(item.index);
  else tryGap(item.index);
}

function moveFocus(dir) {
  if (mode !== "play" || walking) return;
  focusAt = (focusAt + dir + focusOrder.length) % focusOrder.length;
}

function togglePause() {
  if (walking) return;
  if (mode === "play") {
    mode = "paused";
    pauseBtn.textContent = "Play";
  } else if (mode === "paused") {
    mode = "play";
    pauseBtn.textContent = "Pause";
  }
}

function finish() {
  mode = "end";
  playSound("cross");
  showCard(CONFIG.winTitle, "Again");
}

pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetRound);
cardGo.addEventListener("click", () => {
  if (mode === "end") resetRound();
  else begin();
});

canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "play" || walking) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...planks.map((p) => p.mesh), ...gapTargets], false);
  if (!hits.length) return;
  const data = hits[0].object.userData;
  const at = focusOrder.findIndex((item) => item.kind === data.kind && item.index === data.index);
  if (at >= 0) focusAt = at;
  if (data.kind === "plank") selectPlank(data.index);
  else tryGap(data.index);
});

window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "KeyP") {
    togglePause();
    return;
  }
  if (mode !== "play" || e.repeat) return;
  if (e.code === "ArrowRight" || e.code === "ArrowDown") moveFocus(1);
  if (e.code === "ArrowLeft" || e.code === "ArrowUp") moveFocus(-1);
  if (e.code === "Space" || e.code === "Enter") activateFocus();
});

function layout(dt) {
  clock += dt;
  for (const plank of planks) {
    if (plank.hop > 0) plank.hop = Math.max(0, plank.hop - dt);
    const hop = plank.hop > 0 ? Math.sin((1 - plank.hop / 0.4) * Math.PI) * 0.45 : 0;
    if (plank.placed) {
      plank.mesh.position.set(plank.gapX, 0.28, 0);
      continue;
    }
    const lift = plank.selected ? 0.34 : 0;
    const bob = Math.sin(clock * 2.2 + plank.index) * 0.03;
    plank.mesh.position.set(plank.home.x, plank.home.y + lift + bob + hop, plank.home.z);
  }
  const held = planks.find((plank) => plank.selected);
  ring.visible = Boolean(held) && !walking && mode === "play";
  if (held) {
    ring.position.set(held.mesh.position.x, 0.06, held.mesh.position.z);
    ring.scale.setScalar(Math.max(1.15, held.length * 0.48));
  }
  if (walking) {
    walkT += dt / CONFIG.walkSeconds;
    const t = Math.min(1, walkT);
    duck.position.set(
      (postXs[0] - 0.78) + (cursorX + 0.7 - (postXs[0] - 0.78)) * t,
      0.46 + Math.abs(Math.sin(t * Math.PI * 8)) * 0.08,
      0,
    );
    if (t >= 1) finish();
  } else if (!walking) {
    duck.position.y = 0.42 + Math.sin(clock * 2) * 0.02;
  }
}

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / Math.max(1, h);
  const viewH = 7.4;
  camera.left = -(viewH * aspect) / 2;
  camera.right = (viewH * aspect) / 2;
  camera.top = viewH * 0.4;
  camera.bottom = -viewH * 0.6;
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
  if (mode === "play") layout(dt);
  else if (mode !== "end") {
    clock += dt;
    duck.position.y = 0.42 + Math.sin(clock * 2) * 0.02;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
