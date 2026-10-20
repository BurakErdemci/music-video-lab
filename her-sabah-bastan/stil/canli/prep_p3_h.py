# Part-3 lane h (human poses). Run from repo root: python stil/canli/prep_p3_h.py
# Reads stil/canli/p3-h-measured.json (hand-measured points, sprite px). Output video/public/living/p3/ + video/src/living/sprites-p3-h.json
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, save, ROOT, HAM, OUT1, meta ...
exec(compile('def head_h' + P1SRC.split('def head_h')[1].split('\nSTAND =')[0], 'prep_p1.py', 'exec'))
OUT1 = os.path.join(ROOT, 'video', 'public', 'living', 'p3')
os.makedirs(OUT1, exist_ok=True)
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p3-h.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
POZ = os.path.join(ROOT, 'stil', 'pozlar')
CHOSEN = {'h-walk': 'p3-h-walk', 'h-palm': 'p3-h-palm', 'h-lean': 'p3-h-lean', 'h-head': 'p3-h-head',
          'h-kneel': 'p3-h-kneel', 'h-freeze': 'p3-h-freeze-r2'}
MFILE = os.path.join(HERE, 'p3-h-measured.json')
MEASURED = json.load(open(MFILE)) if os.path.exists(MFILE) else {}


def sprite3(raw):
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    return trim(im, box)[0]


sprites = {}
for short, raw in CHOSEN.items():
    sp = sprite3(raw)
    sprites[short] = sp
    save(short, sp, dict(MEASURED.get(short, {}).get('points', {})))
with open(META, 'w') as f:
    json.dump(meta, f, indent=1)


def opaque_bbox(im):
    return im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()


def trimmed_ref(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


ref = trimmed_ref(os.path.join(POZ, 'ref-insan.png'))
figs = {'ref-h': ref, **sprites}
HH = MEASURED.get('headHeight', {})  # by eye on zoomed crops (top of hair to chin), sprite px
if not HH:
    raise SystemExit('no headHeight measured yet: sprites written, boards skipped')
HH['ref-h'] = head_h(ref)


def fnt():
    try:
        return ImageFont.truetype('arial.ttf', 18)
    except Exception:
        return None


H = 200
items = []
for n in ['ref-h', 'h-walk', 'h-palm', 'h-lean', 'h-head', 'h-kneel', 'h-freeze']:
    sc = H / HH[n]
    im = figs[n]
    items.append((n, im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)))
Wd = sum(i.width + 30 for _, i in items) + 30
Ht = max(i.height for _, i in items) + 120
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
d = ImageDraw.Draw(b)
x = 30
for n, i in items:
    b.alpha_composite(i, (x, 60 - opaque_bbox(i)[1]))
    d.text((x, 6), n, fill=(0, 0, 0, 255), font=fnt())
    x += i.width + 30
d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
b.convert('RGB').save(os.path.join(BO, 'p3-h-same-head.png'))

# measured points drawn on each sprite (check board)
tiles = []
for n, m in MEASURED.items():
    if n not in sprites:
        continue
    im = Image.new('RGBA', sprites[n].size, (150, 150, 150, 255))
    im.alpha_composite(sprites[n])
    dd = ImageDraw.Draw(im)
    for k, v in m.get('points', {}).items():
        col = (255, 0, 0, 255)
        if k in ('hair',):
            dd.rectangle([v['x0'], v['y0'], v['x1'], v['y1']], outline=col, width=2)
        elif k in ('palmBox', 'label', 'box'):
            dd.rectangle([v[0], v[1], v[0] + v[2], v[1] + v[3]], outline=col, width=2)
        elif k in ('mugTop', 'palm', 'headTop'):
            dd.ellipse([v[0] - 6, v[1] - 6, v[0] + 6, v[1] + 6], outline=col, width=2)
        elif k in ('cutY', 'floorY', 'handY'):
            dd.line([(0, v), (im.width, v)], fill=(0, 255, 255, 255), width=1)
        elif k == 'glassX':
            dd.line([(v, 0), (v, im.height)], fill=(0, 255, 255, 255), width=1)
        elif k == 'handX':
            for xx in v:
                dd.line([(xx, 0), (xx, im.height)], fill=(0, 255, 0, 255), width=1)
    s = 600 / im.height
    tiles.append(im.resize((round(im.width * s), 600), Image.LANCZOS))
if tiles:
    g = Image.new('RGB', (sum(t.width + 10 for t in tiles), 600), (60, 60, 60))
    xx = 0
    for t in tiles:
        g.paste(t.convert('RGB'), (xx, 0))
        xx += t.width + 10
    g.save(os.path.join(BO, 'p3-h-points.png'))
