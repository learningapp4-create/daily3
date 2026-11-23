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

  drift: 0.85,
  heightStep: 0.4,
  minHeight: 0.8,
  maxHeight: 5.2,
  startHeight: 2.2,
  band: 0.5,
  reach: 1.35,
  endZ: 19.4,

  // None of these heights is the start height. The gaps are short enough to see the next garden.
  gardens: [
    { z: 5.6, y: 3.4, color: "#f0c24b", bright: "#ffe9a8" },
    { z: 11.2, y: 1.4, color: "#e56b8a", bright: "#ffd0dc" },
    { z: 16.8, y: 3.6, color: "#7dce6a", bright: "#d8f5c4" },
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
