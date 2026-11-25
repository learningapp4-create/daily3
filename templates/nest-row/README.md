# Nest Row

Three nests sit in a row. Each egg belongs in the nest that looks like it.

## Change the game

Edit `config.js`.

- `nests` — left to right. `color`, `shape` (`round`, `point`, or `square`), and `mark` (the picture on the button)
- `eggCount` — how many eggs in a round
- `sendSeconds` — how long an egg takes to reach a nest
- `backSeconds` — how long a mismatched egg takes to come back
- `turnBack` — how far along that trip a mismatched egg gets before it turns around
- `colors` — sky, grass, stump, birds
- `sounds` — files for sending an egg, a match, a return, and the end. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
