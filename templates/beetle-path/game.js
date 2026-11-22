import * as THREE from "three";
import { CONFIG } from "./config.js";

const DIRS = {
  N: { dc: 0, dr: -1, rot: 0 },
  E: { dc: 1, dr: 0, rot: -Math.PI / 2 },
  S: { dc: 0, dr: 1, rot: Math.PI },
  W: { dc: -1, dr: 0, rot: Math.PI / 2 },
};
const ORDER = ["N", "E", "S", "W"];

const canvas = document.querySelector("#view");
const titleEl = document.querySelector("#title");
const goalEl = document.querySelector("#goal");
const scoreEl = document.querySelector("#score");
const card = document.querySelector("#card");
const cardTitle = document.querySelector("#card-title");
const cardBody = document.querySelector("#card-body");
const cardGo = document.querySelector("#card-go");
const goBtn = document.querySelector("#go");
const undoBtn = document.querySelector("#undo");
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
function paintSound() {
  soundBtn.textContent = soundOn ? "Sound" : "Quiet";
  soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
}
paintSound();
function playSound(name) {
  if (!soundOn) return;
  const audio = clips.get(name);
  if (!audio) return;
  audio.volume = CONFIG.soundVolume ?? 0.85;
  const node = audio.cloneNode();
  node.volume = audio.volume;
  node.play().catch(() => {});
}
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  paintSound();
  if (!soundOn) {
    for (const audio of clips.values()) audio.pause();
    return;
  }
  playSound("turn");
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
const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 40);
camera.position.set(0.2, 9, 7.4);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 0.65);
sun.position.set(4, 10, 6);
scene.add(sun);

const meadow = new THREE.Mesh(
  new THREE.CircleGeometry(28, 24),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.meadow }),
);
meadow.rotation.x = -Math.PI / 2;
meadow.position.y = -0.2;
scene.add(meadow);

const stoneGeo = new THREE.BoxGeometry(1.12, 0.18, 1.12);
const stoneMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.stone });
const arrowMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.arrow });
const flowerMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.flower });
const centerMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.flowerCenter });

const rows = CONFIG.rows.map((row) => row.trim().toUpperCase().split(""));
const height = rows.length;
const width = Math.max(...rows.map((row) => row.length));
const letters = rows.map((row) => {
  const line = row.slice(0, width);
  while (line.length < width) line.push("E");
  return line.map((ch) => (ch === "F" || DIRS[ch] ? ch : "E"));
});
const initial = letters.map((row) => row.slice());

let flower = null;
for (let r = 0; r < height; r += 1) {
  for (let c = 0; c < width; c += 1) {
    if (letters[r][c] === "F" && !flower) flower = { c, r };
  }
}

function tileXZ(c, r) {
  const midC = (width - 1) / 2;
  const midR = (height - 1) / 2;
  return {
    x: (c - midC) * CONFIG.spacing,
    z: (r - midR) * CONFIG.spacing,
  };
}

const tiles = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function makeArrow() {
  const group = new THREE.Group();
  const mat = arrowMat.clone();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.34), mat);
  shaft.position.set(0, 0.1, 0.02);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.24, 4), mat);
  head.rotation.x = -Math.PI / 2;
  head.position.set(0, 0.16, -0.26);
  group.add(shaft, head);
  group.userData.mat = mat;
  return group;
}

function makeFlower() {
  const group = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 5), flowerMat);
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.18, 0.16, Math.sin(a) * 0.18);
    petal.rotation.x = Math.PI;
    group.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), centerMat);
  center.position.y = 0.2;
  group.add(center);
  return group;
}

for (let r = 0; r < height; r += 1) {
  for (let c = 0; c < width; c += 1) {
    const pos = tileXZ(c, r);
    const stone = new THREE.Mesh(stoneGeo, stoneMat.clone());
    stone.position.set(pos.x, 0, pos.z);
    const isFlower = letters[r][c] === "F";
    if (isFlower) stone.material.color.set(CONFIG.colors.flowerBed);
    const marker = isFlower ? makeFlower() : makeArrow();
    marker.position.set(pos.x, isFlower ? 0.12 : 0.2, pos.z);
    if (!isFlower) marker.rotation.y = DIRS[letters[r][c]].rot;
    stone.userData = { c, r };
    scene.add(stone, marker);
    tiles.push({ c, r, stone, marker, flower: isFlower });
  }
}

const beetle = new THREE.Group();
const shellMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.beetle });
const darkMat = new THREE.MeshLambertMaterial({ color: "#241810" });
const elytraGeo = new THREE.SphereGeometry(0.22, 12, 10);
for (const side of [-1, 1]) {
  const wing = new THREE.Mesh(elytraGeo, shellMat);
  wing.scale.set(0.42, 0.34, 1.7);
  wing.position.set(side * 0.085, 0.12, 0.12);
  beetle.add(wing);
}
const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.7), darkMat);
seam.position.set(0, 0.2, 0.12);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), darkMat);
head.scale.set(1.05, 0.62, 0.85);
head.position.set(0, 0.11, -0.32);
const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
const eyeMat = new THREE.MeshLambertMaterial({ color: "#fff6ea" });
const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
eyeL.position.set(0.07, 0.16, -0.4);
eyeR.position.set(-0.07, 0.16, -0.4);
beetle.add(seam, head, eyeL, eyeR);
for (const side of [-1, 1]) {
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), darkMat);
  ant.rotation.x = Math.PI / 2;
  ant.rotation.z = side * 0.65;
  ant.position.set(side * 0.14, 0.16, -0.52);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), darkMat);
  tip.position.set(side * 0.24, 0.16, -0.64);
  beetle.add(ant, tip);
}
const legGeo = new THREE.BoxGeometry(0.28, 0.04, 0.055);
for (let i = 0; i < 3; i += 1) {
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, darkMat);
    leg.position.set(side * 0.28, 0.05, 0.0 + i * 0.16);
    leg.rotation.z = side * -0.55;
    beetle.add(leg);
  }
}
beetle.scale.setScalar(0.78);
scene.add(beetle);
const flowerTile = tiles.find((tile) => tile.flower);

let cursor = {
  c: Math.max(0, Math.min(width - 1, CONFIG.start.c)),
  r: Math.max(0, Math.min(height - 1, CONFIG.start.r)),
};
let mode = "ready";
let paused = false;
let walk = null;
let seen = new Set();
const turns = [];
let last = performance.now();

function resize() {
  const w = window.innerWidth;
  const h = Math.max(1, window.innerHeight);
  const aspect = w / h;
  const spanX = (width - 1) * CONFIG.spacing + 2.2;
  const spanZ = (height - 1) * CONFIG.spacing + 3.2;
  let halfH = spanZ * 0.72;
  let halfW = halfH * aspect;
  const needW = spanX * 0.62;
  if (halfW < needW) {
    halfW = needW;
    halfH = halfW / aspect;
  }
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.left = -halfW;
  camera.right = halfW;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);
resize();

function tileAt(c, r) {
  return tiles.find((tile) => tile.c === c && tile.r === r);
}

function paintCursor() {
  for (const tile of tiles) {
    if (tile.flower) continue;
    const selected = mode !== "play" && tile.c === cursor.c && tile.r === cursor.r;
    let color = CONFIG.colors.stone;
    if (tile.visited) color = CONFIG.colors.path;
    if (tile.wrong) color = CONFIG.colors.wrong;
    else if (selected) color = CONFIG.colors.stoneOn;
    tile.stone.material.color.set(color);
    tile.stone.position.y = tile.wrong ? 0.16 : selected ? 0.1 : 0;
    tile.marker.visible = !tile.wrong;
    if (tile.marker.userData.mat) {
      tile.marker.userData.mat.color.set(tile.wrong ? "#fffaf0" : CONFIG.colors.arrow);
    }
  }
}

function placeBeetle(c, r, lift = 0) {
  const pos = tileXZ(c, r);
  const tile = tileAt(c, r);
  const onWrong = Boolean(tile && tile.wrong);
  beetle.scale.setScalar(0.78);
  beetle.position.set(pos.x, (onWrong ? 0.52 : 0.34) + lift, onWrong ? pos.z : pos.z + 0.34);
}

function showCard(title, body, label) {
  cardTitle.textContent = title;
  cardBody.textContent = body;
  cardGo.textContent = label;
  card.hidden = false;
}

function hideCard() {
  card.hidden = true;
}

function restoreStones() {
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      letters[r][c] = initial[r][c];
      const tile = tileAt(c, r);
      if (tile && !tile.flower) {
        tile.marker.rotation.y = DIRS[letters[r][c]].rot;
        tile.spin = null;
        tile.visited = false;
        tile.wrong = false;
      }
    }
  }
}

function homeBeetle() {
  cursor = {
    c: Math.max(0, Math.min(width - 1, CONFIG.start.c)),
    r: Math.max(0, Math.min(height - 1, CONFIG.start.r)),
  };
  placeBeetle(cursor.c, cursor.r);
  const face = letters[cursor.r][cursor.c];
  if (DIRS[face]) beetle.rotation.y = DIRS[face].rot;
  paintCursor();
}

function failedWalk() {
  return scoreEl.textContent === "Off the path" || scoreEl.textContent === "Loop";
}

function paintUndo() {
  undoBtn.classList.toggle("ready", mode !== "end" && failedWalk());
}

function resetRound() {
  mode = "ready";
  paused = false;
  walk = null;
  seen = new Set();
  turns.length = 0;
  pauseBtn.textContent = "Pause";
  scoreEl.textContent = "Ready";
  restoreStones();
  homeBeetle();
  paintUndo();
  showCard(CONFIG.readyTitle, CONFIG.readyBody, "Ready");
}

function turnTile(c, r) {
  if (mode === "end") return;
  if (walk) return;
  const tile = tileAt(c, r);
  if (!tile || tile.flower) return;
  const now = letters[r][c];
  const next = ORDER[(ORDER.indexOf(now) + 1) % ORDER.length];
  turns.push({ c, r });
  letters[r][c] = next;
  tile.wrong = false;
  tile.spin = { from: tile.marker.rotation.y, to: tile.marker.rotation.y - Math.PI / 2, t: 0 };
  playSound("turn");
  cursor = { c, r };
  paintCursor();
  placeBeetle(c, r);
  if (CONFIG.start.c === c && CONFIG.start.r === r && !walk) {
    beetle.rotation.y = DIRS[next].rot;
  }
}

function markWrong(at) {
  for (const tile of tiles) tile.wrong = Boolean(at && tile.c === at.c && tile.r === at.r);
  paintCursor();
}

function endWalk(kind, at) {
  const spot = at || (walk ? { c: walk.c, r: walk.r } : null);
  walk = null;
  paused = false;
  pauseBtn.textContent = "Pause";
  if (kind === "win") {
    mode = "end";
    markWrong(null);
    scoreEl.textContent = "Flower";
    playSound("win");
    showCard(CONFIG.winTitle, CONFIG.winBody || "", "Again");
    return;
  }
  mode = "ready";
  hideCard();
  if (spot && tileAt(spot.c, spot.r)) {
    cursor = { c: spot.c, r: spot.r };
    markWrong(spot);
    placeBeetle(spot.c, spot.r);
  }
  scoreEl.textContent = kind === "loop" ? "Loop" : "Off the path";
  playSound(kind === "loop" ? "loop" : "off");
  paintUndo();
}

function undoTurn() {
  if (mode === "end" || walk) return;
  const last = turns.pop();
  const failed = failedWalk() || tiles.some((tile) => tile.wrong);
  if (!last && !failed) return;
  for (const tile of tiles) {
    tile.wrong = false;
    tile.visited = false;
  }
  seen = new Set();
  walk = null;
  paused = false;
  pauseBtn.textContent = "Pause";
  mode = "ready";
  scoreEl.textContent = "Ready";
  hideCard();
  if (last) {
    const tile = tileAt(last.c, last.r);
    const now = letters[last.r][last.c];
    const prev = ORDER[(ORDER.indexOf(now) + ORDER.length - 1) % ORDER.length];
    letters[last.r][last.c] = prev;
    if (tile && !tile.flower) {
      tile.spin = null;
      tile.marker.rotation.y = DIRS[prev].rot;
    }
    playSound("turn");
  }
  homeBeetle();
  paintUndo();
}

function beginWalk() {
  if (mode === "end" || walk) return;
  if (!flower) {
    showCard("Check config.js", "One stone needs the letter F.", "Ready");
    return;
  }
  hideCard();
  mode = "play";
  paused = false;
  pauseBtn.textContent = "Pause";
  seen = new Set();
  for (const tile of tiles) {
    tile.visited = false;
    tile.wrong = false;
  }
  paintCursor();
  const start = {
    c: Math.max(0, Math.min(width - 1, CONFIG.start.c)),
    r: Math.max(0, Math.min(height - 1, CONFIG.start.r)),
  };
  placeBeetle(start.c, start.r);
  walk = { c: start.c, r: start.r, wait: 0.15, moving: null };
  scoreEl.textContent = "Walking";
  paintUndo();
}

function stepWalk(dt) {
  if (!walk || paused) return;
  if (walk.moving) {
    walk.moving.t += dt;
    const u = Math.min(1, walk.moving.t / CONFIG.stepSeconds);
    const ease = u * u * (3 - 2 * u);
    const pos = tileXZ(
      walk.moving.from.c + (walk.moving.to.c - walk.moving.from.c) * ease,
      walk.moving.from.r + (walk.moving.to.r - walk.moving.from.r) * ease,
    );
    beetle.position.set(pos.x, 0.34 + Math.sin(Math.PI * u) * 0.16, pos.z + 0.34);
    if (u >= 1) {
      if (walk.moving.off) {
        const from = walk.moving.from;
        walk.moving = null;
        endWalk("off", from);
        return;
      }
      walk.c = walk.moving.to.c;
      walk.r = walk.moving.to.r;
      walk.moving = null;
      walk.wait = 0.05;
    }
    return;
  }
  walk.wait -= dt;
  if (walk.wait > 0) return;

  const key = `${walk.c},${walk.r}`;
  if (flower && walk.c === flower.c && walk.r === flower.r) {
    endWalk("win");
    return;
  }
  if (seen.has(key)) {
    endWalk("loop");
    return;
  }
  seen.add(key);
  const stepped = tileAt(walk.c, walk.r);
  if (stepped) stepped.visited = true;
  paintCursor();
  const letter = letters[walk.r]?.[walk.c];
  const dir = DIRS[letter];
  if (!dir) {
    endWalk("off");
    return;
  }
  beetle.rotation.y = dir.rot;
  const nc = walk.c + dir.dc;
  const nr = walk.r + dir.dr;
  if (nr < 0 || nc < 0 || nr >= height || nc >= width) {
    const pos = tileXZ(walk.c, walk.r);
    walk.moving = {
      from: { c: walk.c, r: walk.r },
      to: { c: nc, r: nr },
      t: 0,
      off: true,
    };
    beetle.position.set(pos.x, 0.34, pos.z + 0.34);
    playSound("step");
    return;
  }
  playSound("step");
  walk.moving = {
    from: { c: walk.c, r: walk.r },
    to: { c: nc, r: nr },
    t: 0,
  };
}

function finishOffScreen() {
  if (!walk?.moving?.off) return;
  if (walk.moving.t / CONFIG.stepSeconds < 1) return;
  endWalk("off");
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  spinMarkers(dt);
  for (const tile of tiles) {
    if (tile.flower) continue;
    const s = tile.wrong ? 1 + Math.sin(now * 0.012) * 0.22 : 1;
    tile.marker.scale.setScalar(s);
  }
  if (flowerTile) flowerTile.marker.position.y = 0.18 + Math.sin(now * 0.003) * 0.05;
  if (mode === "play") {
    stepWalk(dt);
    finishOffScreen();
  }
  renderer.render(scene, camera);
}

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(tiles.map((tile) => tile.stone));
  if (!hits.length) return;
  const { c, r } = hits[0].object.userData;
  turnTile(c, r);
});

function spinMarkers(dt) {
  for (const tile of tiles) {
    if (!tile.spin) continue;
    tile.spin.t += dt;
    const u = Math.min(1, tile.spin.t / 0.16);
    tile.marker.rotation.y = tile.spin.from + (tile.spin.to - tile.spin.from) * u;
    if (u >= 1) tile.spin = null;
  }
}

function moveCursor(dc, dr) {
  let c = cursor.c + dc;
  let r = cursor.r + dr;
  c = Math.max(0, Math.min(width - 1, c));
  r = Math.max(0, Math.min(height - 1, r));
  cursor = { c, r };
  paintCursor();
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (!card.hidden) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cardGo.click();
    }
    return;
  }
  if (event.key === "ArrowLeft") {
    moveCursor(-1, 0);
    event.preventDefault();
  } else if (event.key === "ArrowRight") {
    moveCursor(1, 0);
    event.preventDefault();
  } else if (event.key === "ArrowUp") {
    moveCursor(0, -1);
    event.preventDefault();
  } else if (event.key === "ArrowDown") {
    moveCursor(0, 1);
    event.preventDefault();
  } else if (event.key === " ") {
    event.preventDefault();
    turnTile(cursor.c, cursor.r);
  } else if (event.key === "Enter") {
    event.preventDefault();
    beginWalk();
  } else if (event.key === "p" || event.key === "P") {
    pauseBtn.click();
  } else if (event.key === "Backspace" || event.key === "z" || event.key === "Z") {
    event.preventDefault();
    undoTurn();
  } else if (event.key === "r" || event.key === "R") {
    resetRound();
  }
});

goBtn.addEventListener("click", beginWalk);
undoBtn.addEventListener("click", undoTurn);
pauseBtn.addEventListener("click", () => {
  if (mode !== "play") return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});
resetBtn.addEventListener("click", resetRound);
cardGo.addEventListener("click", () => {
  if (mode === "end") {
    if (cardGo.textContent === "Again") resetRound();
    else {
      hideCard();
      mode = "ready";
      walk = null;
      seen = new Set();
      homeBeetle();
      scoreEl.textContent = "Ready";
    }
    return;
  }
  hideCard();
  mode = "ready";
});

if (!flower) {
  showCard("Check config.js", "One stone needs the letter F.", "Ready");
} else {
  resetRound();
}
requestAnimationFrame(frame);
