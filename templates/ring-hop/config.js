// Knobs for Ring Hop. Change these, then reload the page.
// rings[0] is the outside. Angles are degrees. Speed is radians per second.

export const CONFIG = {
  title: "Ring Hop",
  // Optional one-line label. Leave empty: the bird, the stars, and the button teach the round.
  goalText: "",
  goalStars: 5,
  soundVolume: 0.85,
  sounds: {
    hop: "sfx/hop.webm",
    catch: "sfx/catch.webm",
    moon: "sfx/moon.webm",
  },
  // How close a star must be to the bird, in degrees, to catch it.
  catchDegrees: 50,
  hopSeconds: 0.36,

  rings: [
    { radius: 5.5, speed: 0.55, stars: [28, 200] },
    { radius: 4.25, speed: -0.48, stars: [90, 270] },
    { radius: 3.05, speed: 0.62, stars: [40, 210] },
    { radius: 1.95, speed: -0.42, stars: [150, 330] },
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
