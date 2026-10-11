"""The new Open World's ground (2026-10-11): the user's 32x32 tiles cut from art/openworld/tileset-sheet.png,
one colour per cell (the middle of the cell), into src/owTiles.data.ts. Run from client/."""
import base64, numpy as np
from PIL import Image

a = np.asarray(Image.open("art/openworld/tileset-sheet.png").convert("RGB")).astype(int)
ROWS = [(3, 133), (137, 245), (246, 369), (370, 511)]
COLS = [
    [(4, 128), (133, 273), (276, 414), (419, 556), (560, 701), (705, 842), (846, 1013), (1015, 1181), (1183, 1309)],
    [(4, 128), (133, 273), (277, 415), (419, 556), (560, 703), (705, 842), (846, 1013), (1015, 1180), (1184, 1308)],
    [(4, 128), (132, 273), (276, 415), (418, 557), (560, 702), (705, 842), (846, 1012), (1015, 1180), (1184, 1308)],
    [(5, 128), (133, 273), (278, 414), (419, 556), (561, 701), (706, 842), (846, 960), (963, 1069), (1074, 1180), (1185, 1307)],
]

def sample(x0, y0, x1, y1, w=32, h=32):
    t = np.zeros((h, w, 3), np.uint8)
    for j in range(h):
        for i in range(w):
            ya = int(y0 + (y1 - y0) * (j + 0.25) / h); yb = max(int(y0 + (y1 - y0) * (j + 0.75) / h), ya + 1)
            xa = int(x0 + (x1 - x0) * (i + 0.25) / w); xb = max(int(x0 + (x1 - x0) * (i + 0.75) / w), xa + 1)
            t[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), 0)
    return t

def tile(r, c, h=32, inset=3):
    (y0, y1), (x0, x1) = ROWS[r], COLS[r][c]
    return sample(x0 + inset, y0 + inset, x1 - inset, y1 - inset, 32, h)

sets = {
    "GRASS": [tile(0, c) for c in range(5)],
    "MEADOW": [tile(0, c) for c in range(5, 8)],
    "DIRT": [tile(1, c) for c in range(3)],
    "COBBLE": [tile(1, 4)],
    "STONE": [tile(1, c) for c in range(5, 9)],
    "WATER": [tile(2, 0)],
    # sand: the beach strip along the bottom of the first shore tile, stretched to a tile
    "SAND": [sample(150, 350, 262, 366, 32, 32)],
    "CLIFF": [sample(COLS[3][c][0] + 16, 372, COLS[3][c][1] - 16, 500, 32, 40) for c in range(6)],
}
out = ["// The user's Open World tiles (2026-10-11), RGB bytes per tile, built by scripts/worldprops/ow_tiles.py.",
       "export interface OwTileSet { w: number; h: number; n: number; d: string }"]
prev = []
for k, ts in sets.items():
    arr = np.stack(ts)
    out.append(f'export const OW_{k}: OwTileSet = {{ w: {arr.shape[2]}, h: {arr.shape[1]}, n: {len(ts)}, d: "{base64.b64encode(arr.tobytes()).decode()}" }};')
    prev.append(np.concatenate([np.pad(t, ((0, 40 - t.shape[0]), (0, 2), (0, 0))) for t in ts], 1))
open("src/owTiles.data.ts", "w").write("\n".join(out) + "\n")
W = max(p.shape[1] for p in prev)
img = np.concatenate([np.pad(p, ((0, 2), (0, W - p.shape[1]), (0, 0))) for p in prev], 0)
Image.fromarray(img.astype(np.uint8)).resize((img.shape[1] * 4, img.shape[0] * 4), Image.NEAREST).save("/tmp/claude-0/-home-user-game-/8c3af6d0-41c5-5f77-9d52-cded3a1b588c/scratchpad/ow/tiles.png")
