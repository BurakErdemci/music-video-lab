"""How much of each endpoint drawing is missing from the first/last morph image (a pop at the morph's end)."""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image

ROOT = 'C:/Users/burcu/Documents/klip-her-sabah'
spec = importlib.util.spec_from_file_location('mt', ROOT + '/video/scripts/make-tweens.py')
mt = importlib.util.module_from_spec(spec); spec.loader.exec_module(mt)
pairs = json.load(open(mt.PAIRS, encoding='utf-8'))

def arr(im):
    return np.asarray(im.convert('RGBA')).astype(np.int16)

def pop(c, s):
    # pixels of the drawing (opaque) that the morph image shows differently (colour) or not at all
    a = c[..., 3] > 128
    n = a.sum()
    diff = (np.abs(c[..., :3] - s[..., :3]).sum(-1) > 150) | (s[..., 3] < 128)
    return float((a & diff).sum()) / max(1, n)

rows = []
for p in pairs:
    key = p['key']
    f0 = os.path.join(mt.DST, f'{key}-0.webp'); f1 = os.path.join(mt.DST, f'{key}-{mt.STEPS-1}.webp')
    if not os.path.exists(f0):
        continue
    ca, cb, W, H, ox, a = mt.canvases(p)
    s0 = Image.open(f0); s1 = Image.open(f1)
    if s0.size != (W, H):
        s0 = s0.resize((W, H)); s1 = s1.resize((W, H))
    rows.append((pop(arr(ca), arr(s0)), pop(arr(cb), arr(s1)), key))

rows.sort(key=lambda r: -max(r[0], r[1]))
print(f'{len(rows)} morphs; start/end pop = share of the endpoint drawing missing or recoloured in the nearest morph image')
for r in rows[:40]:
    print(f'{r[0]:.3f} {r[1]:.3f} {r[2]}')
big = [r for r in rows if max(r[0], r[1]) > 0.08]
print('over 0.08:', len(big))
