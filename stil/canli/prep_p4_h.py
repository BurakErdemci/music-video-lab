# Part-4 lane h (human drawings). Run from repo root: python stil/canli/prep_p4_h.py
# Raw -> key -> trim -> defringe (same rule as defringe_p3.py) -> optional scale -> video/public/living/p4/<name>.png
# + video/src/living/sprites-p4-h.json. Hand numbers (RAW trimmed-sprite px, 50 px grid overlays boards/p4-h-measure-<name>.png)
# come from p4-h-measured.json and are multiplied by the sprite's scale. Sprites with scale 1 equal their raw trim.
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, ROOT, HAM
OUT = os.path.join(ROOT, 'video', 'public', 'living', 'p4')
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p4-h.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
LIV = os.path.join(ROOT, 'video', 'public', 'living')
CANON = os.path.join(ROOT, 'stil', 'hareket', 'ref-insan-kanonik.png')
os.makedirs(OUT, exist_ok=True)

CHOSEN = {'h-leap': 'p4-h-leap', 'h-run1': 'p4-h-run1', 'h-run2': 'p4-h-run2-r1', 'h-run3': 'p4-h-run3',
          'h-pant': 'p4-h-pant', 'h-floor-up': 'p4-h-floor-up', 'h-floor-book': 'p4-h-floor-book',
          'h-cross': 'p4-h-cross', 'h-desk-book': 'p4-h-desk-book'}
MP = os.path.join(HERE, 'p4-h-measured.json')
MEASURED = json.load(open(MP)) if os.path.exists(MP) else {}
PTS = ('fist', 'palm', 'hand', 'hands', 'handLift')
HEAD_TARGET = 150  # as part 2: seated/floor men are scaled so the head is ~150 px (registers with h-sleep / h-type1)
NAVY, CREAM = (0x18, 0x20, 0x3A), (0xF3, 0xEF, 0xE4)


def obb(im, t=128):
    return im.split()[3].point(lambda v: 255 if v > t else 0).getbbox()


def fnt(n=14):
    try:
        return ImageFont.truetype('arial.ttf', n)
    except Exception:
        return None


def defringe(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a >= 8 and r - g > 20 and b - g > 10:
                c = CREAM if (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 else NAVY
                px[x, y] = (c[0], c[1], c[2], a)
    return im


def sprite4(raw):
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    return defringe(trim(im, box)[0])


def overlay(sp, fn, m, k=1):
    bg = Image.new('RGBA', sp.size, (150, 150, 150, 255))
    bg.alpha_composite(sp)
    bg = bg.resize((sp.width * k, sp.height * k), Image.LANCZOS).convert('RGB')
    d = ImageDraw.Draw(bg)
    for x in range(0, sp.width, 50):
        d.line([(x * k, 0), (x * k, sp.height * k)], fill=(255, 255, 255) if x % 100 == 0 else (200, 200, 200), width=1)
        d.text((x * k + 2, 2), str(x), fill=(255, 0, 0), font=fnt())
    for y in range(0, sp.height, 50):
        d.line([(0, y * k), (sp.width * k, y * k)], fill=(255, 255, 255) if y % 100 == 0 else (200, 200, 200), width=1)
        d.text((2, y * k + 2), str(y), fill=(255, 0, 0), font=fnt())
    for n, v in m.items():
        if n in PTS:
            d.ellipse([v[0] * k - 7, v[1] * k - 7, v[0] * k + 7, v[1] * k + 7], outline=(0, 255, 255), width=3)
            d.text((v[0] * k + 9, v[1] * k - 9), n, fill=(0, 255, 255), font=fnt(16))
        elif n == 'hair':
            d.rectangle([v['x0'] * k, v['y0'] * k, v['x1'] * k, v['y1'] * k], outline=(0, 255, 0), width=3)
        elif n == 'book':
            d.rectangle([v[0] * k, v[1] * k, (v[0] + v[2]) * k, (v[1] + v[3]) * k], outline=(255, 0, 255), width=3)
        elif n in ('floorY', 'feetY'):
            d.line([(0, v * k), (sp.width * k, v * k)], fill=(255, 128, 0), width=2)
        elif n in ('backX', 'frontX', 'glassX', 'hipX'):
            d.line([(v * k, 0), (v * k, sp.height * k)], fill=(255, 128, 0), width=2)
    bg.convert('RGB').save(os.path.join(BO, fn))


def leg_span_desk(im, off=12):
    """Chair-leg span (as prep_p2h leg_span) at `off` px above the lowest opaque row."""
    a = im.split()[3].load()
    w, h = im.size
    fy = max(y for y in range(h) for x in range(0, w, 2) if a[x, y] > 128)
    y = fy - off
    r, st = [], None
    for x in range(w):
        o = a[x, y] > 128
        if o and st is None:
            st = x
        if not o and st is not None:
            r.append((round((st + x - 1) / 2), x - st))
            st = None
    legs = [c for c, wd in r if wd <= 32]
    return abs(legs[-1] - legs[0]) if len(legs) >= 2 else None


# the approved chair's leg span (h-mug2) and h-type1's: desk-book must register with h-type1
REF_SPAN = leg_span_desk(Image.open(os.path.join(LIV, 'p1', 'h-mug2.png')).convert('RGBA'))


def scale_for(short, sp):
    m = MEASURED.get(short, {})
    if short in ('h-floor-up', 'h-floor-book'):
        hp = MEASURED.get('h-floor-up', {}).get('headPx')  # same seat, one scale for both
        if not hp:
            return 1.0
        up = FLOOR_UP_RAW  # geometric mean of head scale and body-length scale (to h-sleep's feet-to-back width, 497)
        return ((HEAD_TARGET / hp) * (497 / (obb(up)[2] - obb(up)[0]))) ** 0.5
    if short == 'h-desk-book' and 'headPx' in m:
        span = leg_span_desk(sp)
        sh = HEAD_TARGET / m['headPx']
        return (REF_SPAN / span * sh) ** 0.5 if span else sh
    return 1.0


def scaled(m, s):
    out = {}
    for k, v in m.items():
        if k in PTS:
            out[k] = [round(v[0] * s), round(v[1] * s)]
        elif k == 'hair':
            out[k] = {a: round(b * s) for a, b in v.items()}
        elif k == 'book':
            out[k] = [round(c * s) for c in v]
        elif k in ('headPx', 'floorY', 'feetY', 'backX', 'frontX', 'glassX', 'hipX'):
            out[k] = round(v * s)
        else:
            out[k] = v
    return out


def autos(short, sp):
    bb = obb(sp)
    a = sp.split()[3].load()
    w, h = sp.size
    out = {'floorY': bb[3] - 1}
    if short in ('h-floor-up', 'h-floor-book'):  # facing LEFT like h-sleep: seat bottom in the right part, feet left
        out['floorY'] = max(y for y in range(h) for x in range(int(w * 0.55), w) if a[x, y] > 128)
        out['feetY'] = bb[3] - 1
        out['backX'] = max(x for y in range(int(h * 0.3), int(h * 0.8)) for x in range(w) if a[x, y] > 128)
        out['frontX'] = bb[0]  # leftmost toe (the front, he faces left)
    return out


meta, sprites = {}, {}
FLOOR_UP_RAW = sprite4(CHOSEN['h-floor-up'])
for short, raw in CHOSEN.items():
    if not os.path.exists(os.path.join(HAM, raw + '.png')):
        continue
    r = sprite4(raw)
    overlay(r, 'p4-h-measure-%s.png' % short, {}, 1)
    s = scale_for(short, r)
    sp = r if s == 1.0 else r.resize((round(r.width * s), round(r.height * s)), Image.LANCZOS)
    sprites[short] = sp
    sp.save(os.path.join(OUT, short + '.png'))
    m = scaled(MEASURED.get(short, {}), s)
    if 'headPx' in m:
        m['headH'] = m['headPx']
    meta[short] = {'w': sp.width, 'h': sp.height, 'bbox': list(obb(sp)), 'scale': [round(s, 4), round(s, 4)], **m}
    if short in ('h-floor-up', 'h-floor-book'):
        meta[short].update(autos(short, sp))
    else:
        meta[short]['floorY'] = obb(sp)[3] - 1 if short != 'h-desk-book' else obb(sp)[3] - 1
    # run poses: floorY is the lowest foot (alpha row); same for the rest
    if MEASURED.get(short):
        overlay(sp, 'p4-h-check-%s.png' % short, {k: v for k, v in meta[short].items() if k in ('hair', 'floorY', 'feetY', 'backX', 'frontX', 'glassX', 'hipX', 'book') or k in PTS}, 1)
    print(short, sp.size, 'scale %.3f' % s, meta[short]['bbox'])
with open(META, 'w') as f:
    json.dump(meta, f, indent=1)

# ---------- boards ----------
need = all(n in MEASURED and 'headPx' in MEASURED[n] for n in CHOSEN if n in sprites)
if not need or len(sprites) < len(CHOSEN):
    raise SystemExit('measured json incomplete: boards skipped')


def trimmed(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


figs = {}
canon = key(CANON)
cb = canon.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
figs['ref-canon'] = (trim(canon, cb)[0], round(0.148 * (cb[3] - cb[1])))  # head fraction as README-p2h (by eye, 0.148)
figs['h-walk'] = (trimmed(os.path.join(LIV, 'p3', 'h-walk.png')), 262)  # README-p3 table
sl = json.load(open(os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p2h.json')))
figs['h-sleep'] = (trimmed(os.path.join(LIV, 'p2', 'h-sleep.png')), sl['h-sleep']['headPx'])
for n in CHOSEN:
    figs[n] = (sprites[n], meta[n]['headPx'])
H = 200
items = []
for n, (im, hh) in figs.items():
    sc = H / hh
    items.append((n, im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)))
Wd = sum(i.width + 30 for _, i in items) + 30
Ht = max(i.height for _, i in items) + 120
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
d = ImageDraw.Draw(b)
x = 30
hair_top = {n: (MEASURED[n]['hair']['y0'] * (meta[n]['scale'][0]) if n in meta else 0) for n in CHOSEN}
for n, i in items:
    top = round(hair_top[n] * H / figs[n][1]) if n in hair_top else obb(i)[1]
    if n not in hair_top:
        top = obb(i)[1]
    b.alpha_composite(i, (x, 60 - top))
    d.text((x, 6), n, fill=(0, 0, 0, 255), font=fnt(16))
    x += i.width + 30
d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
b.convert('RGB').save(os.path.join(BO, 'p4-h-same-head.png'))

tiles = []
for n in CHOSEN:
    im = Image.new('RGBA', sprites[n].size, (150, 150, 150, 255))
    im.alpha_composite(sprites[n])
    dd = ImageDraw.Draw(im)
    for k, v in meta[n].items():
        if k in PTS:
            dd.ellipse([v[0] - 9, v[1] - 9, v[0] + 9, v[1] + 9], outline=(255, 0, 0, 255), width=4)
        elif k == 'hair':
            dd.rectangle([v['x0'], v['y0'], v['x1'], v['y1']], outline=(0, 160, 0, 255), width=3)
        elif k == 'book':
            dd.rectangle([v[0], v[1], v[0] + v[2], v[1] + v[3]], outline=(255, 0, 255, 255), width=3)
        elif k in ('floorY', 'feetY'):
            dd.line([(0, v), (im.width, v)], fill=(0, 255, 255, 255), width=2)
        elif k in ('backX', 'frontX', 'glassX', 'hipX'):
            dd.line([(v, 0), (v, im.height)], fill=(255, 128, 0, 255), width=2)
    s = 500 / im.height
    tiles.append(im.resize((round(im.width * s), 500), Image.LANCZOS))
cols = 3
rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
Wb = max(sum(t.width + 10 for t in r) for r in rows)
g = Image.new('RGB', (Wb, 510 * len(rows)), (60, 60, 60))
for ri, r in enumerate(rows):
    xx = 0
    for t in r:
        g.paste(t.convert('RGB'), (xx, ri * 510))
        xx += t.width + 10
g.save(os.path.join(BO, 'p4-h-points.png'))
print('boards ok')
