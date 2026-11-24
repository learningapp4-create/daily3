// Knobs for Path Gate. Change these, then reload the page.

export const CONFIG = {
  title: "Path Gate",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    turn: "sfx/turn.webm",
    bump: "sfx/bump.webm",
    roll: "sfx/roll.webm",
    done: "sfx/done.webm",
  },

  speed: 1.7,
  stopGap: 1.45,
  turnStep: Math.PI / 4,
  startZ: 0,
  barnZ: 22,

  // turns is how far the bar starts from across the path. 0 is fully across.
  // One turn of turnStep swings the bar. Two turns from 0 leaves the path open.
  gates: [
    { z: 6.5, turns: 0 },
    { z: 12.5, turns: 1 },
    { z: 18.2, turns: 0 },
  ],

  colors: {
    sky: "#c5e4f7",
    grass: "#7dae58",
    path: "#e6c48a",
    bar: "#6b3a22",
    post: "#efe6d4",
    wagon: "#d4543c",
    wood: "#a56b3c",
    barn: "#c4473a",
    roof: "#7d4030",
  },

  readyTitle: "Path Gate",
  readyBody: "",
  winTitle: "The wagon reached the barn",
  waitTitle: "The wagon reached the barn",
  winBody: "",
};
