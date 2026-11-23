// Knobs for Pond Skip. Change these, then reload the page.

export const CONFIG = {
  title: "Pond Skip",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    throw: "sfx/throw.webm",
    skip: "sfx/skip.webm",
    across: "sfx/across.webm",
    sink: "sfx/sink.webm",
  },

  // The throw. Angle 0 points straight at the pad.
  startAngle: -0.36,
  angleStep: 0.12,
  angleMin: -0.7,
  angleMax: 0.7,
  speed: 9.2,
  lift: 1.6,
  gravity: 6.2,
  bounce: 0.72,
  sinkSpeed: 3.8,
  maxSkips: 8,

  start: { x: 0, y: 0.45, z: 0.2 },
  waterY: 0.02,
  pad: { x: 0, y: 0.08, z: 10.5, radius: 1.55 },

  colors: {
    sky: "#b7e3fb",
    water: "#3c86c9",
    waterDeep: "#2b6eae",
    sand: "#e6c98b",
    stone: "#e7edf2",
    spot: "#7eb7d6",
    pad: "#6fbf73",
    flower: "#e56b8a",
    aim: "#f7f1df",
    aimOn: "#d8f5c8",
  },

  readyTitle: "Pond Skip",
  readyBody: "",
  winTitle: "The stone reached the pad",
  winBody: "",
};
