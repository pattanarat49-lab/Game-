# Riftborn

A multiplayer pixel-art action RPG set in a collapsing multiverse. This is the first playable prototype: **one dimension (Emberfall), six heroes to pick from, up to 4 players in the browser.**

Design doc: see `docs/game-design-foundation.md`.

## What's in the prototype

- **Stage select:**
  - **Lava Stage:** four waves while lava creeps in from the edges, then the Pyre Warden boss.
  - **PvP Arena (online only, 1 vs 1):** starts on a fighting-game style PLAYER SELECT screen: each player sees the other's pick move live (1P cyan, 2P red), then presses READY; the match starts when both are ready. Players fight in a small boxing ring with no cover (`RING` in `shared/game.ts`). First to 3 kills wins, then both go back to player select. If a player leaves mid-match, the match is void and the other player goes back to player select. Player-vs-player hits deal 60% damage (`PVP_DAMAGE_SCALE`).
  - **Bot Duel (solo):** 1v1 in the same boxing ring against a bot. Pick the bot's hero under the stage cards. The bot closes in or keeps its range, circles, and uses its skills; first to 3 KOs wins.
  - **Boss Room:** no waves. Fight the Atomic Kaiju straight away. It fires an atomic beam after a red warning line, so move out of the line. Between beams it spits fans of fireballs.

- **Emberfall**, a volcanic arena with basalt pillars
- **Rule twist:** lava creeps in from the edges during each wave and burns anyone standing in it. It cools between waves.
- **Character select** with 29 heroes, ordered by PvP strength (weakest at the top, strongest at the bottom; the order is `PVP_RANKING` in `shared/game.ts`):
  - **Captain Steel:** melee punches, the hardest hits and 3x HP. Skill SMASH hits everything around him and stuns it for 1 second (bosses are not stunned). HEAT VISION (E) fires a laser from his eyes for 2.5 seconds that follows where he aims.
  - **Reborn Knight:** mid-range sword sweeps that hit every enemy in the arc. Skill SKY SLASH throws a sword wave that cuts through enemies.
  - **Frost Sniper:** sniper with very long range and huge damage, but a slow reload. Shots pierce. Skill FROST VOLLEY fires three rapid shots.
  - **Volt Kid:** three times faster than anyone. Attacks call down lightning that hits an area. Skill THUNDERBOLT strikes everything around him.
  - **Sky Wizard:** long-range magic orbs that explode in a wide blast. Skill FIRE SPIRIT throws a big fireball with a huge explosion.
  - **Champ Rico:** fast boxer (1.5x speed, quick punches) with very short reach. Skill JAB (1s cooldown) fires a long straight jab that stuns monsters and rival players for 0.5 seconds (bosses are not stunned). DEATH CROSS (E) is a crushing straight right (150 damage) that sends everything it hits flying far away (bosses do not budge).
  - **Plain Hero:** 100x the HP of anyone else. Skill FINAL BLOW kills anything in front of him (Reborn Knight's reach).
  - **Holy Healer:** holy bolts from range. Skill HEAL restores 50% max HP to every ally nearby (and himself).
  - **Green Rookie:** runs 1.5x faster. Skill FULL POWER SMASH blasts a wide straight line.
  - **Sakura Blade:** fast sword. Skill PHANTOM SLASH cuts everything around her 8 times.
  - **Void Sorcerer:** close-range fighter. Skill VOID REALM hits every enemy on the whole map.
  - **Chrono Brawler:** very fast punches. Skill TIME STOP freezes the whole map for 4 seconds; only he can move.
  - **Storm Mage:** magic bolts. Skill HURRICANE summons a storm cloud that keeps striking lightning over a wide area.
  - **Trickster:** magic shots and two skills. ILLUSION raises a golden city for 10 seconds; enemies inside lose 7% of their max HP each second. CLONE (E) makes a copy with 25% of his HP that attacks enemies by itself.
  - **The Detective:** weak hits, runs 1.1x faster. No skill; PASSIVE FORESIGHT shows a ghost of where every monster and boss will be 0.5 seconds ahead.
  - **Viking Kid:** quick twin-dagger slashes. Skill DAGGER RUSH dashes forward, cutting every enemy on the way.
  - **Giant Shifter:** very weak hits as a human. Skill GIANT FORM turns him into a 50m giant for 10 seconds; every attack smashes everything around him.
  - **Retired Hitman:** runs 1.2x faster, quick knife slashes. Skill SWAP MODE switches to a machine gun that fires very fast; use it again to go back to the knife.
  - **Glitch God (6 stars, special):** Captain Steel's HP (300), moves 2x faster, hard-hitting glitch shots, and glitches like a rendering error. CREATOR builds a whole city (bigger than the golden city) for 15 seconds; enemies inside lose 10% of their max HP per second and he heals 10% per second. REALITY CHANGE (E) turns every enemy into an ordinary human for 10 seconds: they hit for 1 and cannot use any skill (no beam, no fireballs).
  - **Rubber Pirate:** 1.5x HP, stretchy punches. Skill GATLING PUNCH pounds a medium-range lane with a storm of fists for 1 second.
  - **Mad Scientist:** laser gun. PORTAL GUN: press once to open a portal, again to open its partner; walk into one to come out of the other (anyone can use them). MISSILES (E): 10 missiles that chase targets until they hit; in PvP, melee swings can cut them down.
  - **Gadget Cat:** 1.5x HP, air-cannon blasts. TIME MACHINE turns everyone and everything still on the map back 2 seconds (positions and HP; shots in the air vanish). GUNNER BOTS (E): 6 little gunner robots, each with 15% of his HP, fight for 15 seconds.
  - **Monster Tamer:** weak, slow punches. SPARK MOUSE: a fast electric mouse (2x speed, 60% of his HP) that zaps areas. FLAME DRAGON (E): a fire-breathing dragon (1.5x speed, 200% of his HP). Pets stay until they fall or the Tamer does.
  - **Phantom Thief:** runs 1.3x faster, pistol shots. Skill DRAW CARD throws a random card 1-9 that takes 10-90% of the target's max HP (a tenth of that on bosses).
  - **Hanuman:** runs 1.5x faster, quick trident thrusts. Skill REVIVE: for 5 seconds after pressing it, falling brings him straight back up with half his HP.
  - **Demon Lord:** four arms, 3x HP, runs 1.2x faster. Slow but crushing blows hit a wide area around him. Skill IMMORTAL: a barrier blocks all damage for 3 seconds and heals 10% HP each second.
  - **Agamemnon:** 2x HP, bronze sword sweeps. Skill GLADIATORS calls 20 gladiators (10% of his HP each) that fight with swords for 20 seconds.
  - **Vampire:** quick claw swipes. Skill BLOOD LATCH leaps onto the nearest target in front, clings to it for 3 seconds and drains 40 HP a second, healing the same.
  - **Hopper Rider:** 1.5x HP, runs 1.5x faster, very fast punches. Skill RIDER KICK leaps into a flying kick that stuns everything it hits for 2 seconds (bosses are not stunned).
- Controls: attack with left mouse, aim with the mouse, dash with Space, use your skill with Q or right mouse (E too, unless the hero has a second skill, which E uses). Skills are aimed while the key is held (a yellow guide shows where they land) and go off when you let go. Press Esc while holding to call it off. On phones, hold a skill button, drag to aim, and release; drop it on the CANCEL spot that appears above the button to call it off.
- **Knockback and parry:** basic hits from melee heroes (punch and sword) push monsters and rival players back (bosses do not budge) and cut down enemy shots, and rival shots in PvP, inside the swing.
- **Online:** your own attacks and skills show the moment you press them, and the HUD shows your ping to the server in the top-right corner.
- **Enemies:** Cinderlings (fast), Magma Brutes (tanky), Ash Casters (ranged), and the **Pyre Warden** boss on wave 5
- **Stage 2: Jungle Temple** (harder than the Lava Stage, no lava): bigger waves of fast Monkeys and Banana Monkeys that throw bananas from range, then the **Ape King** on wave 5. The Ape King hurls boulders and, every few seconds, winds up (a red warning lane shows) and charges along it.
- **Stage 3: Sword Dojo** (much harder than the Jungle Temple): a wooden training hall with straw dummies as obstacles. Waves of Sword Students in white and Sword Masters who throw flying slashes, then the **Sword God** on wave 5: player-sized but deadly, with four sword moves (a lightning dash, a spinning cut, a fan of flying slashes and a three-cut flurry). Every move shows a red warning first; dash through it to dodge.
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
3. Wait for the first build (a few minutes). Render gives you a link like `https://riftborn-sg-xxxx.onrender.com`. The server runs in Singapore (set in `render.yaml`), close to players in Southeast Asia.
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
- **Stages and the Atomic Kaiju's beam:** `STAGES` and the `BEAM_*` numbers at the bottom of `shared/game.ts`.
- **Pixel art:** change the letter grids in `client/src/art.ts`. Each letter is a color from the palette below the grid, and `.` is transparent. The hero sprites are in `HERO_SPRITES`.
- **Map pillars:** the `ROCKS` list in `shared/game.ts`.

## Tech

Phaser 3 + TypeScript + Vite on the client, Node + Colyseus 0.15 on the server.

## Next steps

- Real sprite sheets made in Aseprite, with walk and attack animations
- The Nexus hub where players meet before entering rifts
- A second dimension (Neon Verge) and a second class
- Accounts and saved characters
