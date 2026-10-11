"""Cut one sprite from the user's sheet and redraw it as crisp pixel art: background flood-removed,
one colour per cell (the cell's most common colour), colours reduced, a dark outline closed round it."""
import sys, json, numpy as np
from PIL import Image
from collections import deque, Counter

def cut(src, box, cell=3.0, colors=14, outline=True, tol=46, bg=None):
    im = np.asarray(Image.open(src).convert("RGB")).astype(int)
    x0, y0, x1, y1 = box
    a = im[y0 - 2:y1 + 2, x0 - 2:x1 + 2]
    h, w, _ = a.shape
    bg = np.array(bg if bg is not None else a[0, 0])  # the sheet's background (the box corner)
    sat = a.max(2) - a.min(2)
    near = np.abs(a - bg).sum(2) <= tol
    if bg.sum() > 600: near |= (sat < 18) & (a.sum(2) > 590)  # a light sheet's soft grey shadow
    seen = np.zeros((h, w), bool)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not near[y, x]: continue
        seen[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    fg = ~seen
    # keep only the blobs that reach the middle of the box (drops labels and neighbours caught in it)
    lab = np.zeros((h, w), int)
    n = 0
    keep = np.zeros((h, w), bool)
    for sy, sx in zip(*np.where(fg)):
        if lab[sy, sx]: continue
        n += 1
        lab[sy, sx] = n
        q, pts = [(sy, sx)], []
        while q:
            y, x = q.pop()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and fg[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        q.append((yy, xx))
        if any(h * 0.25 < y < h * 0.75 and w * 0.3 < x < w * 0.7 for y, x in pts) or len(pts) > 0.2 * fg.sum():
            for y, x in pts: keep[y, x] = True
    fg = keep
    ys, xs = np.where(fg)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    fg = fg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = fg.shape
    W, H = max(1, round(w / cell)), max(1, round(h / cell))
    out = np.zeros((H, W, 4), np.uint8)
    for j in range(H):
        for i in range(W):
            ya, yb = int(j * h / H), int((j + 1) * h / H)
            xa, xb = int(i * w / W), int((i + 1) * w / W)
            m = fg[ya:yb, xa:xb]
            if m.size == 0 or m.mean() < 0.5: continue
            px = a[ya:yb, xa:xb][m]
            # the cell's colour: median of its middle pixels (edges blur into neighbours)
            mid = a[ya + (yb - ya) // 2, xa + (xb - xa) // 2]
            out[j, i, :3] = np.median(px, axis=0) * 0.5 + mid * 0.5
            out[j, i, 3] = 255
    img = Image.fromarray(out, "RGBA")
    rgb = img.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    q = np.asarray(rgb).copy()
    res = np.zeros((H, W, 4), np.uint8)
    res[..., :3] = q
    res[..., 3] = out[..., 3]
    if outline:
        al = res[..., 3] > 0
        dark = np.array([34, 30, 36])
        pad = np.pad(al, 1)
        ring = (~al) & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
        # only where the edge isn't dark already
        lum = res[..., :3].astype(int).sum(2)
        for y, x in zip(*np.where(ring)):
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < H and 0 <= x + dx < W and al[y + dy, x + dx]]
            if all(lum[p] > 200 for p in nb):
                pass
        # grow the canvas by one so the outline fits
        big = np.zeros((H + 2, W + 2, 4), np.uint8)
        big[1:-1, 1:-1] = res
        al2 = big[..., 3] > 0
        p2 = np.pad(al2, 1)
        ring2 = (~al2) & (p2[:-2, 1:-1] | p2[2:, 1:-1] | p2[1:-1, :-2] | p2[1:-1, 2:])
        big[ring2, :3] = dark
        big[ring2, 3] = 255
        res = big
    return Image.fromarray(res, "RGBA")

def outline(img, dark=(30, 26, 34)):
    """A one-pixel dark outline all round the sprite (the canvas grows by one pixel each side)."""
    a = np.asarray(img.convert("RGBA"))
    big = np.zeros((a.shape[0] + 2, a.shape[1] + 2, 4), np.uint8)
    big[1:-1, 1:-1] = a
    al = big[..., 3] > 0
    p = np.pad(al, 1)
    ring = (~al) & (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:])
    big[ring, :3] = dark
    big[ring, 3] = 255
    return Image.fromarray(big, "RGBA")

if __name__ == "__main__":
    src, boxes, outdir, prefix = sys.argv[1], json.loads(sys.argv[2]), sys.argv[3], sys.argv[4]
    cell = float(sys.argv[5]) if len(sys.argv) > 5 else 3.0
    for i, b in enumerate(boxes):
        im = cut(src, b, cell)
        im.save(f"{outdir}/{prefix}{i}.png")
