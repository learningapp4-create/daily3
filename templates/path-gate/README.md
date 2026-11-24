# Path Gate

A wagon follows a path. Each gate has a bar. The path is open when the bar swings aside.

## Change the game

Edit `config.js`.

- `speed` — how fast the wagon rolls
- `stopGap` — how far in front of a closed bar the wagon waits
- `turnStep` — how far one press swings the bar, in radians
- `gates` — each `z` is where the gate stands. Each round starts that bar at a new angle
- `startZ` — where the wagon begins
- `barnZ` — where the round ends
- `colors` — sky, grass, path, bar, posts, wagon, wood, barn, roof
- `sounds` — files for a swing, a wait, passing a gate, and the barn. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
