# Beetle Path

Turn the stones so their arrows lead the beetle to the flower. Press Go and watch. If the path loops or leaves the board, the beetle comes home and your turns stay.

Click a stone, or use the arrow keys and Space. Enter is Go. P pauses. Reset puts the stones back.

## Change the game

Edit `config.js`.

- `rows` — one string per row. The first row is the far side. `N` `E` `S` `W` are arrows. `F` is the flower.
- `start` — `{ c, r }` column and row where the beetle begins. `c` is across, `r` is down the list.
- `stepSeconds` — how fast the beetle walks
- `colors` — meadow, stones, the walked path, beetle, flower
