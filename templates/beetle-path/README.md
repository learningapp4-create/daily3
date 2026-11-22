# Beetle Path

Arrow stones lead a beetle across a meadow. The flower is the end of the path.

## Change the game

Edit `config.js`.

- `rows` — one string per row. The first row is the far side. `N` `E` `S` `W` are arrows. `F` is the flower.
- `start` — `{ c, r }` column and row where the beetle begins. `c` is across, `r` is down the list.
- `stepSeconds` — how fast the beetle walks
- `colors` — meadow, stones, the walked path, the stone that closed a loop, beetle, flower
- `sounds` — files for a turn, a step, the flower, a loop, and stepping off. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
