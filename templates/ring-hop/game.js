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
const actBtn = document.querySelector("#act");
const outBtn = document.querySelector("#out");

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
function primeAudio() {
  const audio = clips.values().next().value;
  if (!audio) return;
  audio.volume = 0;
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {});
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

CONFIG.rings.forEach((ring, index) => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(ring.radius, 0.075, 8, 28),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.ring }),
  );
  ringMeshes.push(mesh);
  mesh.rotation.x = Math.PI / 2;
  group.add(mesh);
  for (const deg of ring.stars) {
    const star = new THREE.Mesh(starGeo, starMat);
    const a = (deg * Math.PI) / 180;
    star.position.set(Math.cos(a) * ring.radius, 0.22, Math.sin(a) * ring.radius);
    group.add(star);
    stars.push({ mesh: star, ring: index, got: false });
  }
  scene.add(group);
  ringGroups.push(group);
});

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
  const outer = CONFIG.rings[0].radius + 1.3;
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
  return `Stars ${starsGot}/${CONFIG.goalStars}`;
}

function moonOpen() {
  return starsGot >= CONFIG.goalStars;
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
  const lastRing = ringIndex >= CONFIG.rings.length - 1;
  const aligned = mode === "play" && !hopping && starIsClose();
  let text = "Hop in";
  let dir = "in";
  if (lastRing && moonOpen()) {
    text = "To the moon";
    dir = "moon";
  } else if (aligned) {
    text = "Catch";
    dir = lastRing ? "out" : "in";
  } else if (lastRing) {
    text = "Hop out";
    dir = "out";
  }
  if (actBtn.textContent !== text || actBtn.dataset.dir !== dir) {
    actBtn.hidden = false;
    actBtn.textContent = text;
    actBtn.dataset.dir = dir;
  }
  const hideOut = ringIndex === 0 || (lastRing && !moonOpen());
  if (outBtn.hidden !== hideOut) outBtn.hidden = hideOut;
}

function resetRound() {
  mode = "ready";
  paused = false;
  ringIndex = 0;
  starsGot = 0;
  hopping = null;
  pauseBtn.textContent = "Pause";
  for (const group of ringGroups) group.rotation.y = 0;
  for (const star of stars) {
    star.got = false;
    star.mesh.visible = true;
  }
  moon.material.color.set(CONFIG.colors.moonDim);
  moonHalo.material.color.set(CONFIG.colors.moonDim);
  scoreEl.textContent = scoreText();
  goalEl.textContent = CONFIG.goalText || "";
  updateButtons();
  paintRings();
  placeBird(CONFIG.rings[0].radius, 0);
  showCard(CONFIG.readyTitle, CONFIG.readyBody, "Go");
}

function placeBird(radius, bob) {
  bird.position.set(radius, 0.32 + bob, 0);
  pad.position.set(radius, 0.14, 0);
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

function starIsClose() {
  const limit = (CONFIG.catchDegrees * Math.PI) / 180;
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    if (Math.abs(starAngle(star)) <= limit) return true;
  }
  return false;
}

function collectAligned() {
  const limit = (CONFIG.catchDegrees * Math.PI) / 180;
  let caught = 0;
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    const angle = starAngle(star);
    if (Math.abs(angle) <= limit) {
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
  if (dir === "moon" && !(ringIndex === CONFIG.rings.length - 1 && moonOpen())) return;
  playSound("hop");
  collectAligned();
  const from = CONFIG.rings[ringIndex].radius;
  if (dir === "moon") {
    hopping = { from, to: 0.9, t: 0, dest: "moon" };
    return;
  }
  const next = ringIndex + (dir === "in" ? 1 : -1);
  if (next < 0 || next >= CONFIG.rings.length) return;
  hopping = { from, to: CONFIG.rings[next].radius, t: 0, dest: next };
}

function finish() {
  mode = "end";
  playSound("moon");
  showCard(CONFIG.winTitle, scoreText(), "Again");
}

function update(dt) {
  if (mode !== "play" || paused) {
    placeBird(hopping ? bird.position.x : CONFIG.rings[ringIndex].radius, 0);
    pulsePad(false);
    return;
  }
  for (let i = 0; i < ringGroups.length; i += 1) {
    ringGroups[i].rotation.y += CONFIG.rings[i].speed * dt;
  }
  if (hopping) {
    hopping.t += dt;
    const u = Math.min(1, hopping.t / CONFIG.hopSeconds);
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
  placeBird(CONFIG.rings[ringIndex].radius, 0);
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

actBtn.addEventListener("click", () => hop(actBtn.dataset.dir || "in"));
outBtn.addEventListener("click", () => hop("out"));
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
  resetRound();
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === " " || event.key === "ArrowDown" || event.key === "Enter") {
    event.preventDefault();
    if (!card.hidden && event.key === "Enter") {
      cardGo.click();
      return;
    }
    hop(actBtn.dataset.dir || "in");
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    hop("out");
  } else if (event.key === "p" || event.key === "P") {
    pauseBtn.click();
  } else if (event.key === "r" || event.key === "R") {
    resetRound();
  }
});

resetRound();
requestAnimationFrame(frame);
