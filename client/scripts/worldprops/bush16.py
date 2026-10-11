# Cuts the user's 16x16 tall-grass tiles (flower tiles left out) into client/src/bush16.data.ts.
from PIL import Image; import numpy as np, base64, sys
a=np.asarray(Image.open('bush.png').convert('RGB')).astype(int)
R=[(131,225),(239,331),(345,436),(452,543)]
C=[(34,126),(144,237),(255,346),(365,458),(475,567),(584,675),(693,784),(802,891),(910,1003),(1021,1112),(1131,1222)]
out=[]
for y0,y1 in R:
  for x0,x1 in C:
    reg=a[y0+2:y1-2,x0+2:x1-2]
    if ((reg[...,0]>170)&(reg[...,1]>170)).sum()>2: continue
    x0+=1;y0+=1;x1-=1;y1-=1
    t=np.zeros((16,16,3),int)
    for j in range(16):
      for i in range(16):
        ya=int(y0+(y1-y0)*(j+.2)/16); yb=max(int(y0+(y1-y0)*(j+.8)/16),ya+1)
        xa=int(x0+(x1-x0)*(i+.2)/16); xb=max(int(x0+(x1-x0)*(i+.8)/16),xa+1)
        t[j,i]=np.median(a[ya:yb,xa:xb].reshape(-1,3),0)
    out.append(t.astype(np.uint8))
t=np.stack(out); print(len(t),'tiles')
rng=np.random.default_rng(2); im=np.zeros((96,160,3),np.uint8)
for j in range(6):
  for i in range(10): im[j*16:j*16+16,i*16:i*16+16]=t[rng.integers(len(t))]
Image.fromarray(im).resize((640,384),Image.NEAREST).save('bushprev.png')
open(sys.argv[1],'w').write("// The user's 16x16 tall-grass tiles (flower tiles left out), RGB bytes, 16x16 each. Built by client/scripts/worldprops/bush16.py.\nexport const BUSH16 = { n: %d, d: \"%s\" };\n"%(len(t),base64.b64encode(t.tobytes()).decode()))
