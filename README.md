# Riftborn

A multiplayer pixel-art action RPG set in a collapsing multiverse. This is the first playable prototype: **one dimension (Emberfall), six heroes to pick from, up to 4 players in the browser.**

Design doc: see `docs/game-design-foundation.md`.

## What's in the prototype

- **Stage select:**
  - **Lava Stage:** four waves while lava creeps in from the edges, then the Pyre Warden boss.
  - **PvP Arena (online only):** players fight each other. First to 3 kills wins the round, then a new round starts. Player-vs-player hits deal 60% damage (`PVP_DAMAGE_SCALE`).
  - **Boss Room:** no waves. Fight Godzilla straight away. It fires an atomic beam after a red warning line, so move out of the line. Between beams it spits fans of fireballs.

- **Emberfall**, a volcanic arena with basalt pillars
- **Rule twist:** lava creeps in from the edges during each wave and burns anyone standing in it. It cools between waves.
- **Character select** with six heroes:
  - **Superman:** melee punches, the hardest hits and 3x HP. Skill SMASH hits everything around him.
  - **Isekai Hero:** mid-range sword sweeps that hit every enemy in the arc. Skill SKY SLASH throws a sword wave that cuts through enemies.
  - **Simo Hayha:** sniper with very long range and huge damage, but a slow reload. Shots pierce. Skill WHITE DEATH fires three rapid shots.
  - **Killua:** three times faster than anyone. Attacks call down lightning that hits an area. Skill THUNDERBOLT strikes everything around him.
  - **Howl:** long-range magic orbs that explode in a wide blast. Skill CALCIFER throws a big fireball with a huge explosion.
  - **Ricardo Martinez:** boxer with very short reach. Skill JAB has no cooldown, so hold it for rapid jabs.
  - **Saitama:** 100x the HP of anyone else. Skill ONE PUNCH kills anything in front of him (Isekai Hero's reach).
  - **Healer:** holy bolts from range. Skill HEAL restores 50% max HP to every ally nearby (and himself).
  - **Deku:** runs 1.5x faster. Skill 100% SMASH blasts a wide straight line.
  - **Okita Souji:** fast sword. Skill DIMENSION SLASH cuts everything around her 8 times.
  - **Gojo:** close-range fighter. Skill DOMAIN EXPANSION hits every enemy on the whole map.
  - **Star Platinum:** very fast punches. Skill TIME STOP freezes the whole map for 4 seconds; only he can move.
  - **Rudeus Greyrat:** magic bolts. Skill HURRICANE summons a storm cloud that keeps striking lightning over a wide area.
  - **Loki:** magic shots and two skills. ILLUSION raises Asgard for 10 seconds; enemies inside lose 7% of their max HP each second. CLONE (E) makes a copy with 25% of his HP that attacks enemies by itself.
  - **L:** weak hits, runs 1.1x faster. No skill; PASSIVE FORESIGHT shows a ghost of where every monster and boss will be 0.5 seconds ahead.
  - **Thorfinn:** quick twin-dagger slashes. Skill DAGGER RUSH dashes forward, cutting every enemy on the way.
  - **Titan:** very weak hits as a human. Skill TITAN turns him into a 50m Titan for 10 seconds; every attack smashes everything around him.
  - **Yaotsu (6 stars, special):** infinite HP, moves 2x faster, and glitches like a rendering error. CREATOR builds a whole city (bigger than Asgard) for 15 seconds; inside it Yaotsu heals 10% HP per second. REALITY CHANGE (E) turns every enemy into an ordinary human for 10 seconds: they hit for 1 and cannot use any skill (no beam, no fireballs).
- Controls: attack with left mouse, aim with the mouse, dash with Space, use your skill with Q or right mouse (E too, unless the hero has a second skill, which E uses)
- **Enemies:** Cinderlings (fast), Magma Brutes (tanky), Ash Casters (ranged), and the **Pyre Warden** boss on wave 5
- **Co-op for up to 4 players.** Enemies get tougher with more players. Fallen players respawn after 5 seconds.
- **Smooth multiplayer:** your own hero moves on your device at full frame rate and the server follows it (never faster than the hero can run), so there is no rubber-banding. The server still decides hits, damage and spawns. Other players and enemies are drawn ~60-150 ms in the past, blended between timestamped updates (30 a second), so they glide even when the network is jittery.

## Play it now

**Solo mode** runs entirely in the browser, with no server needed. There's a hosted copy here: https://claude.ai/artifact/M88J4EWiuZrhVHFQ6WtePQ

To make your own copy, run `npm run build:solo --prefix client`. It writes one self-contained file, `client/dist-solo/riftborn.html`, that you can open directly or upload to any static host (GitHub Pages, itch.io, Netlify).

**Online co-op** needs the game server running, as described below.

## Play online with friends

The repo is ready to host on [Render](https://render.com) for free. `render.yaml` describes the service.

1. Create a Render account. Signing in with GitHub is easiest.
2. Click this button and approve: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/pattanarat49-lab/Game-)
3. Wait for the first build (a few minutes). Render gives you a link like `https://riftborn-xxxx.onrender.com`.
4. Share that link. Everyone who opens it and presses **PLAY ONLINE** on the same stage plays together (up to 4 per room).

Every push to `main` redeploys automatically. On the free plan the server sleeps after 15 minutes with no players, so the first visit after a break takes about a minute to wake up.

## Run it

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm run install:all   # installs root, server and client packages
npm run dev           # starts the game server (port 2567) and the client (port 5173)
```

Open http://localhost:5173 in two browser tabs to play together. Friends on the same network can join with your computer's IP address, for example `http://192.168.1.20:5173`.

### Play on your phone

The game works on phones and tablets with touch controls:

- **Left thumb:** touch anywhere on the left half of the screen and drag to move.
- **Right thumb:** touch anywhere on the right half and drag to aim. Your hero attacks in that direction while you hold it. If you only use the left stick, your hero faces where you walk.
- **DASH** and your hero's **skill** button sit in the bottom-right corner.

Turn the phone sideways. On Android the game goes fullscreen and locks to landscape automatically. You can also use "Add to Home Screen" to launch it like an app.

To try it, run `npm run dev` on your computer, connect your phone to the same Wi-Fi, and open `http://<your-computer-ip>:5173` on the phone. To play from anywhere, host the server online (see below).

### One-process mode (for hosting)

```bash
npm run build   # builds the client into client/dist
npm start       # server hosts the game at http://localhost:2567
```

Set `PORT` to change the port. If the client is hosted somewhere else, build it with `VITE_SERVER_URL=wss://your-server` set.

## Project layout

```
shared/game.ts            Game rules and tuning numbers used by both client and server
shared/sim.ts             The game simulation; runs on the server and in the browser for solo mode
server/src/RiftRoom.ts    Multiplayer room that runs the simulation for connected players
server/src/schema.ts      State that is synced to every player
server/src/index.ts       Server entry point (Colyseus + Express)
client/src/art.ts         All pixel art, drawn as editable text grids
client/src/localRoom.ts   Solo mode: runs the simulation inside the browser
client/src/touch.ts       Touch controls for phones (joysticks and buttons)
client/src/scenes/        Phaser scenes: Boot (textures), Game (world), Hud (UI)
client/index.html         Title screen
```

## Easy things to edit

- **Balance:** every number (speeds, damage, cooldowns, waves, lava speed) is at the top of `shared/game.ts`. Each hero's stats are in the `HEROES` list there.
- **Waves:** the `WAVES` list in `shared/game.ts`.
- **Stages and Godzilla's beam:** `STAGES` and the `BEAM_*` numbers at the bottom of `shared/game.ts`.
- **Pixel art:** change the letter grids in `client/src/art.ts`. Each letter is a color from the palette below the grid, and `.` is transparent. The hero sprites are in `HERO_SPRITES`.
- **Map pillars:** the `ROCKS` list in `shared/game.ts`.

## Tech

Phaser 3 + TypeScript + Vite on the client, Node + Colyseus 0.15 on the server.

## Next steps

- Real sprite sheets made in Aseprite, with walk and attack animations
- The Nexus hub where players meet before entering rifts
- A second dimension (Neon Verge) and a second class
- Accounts and saved characters
