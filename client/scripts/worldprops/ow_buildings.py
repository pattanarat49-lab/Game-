"""The new Open World's buildings (2026-10-11): the user's sheet art/openworld/buildings-sheet.png (a cottage,
a windmill, a castle, a fishing dock with a water wheel, a market stall), cut off the dark background the same
way as the other props (ow_props.cut) at a size that suits 32x32 tiles, into art/props/ow_<name>.png.
Run from client/, then `node scripts/embed-hero-art.mjs`."""
import sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from ow_props import cut

SHEET = "art/openworld/buildings-sheet.png"
# name: (box on the sheet, which side to size by, art pixels)
B = {
    "house": ((18, 50, 505, 545), "w", 192),
    "windmill": ((535, 8, 955, 555), "h", 224),
    "castle": ((990, 12, 1525, 580), "w", 320),
    "dock": ((160, 540, 745, 1005), "w", 224),
    "market": ((800, 600, 1445, 965), "w", 224),
}
for name, (box, side, want) in B.items():
    full = cut(SHEET, box, cell=1.0, colors=64)
    cell = (full.height if side == "h" else full.width) / want
    img = cut(SHEET, box, cell=cell, colors=48)
    img.save(f"art/props/ow_{name}.png")
    print(name, img.size)
