# Balloon Drift

A balloon drifts past three gardens. Higher and Lower choose its height.

## Change the game

Edit `config.js`.

- `drift` — how fast the balloon moves forward
- `heightStep`, `minHeight`, `maxHeight`, `startHeight` — the height choice
- `band` — how close the balloon must be to a garden's height
- `reach` — how far past a garden the balloon can still meet it
- `gardens` — `z` is along the drift, `color` and `bright` are the shelf. Each round picks a new `y`
- `colors` — sky, ground, balloon, basket, clouds
- `sounds` — files for a height change, a garden, and the meeting. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
