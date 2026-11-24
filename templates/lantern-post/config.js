// Knobs for Lantern Post. Change these, then reload the page.

export const CONFIG = {
  title: "Lantern Post",
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    drop: "sfx/drop.webm",
    glow: "sfx/glow.webm",
    miss: "sfx/miss.webm",
    done: "sfx/done.webm",
  },

  speed: 1.15,
  band: 0.7,
  dropSeconds: 0.32,
  lanternHigh: 2.15,
  lanternLow: 1.22,
  capY: 1.05,
  tail: 3.2,

  // x is where the post stands. The raft starts at 0.
  posts: [4.2, 8.8, 13.4],

  colors: {
    sky: "#6ea0d4",
    water: "#2f7ea3",
    bank: "#24506a",
    hull: "#c4844a",
    post: "#6b4a32",
    cap: "#4a3428",
    capReady: "#ffe14a",
    flame: "#ffbf1f",
    moon: "#fff6d8",
  },

  readyTitle: "Lantern Post",
  readyBody: "",
  winTitle: "The lanterns lit the posts",
  waitTitle: "The posts are waiting",
  winBody: "",
};
