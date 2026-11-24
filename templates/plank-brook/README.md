# Plank Brook

Planks on the bank fit the gaps in a brook. The duck crosses when the gaps are filled.

## Change the game

Edit `config.js`.

- `gaps` — each `need` is a gap length. Each round swaps which gap is which
- `planks` — each `length`. Each round swaps which plank is which length
- `fitSlack` — how near a length must be to a gap
- `walkSeconds` — how long the duck takes to cross
- `colors` — grass, water, posts, planks, duck
- `sounds` — files for picking up, a fit, a plank coming back, and the crossing. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
