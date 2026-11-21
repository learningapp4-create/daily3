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

titleEl.textContent = CONFIG.title;
goalEl.textContent = CONFIG.goalText;
document.title = CONFIG.title;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "low-power",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.sky);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);

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

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(CONFIG.ballRadius, 16, 12),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.ball }),
);
scene.add(ball);

const shellGeo = new THREE.SphereGeometry(0.32, 12, 10);
const shellMat = new THREE.MeshLambertMaterial({ color: CONFIG.colors.shell });
const shells = CONFIG.shells.map((spot) => {
  const mesh = new THREE.Mesh(shellGeo, shellMat);
  mesh.rotation.x = Math.PI / 2;
  scene.add(mesh);
  return { ...spot, mesh, got: false };
});

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
  new THREE.TorusGeometry(CONFIG.camp.halfWidth, 0.055, 6, 22),
  new THREE.MeshLambertMaterial({ color: CONFIG.colors.camp }),
);
gate.rotation.x = Math.PI / 2;
scene.add(gate);

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
let dune = null;

const hold = { left: false, right: false };
const keys = { left: false, right: false };

let mode = "loading";
let paused = false;
let snapCam = true;
let x = 0;
let z = CONFIG.startZ;
let vx = 0;
let shellsGot = 0;
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
    shell.mesh.position.set(shell.x, (y ?? 1) + 0.42, shell.z);
  }
  const campY = groundY(CONFIG.camp.x, CONFIG.camp.z) ?? 1;
  flag.position.set(CONFIG.camp.x, campY, CONFIG.camp.z);
  gate.position.set(CONFIG.camp.x, campY + 0.2, CONFIG.camp.z);
}

function shellCountLabel() {
  return `Shells ${shellsGot}/${shells.length}`;
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

function resetRound() {
  x = 0;
  z = CONFIG.startZ;
  vx = 0;
  shellsGot = 0;
  paused = false;
  pauseBtn.textContent = "Pause";
  for (const shell of shells) {
    shell.got = false;
    shell.mesh.visible = true;
  }
  scoreEl.textContent = shellCountLabel();
  const y = groundY(x, z);
  ball.position.set(x, (y ?? 1) + CONFIG.ballRadius, z);
  snapCam = true;
  mode = "ready";
  showCard(CONFIG.readyTitle, CONFIG.readyBody, "Go");
}

function finish(kind) {
  mode = "end";
  const shellsLine = shellCountLabel();
  if (kind === "win") {
    showCard(CONFIG.winTitle, shellsLine, "Again");
  } else if (kind === "miss") {
    showCard(CONFIG.missTitle, `${CONFIG.missBody} ${shellsLine}.`, "Again");
  } else {
    showCard(CONFIG.offTitle, CONFIG.offBody, "Again");
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
  vx += (-slope * CONFIG.slide + steerInput() * CONFIG.steer) * dt;
  vx *= Math.exp(-CONFIG.drag * dt);
  vx = Math.max(-CONFIG.maxSideSpeed, Math.min(CONFIG.maxSideSpeed, vx));

  const nextX = x + vx * dt;
  if (groundY(nextX, z) == null) {
    vx = 0;
  } else {
    x = nextX;
  }
  z += CONFIG.cruise * dt;

  const y = groundY(x, z);
  if (y == null) {
    finish("off");
    return;
  }
  ball.position.set(x, y + CONFIG.ballRadius, z);

  for (const shell of shells) {
    if (shell.got) continue;
    const dx = x - shell.x;
    const dz = z - shell.z;
    if (dx * dx + dz * dz <= CONFIG.shellRadius * CONFIG.shellRadius) {
      shell.got = true;
      shell.mesh.visible = false;
      shellsGot += 1;
      scoreEl.textContent = shellCountLabel();
    } else {
      shell.mesh.rotation.z += dt * 1.4;
    }
  }

  if (z >= CONFIG.camp.z) {
    finish(Math.abs(x - CONFIG.camp.x) <= CONFIG.camp.halfWidth ? "win" : "miss");
  }
}

function frameCamera(dt, snap) {
  const y = ball.position.y;
  const cam = CONFIG.camera;
  const camZ = Math.max(0.35, z - cam.back);
  const desired = new THREE.Vector3(x * 0.4, y + cam.up, camZ);
  if (snap) camera.position.copy(desired);
  else camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
  camera.lookAt(x * 0.15, y + cam.lookUp, z + cam.lookAhead);
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

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    keys.left = true;
    event.preventDefault();
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    keys.right = true;
    event.preventDefault();
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
});
window.addEventListener("blur", () => {
  hold.left = false;
  hold.right = false;
  keys.left = false;
  keys.right = false;
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
  },
  undefined,
  () => {
    cardTitle.textContent = "Sand missing";
    cardBody.textContent = "dune.glb did not load. Open this folder with a static server.";
    cardGo.hidden = true;
  },
);

requestAnimationFrame(frame);
