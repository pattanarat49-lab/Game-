# Cuts the user's 16x16 sand and water tiles (plain ones only) into client/src/beach16.data.ts.
from PIL import Image; import numpy as np, base64, sys
def cut(f, boxes):
    a=np.asarray(Image.open(f).convert('RGB')).astype(int); out=[]
    for (x0,x1),(y0,y1) in boxes:
        x0+=1;y0+=1;x1-=1;y1-=1
        t=np.zeros((16,16,3),int)
        for j in range(16):
            for i in range(16):
                ya=int(y0+(y1-y0)*(j+.25)/16); yb=max(int(y0+(y1-y0)*(j+.75)/16),ya+1)
                xa=int(x0+(x1-x0)*(i+.25)/16); xb=max(int(x0+(x1-x0)*(i+.75)/16),xa+1)
                t[j,i]=np.median(a[ya:yb,xa:xb].reshape(-1,3),0)
        t[0]=t[1];t[15]=t[14];t[:,0]=t[:,1];t[:,15]=t[:,14]
        out.append(t.astype(np.uint8))
    return np.stack(out)
SC=[(44,157),(178,290),(311,423),(442,554),(572,683),(703,814),(834,945)]
sand=cut('sand.png',[(c,(107,219)) for c in SC]+[((178,290),(236,348))])
WC=[(36,137),(155,256),(275,376),(396,497),(516,617),(637,738),(757,858),(878,979),(997,1099),(1118,1219)]
water=cut('water.png',[(c,(109,208)) for c in WC])
prev=np.concatenate([np.concatenate(list(sand),1),np.concatenate(list(water[:8]),1)],0)
Image.fromarray(prev).resize((prev.shape[1]*4,prev.shape[0]*4),Image.NEAREST).save('beach.png')
b=lambda t: base64.b64encode(t.tobytes()).decode()
open(sys.argv[1],'w').write("// The user's 16x16 sand and water tiles (plain ones), RGB bytes, 16x16 each. Built by client/scripts/worldprops/beach16.py.\nexport const SAND16 = { n: %d, d: \"%s\" };\nexport const WATER16 = { n: %d, d: \"%s\" };\n"%(len(sand),b(sand),len(water),b(water)))
