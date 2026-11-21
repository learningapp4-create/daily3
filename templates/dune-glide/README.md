# Dune Glide

A marble rolls down a sand dune. Steer left or right and reach the red camp circle. Shells add to your score. Hold a side too long and you miss the camp.

Arrow keys or the Left and Right buttons. P pauses. R starts again.

## Change the game

Edit `config.js`.

- `cruise` — how fast the marble rolls forward
- `steer` and `slide` — how hard you push, and how hard the banks push back
- `shells` — `{ x, z }` spots. `x` is left/right, `z` points toward the camp
- `camp.halfWidth` — how wide the finish circle is
- `colors` — sky, sand, marble, shells, camp

The dune mesh is `dune.glb`, made with [sand3d](https://sand3d.sandflow.ai/api.html) by `terrain.py`. Re-run that file to change the sand shape.
