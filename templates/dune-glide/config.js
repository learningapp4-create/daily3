// Knobs for Dune Glide. Change these, then reload the page.
// The sand shape itself lives in dune.glb (made by terrain.py).

export const CONFIG = {
  title: "Dune Glide",
  goalText: "Steer to the camp.",

  // How strongly the banks push the marble sideways.
  slide: 14,
  // How hard Left / Right pushes. 1 is a full hold.
  steer: 5.4,
  // Slows sideways drift. Higher settles sooner.
  drag: 1.15,
  // Metres per second along the dune.
  cruise: 2.15,
  // How far apart the two height samples are when reading the slope.
  slopeSpan: 0.07,
  maxSideSpeed: 4,

  startZ: 4.6,
  ballRadius: 0.22,
  shellRadius: 0.85,

  // x is left/right. z points toward the camp. The camp catches the middle.
  shells: [
    { x: 0, z: 9 },
    { x: 0, z: 15 },
    { x: 0, z: 21 },
    { x: 2.2, z: 11 },
    { x: -2.2, z: 13 },
    { x: 2.2, z: 17 },
    { x: -2.2, z: 19 },
  ],
  camp: { x: 0, z: 24.4, halfWidth: 1.45 },

  camera: { back: 4.2, up: 3.3, lookAhead: 2.4, lookUp: 0.35 },

  colors: {
    sky: "#9fd6f2",
    ground: "#c4a36a",
    sand: "#e7c98a",
    ball: "#f4f7fb",
    ballSpot: "#7ec8e3",
    shell: "#12c4a8",
    camp: "#e23d3d",
    flag: "#fff4d6",
  },

  winTitle: "You made camp",
  missTitle: "Camp is in the middle",
  missBody: "Let go of the bank so you roll back to the middle.",
  offTitle: "Try a new line",
  offBody: "That side leaves the sand.",
  readyTitle: "Dune Glide",
  readyBody: "Steer to the camp. Shells are a bonus.",
};
