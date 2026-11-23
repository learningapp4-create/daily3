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
const footer = document.querySelector("footer");

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
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.58), shellRidgeMat);
    rib.position.set(i * 0.1, 0.78, 0.02);
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
let handoff = -1;
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
    shell.hold = false;
    shell.mesh.visible = true;
  }
  scoreEl.textContent = shellCountLabel();
  const y = groundY(x, z);
  ball.position.set(x, (y ?? 1) + CONFIG.ballRadius, z);
  shade.position.set(x, (y ?? 1) + 0.03, z);
  snapCam = true;
  handoff = -1;
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
  const inLane = Math.abs(x - CONFIG.camp.x) <= CONFIG.camp.halfWidth;
  const inCamp = z >= CONFIG.camp.z && inLane;
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
  // Turn back before the pole when shells are still out, far enough to reach the one that was missed.
  const beforePole = z >= CONFIG.camp.z - 1.4 && inLane;
  if (retreatTo == null && rolling && !backHeld && shellsGot < need && along >= 0 && beforePole) {
    const missed = shells.filter((shell) => !shell.got).sort((a, b) => a.z - b.z)[0];
    retreatTo = missed
      ? Math.max(CONFIG.startZ, missed.z - CONFIG.shellRadius)
      : Math.max(CONFIG.startZ, z - (CONFIG.retreat ?? 8));
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
      shellsGot += 1;
      // The last shell stays on the sand until the view has turned back to the flag.
      shell.hold = shellsGot >= need;
      shell.holdUntil = shell.hold ? performance.now() + 1600 : 0;
      shell.mesh.visible = shell.hold;
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
  if (shellsGot >= need && retreatTo != null) retreatTo = null;

}

function frameCamera(dt, snap) {
  const y = ball.position.y;
  const cam = CONFIG.camera;
  const focus = shells.filter((shell) => !shell.got || shell.hold).sort((a, b) => a.z - b.z)[0];
  const now = performance.now();
  const liveHold = shells.some((shell) => shell.hold && now < shell.holdUntil);
  // Hold one view on the ball, the missed shell, and the flag. Swinging the chase camera drops two of them.
  const wantGroup = !!(focus && (retreatTo != null || liveHold));
  if (snap) handoff = -1;
  if (wantGroup) {
    handoff = 0;
    frameTogether();
  } else if (handoff >= 0 && handoff < 1) {
    handoff = Math.min(1, handoff + dt / 1.05);
    easeFromGroup(handoff, y, cam);
    if (handoff >= 1) handoff = -1;
  } else {
    const camZ = Math.max(0.35, z - cam.back);
    const desired = new THREE.Vector3(x * 0.4, y + cam.up, camZ);
    let lookX = x * 0.15;
    let lookY = y + cam.lookUp - 0.45;
    const lookZ = z + cam.lookAhead;
    if (snap) camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(lookX, lookY, lookZ);
    camera.updateMatrixWorld();
    const limit = footer.getBoundingClientRect().top - 12;
    const lookFloor = lookY - 1.2;
    for (let n = 0; n < 8; n += 1) {
      camera.lookAt(lookX, lookY, lookZ);
      camera.updateMatrixWorld();
      const low = Math.max(lowestShellScreenY(), ballScreenY());
      if (low < 0 || low <= limit || lookY <= lookFloor) break;
      const h = renderer.domElement.clientHeight || 1;
      lookY -= ((low - limit) / h) * 3;
    }
  }
  for (const shell of shells) {
    if (shell.got && !shell.hold) {
      shell.mesh.visible = false;
      continue;
    }
    shell.mesh.visible = true;
    shell.mesh.position.x = shell.x;
    shell.mesh.position.z = shell.z;
    // The first shell sits behind a higher lip at the start, so it grows a little more. The rest stay as they are, so a close shell does not cover the next.
    const grown = shell.z < 9 ? 2.2 : shell.z < 12 ? 1.75 : shell.z < 19 ? 1.5 : 1.15;
    shell.mesh.scale.set(1.15, grown, 1.15);
    shell.mesh.rotation.set(0, 0, 0);
    const bob = Math.sin(performance.now() * 0.004 + shell.z) * 0.08;
    shell.mesh.position.y = shell.baseY + bob;
  }
  if (!liveHold) {
    for (const shell of shells) {
      if (!shell.hold) continue;
      shell.hold = false;
      shell.mesh.visible = false;
    }
  }
}

function frameTogether() {
  // Past the flag, looking up the valley, so the shell, the ball, and the flag stay in one picture.
  const base = flag.position.y;
  camera.position.set(0.65, base + 6.5, 31.2);
  camera.lookAt(0.05, base - 2.15, 14.2);
}

function smoothStep(u) {
  return u * u * (3 - 2 * u);
}

const skyRay = new THREE.Vector3();
const FLAG_CORNERS = [
  [-0.01, 0.62, 0],
  [0.41, 0.62, 0],
  [-0.01, 0.88, 0],
  [0.41, 0.88, 0],
  [0, 0.02, 0],
  [0, 0.9, 0],
];

function easeFromGroup(t, y, cam) {
  // Dolly in along the valley so the ball grows where it sits, then slide behind it
  // along the valley. A side swing tips onto the sand and cuts the flag at the corner.
  const base = flag.position.y;
  const groupPos = new THREE.Vector3(0.65, base + 6.5, 31.2);
  const groupLook = new THREE.Vector3(0.05, base - 2.15, 14.2);
  const chasePos = new THREE.Vector3(x * 0.4, y + cam.up, Math.max(0.35, z - cam.back));
  const chaseLook = new THREE.Vector3(x * 0.15, y + cam.lookUp - 0.45, z + cam.lookAhead);
  const ballPos = new THREE.Vector3(x, y + 0.12, z);
  const toBall = ballPos.clone().sub(groupPos);
  const dist = Math.max(0.001, toBall.length());
  const dir = toBall.multiplyScalar(1 / dist);
  const travel = Math.max(0, dist - 4.8);
  const lookOffset = groupLook.clone().sub(groupPos);
  if (t < 0.36) {
    const u = 1 - (1 - t / 0.36) ** 2.4;
    const pos = groupPos.clone().addScaledVector(dir, travel * u);
    camera.position.copy(pos);
    camera.lookAt(pos.clone().add(lookOffset));
    return;
  }
  // Cross the short stretch beside the ball quickly. Lingering there tips the view onto the sand.
  const u = t < 0.52 ? (t - 0.36) / 0.16 * 0.22 : 0.22 + smoothStep((t - 0.52) / 0.48) * 0.78;
  const near = groupPos.clone().addScaledVector(dir, travel);
  const pos = near.clone().lerp(chasePos, u);
  pos.y = Math.max(pos.y, y + cam.up);
  const valley = lookOffset.clone().normalize();
  const look = pos.clone().addScaledVector(valley, 8).lerp(chaseLook, smoothStep(u));
  const ahead = Math.max(1.4, Math.hypot(look.x - pos.x, look.z - pos.z));
  if (pos.y - look.y > ahead * 0.48) look.y = pos.y - ahead * 0.48;
  camera.position.copy(pos);
  holdSkyAndFlag(look, pos.z < z - 0.6);
  camera.updateMatrixWorld();
  // The stretch beside the ball cannot show the sky and the ball together. Settle on the chase view instead of an empty dune.
  if (!ballOnScreen()) {
    camera.position.copy(chasePos);
    camera.lookAt(chaseLook);
  }
}

function ballOnScreen() {
  shellPoint.set(x, ball.position.y, z).project(camera);
  return shellPoint.z > -1 && shellPoint.z < 1
    && shellPoint.y > -0.55 && shellPoint.y < 0.8
    && Math.abs(shellPoint.x) < 0.85;
}

function topIsSky() {
  shellPoint.set(0, 0.58, 0.5).unproject(camera);
  skyRay.copy(shellPoint).sub(camera.position);
  if (skyRay.lengthSq() < 1e-6) return false;
  skyRay.normalize();
  if (skyRay.y > 0.02) return true;
  raycaster.set(camera.position, skyRay);
  const hits = dune ? raycaster.intersectObject(dune, true) : [];
  return hits.length === 0 || hits[0].distance > 16;
}

function flagFrame() {
  const origin = flag.position;
  const scale = flag.scale.x || 1;
  let seen = 0;
  let inside = 0;
  let onScreen = 0;
  for (let i = 0; i < FLAG_CORNERS.length; i += 1) {
    const corner = FLAG_CORNERS[i];
    shellPoint.set(origin.x + corner[0] * scale, origin.y + corner[1] * scale, origin.z + corner[2] * scale);
    shellPoint.project(camera);
    if (shellPoint.z < -1 || shellPoint.z > 1) continue;
    seen += 1;
    const on = Math.abs(shellPoint.x) < 1 && shellPoint.y < 1 && shellPoint.y > -1;
    const fit = Math.abs(shellPoint.x) < 0.82 && shellPoint.y < 0.7 && shellPoint.y > -0.78;
    if (on) onScreen += 1;
    if (fit) inside += 1;
    if (on && !fit) return "cut";
  }
  if (!seen || onScreen === 0) return "out";
  if (inside === seen) return "in";
  return "cut";
}

function capPitch(look) {
  const ahead = Math.max(1.4, Math.hypot(look.x - camera.position.x, look.z - camera.position.z));
  const maxDrop = ahead * 0.48;
  if (camera.position.y - look.y > maxDrop) look.y = camera.position.y - maxDrop;
}

function holdSkyAndFlag(look, wantFlag) {
  const flagAim = new THREE.Vector3(flag.position.x, flag.position.y + 1.7, flag.position.z - 1.2);
  for (let n = 0; n < 8; n += 1) {
    capPitch(look);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    if (!topIsSky()) {
      look.y += 0.35;
      continue;
    }
    const framed = flagFrame();
    if (framed === "cut") {
      look.lerp(wantFlag ? flagAim : new THREE.Vector3(x, camera.position.y, z - 5), 0.45);
      continue;
    }
    if (wantFlag && framed === "out") {
      look.lerp(flagAim, 0.35);
      continue;
    }
    for (let step = 0; step < 6; step += 1) {
      shellPoint.set(x, ball.position.y, z).project(camera);
      const ballHigh = shellPoint.z > -1 && shellPoint.z < 1 && shellPoint.y > -0.45 && shellPoint.y < 0.72 && Math.abs(shellPoint.x) < 0.8;
      if (ballHigh) break;
      const kept = look.y;
      look.y -= 0.18;
      capPitch(look);
      if (look.y === kept) break;
      camera.lookAt(look);
      camera.updateMatrixWorld();
      if (!topIsSky() || flagFrame() === "cut") {
        look.y = kept;
        camera.lookAt(look);
        break;
      }
    }
    return;
  }
  capPitch(look);
  camera.lookAt(look);
}

const shellBox = new THREE.Box3();
const shellPoint = new THREE.Vector3();

function ballScreenY(pad = 42) {
  const h = renderer.domElement.clientHeight || 1;
  shellPoint.copy(ball.position).project(camera);
  if (shellPoint.z < -1 || shellPoint.z > 1) return -1;
  return (1 - shellPoint.y) * 0.5 * h + pad;
}

function lowestShellScreenY() {
  const h = renderer.domElement.clientHeight;
  let lowest = -1;
  for (const shell of shells) {
    if ((shell.got && !shell.hold) || !shell.mesh.visible) continue;
    const inFront = camera.position.z > z
      ? shell.z < camera.position.z - 0.3
      : shell.z > camera.position.z + 0.3;
    if (!inFront) continue;
    shellBox.setFromObject(shell.mesh);
    const xs = [shellBox.min.x, shellBox.max.x];
    const ys = [shellBox.min.y, shellBox.max.y];
    const zs = [shellBox.min.z, shellBox.max.z];
    for (const sx of xs) {
      for (const sy of ys) {
        for (const sz of zs) {
          shellPoint.set(sx, sy, sz).project(camera);
          if (shellPoint.z < -1 || shellPoint.z > 1) continue;
          const py = (1 - shellPoint.y) * 0.5 * h;
          if (py > lowest) lowest = py;
        }
      }
    }
  }
  return lowest;
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
  if (mode !== "play" || paused) return;
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
