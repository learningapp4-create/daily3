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
const dropBtn = document.querySelector("#drop");

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
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const sun = new THREE.DirectionalLight(0xfff4e0, 0.65);
sun.position.set(-2, 6, 4);
scene.add(sun);

const camera = new THREE.OrthographicCamera(-8, 8, 4, -4, 0.1, 40);

scene.add(new THREE.Mesh(
  new THREE.BoxGeometry(80, 2.2, 6),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.water }),
));
const water = scene.children[scene.children.length - 1];
water.position.y = -1.05;

const bank = new THREE.Mesh(
  new THREE.BoxGeometry(80, 1.2, 3),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.bank }),
);
bank.position.set(0, -0.2, -2.2);
scene.add(bank);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 12, 10),
  new THREE.MeshBasicMaterial({ color: CONFIG.colors.moon }),
);
moon.position.set(4.5, 3.3, -3);
scene.add(moon);

const reedMat = new THREE.MeshLambertMaterial({ color: "#2f6a45" });
const reeds = [];
for (let i = 0; i < 3; i += 1) {
  const reed = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.05, 5), reedMat);
  scene.add(reed);
  reeds.push(reed);
}
const fishMat = new THREE.MeshLambertMaterial({ color: "#f08a3c" });
const fish = [0, 1].map((index) => {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5), fishMat);
  mesh.rotation.z = -Math.PI / 2;
  scene.add(mesh);
  return { mesh, baseX: 0, index };
});
const bird = new THREE.Group();
const birdBody = new THREE.Mesh(
  new THREE.ConeGeometry(0.12, 0.46, 4),
  new THREE.MeshLambertMaterial({ color: "#f4f7fb" }),
);
birdBody.rotation.z = -Math.PI / 2;
bird.add(birdBody);
const wing = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.06, 0.22),
  new THREE.MeshLambertMaterial({ color: "#d5deea" }),
);
bird.add(wing);
scene.add(bird);

const raft = new THREE.Group();
const hull = new THREE.Mesh(
  new THREE.BoxGeometry(1.55, 0.4, 1.05),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.hull }),
);
hull.position.y = 0.2;
raft.add(hull);
const pole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6),
  new THREE.MeshLambertMaterial({ color: "#d7c4a3" }),
);
pole.position.y = 1.05;
raft.add(pole);
const lantern = new THREE.Mesh(
  new THREE.SphereGeometry(0.42, 14, 12),
  new THREE.MeshBasicMaterial({ color: CONFIG.colors.flame }),
);
lantern.position.y = CONFIG.lanternHigh;
raft.add(lantern);
scene.add(raft);

const capGeo = new THREE.CylinderGeometry(0.62, 0.66, 0.22, 10);
const posts = [0, 1, 2].map(() => {
  const group = new THREE.Group();
  const poleMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 1.15, 6),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.post }),
  );
  poleMesh.position.y = 0.62;
  group.add(poleMesh);
  const capMat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.cap });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = CONFIG.capY;
  group.add(cap);
  group.position.set(0, 0, 0);
  scene.add(group);
  return { x: 0, group, cap, capMat, lit: false, missed: false, glow: null };
});

let raftX = 0;
let met = 0;
let mode = "ready";
let clock = 0;
let drop = null;
let endX = 0;
let lastRhythm = "";

function paintScore() {
  scoreEl.textContent = `Posts ${met}/${posts.length}`;
}

function showCard(title, label) {
  cardTitle.textContent = title;
  cardBody.textContent = "";
  cardGo.textContent = label;
  card.hidden = false;
}

function placeCamera() {
  camera.position.set(raftX + 0.2, 1.55, 12);
  camera.lookAt(raftX + 0.2, 1.35, 0);
  moon.position.x = raftX + 3.4;
}

function paintPosts() {
  for (const post of posts) {
    const ready = !post.lit && !post.missed && Math.abs(raftX - post.x) <= CONFIG.band;
    const color = post.lit ? CONFIG.colors.flame : ready ? CONFIG.colors.capReady : CONFIG.colors.cap;
    post.capMat.color.set(color);
    const scale = ready ? 1.35 : 1;
    post.cap.scale.setScalar(scale);
  }
}

function clearGlows() {
  for (const post of posts) {
    if (!post.glow) continue;
    scene.remove(post.glow);
    post.glow.geometry.dispose();
    post.glow.material.dispose();
    post.glow = null;
  }
}

function layPosts() {
  const choices = CONFIG.rhythms.filter((rhythm) => rhythm.join(",") !== lastRhythm);
  const rhythm = choices[Math.floor(Math.random() * choices.length)] || CONFIG.rhythms[0];
  lastRhythm = rhythm.join(",");
  let x = CONFIG.firstPost;
  posts.forEach((post, index) => {
    post.x = x;
    post.group.position.x = x;
    if (index < rhythm.length) x += rhythm[index];
  });
  endX = posts[posts.length - 1].x + CONFIG.tail;
  reeds[0].position.set(CONFIG.firstPost * 0.4, 0.5, -0.85);
  reeds[1].position.set(posts[0].x + (posts[1].x - posts[0].x) * 0.38, 0.5, -0.85);
  reeds[2].position.set(posts[1].x + (posts[2].x - posts[1].x) * 0.38, 0.5, -0.85);
  fish.forEach((item, index) => {
    item.baseX = posts[index].x + (posts[index + 1].x - posts[index].x) * 0.62;
  });
}

function driftLife() {
  fish.forEach((item) => {
    const leap = Math.max(0, Math.sin(clock * 2.1 + item.index * 1.7));
    item.mesh.position.set(
      item.baseX + Math.sin(clock * 0.7 + item.index) * 0.3,
      0.12 + leap * 0.85,
      0.55,
    );
    item.mesh.rotation.z = -Math.PI / 2 + leap * 0.8;
  });
  bird.position.set(raftX + Math.sin(clock * 0.85) * 3.1, 2.85 + Math.sin(clock * 2.6) * 0.12, -0.5);
  wing.rotation.z = Math.sin(clock * 7) * 0.5;
}

function resetPlay() {
  heard = false;
  raftX = 0;
  met = 0;
  clock = 0;
  drop = null;
  pauseBtn.textContent = "Pause";
  clearGlows();
  lantern.position.y = CONFIG.lanternHigh;
  layPosts();
  for (const post of posts) {
    post.lit = false;
    post.missed = false;
  }
  paintPosts();
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

function finish(won) {
  mode = "end";
  if (won) playSound("done");
  showCard(won ? CONFIG.winTitle : CONFIG.waitTitle, "Again");
}

function pressDrop() {
  if (mode !== "play" || drop) return;
  heard = true;
  const post = posts.find((item) => !item.lit && !item.missed && Math.abs(raftX - item.x) <= CONFIG.band);
  if (post) {
    playSound("drop");
    drop = { post, phase: "down", t: 0 };
  } else {
    playSound("miss");
    drop = { post: null, phase: "dip", t: 0 };
  }
}

function step(dt) {
  clock += dt;
  if (!drop) raftX += CONFIG.speed * dt;
  raft.position.x = raftX;
  if (!drop) lantern.position.y = CONFIG.lanternHigh + Math.sin(clock * 2.2) * 0.04;

  if (drop) {
    drop.t += dt;
    const k = Math.min(1, drop.t / CONFIG.dropSeconds);
    if (drop.phase === "down") {
      lantern.position.y = CONFIG.lanternHigh + (CONFIG.lanternLow - CONFIG.lanternHigh) * k;
      if (k >= 1) {
        drop.post.lit = true;
        met += 1;
        playSound("glow");
        paintScore();
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 10, 8),
          new THREE.MeshBasicMaterial({ color: CONFIG.colors.flame }),
        );
        glow.position.set(drop.post.x, CONFIG.capY + 0.28, 0);
        scene.add(glow);
        drop.post.glow = glow;
        drop.phase = "up";
        drop.t = 0;
      }
    } else if (drop.phase === "up") {
      lantern.position.y = CONFIG.lanternLow + (CONFIG.lanternHigh - CONFIG.lanternLow) * k;
      if (k >= 1) drop = null;
    } else {
      lantern.position.y = CONFIG.lanternHigh - Math.sin(k * Math.PI) * 0.55;
      if (k >= 1) drop = null;
    }
  }

  for (const post of posts) {
    if (!post.lit && !post.missed && raftX > post.x + CONFIG.band) post.missed = true;
  }
  paintPosts();
  driftLife();
  placeCamera();
  if (raftX > endX) finish(posts.every((post) => post.lit));
}

dropBtn.addEventListener("click", pressDrop);
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
  if (event.code === "Space" || event.code === "ArrowDown") event.preventDefault();
  if (event.code === "KeyP") {
    pauseBtn.click();
    return;
  }
  if (mode !== "play") return;
  if (event.code === "Space" || event.code === "ArrowDown") pressDrop();
});

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / Math.max(1, h);
  const viewH = 2.45;
  camera.top = viewH;
  camera.bottom = -viewH;
  camera.left = -viewH * aspect;
  camera.right = viewH * aspect;
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
    if (!drop) lantern.position.y = CONFIG.lanternHigh + Math.sin(clock * 2.2) * 0.04;
    raft.position.x = raftX;
    driftLife();
    placeCamera();
    renderer.render(scene, camera);
    return;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
