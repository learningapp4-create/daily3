// Knobs for Beetle Path. Change these, then reload the page.
//
// rows[0] is the far side of the board. Each letter is a stone:
// N E S W point that way. F is the flower. The beetle starts on `start`.

export const CONFIG = {
  title: "Beetle Path",
  goalText: "Turn stones. Reach the flower.",
  stepSeconds: 0.42,
  spacing: 1.38,

  rows: [
    "EEFEE",
    "EENSE",
    "EENWE",
    "EENEE",
    "EEWEE",
  ],
  start: { c: 2, r: 4 },

  colors: {
    sky: "#c9ecff",
    meadow: "#7fbf6a",
    stone: "#f3efe2",
    stoneOn: "#fff4c2",
    arrow: "#3d4a3a",
    beetle: "#d8453c",
    eye: "#241c14",
    flower: "#e85d8c",
    flowerCenter: "#ffd45a",
    leaf: "#2f8f4e",
  },

  readyTitle: "Beetle Path",
  readyBody: "Turn the stones, then press Go.",
  winTitle: "The beetle found the flower",
  winBody: "That path works.",
  loopTitle: "That path loops",
  loopBody: "Turn a stone and try again.",
  offTitle: "The beetle stepped off",
  offBody: "Try a different stone.",
};
