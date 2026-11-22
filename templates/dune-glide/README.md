# Dune Glide

A marble rolls down a sand dune toward a red camp. Shells along the way add to the score.

## Change the game

Edit `config.js`.

- `cruise` — how fast the marble rolls forward
- `easeSeconds` — how long the marble takes to reach that speed at the start
- `steer` and `slide` — how hard you push, and how hard the banks push back
- `shells` — `{ x, z }` spots. `x` is left/right, `z` points toward the camp
- `camp.halfWidth` — how wide the finish circle is
- `colors` — sky, sand, marble, shells, the gold pickup mark, camp
- `sounds` — files for a shell, camp, a miss, and leaving the sand. `soundVolume` turns them down

The dune mesh is `dune.glb`, made with [sand3d](https://sand3d.sandflow.ai/api.html) by `terrain.py`. Re-run that file to change the sand shape. The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
