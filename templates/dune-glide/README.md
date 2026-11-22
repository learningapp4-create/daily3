# Dune Glide

A marble rolls down a sand dune toward a red camp. Shells along the way add to the score.

## Change the game

Edit `config.js`.

- `cruise` — how fast the marble rolls toward the camp
- `back` and `brake` — reverse speed, and how quickly a hold slows the marble through a stop
- `backTap` — how far one tap of Back rolls the marble up the dune
- `easeSeconds` — how long the marble takes to reach cruise speed at the start
- `goalShells` — how many shells the camp counts as a win
- `retreat` — how far the ball rolls back up the dune if shells are still out
- `steer` and `slide` — how hard you push, and how hard the banks push back
- `shells` — `{ x, z }` spots. `x` is left/right, `z` points toward the camp
- `camp.halfWidth` — how wide the finish circle is
- `colors` — sky, sand, marble, shell, shell ridge, shell mouth, camp
- `sounds` — files for a shell, camp, a miss, and leaving the sand. `soundVolume` turns them down

The dune mesh is `dune.glb`, made with [sand3d](https://sand3d.sandflow.ai/api.html) by `terrain.py`. Re-run that file to change the sand shape. The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
