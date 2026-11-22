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
const leftBtn = document.querySelector("#left");
const rightBtn = document.querySelector("#right");
const hopInBtn = document.querySelector("#hop-in");
const outBtn = document.querySelector("#out");
const catchBtn = document.querySelector("#catch");
const moonBtn = document.querySelector("#moon");

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
const unlock = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
function primeAudio() {
  unlock.play().catch(() => {});
}
window.addEventListener("pointerdown", primeAudio, { once: true });
window.addEventListener("keydown", primeAudio, { once: true });
function playSound(name) {
  const audio = clips.get(name);
  if (!audio) return;
  const node = audio.cloneNode();
  node.volume = CONFIG.soundVolume ?? 0.85;
  node.play().catch(() => {});
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "low-power",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.sky);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 50);
camera.position.set(0, 9.2, 8.4);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.78));
const sun = new THREE.DirectionalLight(0xffffff, 0.7);
sun.position.set(4, 10, 6);
scene.add(sun);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.72, 18, 14),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.moonDim }),
);
const moonHalo = new THREE.Mesh(
  new THREE.TorusGeometry(1.05, 0.04, 6, 24),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.moonDim }),
);
moonHalo.rotation.x = Math.PI / 2;
scene.add(moon, moonHalo);

const starGeo = new THREE.OctahedronGeometry(0.26, 0);
const starMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.star });
const ringGroups = [];
const ringMeshes = [];
const stars = [];

let levelIndex = 0;
function level() {
  return CONFIG.levels[levelIndex];
}
function rings() {
  return level().rings;
}

rings().forEach((ring) => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(ring.radius, 0.075, 8, 28),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.ring }),
  );
  ringMeshes.push(mesh);
  mesh.rotation.x = Math.PI / 2;
  group.add(mesh);
  scene.add(group);
  ringGroups.push(group);
});

function layStars() {
  for (const star of stars) star.mesh.removeFromParent();
  stars.length = 0;
  rings().forEach((ring, index) => {
    for (const deg of ring.stars) {
      const star = new THREE.Mesh(starGeo, starMat);
      const a = (deg * Math.PI) / 180;
      star.position.set(Math.cos(a) * ring.radius, 0.22, Math.sin(a) * ring.radius);
      ringGroups[index].add(star);
      stars.push({ mesh: star, ring: index, got: false });
    }
  });
}

const bird = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.SphereGeometry(0.24, 14, 12),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.bird }),
);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 12, 10),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.bird }),
);
head.position.set(-0.16, 0.12, 0);
const beak = new THREE.Mesh(
  new THREE.ConeGeometry(0.06, 0.16, 6),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.beak }),
);
beak.rotation.z = Math.PI / 2;
beak.position.set(-0.32, 0.1, 0);
const wingGeo = new THREE.BoxGeometry(0.08, 0.16, 0.22);
const wingMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.wing });
const wingL = new THREE.Mesh(wingGeo, wingMat);
const wingR = new THREE.Mesh(wingGeo, wingMat);
wingL.position.set(0.02, 0.02, 0.18);
wingR.position.set(0.02, 0.02, -0.18);
const eyeGeo = new THREE.SphereGeometry(0.035, 8, 6);
const eyeMat = new THREE.MeshLambertMaterial({ color: "#2a241c" });
const eyeA = new THREE.Mesh(eyeGeo, eyeMat);
const eyeB = new THREE.Mesh(eyeGeo, eyeMat);
eyeA.position.set(-0.22, 0.18, 0.06);
eyeB.position.set(-0.22, 0.18, -0.06);
bird.add(body, head, beak, wingL, wingR, eyeA, eyeB);
scene.add(bird);

const pad = new THREE.Mesh(
  new THREE.TorusGeometry(0.46, 0.05, 6, 18),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.pad }),
);
pad.rotation.x = Math.PI / 2;
scene.add(pad);

let mode = "ready";
let paused = false;
let ringIndex = 0;
let starsGot = 0;
let hopping = null;
let last = performance.now();

function resize() {
  const w = window.innerWidth;
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  const outer = rings()[0].radius + 1.3;
  const half = Math.tan((camera.fov * Math.PI) / 360);
  const aspect = w / h;
  let dist = Math.hypot(8.2, 7.6);
  const visible = half * dist * aspect;
  if (visible < outer) dist *= outer / visible;
  camera.position.set(0, (8.2 / Math.hypot(8.2, 7.6)) * dist, (7.6 / Math.hypot(8.2, 7.6)) * dist);
  camera.lookAt(0, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function totalStars() {
  return stars.length;
}

function scoreText() {
  return `Stars ${starsGot}/${level().goalStars}`;
}

function moonOpen() {
  return starsGot >= level().goalStars;
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

function paintRings() {
  ringMeshes.forEach((mesh, index) => {
    mesh.material.color.set(index === ringIndex ? CONFIG.colors.ringOn : CONFIG.colors.ring);
  });
}

function popScore() {
  scoreEl.classList.remove("pop");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("pop");
}

function updateButtons() {
  const lastRing = ringIndex >= rings().length - 1;
  const aligned = mode === "play" && !hopping && starIsClose();
  catchBtn.classList.toggle("ready", aligned);
  outBtn.hidden = ringIndex === 0;
  const showMoon = lastRing && moonOpen();
  moonBtn.hidden = !showMoon;
  hopInBtn.hidden = showMoon;
}

function resetRound() {
  mode = "ready";
  paused = false;
  ringIndex = 0;
  starsGot = 0;
  hopping = null;
  birdTheta = 0;
  faceSign = 1;
  walkKeys.left = false;
  walkKeys.right = false;
  pauseBtn.textContent = "Pause";
  for (const group of ringGroups) group.rotation.y = 0;
  layStars();
  moon.material.color.set(CONFIG.colors.moonDim);
  moonHalo.material.color.set(CONFIG.colors.moonDim);
  scoreEl.textContent = scoreText();
  goalEl.textContent = CONFIG.goalText || `Level ${levelIndex + 1}`;
  updateButtons();
  paintRings();
  placeBird(rings()[0].radius, 0);
  showCard(CONFIG.readyTitle, CONFIG.readyBody, "Go");
}

let birdTheta = 0;
let faceSign = 1;
const walkKeys = { left: false, right: false };

function placeBird(radius, bob) {
  const x = Math.cos(birdTheta) * radius;
  const z = Math.sin(birdTheta) * radius;
  bird.position.set(x, 0.32 + bob, z);
  pad.position.set(x, 0.14, z);
  bird.rotation.y = Math.PI / 2 - birdTheta + (faceSign < 0 ? Math.PI : 0);
}

function pulsePad(on) {
  const scale = on ? 1 + Math.sin(performance.now() * 0.014) * 0.14 : 1;
  pad.scale.setScalar(scale);
}

const starPos = new THREE.Vector3();

function starAngle(star) {
  star.mesh.getWorldPosition(starPos);
  return Math.atan2(starPos.z, starPos.x);
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function starIsClose() {
  const limit = (CONFIG.catchDegrees * Math.PI) / 180;
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    if (Math.abs(angleDelta(starAngle(star), birdTheta)) <= limit) return true;
  }
  return false;
}

function collectAligned() {
  if (mode !== "play" || paused || hopping) return;
  const limit = (CONFIG.catchDegrees * Math.PI) / 180;
  let caught = 0;
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    if (Math.abs(angleDelta(starAngle(star), birdTheta)) <= limit) {
      star.got = true;
      star.mesh.visible = false;
      starsGot += 1;
      caught += 1;
    }
  }
  if (caught) {
    scoreEl.textContent = scoreText();
    popScore();
    playSound("catch");
    if (moonOpen()) {
      moon.material.color.set(CONFIG.colors.moon);
      moonHalo.material.color.set(CONFIG.colors.moon);
    }
    updateButtons();
  }
}

function hop(dir) {
  if (mode !== "play" || paused || hopping) return;
  if (dir === "out" && ringIndex === 0) return;
  if (dir === "moon" && !(ringIndex === rings().length - 1 && moonOpen())) return;
  const from = rings()[ringIndex].radius;
  if (dir === "moon") {
    playSound("hop");
    hopping = { from, to: 0.9, t: 0, dest: "moon" };
    return;
  }
  const next = ringIndex + (dir === "in" ? 1 : -1);
  if (next < 0 || next >= rings().length) return;
  playSound("hop");
  hopping = { from, to: rings()[next].radius, t: 0, dest: next };
}

function hopIn() {
  if (ringIndex === rings().length - 1 && moonOpen()) hop("moon");
  else hop("in");
}

function finish() {
  mode = "end";
  playSound("moon");
  const more = levelIndex < CONFIG.levels.length - 1;
  showCard(CONFIG.winTitle, scoreText(), more ? "Next" : "Again");
}

function walk(dt) {
  const dir = (walkKeys.right ? 1 : 0) + (walkKeys.left ? -1 : 0);
  if (dir !== 0) faceSign = dir;
  birdTheta += dir * level().walkSpeed * dt;
}

function update(dt) {
  if (mode !== "play" || paused) {
    const radius = hopping ? hopping.from : rings()[ringIndex].radius;
    placeBird(radius, 0);
    pulsePad(false);
    return;
  }
  walk(dt);
  for (let i = 0; i < ringGroups.length; i += 1) {
    ringGroups[i].rotation.y += rings()[i].speed * dt;
  }
  if (hopping) {
    hopping.t += dt;
    const u = Math.min(1, hopping.t / level().hopSeconds);
    const ease = u * u * (3 - 2 * u);
    const radius = hopping.from + (hopping.to - hopping.from) * ease;
    const bob = Math.sin(Math.PI * u) * 0.5;
    placeBird(radius, bob);
    pulsePad(false);
    if (u >= 1) {
      if (hopping.dest === "moon") {
        hopping = null;
        finish();
        return;
      }
      ringIndex = hopping.dest;
      hopping = null;
      paintRings();
      updateButtons();
    }
    return;
  }
  placeBird(rings()[ringIndex].radius, 0);
  pulsePad(starIsClose());
  updateButtons();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
}

function holdWalk(button, key) {
  const down = (event) => {
    event.preventDefault();
    walkKeys[key] = true;
    faceSign = key === "right" ? 1 : -1;
  };
  const up = () => {
    walkKeys[key] = false;
  };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointerleave", up);
  button.addEventListener("pointercancel", up);
}
holdWalk(leftBtn, "left");
holdWalk(rightBtn, "right");
hopInBtn.addEventListener("click", () => hopIn());
outBtn.addEventListener("click", () => hop("out"));
catchBtn.addEventListener("click", () => collectAligned());
moonBtn.addEventListener("click", () => hop("moon"));
pauseBtn.addEventListener("click", () => {
  if (mode !== "play") return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});
cardGo.addEventListener("click", () => {
  if (mode === "ready") {
    hideCard();
    mode = "play";
    updateButtons();
    return;
  }
  if (mode === "end" && levelIndex < CONFIG.levels.length - 1) {
    levelIndex += 1;
    resetRound();
    return;
  }
  levelIndex = 0;
  resetRound();
});

window.addEventListener("keydown", (event) => {
  if (!card.hidden && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    cardGo.click();
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    walkKeys.left = true;
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    walkKeys.right = true;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!event.repeat) hopIn();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!event.repeat) hop("out");
  } else if (event.key === " ") {
    event.preventDefault();
    if (!event.repeat) collectAligned();
  } else if (event.key === "p" || event.key === "P") {
    if (!event.repeat) pauseBtn.click();
  } else if (event.key === "r" || event.key === "R") {
    if (!event.repeat) resetRound();
  }
});
window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") walkKeys.left = false;
  if (event.key === "ArrowRight") walkKeys.right = false;
});
window.addEventListener("blur", () => {
  walkKeys.left = false;
  walkKeys.right = false;
});

resetRound();
requestAnimationFrame(frame);
