# Part-4 plates/inserts. Run from the repo root: python stil/canli/prep_p4_pl.py
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
HAM = os.path.join(HERE, 'ham')
OUT = os.path.join(ROOT, 'video', 'public', 'living', 'p4')
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p4-pl.json')
os.makedirs(OUT, exist_ok=True)
M = json.load(open(os.path.join(HERE, 'p4-pl-measured.json')))
CHOSEN = {'bus-door': 'p4-pl-bus-door', 'ins-foot': 'p4-pl-ins-foot', 'ins-fist': 'p4-pl-ins-fist', 'ins-face': 'p4-pl-ins-face-r1'}
meta = {}
for n, r in CHOSEN.items():
    p = os.path.join(HAM, r + '.png')
    if not os.path.exists(p):
        print('missing', r)
        continue
    im = Image.open(p).convert('RGBA')
    assert im.size == (1672, 941), im.size
    im.save(os.path.join(OUT, n + '.png'))
    meta[n] = {'w': im.width, 'h': im.height, **M[n]}
json.dump(meta, open(META, 'w'), indent=1)
print(sorted(meta))
