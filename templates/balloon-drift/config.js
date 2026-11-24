// Knobs for Balloon Drift. Change these, then reload the page.

export const CONFIG = {
  title: "Balloon Drift",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    rise: "sfx/rise.webm",
    bloom: "sfx/bloom.webm",
    meet: "sfx/meet.webm",
  },

  drift: 1.8,
  heightStep: 1.08,
  minHeight: 0.55,
  maxHeight: 7.2,
  startHeight: 3.85,
  band: 0.18,
  reach: 1.35,
  endZ: 40,

  // z stays put so later gardens stay ahead of the view. Each round picks a new y.
  // heightStep is one press. The even shelf sits on that step.
  gardens: [
    { z: 6.4, y: 3.35, color: "#f0c24b", bright: "#ffe9a8" },
    { z: 21.6, y: 1.35, color: "#e56b8a", bright: "#ffd0dc" },
    { z: 36.8, y: 3.35, color: "#7dce6a", bright: "#d8f5c4" },
  ],

  colors: {
    sky: "#9fd4f2",
    ground: "#7fbf6a",
    balloon: "#e23d4a",
    basket: "#c4a36a",
    cloud: "#f7fbff",
  },

  readyTitle: "Balloon Drift",
  readyBody: "",
  winTitle: "The balloon met the gardens",
  waitTitle: "Gardens are waiting",
  winBody: "",
};
