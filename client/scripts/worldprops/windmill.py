"""Draws the Open World windmill as pixel art in the user's colours, with its sails turning (12 frames per quarter turn)."""
import math, sys
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))  # run in client/: python3 scripts/worldprops/windmill.py art/props
from pixelize import outline
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
C = {k: H(v) for k, v in dict(
    roofL="6aa2e2", roof="4a7ec4", roofD="345c9c", roofLine="2c4c84",
    wall="ebdbcc", wallD="d6c2ae", joint="b8a690", door="714b45", doorD="4a3028", glass="3c5e9c",
    stone="a8a0a4", stoneD="7e7880", grass="5aa848", grassL="86c652",
    sail="faf1e6", lattice="e6d2b8", wood="d38b60", woodD="a8643c", hub="714b45", hubD="4a3028").items()}
W, Hh = 41, 50
HX, HY = 20, 17

def body():
    a = np.zeros((Hh, W, 4), np.uint8)
    def put(x, y, c):
        if 0 <= x < W and 0 <= y < Hh: a[y, x, :3] = C[c]; a[y, x, 3] = 255
    # tower: a stone cone, lit on the left
    for y in range(16, 43):
        hw = 7 + (y - 16) * 4 / 26
        for x in range(W):
            d = x - HX
            if abs(d) > hw: continue
            c = "wallD" if d > hw * 0.35 else "wall"
            row = (y - 16) // 4
            if (y - 16) % 4 == 3 or (x + row * 3) % 7 == 0 and (y - 16) % 4 != 3: c = "joint" if c == "wall" or (y - 16) % 4 == 3 else "joint"
            put(x, y, c)
    # window and door
    for y in range(25, 29):
        for x in range(19, 22): put(x, y, "glass" if y > 25 else "doorD")
    for y in range(35, 43):
        for x in range(17, 24):
            if y == 35 and x in (17, 23): continue
            put(x, y, "doorD" if x in (17, 23) or y == 35 else ("door" if x != 20 else "doorD"))
    # roof: a blue cone with shingle rows
    for y in range(5, 18):
        hw = (y - 5) * 0.85 + 0.5
        for x in range(W):
            d = x - HX
            if abs(d) > hw: continue
            c = "roofL" if d < -hw * 0.3 else "roofD" if d > hw * 0.4 else "roof"
            if (y - 5) % 3 == 2: c = "roofLine" if c != "roofL" else "roof"
            put(x, y, c)
    # stones and grass round the foot
    for y in range(41, 46):
        for x in range(W):
            e = ((x - HX) / 14.5) ** 2 + ((y - 43) / 2.6) ** 2
            if e > 1 or a[y, x, 3]: continue
            h = (x * 7 + y * 13) % 5
            put(x, y, "grass" if h < 2 else "grassL" if h == 2 else "stone" if (x + y) % 3 else "stoneD")
    return a

def sails(a, theta):
    a = a.copy()
    m = np.zeros((Hh, W), bool)  # where the sails are
    for y in range(Hh):
        for x in range(W):
            dx, dy = x + 0.5 - (HX + 0.5), y + 0.5 - (HY + 0.5)
            r = math.hypot(dx, dy)
            c = None
            for k in range(4):
                f = theta + k * math.pi / 2
                u = dx * math.cos(f) + dy * math.sin(f)
                v = -dx * math.sin(f) + dy * math.cos(f)
                if 4.5 <= u <= 16.5 and 0.7 < v <= 5.2:
                    edge = u < 5.5 or u > 15.5 or v > 4.2
                    c = "wood" if edge else ("lattice" if (u % 3.6) < 0.9 or abs(v - 2.9) < 0.5 else "sail")
                elif 1 <= u <= 17.2 and abs(v) <= 0.75:
                    c = c or ("woodD" if v > 0 else "wood")
            if r <= 2.2: c = "hubD" if r <= 1.1 else "hub"
            if c: a[y, x, :3] = C[c]; a[y, x, 3] = 255; m[y, x] = True
    # a dark line where the sails cross the tower, so they stand off the pale wall
    p = np.pad(m, 1)
    ring = ~m & (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & (a[..., 3] > 0)
    a[ring, :3] = (30, 26, 34)
    return a

b = body()
out = sys.argv[1]
N = 12
for i in range(N):
    im = outline(Image.fromarray(sails(b, math.radians(20 + i * 90 / N)), "RGBA"), dark=(30, 26, 34))
    im.save(f"{out}/windmill_{i}.png")
prev = Image.new("RGBA", ((W + 6) * N, Hh + 2), (134, 198, 82, 255))
for i in range(N): prev.alpha_composite(Image.open(f"{out}/windmill_{i}.png"), (i * (W + 6), 0))

