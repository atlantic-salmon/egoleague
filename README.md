# Blue Lock: Egoist Pitch

A 2D top-down football game inspired by Blue Lock. Play story mode through the manga, pull characters and gear from a gacha, build squads from players you own, and play locally or online. In every match the goalkeeper is the Blue Lock Man — drawn as a human athlete like every other character, not a robot.

## Features

- **Isagi's Path (story mode):** 8 stages across 4 chapters (First Selection, Second Selection, U-20 Japan, Neo Egoist League). Each stage has an objective, star ratings, first-clear rewards, and animated cutscenes before and after the match. Cutscenes include portraits, typewriter text, speed lines, Metavision, flashes and shakes.
- **Abilities:** every skill has an activatable technique (Q / U / gamepad Y). Activating plays a short on-screen cutscene with your portrait, ability title and FX (Metavision grid, speed lines, impact flash, etc.), then applies a timed effect such as a speed burst, untackleable dribble, forced charged shot, ball steal or opponent stun.
- **Character portraits:** each character (including Blue Lock Man and Ego) has an AI-generated profile image under `public/portraits/`. The UI uses those images and falls back to the vector bust if a file is missing.
- **Movement:** there is no sprint key. Players wind up to top speed over time. How fast depends on the character's Acceleration, and sharp turns bleed momentum based on Agility. Hold shoot to charge a shot. Pressing shoot without the ball is a tackle.
- **Blue Lock Man goalkeeper:** an AI keeper that tracks the ball, dives, saves or parries shots, rushes out on through balls, and distributes the ball.
- **Gacha with 8 rarities:** Common (C), Uncommon (UC), Rare (R), Epic (E), Mythic (M), Legendary (L), World Class (WC), #1.
  - Characters come in several versions, such as Isagi (Base), Isagi (Team Z) and Isagi (Bastard München).
  - Gear (boots, headband, jersey) uses the same rarities. World Class and #1 gear have unique names, such as *Metavision Lens* and *Crown of the Striker*.
  - Pity: Legendary or better is guaranteed within 70 pulls, and #1 within 500. Every 10-pull includes at least one Rare or better.
- **Talent and Quality:** every item rolls Talent (0-100) and Quality (0-100) on the server when it's pulled. These rolls are permanent. Talent scales Top Speed, Shot Power and Physical. Quality scales everything else. Both rolls also set the item's grade (S to D) and its market value.
- **Teams:** save up to 8 lineups with formations. You can only use players you own, and a player that's locked in a trade or listing can't be used. Each team can include only one version of each character.
- **Play modes:**
  - **Local 2P:** two players on one keyboard, head to head or co-op against bots. No account needed.
  - **Friendly lobbies:** play online from different laptops with any mix of friends and bots on each side, up to 5v5. The host controls the settings.
  - **Ranked:** a 3v3 queue with Elo rating.
  - **Ghost matches:** play against a friend's saved team, even when they're offline.
- **Economy:**
  - Quests: daily quests and lifetime milestones.
  - Leaderboards: rating, story stars and goals.
  - Market: listing fee and sale tax, with price history.
  - Trades: offered items and coins are held in escrow until the trade is accepted, declined or cancelled.
  - Friends list.
- **Pacing:** the early game moves fast. Rewards are boosted until level 9, and early story stages run at a faster tempo. The late game is a grind: level upgrade costs grow exponentially, stat gains from levels have diminishing returns, and top-rarity drops are rare and protected by long pity counters.

## Running locally

You need **Node.js 22.5 or newer**, because the game uses the built-in `node:sqlite`.

```bash
npm install
npm run dev
```

Open http://localhost:4517. The dev server is a single custom Node server that serves the Next.js app, the JSON API at `/api/*`, and the WebSocket game server at `/ws`. To play from another laptop on the same network, open `http://<your-ip>:4517` there.

The database is created automatically at `data/bluelock.db`. Delete that file to reset everything.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload, port 4517 (override with `PORT`) |
| `npm run build` then `npm start` | Production build and server |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run sim:test` | Checks that the match engine is deterministic (live run equals replay) |
| `npm run e2e` | Smoke test against a running server: accounts, friends, a lobby match over WebSocket, market buy, escrowed trade |

## Controls

| Scheme | Move | Shoot (hold to charge) / tackle | Pass | Ability |
| --- | --- | --- | --- |
| Solo (story, online) | WASD or arrows | Space or J | E, K or Left Shift | Q |
| Local Player 1 | WASD | Space | E | Q |
| Local Player 2 | Arrow keys | Enter | Right Shift or / | U |

Gamepads work automatically. On touch screens an on-screen joystick appears. Press Esc or P to pause local matches.

## Anti-cheat and security

The server is the only source of truth. The browser never decides what you own or what you earn.

- **Accounts:** passwords are hashed with scrypt. Sessions are random tokens, stored only as SHA-256 hashes, in an httpOnly SameSite cookie. WebSocket connections use single-use tickets that expire after 60 seconds.
- **API protection:** every mutating request needs a custom header and a matching Origin, which blocks CSRF. Request bodies are validated with zod and size-limited. Every route is rate-limited. Pulls, purchases, trades, level-ups and match submissions require an `Idempotency-Key`, so retries can't double-spend.
- **Database guarantees (SQLite):** CHECK constraints keep coins, gems and shards from going negative. Triggers make Talent, Quality, rarity and template immutable after an item is created. Original rolls are also copied into an append-only table, and every currency change goes to an append-only ledger. All multi-step changes run inside `BEGIN IMMEDIATE` transactions.
- **Gacha:** rolls use `crypto.randomInt` on the server, and pity counters are stored server-side.
- **Story and ghost matches:** the server issues a ticket containing the match seed and lineups. The client uploads only its compressed input log, and the server replays the deterministic engine to compute the real score. Tickets are single-use, expire, and are rejected if submitted faster than the match could actually be played. A claimed score that doesn't match the replay gets flagged.
- **Online matches:** the server runs the simulation. Clients only send button states and render server snapshots.
- **Abuse detection:** the server limits trades and purchases between the same pair of accounts per day, which stops alt-account funnelling. It also caps friendly-match rewards, and flags suspicious win streaks and pair farming.

## Tuning

All balance values are in `src/shared/tuning.json`: gacha rates, pity, roll ranges, stat curves, acceleration physics, level costs, reward multipliers, market fees and anti-cheat thresholds. The server reads this file at startup.

## Project layout

```
server/          custom HTTP + WebSocket server, SQLite schema, API routes, rooms
src/game/        deterministic match engine, bot and Blue Lock Man AI, canvas renderer, input, sound
src/shared/      catalog (characters, versions, gear), stats, story, cutscenes, quests, banners, tuning
src/app/         Next.js pages (story, play, gacha, collection, teams, market, trades, ...)
src/components/  UI components (shadcn/ui) and game components (match view, cutscene, item cards)
scripts/         engine determinism test and online end-to-end test
```

Blue Lock is a fan inspiration only. All art in this game is generated vector shapes.
