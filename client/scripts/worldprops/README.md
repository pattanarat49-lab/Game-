Open World props (2026-10-11): trees, bushes, rocks, houses, stall, lamp, well and log are cut from the
user's own tileset sheet (art/worldprops-sheet.png) and redrawn as crisp pixel art.

    python3 scripts/worldprops/mkprops.py art/worldprops-sheet.png src/worldProps.data.ts scripts/worldprops preview.png

Needs Pillow and numpy.

2026-10-11: trees, houses (roof recoloured per variant), market stall and windmill now come from the user's
art/worldprops-trees.png and art/worldprops-buildings.png; bushes, rocks, lamp, well and log still from the first sheet.
The portal frames: scripts/worldprops/cutportal.py on art/props/src/portal-sheet.png.
