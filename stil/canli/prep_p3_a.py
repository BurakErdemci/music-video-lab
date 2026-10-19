# Part-3 lane a sprites (AI poses). Reuses prep_p1.py helpers like prep_p1v2.py. Run from the repo root: python stil/canli/prep_p3_a.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, eye_rect, outline, save, split_eye, OUT1, meta
exec(compile('def head_h' + P1SRC.split('def head_h')[1].split('\nSTAND =')[0], 'prep_p1.py', 'exec'))
OUT1 = os.path.join(ROOT, 'video', 'public', 'living', 'p3')
os.makedirs(OUT1, exist_ok=True)
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p3-a.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
LIV = os.path.join(ROOT, 'video', 'public', 'living')
POZ = os.path.join(ROOT, 'stil', 'pozlar')
CHOSEN = {'a-walk': 'p3-a-walk', 'a-palm': 'p3-a-palm', 'a-reach': 'p3-a-reach', 'a-finger': 'p3-a-finger-r1b', 'a-tower': 'p3-a-tower'}
M = json.load(open(os.path.join(HERE, 'p3-a-measured.json')))
WAIST = ('a-walk', 'a-palm')
sprites, origin, HH = {}, {}, {}
for short, raw in CHOSEN.items():
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    sp = trim(im, box)[0]
    sprites[short] = sp
    ox, oy = box[0], box[1]
    origin[short] = (ox, oy)
    extra = {}
    for k, v in M['raw'][short].items():
        if k in ('floorY',):
            extra[k] = v - oy
        elif k == 'glassX':
            extra[k] = v - ox
        elif len(v) == 4:
            extra[k] = [v[0] - ox, v[1] - oy, v[2], v[3]]
        else:
            extra[k] = [v[0] - ox, v[1] - oy]
    if short in WAIST:
        extra['cutY'] = sp.height  # body is cut by the bottom edge of the raw image; the sprite ends there
    h0, h1 = M['headRaw'][short]
    extra['headTop'] = h0 - oy
    extra['headH'] = h1 - h0
    HH[short] = h1 - h0
    try:
        rect = eye_rect(sp)
    except SystemExit:
        rect = None
    if rect:
        extra['eye'] = list(rect)
        split_eye(short, sp, rect)
    else:
        sp.save(os.path.join(OUT1, short + '-noeye.png'))
        Image.new('RGBA', (1, 1), (0, 0, 0, 0)).save(os.path.join(OUT1, short + '-eye.png'))
        print('NOTE', short, 'no eye found')
    extra['outline'] = outline(sp)
    save(short, sp, extra)
with open(META, 'w') as f:
    json.dump(meta, f, indent=1)
json.dump({k: {'origin': v, 'headH': HH[k]} for k, v in origin.items()}, open(os.path.join(HERE, 'p3-a-origin.json'), 'w'))


def trimmed_ref(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


def opaque_bbox(im):
    return im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()


figs = dict(sprites)
figs['ref-a'] = trimmed_ref(os.path.join(POZ, 'ref-ai.png'))
figs['ai-stand'] = Image.open(os.path.join(LIV, 'ai-stand.png')).convert('RGBA')
for n in ('ref-a', 'ai-stand'):
    HH[n] = head_h(figs[n])
    print('HEAD', n, HH[n])
for n in sprites:
    print('HEAD', n, HH[n], 'sprite', sprites[n].size)
fnt = ImageFont.truetype('arial.ttf', 18)
H = 200
items = []
for n in ['ref-a', 'ai-stand', 'a-walk', 'a-palm', 'a-reach', 'a-finger', 'a-tower']:
    sc = H / HH[n]
    im = figs[n]
    items.append((n, im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS), HH[n]))
Wd = sum(i.width + 30 for _, i, _ in items) + 30
Ht = max(i.height for _, i, _ in items) + 120
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
d = ImageDraw.Draw(b)
x = 30
for n, i, _ in items:
    top = opaque_bbox(i)[1]
    b.alpha_composite(i, (x, 60 - top))
    d.text((x, 6), n, fill=(0, 0, 0, 255), font=fnt)
    x += i.width + 30
d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
b.convert('RGB').save(os.path.join(BO, 'p3-a-same-head.png'))

# points board: measured points drawn on each sprite
tiles = []
for n, sp in sprites.items():
    t = Image.new('RGBA', sp.size, (150, 150, 150, 255))
    t.alpha_composite(sp)
    dd = ImageDraw.Draw(t)
    for k, v in meta[n].items():
        if k in ('w', 'h', 'bbox', 'eye', 'outline', 'headTop', 'headH'):
            continue
        if k in ('floorY', 'cutY'):
            dd.line([(0, v - 1), (t.width, v - 1)], fill=(255, 0, 0, 255), width=2)
        elif k == 'glassX':
            dd.line([(v, 0), (v, t.height)], fill=(0, 255, 255, 255), width=2)
        elif len(v) == 4:
            dd.rectangle([v[0], v[1], v[0] + v[2], v[1] + v[3]], outline=(0, 160, 255, 255), width=3)
        else:
            dd.ellipse([v[0] - 7, v[1] - 7, v[0] + 7, v[1] + 7], outline=(255, 0, 0, 255), width=3)
    dd.line([(0, meta[n]['headTop']), (t.width, meta[n]['headTop'])], fill=(255, 0, 0, 255))
    dd.line([(0, meta[n]['headTop'] + meta[n]['headH']), (t.width, meta[n]['headTop'] + meta[n]['headH'])], fill=(0, 255, 255, 255))
    t.convert('RGB').save(os.path.join(BO, 'p3-a-points-' + n + '.png'))
