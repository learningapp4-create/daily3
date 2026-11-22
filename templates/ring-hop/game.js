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
const soundBtn = document.querySelector("#sound");
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
  playSound("catch");
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

function makeStarGeometry() {
  const shape = new THREE.Shape();
  const spikes = 5;
  const outer = 0.5;
  const inner = 0.2;
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -0.06);
  geo.rotateX(-Math.PI / 2);
  return geo;
}
const starGeo = makeStarGeometry();
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
      const x = Math.cos(a) * ring.radius;
      const z = Math.sin(a) * ring.radius;
      star.position.set(x, 0.22, z);
      ringGroups[index].add(star);
      stars.push({ mesh: star, ring: index, got: false, x, z });
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
  const showMoon = mode === "play" && moonOpen();
  moonBtn.hidden = !showMoon;
  hopInBtn.hidden = showMoon && lastRing;
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

function catchLimit() {
  return (CONFIG.catchDegrees * Math.PI) / 180;
}

function starGap(star) {
  return Math.abs(angleDelta(starAngle(star), birdTheta));
}

function starIsClose() {
  const limit = catchLimit();
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    if (starGap(star) <= limit) return true;
  }
  return false;
}

function nearestStar() {
  let best = null;
  let bestGap = Infinity;
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    const gap = starGap(star);
    if (gap < bestGap) {
      bestGap = gap;
      best = star;
    }
  }
  return best;
}

function takeStar(star) {
  star.got = true;
  star.mesh.visible = false;
  starsGot += 1;
  scoreEl.textContent = scoreText();
  popScore();
  playSound("catch");
  if (moonOpen()) {
    moon.material.color.set(CONFIG.colors.moon);
    moonHalo.material.color.set(CONFIG.colors.moon);
  }
  updateButtons();
}

function collectAligned() {
  if (mode !== "play" || paused || hopping) return;
  const limit = catchLimit();
  let caught = false;
  for (const star of stars) {
    if (star.got || star.ring !== ringIndex) continue;
    if (starGap(star) <= limit) {
      takeStar(star);
      caught = true;
    }
  }
  if (caught) return;
  const near = nearestStar();
  if (near) near.boop = 1;
}

const starMark = new THREE.Mesh(
  new THREE.TorusGeometry(0.55, 0.07, 6, 18),
  new THREE.MeshBasicMaterial({ color: "#fff3a0" }),
);
starMark.rotation.x = Math.PI / 2;
starMark.visible = false;
scene.add(starMark);

function dressStars(dt) {
  const limit = catchLimit();
  let marked = null;
  let markedGap = Infinity;
  for (const star of stars) {
    if (star.got) continue;
    if (star.boop) star.boop = Math.max(0, star.boop - dt * 2.2);
    star.mesh.position.x = star.x;
    star.mesh.position.z = star.z;
    const gap = star.ring === ringIndex ? starGap(star) : Infinity;
    const near = gap <= limit;
    const len = Math.hypot(star.x, star.z) || 1;
    const aside = near ? 1.05 : 0;
    star.mesh.scale.setScalar((near ? 1.15 : 1) + (star.boop || 0) * 0.15);
    star.mesh.position.x = star.x + (-star.z / len) * aside;
    star.mesh.position.z = star.z + (star.x / len) * aside;
    star.mesh.position.y = 0.22 + (star.boop || 0) * 0.08;
    if (near && gap < markedGap) {
      marked = star;
      markedGap = gap;
    }
  }
  if (marked && mode === "play" && !hopping) {
    marked.mesh.getWorldPosition(starPos);
    starMark.visible = true;
    starMark.position.set(starPos.x, 0.16, starPos.z);
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.12;
    starMark.scale.setScalar(pulse);
  } else {
    starMark.visible = false;
  }
  if (mode === "play" && moonOpen()) {
    const s = 1.2 + Math.sin(performance.now() * 0.007) * 0.1;
    moon.scale.setScalar(s);
    moonHalo.scale.setScalar(s);
  } else {
    moon.scale.setScalar(1);
    moonHalo.scale.setScalar(1);
  }
}

function hop(dir) {
  if (mode !== "play" || paused || hopping) return;
  if (dir === "out" && ringIndex === 0) return;
  if (dir === "moon" && !moonOpen()) return;
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
  const now = performance.now();
  let dir = 0;
  if (walkKeys.right && now - heldSince.right > 180) dir += 1;
  if (walkKeys.left && now - heldSince.left > 180) dir -= 1;
  if (dir !== 0) faceSign = dir > 0 ? 1 : -1;
  birdTheta += dir * level().walkSpeed * dt;
}

function update(dt) {
  if (mode !== "play" || paused) {
    const radius = hopping ? hopping.from : rings()[ringIndex].radius;
    placeBird(radius, 0);
    pulsePad(false);
    dressStars(dt);
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
    dressStars(dt);
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
  dressStars(dt);
  updateButtons();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
}

const heldSince = { left: 0, right: 0 };

function stepWalk(key) {
  if (mode !== "play" || paused || hopping) return;
  const dir = key === "right" ? 1 : -1;
  faceSign = dir;
  birdTheta += dir * (CONFIG.tapStep ?? 1.05);
}

function holdWalk(button, key) {
  const down = (event) => {
    event.preventDefault();
    if (heldSince[key]) return;
    heldSince[key] = performance.now();
    walkKeys[key] = true;
    faceSign = key === "right" ? 1 : -1;
    stepWalk(key);
  };
  const up = () => {
    walkKeys[key] = false;
    heldSince[key] = 0;
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
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    const key = event.key === "ArrowLeft" ? "left" : "right";
    if (!walkKeys[key]) {
      walkKeys[key] = true;
      heldSince[key] = performance.now();
      stepWalk(key);
    }
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
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const key = event.key === "ArrowLeft" ? "left" : "right";
  walkKeys[key] = false;
  heldSince[key] = 0;
});
window.addEventListener("blur", () => {
  walkKeys.left = false;
  walkKeys.right = false;
  heldSince.left = 0;
  heldSince.right = 0;
});

resetRound();
requestAnimationFrame(frame);
