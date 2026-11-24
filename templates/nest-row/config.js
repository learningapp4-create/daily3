// Knobs for Nest Row. Change these, then reload the page.

export const CONFIG = {
  title: "Nest Row",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    send: "sfx/send.webm",
    home: "sfx/home.webm",
    back: "sfx/back.webm",
    done: "sfx/done.webm",
  },

  eggCount: 4,
  sendSeconds: 0.45,
  backSeconds: 0.4,
  eggY: 0.95,

  // Left to right. shape is round, point, or square. mark is the button picture.
  nests: [
    { name: "Blue", color: "#2f6fed", ink: "#f4f8ff", shape: "round", mark: "●" },
    { name: "Gold", color: "#e2a20a", ink: "#2a2108", shape: "point", mark: "▲" },
    { name: "Rose", color: "#e24b6a", ink: "#fff5f7", shape: "square", mark: "■" },
  ],

  colors: {
    sky: "#d7f3ff",
    grass: "#8fce7a",
    stump: "#c4a574",
    bird: "#8a5a32",
  },

  readyTitle: "Nest Row",
  readyBody: "",
  winTitle: "The eggs found their nests",
  waitTitle: "The eggs found their nests",
  winBody: "",
};
