"""Sharpen a pixelized sprite: fewer colours, lone specks folded into their neighbours, clean outline."""
import numpy as np
from collections import Counter

def clean(img, colors=7, passes=2):
    from PIL import Image
    a = np.asarray(img.convert("RGBA")).copy()
    al = a[..., 3] > 0
    H, W = al.shape
    rgb = Image.fromarray(a[..., :3])
    q = np.asarray(rgb.quantize(colors=colors, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE).convert("RGB")).copy()
    q[~al] = 0
    for _ in range(passes):
        out = q.copy()
        for y in range(H):
            for x in range(W):
                if not al[y, x]: continue
                nb = [tuple(q[y + dy, x + dx]) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and al[y + dy, x + dx]]
                me = tuple(q[y, x])
                same = sum(1 for n in nb if n == me)
                if same <= 1 and nb:
                    out[y, x] = Counter(nb).most_common(1)[0][0]
        q = out
    res = np.zeros_like(a)
    res[..., :3] = q
    res[..., 3] = np.where(al, 255, 0)
    return Image.fromarray(res, "RGBA")
