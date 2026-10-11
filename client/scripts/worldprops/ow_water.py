"""The new Open World's moving water (2026-10-11): built from the water tiles on the user's second sheet
(art/openworld/tileset-sheet2.png). Writes, into art/props/ (embedded like the other props):
  owwater_base.png   128x128 calm water that tiles seamlessly (the plain water tile's colours, in soft swirls)
  owwater_glint.png  256x256 the white wave lines off the streak / crescent tiles, on clear (scrolled on top)
  owripple.png       the ring off the ripple tile, on clear (rings spread on the water now and then)
Run from client/."""
import numpy as np
from PIL import Image

S = np.asarray(Image.open("art/openworld/tileset-sheet2.png").convert("RGB")).astype(int)
OX, OY = 728, 30  # the water panel
CELL = {"plain": (172, 455, 260, 545), "streak": (268, 366, 359, 449), "curtain": (460, 366, 575, 449), "crescent": (4, 455, 82, 545), "ripple": (365, 455, 452, 545)}


def cell(name, inset=5):
    x0, y0, x1, y1 = CELL[name]
    return S[OY + y0 + inset: OY + y1 - inset, OX + x0 + inset: OX + x1 - inset]


def pool(a, n, how):
    """Down to n x n art pixels: each art pixel from its patch of the sheet (median colour, or the brightest)."""
    h, w = a.shape[:2]
    out = np.zeros((n, n, 3), int)
    for j in range(n):
        for i in range(n):
            p = a[j * h // n:max((j + 1) * h // n, j * h // n + 1), i * w // n:max((i + 1) * w // n, i * w // n + 1)].reshape(-1, 3)
            out[j, i] = np.median(p, 0) if how == "median" else p[np.argmax(p[:, 1] + p[:, 2])]
    return out


# Calm water: the plain tile's colours from dark to light, laid out by a noise that repeats every 128 pixels.
plain = np.concatenate([pool(cell(n), 32, "median").reshape(-1, 3) for n in ("streak", "crescent", "ripple", "curtain")])
order = plain[np.argsort(plain[:, 1] + plain[:, 2])]
order = order[: int(len(order) * 0.8)]  # leave the white wave lines to the glint layer
N = 128
y, x = np.mgrid[0:N, 0:N] / N * 2 * np.pi
rng = np.random.default_rng(11)
noise = np.zeros((N, N))
for k in range(9):
    fx, fy = rng.integers(-4, 5, 2)
    if fx == 0 and fy == 0:
        fx = 1
    noise += np.sin(fx * x + fy * y + rng.random() * 6.3) / (1 + 0.15 * k)
noise += rng.random((N, N)) * 2.6  # speckle, like the tile
q = (noise - noise.min()) / (noise.max() - noise.min())
q = np.clip((q - 0.5) * 1.3 + 0.5, 0, 0.999)
base = order[(q * len(order)).astype(int)]
Image.fromarray(base.astype(np.uint8)).save("art/props/owwater_base.png")


def lines(name, n=32, hi=0.93, mid=0.85):
    a = pool(cell(name), n, "median")
    v = a[..., 1] + a[..., 2]
    hi, mid = np.quantile(v, hi), np.quantile(v, mid)
    out = np.zeros((n, n, 4), np.uint8)
    out[v > mid] = (130, 225, 240, 150)
    out[v > hi] = (235, 252, 255, 235)
    return out


stamps = [lines("streak"), lines("crescent")]
G = 256
glint = np.zeros((G, G, 4), np.uint8)
for k in range(15):
    s = stamps[k % len(stamps)]
    if rng.random() < 0.5:
        s = s[:, ::-1]
    if rng.random() < 0.5:
        s = s[::-1]
    ox, oy = rng.integers(0, G, 2)
    for j in range(s.shape[0]):
        for i in range(s.shape[1]):
            if s[j, i, 3] > glint[(oy + j) % G, (ox + i) % G, 3]:
                glint[(oy + j) % G, (ox + i) % G] = s[j, i]
Image.fromarray(glint).save("art/props/owwater_glint.png")

ring = lines("ripple", 32, 0.9, 0.8)
Image.fromarray(ring).save("art/props/owripple.png")

prev = Image.new("RGBA", (N * 2 + G, G), (0, 0, 0, 255))
prev.paste(Image.fromarray(np.tile(base, (2, 2, 1)).astype(np.uint8)).resize((N * 2, N * 2)), (0, 0))
bg = Image.fromarray(np.tile(base, (2, 2, 1)).astype(np.uint8)).convert("RGBA")
bg.alpha_composite(Image.fromarray(glint))
prev.paste(bg, (N * 2, 0))
prev.paste(Image.fromarray(ring).resize((96, 96), Image.NEAREST), (0, 160))
prev.resize((prev.width * 2, prev.height * 2), Image.NEAREST).save("/tmp/claude-0/-home-user-game-/8c3af6d0-41c5-5f77-9d52-cded3a1b588c/scratchpad/ow/waterprev.png")
