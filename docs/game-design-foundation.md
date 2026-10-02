# Multiverse MMORPG: Game Design Foundation

Working title: **Riftborn** (placeholder, easy to change)
Genre: 2D pixel-art MMORPG, top-down
Theme: a battle across the multiverse, where players travel between dimensions
Status: draft v0.1, 2026-10-02

---

## 1. Core concept

Reality has shattered into countless dimensions. A hostile force, **the Unmaking**, is devouring them one by one. Players are **Riftborn**: people who survived the collapse of their home world and can now step through rifts between dimensions.

Every dimension is a distinct world with its own art style, rules, enemies and loot. Players gather in a shared hub, the **Nexus**, form crews, open rifts, and fight to hold dimensions against the Unmaking and against rival factions.

**One-line pitch:** "Hop between pixel worlds, each with its own rules, and fight together to keep the multiverse from collapsing."

### Design pillars
1. **Every dimension feels different.** Not just a palette swap: each world changes one rule of play (gravity, time, light, magic).
2. **Short sessions, long goals.** A rift run takes 10 to 20 minutes, but progression spans weeks.
3. **Social by default.** Party play is rewarded, solo play is possible.
4. **Readable pixel art.** 16x16 tiles, 32x32 characters, a limited palette per dimension.

---

## 2. Dimensions (world ideas)

Each dimension has a theme, a **rule twist** and a signature resource.

| Dimension | Theme | Rule twist | Resource |
|---|---|---|---|
| **The Nexus** (hub) | Floating city built from fragments of lost worlds | Safe zone, no combat | none (trade, crafting, quests) |
| **Emberfall** | Volcanic fantasy kingdom | Lava spreads over time; fight fast | Ember Shards |
| **Neon Verge** | Cyberpunk megacity | Hacking terminals switches enemies to your side | Data Cores |
| **Hollow Tide** | Sunken ocean ruins | Limited air; air bubbles are a resource | Abyss Pearls |
| **Chronoshard** | Broken clockwork world | Time rewinds every 60 seconds; puzzles across loops | Time Gears |
| **Verdant Maw** | Living jungle that is a giant creature | Terrain shifts and hostile plants regrow | Bloom Seeds |
| **Null Expanse** | Void at the edge of the Unmaking | Darkness; your light radius is your health | Void Essence |

Later expansions can add more dimensions without changing the core systems, which is the main content strategy.

**Rift stability:** each dimension has a server-wide stability meter. Players raise it by clearing rifts; if it drops, the Unmaking invades and the dimension enters an "incursion" event with tougher enemies and better rewards. This gives the whole server a shared goal.

---

## 3. Combat

- **Real-time, action-style** combat (closer to *Realm of the Mad God* or *Hyper Light Drifter* than tab-targeting). Fits pixel art and short sessions.
- Controls: WASD to move, mouse to aim, left click for basic attack, keys 1 to 4 for skills, Space to dash.
- **Classes (starting four), each drawn from a different world:**
  - **Vanguard** (fantasy knight): tank, shields, crowd control
  - **Gunslinger** (cyberpunk): ranged damage, mobility
  - **Chronomancer** (clockwork): support, slows, rewinds ally health
  - **Wildcaller** (jungle): summoner, area control
- **Dimension affinity:** each class is stronger in its home dimension and has a small penalty in its opposite. This encourages mixed parties and makes dimension choice matter.
- **Rift Cores:** equippable modifiers found in each dimension that bend skills (for example, an Emberfall core makes your dash leave fire). These are the main build-crafting layer.

---

## 4. Progression loop

**Moment to moment:** fight, dodge, collect drops.

**Session loop (10 to 20 min):**
1. Gather in the Nexus, form a party, pick a rift.
2. Run the rift: 3 to 5 rooms of enemies, a rule twist event, a boss.
3. Return with loot, dimension resources and stability contribution.
4. Craft, upgrade, sell or trade in the Nexus.

**Long-term loop:**
- **Character level** (1 to 50) unlocks skill slots and talents.
- **Gear** with rarities (Common to Mythic) plus Rift Core slots.
- **Dimension reputation:** per-world reputation unlocks harder rift tiers, cosmetics and that world's crafting recipes.
- **Seasons:** every few months the Unmaking attacks a new dimension, bringing a seasonal story, leaderboard and cosmetic rewards.

---

## 5. Multiplayer scope

Start small, grow later. "MMO" for a small team should mean a shared persistent world, not thousands of players in one zone.

| Phase | Scope |
|---|---|
| **Prototype** | One dimension, up to 4 players in one room, no accounts |
| **Alpha** | Nexus hub (30 to 50 visible players per instance), rift instances for parties of up to 4, accounts and saved characters, chat |
| **Beta** | Multiple dimensions, trading, guilds ("crews"), stability meters, incursion events |
| **Later** | Faction PvP zones ("Contested Rifts"), seasons, cosmetic shop |

**Architecture principles:**
- **Server-authoritative:** the server decides hits, damage and loot; clients send inputs only. Prevents most cheating.
- **Instances, not seamless world:** hub instances and party rift instances. Much cheaper and simpler than one giant world.
- **Tick rate** of 20 Hz for rifts, with client-side prediction and interpolation for smooth movement.

---

## 6. Recommended tech stack (small team)

| Layer | Choice | Why |
|---|---|---|
| Game client | **Phaser 3** + TypeScript, built with **Vite** | Mature 2D engine, great for pixel art, runs in any browser, no install for players |
| Multiplayer server | **Node.js** + **Colyseus** | Rooms, state sync and matchmaking out of the box; fits hub and rift instances perfectly; same language as client |
| Shared code | TypeScript package for game rules, stats and types | Same logic on client and server |
| Database | **PostgreSQL** (accounts, characters, items) + **Redis** (sessions, presence) | Reliable and standard |
| Maps | **Tiled** map editor, exported as JSON | Phaser loads Tiled maps directly |
| Pixel art | **Aseprite** (or free LibreSprite) | Industry standard for sprites and animation |
| Hosting | One small VPS or Fly.io / Railway at first | Cheap; scale out later |

**Alternative:** if you would rather ship a downloadable desktop or mobile game, **Godot 4** is the strongest option, but browser play is the easiest way to get players trying it, so Phaser is recommended to start.

---

## 7. Art direction

- 16x16 tiles, 32x32 characters, 4-direction sprites with 4 to 6 animation frames.
- Each dimension has its own 16 to 32 color palette so players know instantly where they are.
- Shared UI frame in the Nexus style so the game feels unified.
- Free asset packs (for example from itch.io) can be used as placeholders while original art is made.

---

## 8. Next step: playable prototype

A first prototype that proves the core is fun:
- One dimension (Emberfall) with a small Tiled map
- One class (Gunslinger or Vanguard) with movement, aim, attack and dash
- A few enemy types and a simple wave or boss
- 2 to 4 players in the same room through a Colyseus server
- Placeholder pixel art

This needs a GitHub repository (new or existing) to hold the code.

## Open questions
- Working title: keep "Riftborn" or choose another?
- Platform: browser first (recommended) or desktop/mobile?
- Monetization intent: free with cosmetics, paid, or hobby project?
- Team size and art skills: will you draw sprites yourself or use asset packs first?
