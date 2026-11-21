// Knobs for Beetle Path. Change these, then reload the page.
//
// rows[0] is the far side of the board. Each letter is a stone:
// N E S W point that way. F is the flower. The beetle starts on `start`.

export const CONFIG = {
  title: "Beetle Path",
  // Optional one-line label. Leave empty: the arrows, the flower, and Go teach the round.
  goalText: "",
  stepSeconds: 0.42,
  soundVolume: 0.85,
  sounds: {
    turn: "sfx/turn.webm",
    step: "sfx/step.webm",
    win: "sfx/win.webm",
    loop: "sfx/loop.webm",
    off: "sfx/off.webm",
  },
  spacing: 1.38,

  rows: [
    "EEFEE",
    "EEWSE",
    "EEEWE",
    "EENEE",
    "EEWEE",
  ],
  start: { c: 2, r: 4 },

  colors: {
    sky: "#c9ecff",
    meadow: "#7fbf6a",
    stone: "#f3efe2",
    stoneOn: "#ffffff",
    flowerBed: "#ffd0dc",
    path: "#f6d36a",
    arrow: "#3d4a3a",
    beetle: "#d8453c",
    eye: "#241c14",
    flower: "#e85d8c",
    flowerCenter: "#ffd45a",
    leaf: "#2f8f4e",
  },

  readyTitle: "Beetle Path",
  readyBody: "",
  winTitle: "The beetle found the flower",
  winBody: "",
  loopTitle: "That path loops",
  offTitle: "The beetle stepped off",
};
