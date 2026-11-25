// Knobs for Door Pips. Change these, then reload the page.

export const CONFIG = {
  title: "Door Pips",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    turn: "sfx/turn.webm",
    shut: "sfx/shut.webm",
    open: "sfx/open.webm",
    done: "sfx/done.webm",
  },

  doors: 3,
  needs: [1, 2, 3],
  crackAngle: 0.14,
  openAngle: 1.08,
  crackSeconds: 0.36,
  openSeconds: 0.42,
  holdSeconds: 0.4,

  colors: {
    sky: "#d5e8f8",
    wall: "#d7d2c8",
    stone: "#b7b1a6",
    door: "#c45a3a",
    key: "#e2b227",
    pip: "#fff8ea",
    fill: "#e2b227",
    garden: "#6fbf62",
    bloom: "#ff6b8a",
    leaf: "#3e8f45",
  },

  readyTitle: "Door Pips",
  winTitle: "The doors opened",
};
