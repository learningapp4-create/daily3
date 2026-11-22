# Ring Hop

A bird sits on spinning rings. Stars ride the rings, and the moon waits in the middle.

## Change the game

Edit `config.js`.

- `levels` — each level has `goalStars`, `hopSeconds`, `walkSpeed`, and `rings`
- `catchDegrees` — how close a star must be to count
- `tapStep` — how far one tap of Left or Right walks, in radians
- `rings` — outside ring first, inside each level. `radius`, `speed` (radians per second), `stars` (degrees around the ring)
- `colors` — sky, rings, stars, bird, moon
- `sounds` — files for a hop, a catch, and the moon. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
