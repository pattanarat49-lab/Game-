# Cuts the 16 portal frames from art/props/src/portal-sheet.png (run in client/); then halve each with
# PIL reduce(2), quantize to 96 colours, save as art/props/portal_N.png and run scripts/embed-hero-art.mjs.
import numpy as np
from PIL import Image
im=np.asarray(Image.open('art/props/src/portal-sheet.png').convert('RGB')).astype(float)
bg=np.array([21,32,53.])
H,W,_=im.shape
d=np.abs(im-bg).sum(2)
mask=d>60
# blank the number labels
lab=[]
for r in range(4):
  for c in range(4):
    y0,x0=int(r*W/4),int(c*W/4)
    # labels sit around (x0+30..90, y0+25..60) but rows drift; find text near top-left
    pass
cell=W/4
out=[]
for r in range(4):
  for c in range(4):
    y0,x0=int(r*cell),int(c*cell)
    sub=mask[y0:int(y0+cell),x0:int(x0+cell)].copy()
    sub[:, :0]=False
    ys,xs=np.nonzero(sub[:, :])
    bot=ys.max()
    rows=np.nonzero(sub[bot-8:bot+1].any(0))[0]
    cx=(rows.min()+rows.max())/2
    out.append((y0+bot, x0+cx))
print(out)
WIN_W,UP,DOWN=264,300,4
frames=[]
for i,(by,cx) in enumerate(out):
    x=int(round(cx-WIN_W/2)); y=int(by-UP)
    a=im[y:y+UP+DOWN, x:x+WIN_W].copy()
    # remove neighbouring labels: anything in the top-left corner where digits live
    # colour to alpha against bg
    diff=a-bg
    dd=np.abs(diff).sum(2)
    alpha=np.clip((dd-22)/90,0,1)
    alpha[:70,:70]=0
    al=np.maximum(alpha,1e-3)[...,None]
    rgb=np.clip(bg+diff/al,0,255)
    rgba=np.dstack([rgb,alpha*255]).astype(np.uint8)
    frames.append(rgba)
# erase label digits: they are white pixels in the top-left of each window, far from portal; detect connected white small blobs left of x<60 and y< label
for i,f in enumerate(frames):
    Image.fromarray(f).save(f'big_{i}.png')
