# Door Pips

A key turns, and pips fill in above the door. When the gold pips match the row, the door opens onto the garden.

## Change the game

Edit `config.js`.

- `doors` — how many doors a round opens
- `needs` — how many pips a door can ask for
- `crackAngle` — how far a wrong try moves the door
- `openAngle` — how far a matching door swings
- `crackSeconds`, `openSeconds`, `holdSeconds` — the bump, the swing, and the wait
- `colors` — wall, door, key, pips, and garden
- `sounds` — files for a turn, a shut bump, an opening, and the end. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
