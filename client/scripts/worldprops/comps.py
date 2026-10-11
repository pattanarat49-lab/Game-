import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(int)[y0:y1, x0:x1]
bg = np.array([250, 245, 240])
fg = np.abs(a - bg).sum(2) > 40
fg = ndimage.binary_dilation(fg, iterations=2)
lab, n = ndimage.label(fg)
boxes = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    ys, xs = sl
    w, h = xs.stop - xs.start, ys.stop - ys.start
    if w * h < 150: continue
    boxes.append([xs.start + x0, ys.start + y0, xs.stop + x0, ys.stop + y0])
boxes.sort(key=lambda b: (round(b[1] / 40), b[0]))
vis = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.NEAREST)
d = ImageDraw.Draw(vis)
for i, b in enumerate(boxes):
    d.rectangle([(b[0] - x0) * 2, (b[1] - y0) * 2, (b[2] - x0) * 2, (b[3] - y0) * 2], outline=(255, 0, 0))
    d.text(((b[0] - x0) * 2 + 2, (b[1] - y0) * 2 + 2), str(i), fill=(0, 0, 255))
vis.save(out)
print(json.dumps(boxes))
