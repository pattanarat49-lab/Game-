# Riftborn

A multiplayer pixel-art action RPG set in a collapsing multiverse. This is the first playable prototype: **one dimension (Emberfall), three heroes to pick from, up to 4 players in the browser.**

Design doc: see `docs/game-design-foundation.md`.

## What's in the prototype

- **Emberfall**, a volcanic arena with basalt pillars
- **Rule twist:** lava creeps in from the edges during each wave and burns anyone standing in it. It cools between waves.
- **Character select** with three heroes:
  - **Superman:** melee punches, the hardest hits and 3x HP. Skill SMASH hits everything around him.
  - **Isekai Hero:** mid-range sword sweeps that hit every enemy in the arc. Skill SKY SLASH throws a sword wave that cuts through enemies.
  - **Simo Hayha:** sniper with very long range and huge damage, but a slow reload. Shots pierce. Skill WHITE DEATH fires three rapid shots.
- Controls: attack with left mouse, aim with the mouse, dash with Space, and use your skill with Q, E or right mouse
- **Enemies:** Cinderlings (fast), Magma Brutes (tanky), Ash Casters (ranged), and the **Pyre Warden** boss on wave 5
- **Co-op for up to 4 players.** Enemies get tougher with more players. Fallen players respawn after 5 seconds.
- **Server-authoritative multiplayer:** the server decides movement, hits and damage. The client predicts your own movement so it feels instant.

## Play it now

**Solo mode** runs entirely in the browser, with no server needed. There's a hosted copy here: https://claude.ai/artifact/M88J4EWiuZrhVHFQ6WtePQ

To make your own copy, run `npm run build:solo --prefix client`. It writes one self-contained file, `client/dist-solo/riftborn.html`, that you can open directly or upload to any static host (GitHub Pages, itch.io, Netlify).

**Online co-op** needs the game server running, as described below.

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
- **Pixel art:** change the letter grids in `client/src/art.ts`. Each letter is a color from the palette below the grid, and `.` is transparent. The hero sprites are in `HERO_SPRITES`.
- **Map pillars:** the `ROCKS` list in `shared/game.ts`.

## Tech

Phaser 3 + TypeScript + Vite on the client, Node + Colyseus 0.15 on the server.

## Next steps

- Real sprite sheets made in Aseprite, with walk and attack animations
- The Nexus hub where players meet before entering rifts
- A second dimension (Neon Verge) and a second class
- Accounts and saved characters
