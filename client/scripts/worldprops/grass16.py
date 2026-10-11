from PIL import Image; import numpy as np, json, sys
a=np.asarray(Image.open('sheet.png').convert('RGB')).astype(int)
X=[(871,945),(956,1025),(1034,1103),(1112,1181),(1190,1259),(1269,1337),(1347,1416),(1425,1497)]
Y=[(114,191),(202,273),(283,356),(366,438),(448,522),(533,605),(615,689)]
keep=[];rej=[]
for ri,(y0,y1) in enumerate(Y):
  for ci,(x0,x1) in enumerate(X):
    t=np.zeros((16,16,3),int); bad=0
    for j in range(16):
      for i in range(16):
        ya=y0+(y1-y0)*(j+.25)/16; yb=y0+(y1-y0)*(j+.75)/16
        xa=x0+(x1-x0)*(i+.25)/16; xb=x0+(x1-x0)*(i+.75)/16
        c=a[int(ya):max(int(yb),int(ya)+1), int(xa):max(int(xb),int(xa)+1)].reshape(-1,3)
        t[j,i]=np.median(c,0)
    r,g,b=t[...,0],t[...,1],t[...,2]
    flower=((r>170)&(g>150))|((r>150)&(g>140)&(b<90)&(r>g-40))  # white or yellow
    rock=(abs(r-g)<25)&(abs(g-b)<25)&(g>60)
    # also check raw region for flowers (small ones)
    reg=a[y0+3:y1-3,x0+3:x1-3]
    fl=((reg[...,0]>190)&(reg[...,1]>170)).sum()+((reg[...,0]>180)&(reg[...,1]>150)&(reg[...,2]<100)).sum()
    gr=((abs(reg[...,0]-reg[...,1])<25)&(abs(reg[...,1]-reg[...,2])<25)&(reg[...,1]>60)).sum()
    name=f'{ri}_{ci}'
    if fl>3 or gr>10 or flower.any() or rock.any(): rej.append((name,int(fl),int(gr))); continue
    keep.append((name,t.astype(np.uint8)))
print(len(keep),'kept', [k for k,_ in keep]); print('rejected',rej)
big=Image.new('RGB',(len(keep)*17*4,16*4),(0,0,0))
for n,(k,t) in enumerate(keep): big.paste(Image.fromarray(t).resize((64,64),Image.NEAREST),(n*68,0))
big.save('kept.png')
np.save('tiles.npy',np.stack([t for _,t in keep]))
