// Knobs for Dune Glide. Change these, then reload the page.
// The sand shape itself lives in dune.glb (made by terrain.py).

export const CONFIG = {
  title: "Dune Glide",
  // Optional one-line label under the title. Leave empty: the flag, shells, and buttons teach the round.
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    collect: "sfx/collect.webm",
    win: "sfx/win.webm",
    miss: "sfx/miss.webm",
    off: "sfx/off.webm",
  },

  // How strongly the banks push the marble sideways.
  slide: 14,
  // How hard Left / Right pushes. 1 is a full hold.
  steer: 5.4,
  // Slows sideways drift. Higher settles sooner.
  drag: 1.15,
  // Metres per second along the dune, toward the camp.
  cruise: 2.15,
  // Metres per second when Back is held. The ball slows through a stop first.
  back: 1.7,
  // How fast the ball can slow down or speed up.
  brake: 6,
  // Seconds to ease from a standstill into full speed when a round starts.
  easeSeconds: 1.1,
  // How far apart the two height samples are when reading the slope.
  slopeSpan: 0.07,
  maxSideSpeed: 4,

  startZ: 4.6,
  ballRadius: 0.22,
  shellRadius: 0.85,
  // Shells still on the sand mean the camp is not won yet.
  goalShells: 6,

  // x is left/right. z points toward the camp. The camp catches the middle.
  // A right pair, then a left shell further on, so one steer can take a bank
  // and still roll back to the middle before camp.
  shells: [
    { x: 0, z: 9 },
    { x: 0, z: 17 },
    { x: 0, z: 23.3 },
    { x: 2.15, z: 11.2 },
    { x: 2.1, z: 12.8 },
    { x: -1.6, z: 19.6 },
  ],
  camp: { x: 0, z: 24.4, halfWidth: 1.45 },

  camera: { back: 4.2, up: 3.3, lookAhead: 2.4, lookUp: 0.35 },

  colors: {
    sky: "#9fd6f2",
    ground: "#c4a36a",
    sand: "#e7c98a",
    ball: "#f4f7fb",
    ballSpot: "#7ec8e3",
    shell: "#fff6ec",
    shellRidge: "#f09a4a",
    shellMouth: "#e4544a",
    camp: "#e23d3d",
    flag: "#fff4d6",
  },

  winTitle: "You made camp",
  missTitle: "Camp is in the middle",
  offTitle: "Off the sand",
  readyTitle: "Dune Glide",
  readyBody: "",
};
