# Pond Skip

A stone skips across a pond. The lily pad is on the far side.

## Change the game

Edit `config.js`.

- `startAngle`, `angleStep`, `angleMin`, `angleMax` — where the throw begins, and how far Left and Right turn it
- `aimReach` — how far the aim dots go. They stop before the pads
- `speed`, `lift`, `gravity`, `bounce`, `sinkSpeed`, `maxSkips` — the skip
- `pads` — the flower pads. `x` and `z` place each one, `radius` is how near the stone must come
- `colors` — sky, water, sand, stone, lily, aim dots
- `sounds` — files for the throw, a skip, the pad, and a gentle plop. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
