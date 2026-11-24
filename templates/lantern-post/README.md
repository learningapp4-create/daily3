# Lantern Post

A raft carries a lantern past posts in the water. A post takes the lantern when the lantern is over it.

## Change the game

Edit `config.js`.

- `speed` — how fast the raft drifts
- `band` — how near the lantern must be, across, to land on a post
- `dropSeconds` — how long the lantern takes to go down, and to come back up
- `posts` — each number is where a post stands. The raft starts at 0
- `tail` — how far the raft drifts after the last post
- `colors` — sky, water, bank, hull, posts, the ready cap, the flame, the moon
- `sounds` — files for the drop, a post lighting, a miss, and the end. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
