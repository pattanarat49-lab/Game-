"""The Battle Royale heal shrine from the user's sheet (art/healshrine-sheet.png): pixelized, then a crisp
glowing cross redrawn on the altar. Writes art/props/healshrine.png (run embed-hero-art.mjs after)."""
import sys, numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from pixelize import cut, outline

img = cut("art/healshrine-sheet.png", (32, 145, 440, 495), cell=6, colors=28, outline=False, tol=40, bg=(14, 21, 27))
a = np.asarray(img).copy()
# the altar's centre: the middle of the greenest pixels
g = a[..., 1].astype(int) - a[..., 0].astype(int)
g[a[..., 3] == 0] = -999
ys, xs = np.where(g >= np.sort(g.ravel())[-12])
cy, cx = int(np.median(ys)), int(np.median(xs))
glow, core = (60, 200, 110, 255), (170, 255, 200, 255)
for d in range(-4, 5):
    for t in (-1, 0, 1):
        a[cy + d, cx + t] = glow
        a[cy + t, cx + d] = glow
for d in range(-3, 4):
    a[cy + d, cx] = core
    a[cy, cx + d] = core
Image.fromarray(a).save("art/props/healshrine.png")
print(img.size, (cx, cy))
