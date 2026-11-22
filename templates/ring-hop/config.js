// Knobs for Ring Hop. Change these, then reload the page.
// levels[0] is the start. Each rings[0] is the outside ring.
// Angles are degrees. Speed is radians per second. walkSpeed is too.

export const CONFIG = {
  title: "Ring Hop",
  // Optional one-line label. Leave empty: the bird, the stars, and the rings teach the round.
  goalText: "",
  soundVolume: 0.85,
  sounds: {
    hop: "sfx/hop.webm",
    catch: "sfx/catch.webm",
    moon: "sfx/moon.webm",
  },
  // How close a star must be to the bird, in degrees, to catch it.
  // A star anywhere near the bird on the same ring counts.
  catchDegrees: 118,
  // How far one tap of Left or Right walks, in radians.
  tapStep: 0.8,

  levels: [
    {
      goalStars: 4,
      hopSeconds: 0.5,
      walkSpeed: 0.85,
      rings: [
        { radius: 5.5, speed: 0.22, stars: [28, 200] },
        { radius: 4.25, speed: -0.18, stars: [90, 270] },
        { radius: 3.05, speed: 0.26, stars: [40, 210] },
        { radius: 1.95, speed: -0.16, stars: [150, 330] },
      ],
    },
    {
      goalStars: 5,
      hopSeconds: 0.42,
      walkSpeed: 1.05,
      rings: [
        { radius: 5.5, speed: 0.38, stars: [20, 140, 250] },
        { radius: 4.25, speed: -0.32, stars: [80, 200, 310] },
        { radius: 3.05, speed: 0.42, stars: [40, 170, 280] },
        { radius: 1.95, speed: -0.28, stars: [110, 250] },
      ],
    },
    {
      goalStars: 6,
      hopSeconds: 0.36,
      walkSpeed: 1.25,
      rings: [
        { radius: 5.5, speed: 0.55, stars: [15, 110, 200, 300] },
        { radius: 4.25, speed: -0.48, stars: [50, 160, 270] },
        { radius: 3.05, speed: 0.62, stars: [30, 140, 240] },
        { radius: 1.95, speed: -0.42, stars: [90, 210, 330] },
      ],
    },
  ],

  colors: {
    sky: "#1c1b4a",
    ring: "#7ea2d6",
    ringOn: "#f6fbff",
    star: "#ffd45a",
    bird: "#ffe7a3",
    beak: "#ff8a3d",
    wing: "#f0c56e",
    moon: "#f6f1e2",
    moonDim: "#b7b3a4",
    pad: "#ffffff",
  },

  readyTitle: "Ring Hop",
  readyBody: "",
  winTitle: "You reached the moon",
};
