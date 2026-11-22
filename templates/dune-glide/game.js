import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
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
const backBtn = document.querySelector("#back");
const stopBtn = document.querySelector("#stop");
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
  playSound("collect");
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
const camera = new THREE.PerspectiveCamera(52, 1, 0.45, 80);
camera.position.set(0, 5.2, 0.6);
camera.lookAt(0, 1.2, 7);

scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(8, 16, 6);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(40, 24),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.ground }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

const ball = new THREE.Group();
const ballBody = new THREE.Mesh(
  new THREE.SphereGeometry(CONFIG.ballRadius, 16, 12),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.ball }),
);
const spotGeo = new THREE.SphereGeometry(CONFIG.ballRadius * 0.34, 8, 8);
const spotMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.ballSpot });
for (const spotAt of [[0, 1, 0], [0.15, -0.2, 0.95], [-0.9, 0.25, 0.2]]) {
  const spot = new THREE.Mesh(spotGeo, spotMat);
  spot.position.set(spotAt[0], spotAt[1], spotAt[2]).normalize().multiplyScalar(CONFIG.ballRadius * 0.82);
  ball.add(spot);
}
ball.add(ballBody);
scene.add(ball);

const shellMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.shell });
const shellRidgeMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.shellRidge });
const shellMouthMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.shellMouth });
function makeShell() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), shellMat);
  body.scale.set(1.05, 1.2, 0.95);
  body.position.y = 0.5;
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), shellMouthMat);
  mouth.position.set(0, 0.26, -0.3);
  group.add(body, mouth);
  for (let i = -3; i <= 3; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.5), shellRidgeMat);
    rib.position.set(i * 0.1, 0.86, -0.12);
    rib.rotation.y = i * 0.1;
    group.add(rib);
  }
  group.rotation.order = "YXZ";
  group.scale.setScalar(1.7);
  return group;
}
const shells = CONFIG.shells.map((spot) => {
  const mesh = makeShell();
  scene.add(mesh);
  return { ...spot, mesh, got: false };
});

const shade = new THREE.Mesh(
  new THREE.CircleGeometry(0.34, 14),
  new THREE.MeshBasicMaterial({ color: 0x5c4328, transparent: true, opacity: 0.28, depthWrite: false }),
);
shade.rotation.x = -Math.PI / 2;
scene.add(shade);

const flag = new THREE.Group();
const pole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.flag }),
);
pole.position.y = 0.45;
const cloth = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.26, 0.05),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.camp }),
);
cloth.position.set(0.2, 0.75, 0);
flag.add(pole, cloth);
flag.scale.setScalar(1.7);
scene.add(flag);

const gate = new THREE.Mesh(
  new THREE.TorusGeometry(CONFIG.camp.halfWidth, 0.1, 8, 24),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.camp }),
);
gate.rotation.x = Math.PI / 2;
scene.add(gate);

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
let dune = null;

const hold = { left: false, right: false, back: false };
const keys = { left: false, right: false, back: false };

let mode = "loading";
let paused = false;
let snapCam = true;
let x = 0;
let z = CONFIG.startZ;
let vx = 0;
let shellsGot = 0;
let rollIn = 0;
let along = 0;
let campNoted = false;
let retreatTo = null;
let backTapTo = null;
let rolling = true;
let last = performance.now();

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);
resize();

function groundY(px, pz) {
  if (!dune) return null;
  raycaster.set(new THREE.Vector3(px, 40, pz), down);
  const hits = raycaster.intersectObject(dune, true);
  return hits.length ? hits[0].point.y : null;
}

function placeProps() {
  for (const shell of shells) {
    const y = groundY(shell.x, shell.z);
    shell.baseY = (y ?? 1) + 0.04;
    shell.mesh.position.set(shell.x, shell.baseY, shell.z);
  }
  const campY = groundY(CONFIG.camp.x, CONFIG.camp.z) ?? 1;
  flag.position.set(CONFIG.camp.x, campY, CONFIG.camp.z);
  gate.position.set(CONFIG.camp.x, campY + 0.2, CONFIG.camp.z);
}

function shellCountLabel() {
  return `Shells ${shellsGot}/${shells.length}`;
}

function popScore() {
  scoreEl.classList.remove("pop");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("pop");
}

let cardTimer = 0;

function showCard(title, body, label) {
  window.clearTimeout(cardTimer);
  cardTitle.textContent = title;
  cardBody.textContent = body || "";
  cardGo.textContent = label;
  card.classList.remove("leaving");
  card.hidden = false;
}

function hideCard() {
  if (card.hidden || card.classList.contains("leaving")) return;
  card.classList.add("leaving");
  window.clearTimeout(cardTimer);
  cardTimer = window.setTimeout(() => {
    card.hidden = true;
    card.classList.remove("leaving");
  }, 480);
}

function resetRound() {
  x = 0;
  z = CONFIG.startZ;
  vx = 0;
  shellsGot = 0;
  along = 0;
  campNoted = false;
  retreatTo = null;
  backTapTo = null;
  rolling = true;
  paintStop();
  goalEl.textContent = CONFIG.goalText || "";
  paused = false;
  pauseBtn.textContent = "Pause";
  for (const shell of shells) {
    shell.got = false;
    shell.missed = false;
    shell.mesh.visible = true;
  }
  scoreEl.textContent = shellCountLabel();
  const y = groundY(x, z);
  ball.position.set(x, (y ?? 1) + CONFIG.ballRadius, z);
  shade.position.set(x, (y ?? 1) + 0.03, z);
  snapCam = true;
  mode = "ready";
  showCard(CONFIG.readyTitle, CONFIG.readyBody, "Go");
}

function finish(kind) {
  mode = "end";
  const shellsLine = shellCountLabel();
  if (kind === "win") {
    playSound("win");
    showCard(CONFIG.winTitle, shellsLine, "Again");
  } else if (kind === "miss") {
    playSound("miss");
    const short = shellsGot < (CONFIG.goalShells ?? shells.length);
    showCard(short ? (CONFIG.shellsTitle || "Missed the shells") : CONFIG.missTitle, shellsLine, "Again");
  } else {
    playSound("off");
    showCard(CONFIG.offTitle, "", "Again");
  }
}

function steerInput() {
  const left = hold.left || keys.left;
  const right = hold.right || keys.right;
  if (left === right) return 0;
  return right ? 1 : -1;
}

function update(dt) {
  if (mode !== "play" || paused || !dune) return;

  const span = CONFIG.slopeSpan;
  const yL = groundY(x - span, z);
  const yR = groundY(x + span, z);
  const yHere = groundY(x, z);
  if (yL == null || yR == null || yHere == null) {
    finish("off");
    return;
  }
  const slope = (yR - yL) / (2 * span);
  const backHeld = hold.back || keys.back;
  const backing = backHeld || retreatTo != null || (backTapTo != null && z > backTapTo);
  const stopped = !rolling && !backing;
  if (stopped) {
    vx = 0;
  } else {
    vx += (-slope * CONFIG.slide + steerInput() * CONFIG.steer) * dt;
    vx *= Math.exp(-CONFIG.drag * dt);
    vx = Math.max(-CONFIG.maxSideSpeed, Math.min(CONFIG.maxSideSpeed, vx));
  }

  const nextX = x + vx * dt;
  if (groundY(nextX, z) == null) {
    vx = 0;
  } else {
    x = nextX;
  }
  const ease = CONFIG.easeSeconds > 0 ? Math.min(1, rollIn / CONFIG.easeSeconds) : 1;
  rollIn += dt;
  const forward = CONFIG.cruise * ease * ease;
  const target = backing ? -(CONFIG.back ?? 1.7) : stopped ? 0 : forward;
  const brake = CONFIG.brake ?? 6;
  if (along < target) along = Math.min(target, along + brake * dt);
  else along = Math.max(target, along - brake * dt);
  z += along * dt;
  if (z < CONFIG.startZ) {
    z = CONFIG.startZ;
    if (along < 0) along = 0;
  }

  const need = CONFIG.goalShells ?? shells.length;
  const inCamp = z >= CONFIG.camp.z && Math.abs(x - CONFIG.camp.x) <= CONFIG.camp.halfWidth;
  if (shellsGot >= need && goalEl.textContent === "Shells left") goalEl.textContent = CONFIG.goalText || "";
  if (inCamp && shellsGot >= need && along >= 0 && retreatTo == null) {
    const yWin = groundY(x, z);
    if (yWin != null) {
      ball.position.set(x, yWin + CONFIG.ballRadius, z);
      shade.position.set(x, yWin + 0.03, z);
    }
    finish("win");
    return;
  }
  if (retreatTo == null && rolling && !backHeld && inCamp && shellsGot < need && along >= 0) {
    retreatTo = Math.max(CONFIG.startZ, z - (CONFIG.retreat ?? 8));
    along = -(CONFIG.back ?? 1.7);
    campNoted = true;
    playSound("miss");
    goalEl.textContent = "Shells left";
  }
  if (retreatTo != null && z <= retreatTo) retreatTo = null;
  if (backTapTo != null && z <= backTapTo) backTapTo = null;
  if (retreatTo == null && !inCamp && along > 0 && z >= CONFIG.camp.z) {
    finish("miss");
    return;
  }

  const y = groundY(x, z);
  if (y == null) {
    finish("off");
    return;
  }
  ball.position.set(x, y + CONFIG.ballRadius, z);
  shade.position.set(x, y + 0.03, z);
  ball.rotation.x -= (along / CONFIG.ballRadius) * dt;
  ball.rotation.z += (vx / CONFIG.ballRadius) * dt;

  const bob = performance.now() * 0.004;
  for (const shell of shells) {
    if (shell.got) continue;
    shell.mesh.position.y = shell.baseY + Math.sin(bob + shell.z) * 0.08;
    const dx = x - shell.x;
    const dz = z - shell.z;
    if (dx * dx + dz * dz <= CONFIG.shellRadius * CONFIG.shellRadius) {
      shell.got = true;
      shell.missed = false;
      shell.mesh.visible = false;
      shellsGot += 1;
      scoreEl.textContent = shellCountLabel();
      if (goalEl.textContent === "Miss") goalEl.textContent = CONFIG.goalText || "";
      popScore();
      playSound("collect");
    } else if (!shell.missed && along > 0 && z > shell.z + CONFIG.shellRadius) {
      shell.missed = true;
      goalEl.textContent = "Miss";
      playSound("miss");
    }
  }

}

function frameCamera(dt, snap) {
  const y = ball.position.y;
  const cam = CONFIG.camera;
  const camZ = Math.max(0.35, z - cam.back);
  const desired = new THREE.Vector3(x * 0.4, y + cam.up, camZ);
  if (snap) camera.position.copy(desired);
  else camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
  camera.lookAt(x * 0.15, y + cam.lookUp - 0.45, z + cam.lookAhead);
  camera.updateMatrixWorld();
  for (const shell of shells) {
    if (shell.got) {
      shell.mesh.visible = false;
      continue;
    }
    shell.mesh.visible = true;
    shell.mesh.position.x = shell.x;
    shell.mesh.position.z = shell.z;
    shell.mesh.scale.setScalar(1.15);
    shell.mesh.rotation.set(0, 0, 0);
    const flat = Math.hypot(camera.position.x - shell.x, camera.position.z - shell.z);
    shell._flat = flat;
    const bob = Math.sin(performance.now() * 0.004 + shell.z) * 0.08;
    shell.mesh.position.y = shell.baseY + bob;
  }
  // The low chase view hides the next shells behind the dune, so they read as pale discs. Lift those two until they stay ridged shells. The last shell already clears the flag.
  const waiting = shells.filter((shell) => !shell.got && shell.z < 21.5).sort((a, b) => a._flat - b._flat);
  waiting.slice(0, 2).forEach((shell, index) => {
    const fadeIn = Math.min(1, Math.max(0, (13.5 - shell._flat) / 3));
    shell.mesh.position.y += (index === 0 ? 1.15 : 0.7) * fadeIn;
  });
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  if (dune) {
    frameCamera(dt, snapCam);
    snapCam = false;
  }
  renderer.render(scene, camera);
}

function bindHold(button, side) {
  const on = (event) => {
    event.preventDefault();
    hold[side] = true;
  };
  const off = () => {
    hold[side] = false;
  };
  button.addEventListener("pointerdown", on);
  button.addEventListener("pointerup", off);
  button.addEventListener("pointerleave", off);
  button.addEventListener("pointercancel", off);
}
bindHold(leftBtn, "left");
bindHold(rightBtn, "right");
bindHold(backBtn, "back");
function shoveBack() {
  backTapTo = Math.max(CONFIG.startZ, z - (CONFIG.backTap ?? 2.6));
  along = Math.min(along, -(CONFIG.back ?? 1.7));
}
backBtn.addEventListener("pointerdown", shoveBack);

function paintStop() {
  stopBtn.textContent = rolling ? "Stop" : "Roll";
  stopBtn.classList.toggle("roll", !rolling);
}
function toggleRoll() {
  if (mode !== "play") return;
  rolling = !rolling;
  if (!rolling) {
    backTapTo = null;
    retreatTo = null;
  }
  paintStop();
}
stopBtn.addEventListener("click", toggleRoll);
paintStop();

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    keys.left = true;
    event.preventDefault();
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    keys.right = true;
    event.preventDefault();
  } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
    keys.back = true;
    shoveBack();
    event.preventDefault();
  } else if (event.key === " " && card.hidden) {
    event.preventDefault();
    toggleRoll();
  } else if (event.key === "p" || event.key === "P") {
    togglePause();
  } else if (event.key === "r" || event.key === "R") {
    resetRound();
  } else if (event.key === "Enter" && !card.hidden) {
    cardGo.click();
  }
});
window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") keys.left = false;
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") keys.right = false;
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") keys.back = false;
});
window.addEventListener("blur", () => {
  hold.left = false;
  hold.right = false;
  hold.back = false;
  keys.left = false;
  keys.right = false;
  keys.back = false;
});

function togglePause() {
  if (mode !== "play") return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
}

pauseBtn.addEventListener("click", togglePause);
cardGo.addEventListener("click", () => {
  if (mode === "loading") return;
  if (mode === "ready") {
    rollIn = 0;
    hideCard();
    mode = "play";
    return;
  }
  resetRound();
});

showCard("Loading", "The sand is settling.", "…");
cardGo.disabled = true;

const loader = new GLTFLoader();
loader.load(
  "./dune.glb",
  (gltf) => {
    dune = gltf.scene;
    dune.rotation.x = Math.PI / 2;
    dune.traverse((node) => {
      if (!node.isMesh) return;
      node.material.color?.set(CONFIG.colors.sand);
    });
    scene.add(dune);
    placeProps();
    cardGo.disabled = false;
    resetRound();
    frameCamera(1, true);
    snapCam = false;
  },
  undefined,
  () => {
    cardTitle.textContent = "Sand missing";
    cardBody.textContent = "dune.glb did not load. Open this folder with a static server.";
    cardGo.hidden = true;
  },
);

requestAnimationFrame(frame);
