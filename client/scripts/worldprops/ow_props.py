"""The new Open World's props (2026-10-11) from the user's 32x32 tileset sheet (art/openworld/tileset-sheet.png):
each one pixelized back to 1 art pixel per sheet cell (~4 px) and saved as art/props/ow_<name>.png.
Run from client/, then `node scripts/embed-hero-art.mjs`."""
import glob, sys, numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from collections import deque

SEP = np.array([27, 41, 51])  # the sheet's dark lines between panels


def cut(src, box, cell=1.0, colors=32, tol=46, sep=34, **_):
    """Cut one thing off its panel: the panel colour (the commonest colour round the box edge) and the sheet's
    dark lines are flooded away from the edges, then one colour per cell, colours reduced."""
    im = np.asarray(Image.open(src).convert("RGB")).astype(int)
    x0, y0, x1, y1 = box
    a = im[y0:y1, x0:x1]
    h, w, _ = a.shape
    ring = np.concatenate([a[:3].reshape(-1, 3), a[-3:].reshape(-1, 3), a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
    ring = ring[np.abs(ring - SEP).sum(1) > 30]
    panel = np.median(ring, 0) if len(ring) else SEP
    near = (np.abs(a - panel).sum(2) <= tol) | (np.abs(a - SEP).sum(2) <= sep)
    seen = np.zeros((h, w), bool)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not near[y, x]:
            continue
        seen[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    fg = ~seen
    # keep the big pieces (drops specks of panel texture)
    lab = np.zeros((h, w), int)
    sizes = [0]
    for sy, sx in zip(*np.where(fg)):
        if lab[sy, sx]:
            continue
        n = len(sizes)
        lab[sy, sx] = n
        st, cnt = [(sy, sx)], 0
        while st:
            y, x = st.pop()
            cnt += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and fg[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    st.append((yy, xx))
        sizes.append(cnt)
    big = max(sizes)
    keepIds = [i for i, c in enumerate(sizes) if i and c >= big * 0.04]
    fg = np.isin(lab, keepIds)
    ys, xs = np.where(fg)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    fg = fg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = fg.shape
    W, H = max(1, round(w / cell)), max(1, round(h / cell))
    out = np.zeros((H, W, 4), np.uint8)
    for j in range(H):
        for i in range(W):
            ya, yb = int(j * h / H), max(int((j + 1) * h / H), int(j * h / H) + 1)
            xa, xb = int(i * w / W), max(int((i + 1) * w / W), int(i * w / W) + 1)
            m = fg[ya:yb, xa:xb]
            if m.mean() < 0.5:
                continue
            px = a[ya:yb, xa:xb][m]
            mid = a[ya + (yb - ya) // 2, xa + (xb - xa) // 2]
            out[j, i, :3] = np.median(px, axis=0) * 0.5 + mid * 0.5
            out[j, i, 3] = 255
    rgb = Image.fromarray(out[..., :3]).quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    res = np.zeros((H, W, 4), np.uint8)
    res[..., :3] = np.asarray(rgb)
    res[..., 3] = out[..., 3]
    return tidy(res)


def tidy(res):
    """Close the edges (2026-10-11, user: the buildings and sheep looked chipped): fill see-through holes
    inside the shape, drop lone stray pixels, and draw a 1-pixel dark outline round the whole thing."""
    a = np.pad(res, ((1, 1), (1, 1), (0, 0)))
    h, w = a.shape[:2]
    solid = a[..., 3] > 0
    # see-through pixels not reachable from the border are holes: fill them from their neighbours
    out = np.zeros((h, w), bool)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or out[y, x] or solid[y, x]:
            continue
        out[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    holes = ~out & ~solid
    for _ in range(8):
        ys, xs = np.where(holes)
        if not len(ys):
            break
        for y, x in zip(ys, xs):
            nb = [a[yy, xx, :3] for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)) if 0 <= yy < h and 0 <= xx < w and a[yy, xx, 3] > 0]
            if nb:
                a[y, x, :3] = np.median(nb, 0)
                a[y, x, 3] = 255
                holes[y, x] = False
    solid = a[..., 3] > 0
    # lone pixels sticking out (fewer than 2 solid neighbours) go
    n4 = np.zeros((h, w), int)
    n4[1:] += solid[:-1]; n4[:-1] += solid[1:]; n4[:, 1:] += solid[:, :-1]; n4[:, :-1] += solid[:, 1:]
    a[solid & (n4 < 2), 3] = 0
    solid = a[..., 3] > 0
    # the outline: every see-through pixel touching the shape, a very dark shade of what it touches
    edge = np.zeros((h, w), bool)
    edge[1:] |= solid[:-1]; edge[:-1] |= solid[1:]; edge[:, 1:] |= solid[:, :-1]; edge[:, :-1] |= solid[:, 1:]
    edge &= ~solid
    for y, x in zip(*np.where(edge)):
        nb = [a[yy, xx, :3].astype(int) for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)) if 0 <= yy < h and 0 <= xx < w and solid[yy, xx]]
        c = np.mean(nb, 0) * 0.3 + np.array([14, 12, 18]) * 0.7
        a[y, x, :3] = c
        a[y, x, 3] = 255
    return Image.fromarray(a.astype(np.uint8), "RGBA")

SHEET = "art/openworld/tileset-sheet.png"
CELL = 4.05
B = {
    "grass_a": (6, 518, 119, 607), "grass_b": (125, 518, 197, 607), "flower_pink": (197, 518, 269, 609), "clover": (273, 518, 347, 608),
    "flower_white": (349, 518, 424, 608), "flower_cream": (426, 518, 493, 607), "flower_yellow": (495, 518, 570, 607),
    "reeds_a": (574, 518, 640, 608), "reeds_b": (642, 518, 711, 608), "flower_gold": (713, 518, 780, 607), "clover_b": (780, 518, 835, 607),
    "oak_a": (842, 515, 952, 676), "oak_b": (960, 515, 1066, 676), "oak_c": (1071, 515, 1181, 676), "pine": (1185, 513, 1310, 676),
    "stump_a": (858, 676, 940, 757), "mosslog": (962, 676, 1065, 757), "stump_b": (1080, 676, 1170, 757), "stump_c": (1195, 680, 1300, 757),
    "bush_a": (5, 611, 113, 717), "bush_big": (118, 608, 254, 718), "bush_b": (259, 610, 358, 717), "bush_rose": (363, 611, 469, 717),
    "bush_c": (472, 611, 578, 717), "bush_white": (584, 610, 677, 717), "bush_d": (682, 611, 755, 717), "clovers": (760, 611, 834, 717),
    "rock_a": (6, 722, 91, 795), "rock_b": (95, 722, 164, 795), "boulder": (167, 759, 262, 866), "rocks": (253, 721, 343, 794),
    "clover_c": (347, 721, 422, 796), "flowers_b": (427, 721, 524, 796), "rock_c": (526, 721, 621, 796), "branch": (625, 721, 686, 796),
    "mushroom": (690, 720, 758, 796), "grass_c": (763, 720, 838, 797), "flower_d": (6, 799, 80, 865), "stickrock": (86, 799, 164, 866),
    "log": (267, 795, 348, 865), "twigs": (356, 798, 429, 865), "flowers_c": (435, 798, 513, 866), "frame": (519, 796, 586, 866),
    "flowers_d": (586, 798, 653, 866), "bush_e": (659, 800, 712, 865), "flowers_e": (717, 801, 772, 865), "crate_a": (777, 797, 846, 862),
    "deadbush": (841, 762, 905, 858), "firewood": (908, 762, 986, 858), "signbarrel": (991, 762, 1068, 859), "post": (1074, 762, 1151, 859),
    "plank": (1157, 762, 1223, 858), "scarecrow": (1230, 762, 1304, 860),
    "fence_a": (6, 868, 123, 952), "fence_b": (129, 868, 239, 952), "fence_c": (246, 868, 336, 952), "fence_d": (342, 868, 415, 952),
    "lantern": (419, 867, 512, 952), "well_a": (520, 871, 644, 951), "cart_a": (650, 869, 777, 949), "sack": (782, 868, 848, 948),
    "haycart": (851, 860, 943, 949), "cart_b": (945, 860, 1072, 950), "sapling": (1074, 863, 1151, 944), "banner": (1158, 863, 1236, 988),
    "lampbanner": (1240, 864, 1304, 983), "fence_e": (6, 956, 106, 1048), "fence_f": (114, 956, 214, 1048), "fence_g": (218, 956, 319, 1048),
    "fence_h": (319, 956, 414, 1049), "fern": (419, 956, 520, 1048), "pillar": (524, 956, 584, 1048), "gate": (588, 953, 672, 1048),
    "well_b": (688, 953, 796, 1048), "crate_b": (799, 955, 880, 1045), "signboard": (884, 953, 968, 1045),
    "wall": (970, 948, 1152, 1048), "bridge": (598, 1050, 968, 1185), "woodbridge": (1000, 1052, 1122, 1185), "cave": (1124, 985, 1310, 1185),
    "sheep_a": (14, 1060, 119, 1166), "sheep_b": (127, 1057, 228, 1166), "sheep_c": (236, 1064, 341, 1173), "sheep_d": (348, 1094, 434, 1175),
    "sheep_e": (442, 1077, 506, 1159), "sheep_f": (510, 1116, 585, 1182),
}

# How big each one stands in the world, in art pixels (a ground tile is 32): "h" = height, "w" = width.
# The sheet draws things at mixed sizes (a sheep nearly as tall as a tree), so each gets its own size.
SIZE = {
    "oak_a": ("h", 96), "oak_b": ("h", 92), "oak_c": ("h", 100), "pine": ("h", 108),
    "stump_a": ("w", 30), "stump_b": ("w", 30), "stump_c": ("w", 34), "mosslog": ("w", 44),
    "bush_a": ("w", 44), "bush_big": ("w", 60), "bush_b": ("w", 42), "bush_rose": ("w", 44), "bush_c": ("w", 44),
    "bush_white": ("w", 40), "bush_d": ("w", 32), "bush_e": ("w", 22), "fern": ("w", 38),
    "rock_a": ("w", 30), "rock_b": ("w", 20), "boulder": ("w", 46), "rocks": ("w", 32), "rock_c": ("w", 34), "stickrock": ("w", 26),
    "branch": ("w", 18), "mushroom": ("h", 14), "log": ("w", 38), "twigs": ("w", 22), "deadbush": ("h", 34), "firewood": ("w", 30),
    "crate_a": ("h", 24), "crate_b": ("h", 26), "signbarrel": ("h", 38), "post": ("h", 36), "plank": ("h", 30), "scarecrow": ("h", 54),
    "fence_a": ("h", 30), "fence_b": ("h", 30), "fence_c": ("h", 32), "fence_d": ("h", 34), "fence_e": ("h", 32), "fence_f": ("h", 32),
    "fence_g": ("h", 32), "fence_h": ("h", 34), "frame": ("h", 26), "gate": ("h", 40), "pillar": ("h", 40),
    "lantern": ("h", 64), "lampbanner": ("h", 62), "banner": ("h", 74), "signboard": ("h", 36), "sapling": ("h", 26), "sack": ("h", 20),
    "well_a": ("w", 50), "well_b": ("w", 46), "cart_a": ("w", 64), "cart_b": ("w", 64), "haycart": ("w", 54),
    "wall": ("w", 96), "bridge": ("w", 168), "woodbridge": ("w", 72), "cave": ("w", 108),
    "sheep_a": ("w", 34), "sheep_b": ("w", 34), "sheep_c": ("w", 34), "sheep_d": ("w", 28), "sheep_e": ("w", 22), "sheep_f": ("w", 24),
}

if __name__ == "__main__":
    src = np.asarray(Image.open(SHEET).convert("RGB")).astype(int)
    for name, (x0, y0, x1, y1) in B.items():
        bg = tuple(int(v) for v in src[y0 + 3, x0 + 3])
        box = (x0 + 2, y0 + 2, x1 - 2, y1 - 2)
        full = cut(SHEET, box, cell=1.0, colors=64)  # the size of the thing itself
        side, want = SIZE.get(name, ("h", 18))  # flowers and grass tufts: about half a tile
        cell = (full.height if side == "h" else full.width) / want
        img = cut(SHEET, box, cell=cell, colors=32)
        img.save(f"art/props/ow_{name}.png")
        print(name, img.size)

# Fences (2026-10-11): the teal panel shows through the gaps between the rails, so clear it there too.
for f in glob.glob("art/props/ow_fence_*.png") + ["art/props/ow_gate.png", "art/props/ow_frame.png"]:
    a = np.asarray(Image.open(f).convert("RGBA")).copy()
    r, g, b = (a[..., i].astype(int) for i in range(3))
    teal = (g > r + 12) & (b > r + 12) & (g + b < 220)
    a[teal, 3] = 0
    Image.fromarray(a).save(f)
