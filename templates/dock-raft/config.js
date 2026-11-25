// Knobs for Dock Raft. Change these, then reload the page.

export const CONFIG = {
  title: "Dock Raft",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    load: "sfx/load.webm",
    send: "sfx/send.webm",
    back: "sfx/back.webm",
    done: "sfx/done.webm",
  },

  crossings: 3,
  loads: [1, 2, 3],
  maxCrates: 4,
  raftHigh: 1.36,
  crateDrop: 0.28,
  stripe: 0.09,
  startX: -2.15,
  endX: 2.55,
  turnBack: 0.34,
  sendSeconds: 0.72,
  backSeconds: 0.42,
  holdSeconds: 0.48,

  colors: {
    sky: "#d5f1ff",
    water: "#2f93c9",
    deep: "#1c6e9c",
    dock: "#c48a52",
    raft: "#a86b3c",
    stripe: "#fff7ea",
    mark: "#f2c230",
    crate: "#e07a3d",
    flag: "#f25d5d",
    post: "#8a5a32",
  },

  readyTitle: "Dock Raft",
  winTitle: "The raft reached the jetty",
};
