// Knobs for Plank Brook. Change these, then reload the page.
//
// `need` is the gap, in the same units as a plank's `length`.
// A plank fits when those two numbers are within `fitSlack`.

export const CONFIG = {
  title: "Plank Brook",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    take: "sfx/take.webm",
    fit: "sfx/fit.webm",
    back: "sfx/back.webm",
    cross: "sfx/cross.webm",
  },

  fitSlack: 0.2,
  walkSeconds: 2.4,
  gaps: [
    { need: 1.15 },
    { need: 2.7 },
    { need: 1.9 },
  ],
  planks: [
    { length: 1.9 },
    { length: 1.15 },
    { length: 2.7 },
  ],

  colors: {
    sky: "#c9ecff",
    grass: "#7fbf6a",
    water: "#4f98cf",
    post: "#8d6b45",
    plank: "#e2b56a",
    plankOn: "#ffe3a8",
    duck: "#f4f7fb",
    beak: "#f0a03a",
    focus: "#ffd45a",
  },

  readyTitle: "Plank Brook",
  readyBody: "",
  winTitle: "The duck crossed",
  winBody: "",
};
