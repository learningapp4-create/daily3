# Dock Raft

Crates lower a raft. The pale stripe on the raft meets the yellow mark on the dock, and the raft can cross to the jetty.

## Change the game

Edit `config.js`.

- `crossings` — how many times the raft crosses in a round
- `loads` — crate counts a crossing can ask for
- `maxCrates` — the most crates that can sit on the raft
- `raftHigh` — how high the stripe sits with no crates
- `crateDrop` — how far one crate lowers the stripe
- `turnBack` — how far a mismatched raft travels before it comes back
- `sendSeconds`, `backSeconds`, `holdSeconds` — the crossing, the return, and the pause at the jetty
- `colors` — sky, water, wood, stripe, mark, crates, flags
- `sounds` — files for a crate, a send, a return, and the end. `soundVolume` turns them down

The clips in `sfx/` were rendered with [earshot](https://github.com/learningapp4-create/dailyearshot).
