import importlib.util, json, os
from PIL import Image
ROOT='C:/Users/burcu/Documents/klip-her-sabah'
spec=importlib.util.spec_from_file_location('mt',ROOT+'/video/scripts/make-tweens.py');mt=importlib.util.module_from_spec(spec);spec.loader.exec_module(mt)
pairs={p['key']:p for p in json.load(open(mt.PAIRS,encoding='utf-8'))}
keys=['A15.1_A22.3_-18','H26.1m_H26.2m_-57','A18.1_A18.2_10','H28.2_H28.3_159']
tiles=[]
for k in keys:
    ca,cb,W,H,ox,a=mt.canvases(pairs[k])
    s0=Image.open(f'{mt.DST}/{k}-0.webp').resize((W,H));s1=Image.open(f'{mt.DST}/{k}-14.webp').resize((W,H))
    for im in (ca,s0,s1,cb):
        bg=Image.new('RGBA',(W,H),(150,150,150,255));bg.alpha_composite(im.convert('RGBA'));tiles.append(bg.resize((int(W*300/H),300)))
w=max(t.width for t in tiles);sheet=Image.new('RGB',(w*4,300*len(keys)),'white')
for i,t in enumerate(tiles):sheet.paste(t,((i%4)*w,(i//4)*300))
sheet.save('endsheet.png')
