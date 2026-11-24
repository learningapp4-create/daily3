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

  // The throw. Angle 0 points straight up the pond, between the flowers.
  startAngle: 0,
  angleStep: 0.06,
  angleMin: -0.72,
  angleMax: 0.72,
  speed: 9.2,
  lift: 1.6,
  gravity: 6.2,
  bounce: 0.72,
  sinkSpeed: 3.8,
  maxSkips: 8,
  // The stone lands only this close to a flower's middle. A line that
  // merely points that way, or passes beside the pad, sinks.
  hit: 0.55,
  // A line that will sink stops here, in open water, short of the flowers.
  aimReach: 4.4,
  // A line that will land stops this close to the pad, still off the flower.
  aimMargin: 0.08,
  // Flowers slide this far past the dots, leaving open water. A throw
  // lands only while the flower is this close to the end of the line.
  // It sits there, then comes back this soon after it leaves.
  drift: 2,
  driftSit: 8.5,
  driftAway: 4,
  catch: 0.2,

  start: { x: 0, y: 0.45, z: 0.2 },
  waterY: 0.02,
  // Each round moves the flowers. radius is the lily; x and z are a spare spot.
  pads: [
    { x: -2.15, y: 0.08, z: 9.55, radius: 1.55 },
    { x: 2.15, y: 0.08, z: 9.55, radius: 1.55 },
    { x: 5.8, y: 0.08, z: 12.2, radius: 1.48 },
  ],

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
  winTitle: "The stone reached the pads",
  winBody: "",
};
