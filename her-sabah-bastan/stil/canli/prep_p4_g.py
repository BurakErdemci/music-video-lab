# Part-4 lane g (full-body palm-on-glass pair). Run from the repo root: python stil/canli/prep_p4_g.py
# Raw -> key -> trim -> (human: defringe as p4-h) -> video/public/living/p4/{h-palm-full,a-palm-full[-eye|-noeye]}.png
# + video/src/living/sprites-p4-g.json. Hand/head numbers come from p4-g-measured.json (RAW px, minus the trim origin).
import json
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, eye_rect, eye_rect_loose, outline, save, split_eye, meta, ROOT, HAM
OUT = OUT1 = os.path.join(ROOT, 'video', 'public', 'living', 'p4')
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p4-g.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
os.makedirs(OUT, exist_ok=True)
CHOSEN = {'h-palm-full': 'p4-g-h-palm-full', 'a-palm-full': 'p4-g-a-palm-full'}
M = json.load(open(os.path.join(HERE, 'p4-g-measured.json')))
NAVY, CREAM = (0x18, 0x20, 0x3A), (0xF3, 0xEF, 0xE4)


def defringe(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a >= 8 and r - g > 20 and b - g > 10:
                c = CREAM if (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 else NAVY
                px[x, y] = (c[0], c[1], c[2], a)
    return im


def obb(im, t=128):
    return im.split()[3].point(lambda v: 255 if v > t else 0).getbbox()


def floor_row(im):
    a = im.split()[3].load()
    for y in range(im.height - 1, -1, -1):
        if sum(1 for x in range(im.width) if a[x, y] > 128) >= 8:
            return y + 1
    return im.height


out = {}
for short, raw in CHOSEN.items():
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    sp = trim(im, box)[0]
    if short.startswith('h-'):
        sp = defringe(sp)
    ox, oy = box[0], box[1]
    m = M[short]
    h0, h1 = m['headRaw']
    extra = {'palm': [m['palmRaw'][0] - ox, m['palmRaw'][1] - oy], 'headTop': h0 - oy, 'headH': h1 - h0,
             'floorY': floor_row(sp)}
    bx = obb(sp)
    if short.startswith('h-'):
        extra['hair'] = {'x0': m['hair']['x0'] - ox, 'y0': m['hair']['y0'] - oy, 'x1': m['hair']['x1'] - ox, 'y1': m['hair']['y1'] - oy}
        extra['headPx'] = h1 - h0
        extra['glassX'] = bx[2] - 1  # palm's flat right edge = rightmost opaque column
    else:
        extra['glassX'] = bx[0]  # palm's flat left edge = leftmost opaque column
        try:
            rect = eye_rect(sp)
            loose = False
        except SystemExit:
            rect = eye_rect_loose(sp, 0.4)
            loose = True
        extra['eye'] = list(rect)
        split_eye(short, sp, rect, dark_only=loose)
        extra['outline'] = outline(sp)
    save(short, sp, extra)
    out[short] = (sp, extra)
with open(META, 'w') as f:
    json.dump(meta, f, indent=1)

for n, (sp, e) in out.items():
    t = Image.new('RGBA', sp.size, (150, 150, 150, 255))
    t.alpha_composite(sp)
    d = ImageDraw.Draw(t)
    px, py = e['palm']
    d.ellipse([px - 9, py - 9, px + 9, py + 9], outline=(255, 0, 0, 255), width=3)
    d.line([(e['glassX'], 0), (e['glassX'], t.height)], fill=(255, 128, 0, 255), width=2)
    d.line([(0, e['floorY'] - 1), (t.width, e['floorY'] - 1)], fill=(0, 255, 255, 255), width=2)
    d.line([(0, e['headTop']), (t.width, e['headTop'])], fill=(255, 0, 0, 255))
    d.line([(0, e['headTop'] + e['headH']), (t.width, e['headTop'] + e['headH'])], fill=(0, 255, 0, 255))
    t.convert('RGB').save(os.path.join(BO, 'p4-g-check-%s.png' % n))
    print(n, sp.size, {k: v for k, v in e.items() if k != 'outline'}, 'palm rel height', round((e['floorY'] - py) / (e['floorY'] - e['headTop']), 3))
