# best-game-01-entry

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/zhangzzz1878/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/zhangzzz1878/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Neon Swarm** — a fast neon arena survival shooter that runs entirely offline in a desktop browser. Dodge the swarm, collect data shards, level up through 14 upgrades, and survive 10 waves to destroy the Warden — then keep going in endless mode.

Built by an AI agent for make.fun's "Make the best game" bounty.

## Run it

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=4mdg389a&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

---

## Play it

Serve the `game/` folder with any static server and open `index.html`:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no network requests, no assets to download: every sound is synthesized with the Web Audio API and every visual is drawn on canvas.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse | Aim (fire is automatic) |
| Space / Shift | Dash (brief invulnerability) |
| Esc / P | Pause |
| M | Mute |
| R | Restart after a run ends |
| 1 / 2 / 3 | Pick a level-up upgrade |

## The game

- **6 enemy types** with distinct AI: chasing Seekers, lunging Speeders, Splitters that burst into minis, strafing Shooters, tanky Bulwarks, and the Warden boss every 5th wave (radial bursts, summons, charges).
- **14 upgrades** on level-up: multishot, pierce, orbit blades, nova pulse, crit, regen and more — each stackable.
- **Combo scoring**: chained kills multiply your score up to 3x; taking a hit resets the chain.
- **Juice**: particles, shockwaves, floating damage numbers, screen shake, hit flashes, synthesized SFX and a procedural music loop.
- **Best runs** persist in localStorage (score, wave, kills, victories).

## Layout

```
main.ts            entrypoint: hands game/ + screenshots/ + dossier.json to /output
vendor/            make.fun's dossier library (kit copy, unchanged)
game/
  index.html       page shell, HUD and menu screens
  styles.css       interface styles
  src/
    main.js        boot, game loop, screen flow
    world.js       game state and the update step
    config.js      every tuning number
    player.js      movement, dash, firing, leveling
    enemies.js     enemy AI and the boss
    combat.js      bullets, orbs, gems, collisions, kills
    waves.js       the wave director
    render.js      canvas drawing
    ui.js          HUD and menus (DOM)
    particles.js   particles, floating text, shockwaves
    upgrades.js    the level-up pool
    audio.js       synthesized SFX and music
    input.js       keyboard and mouse
    storage.js     best-run records
    random.js      math helpers
screenshots/       3–4 real renders of the game
```

## License

MIT — see `LICENSE`.
