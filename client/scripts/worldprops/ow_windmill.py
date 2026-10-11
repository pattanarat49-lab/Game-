"""The windmill with turning sails (2026-10-11): the user's 4-picture windmill sheet
(art/openworld/windmill-sheet.png). The first picture gives the sails (cut out round the hub) and the body;
where the sails covered the body, the same spot is taken from the other pictures (lined up on the door),
where the sails stand elsewhere. Writes art/props/ow_windmill.png (body) and ow_windmill_sails.png
(sails, centred on the hub) and prints where the hub sits on the body. Run from client/."""
import sys, numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from ow_props import tidy

S = np.asarray(Image.open("art/openworld/windmill-sheet.png").convert("RGB")).astype(int)
Q = 627
F = [S[y:y + Q, x:x + Q] for y in (0, Q) for x in (0, Q)]
BG = np.median(np.concatenate([f[:6].reshape(-1, 3) for f in F]), 0)
HUB = (323, 180)  # (x, y) in the first picture
REACH = 198
CELL = 2.52  # sheet pixels per art pixel (the windmill about 7 tiles tall, as before)


def sailish(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    cream = (r > 150) & (g > 135) & (b > 100) & (r - b < 80)
    wood = (r > 70) & (r - b > 35) & (r >= g) & (g > b)
    return cream | wood


# Line the other pictures up with the first on the door.
door = F[0][420:505, 290:350]
shift = [(0, 0)]
for f in F[1:]:
    best = None
    for dy in range(-40, 41):
        for dx in range(-40, 41, 1):
            c = f[420 + dy:505 + dy, 290 + dx:350 + dx]
            if c.shape != door.shape:
                continue
            e = np.abs(c - door).sum()
            if best is None or e < best[0]:
                best = (e, dx, dy)
    shift.append(best[1:])
print("shifts", shift)

yy, xx = np.mgrid[0:Q, 0:Q]
dx, dy = xx - HUB[0], yy - HUB[1]
dist = np.hypot(dx, dy)
# the X of the sails in the first picture: two diagonal bands through the hub
band = (np.minimum(np.abs(dx - dy), np.abs(dx + dy)) / np.sqrt(2) < 44) & (dist < REACH)
hub = dist < 15
sails = (band & sailish(F[0])) | hub

body = F[0].copy()
fill = sails & ~hub
for k in range(1, 4):
    sx, sy = shift[k]
    src = np.roll(np.roll(F[k], -sy, 0), -sx, 1)
    ok = fill & ~(sailish(src) & (dist < REACH + 20))
    body[ok] = src[ok]
    fill &= ~ok
# whatever no picture shows behind the sails: the hub's dark wood
body[hub] = (60, 44, 36)
bodyA = np.abs(body - BG).sum(2) > 30


def shrink(rgb, mask, cell):
    h, w = mask.shape
    H, W = int(h / cell), int(w / cell)
    out = np.zeros((H, W, 4), np.uint8)
    for j in range(H):
        for i in range(W):
            ya, yb = int(j * cell), int((j + 1) * cell)
            xa, xb = int(i * cell), int((i + 1) * cell)
            m = mask[ya:yb, xa:xb]
            if m.mean() < 0.5:
                continue
            out[j, i, :3] = np.median(rgb[ya:yb, xa:xb][m], 0)
            out[j, i, 3] = 255
    return out


def keep_big(mask):
    """Only the biggest connected piece (drops background specks)."""
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    if n <= 1:
        return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.03])


bodyA = keep_big(bodyA)
b = shrink(body, bodyA, CELL)
ys, xs = np.where(b[..., 3] > 0)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
bimg = tidy(b[y0:y1, x0:x1])  # tidy pads 1 pixel round
bimg.save("art/props/ow_windmill.png")
hubx = HUB[0] / CELL - x0 + 1
huby = HUB[1] / CELL - y0 + 1
print("body", bimg.size, "hub from bottom centre", round(hubx - bimg.width / 2, 1), round(huby - bimg.height, 1))

R = REACH + 6
P = np.pad(F[0], ((R, R), (R, R), (0, 0)))
M = np.pad(sails, ((R, R), (R, R)))
sq = slice(HUB[1], HUB[1] + 2 * R), slice(HUB[0], HUB[0] + 2 * R)
# One blade (the top right one, the cleanest) turned round four times, so the sails are even as they spin.
rgb, m = P[sq].copy(), M[sq].copy()
cy, cx = np.mgrid[0:2 * R, 0:2 * R] - R
blade = m & (cx > 11) & (cy < -11) & (np.abs(cx + cy) / np.sqrt(2) < 40)
hubm = np.hypot(cx, cy) < 15
rgb2 = np.zeros_like(rgb)
m2 = np.zeros_like(m)
for k in range(4):
    br, bm = np.rot90(rgb, k), np.rot90(blade, k)
    rgb2[bm] = br[bm]
    m2 |= bm
rgb2[hubm] = rgb[hubm]
m2 |= hubm
# the wooden arms from the hub out to each blade
arms = (np.minimum(np.abs(cx - cy), np.abs(cx + cy)) / np.sqrt(2) < 3.5) & (np.hypot(cx, cy) < 46) & ~hubm
rgb2[arms & ~m2] = (122, 78, 46)
m2 |= arms
m2 = keep_big(m2)
s = shrink(rgb2, m2, CELL)
simg = tidy(s)
simg.save("art/props/ow_windmill_sails.png")
print("sails", simg.size)
