# Map textures and fog (all CC0, public domain)

Used by the Classic 3v3 maps and Battle Royale (`src/mapTex.data.ts`, `src/fog.data.ts`).
Only each photo's light and dark is kept (shrunk to pixel size), so every map keeps its own colours.

| In game | Source | License |
| --- | --- | --- |
| floor (cobbles) | ambientCG PavingStones070 — https://ambientcg.com/view?id=PavingStones070 | CC0 1.0 |
| brick (walls) | ambientCG Bricks085 — https://ambientcg.com/view?id=Bricks085 | CC0 1.0 |
| plank (crates) | ambientCG WoodFloor044 — https://ambientcg.com/view?id=WoodFloor044 | CC0 1.0 |
| grass (tall grass, hedges) | ambientCG Grass004 — https://ambientcg.com/view?id=Grass004 | CC0 1.0 |
| meadow (Battle Royale ground) | ambientCG Ground037 — https://ambientcg.com/view?id=Ground037 | CC0 1.0 |
| fog puffs | Kenney Smoke Particles, whitePuff02/07/12/18 — https://kenney.nl/assets/smoke-particles | CC0 1.0 |

Rebuild: download the 1K-JPG colour maps, then
`python3 scripts/mktex.py tex.json outdir src/mapTex.data.ts` (tex.json: name -> src, size, contrast) and
`python3 scripts/mkfog.py "<smoke>/PNG/White puff" src/fog.data.ts preview.png`.
Sizes used: floor 126, brick 84, plank 63, grass 96 (contrast 16), meadow 168; floor contrast 17, brick 24, plank 22, meadow 18.

## Hero effects (all CC0)

Kenney Particle Pack — https://kenney.nl/assets/particle-pack (CC0 1.0). 23 of its textures, made white (brightness kept
as transparency) and shrunk: `art/props/fx_*.png`. `src/heroFx.ts` gives every hero a colour and a set of these for the
flash of a basic attack, the burst when a skill is cast, and the star where a hit lands.
