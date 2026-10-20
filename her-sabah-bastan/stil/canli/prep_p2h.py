# Part-2 human sprites (magenta key -> alpha, trim, metadata, measure overlays, boards). Reuses prep_p1.py's helpers by exec of
# its function section (prep_p1.py untouched). Hand-measured numbers come from p2h-measured.json (read off the 50 px grid overlays
# boards/p2h-measure-<name>.png). Run from the repo root: python stil/canli/prep_p2h.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, ROOT, HAM
OUT2 = os.path.join(ROOT, 'video', 'public', 'living', 'p2')
META2 = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p2h.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
LIV = os.path.join(ROOT, 'video', 'public', 'living')
POZ = os.path.join(ROOT, 'stil', 'hareket')
os.makedirs(OUT2, exist_ok=True)

# sprite name -> chosen raw attempt (see README-p2h.md)
CHOSEN = {'h-type1': 'p2-h-type1', 'h-type2': 'p2-h-type2', 'h-type3': 'p2-h-type3', 'h-stretch': 'p2-h-stretch',
          'coffee-cab': 'p2-h-coffeecab', 'h-coffee': 'p2-h-coffee', 'chair2': 'p2-chair2', 'h-sleep': 'p2-h-sleep',
          'h-wake': 'p2-h-wake', 'h-ots': 'p2-h-ots', 'h-calm': 'p2-h-calm', 'h-torch': 'p2-h-torch',
          'h-torch-back': 'p2-h-torch-back'}
MP = os.path.join(HERE, 'p2h-measured.json')
MEASURED = json.load(open(MP)) if os.path.exists(MP) else {}
POINTS = ('hands', 'mugTop', 'spout', 'headTop', 'lens', 'kb')


def opaque_bbox(im, t=128):
    return im.split()[3].point(lambda v: 255 if v > t else 0).getbbox()


def sprite2(raw):
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    if raw == 'p2-h-ots':  # plate is cut by the bottom edge: keep that edge, no bottom margin
        box = (box[0], box[1], box[2], im.height)
    return trim(im, box)[0]


def fnt(n=14):
    try:
        return ImageFont.truetype('arial.ttf', n)
    except Exception:
        return None


def overlay(name, sp, fn, m=None):
    """Sprite on grey with a 50 px grid (sprite px), 2x, labelled; draws every measured point."""
    k = 2
    m = MEASURED.get(name, {}) if m is None else m
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
    for kname, v in m.items():
        if kname in POINTS:
            d.ellipse([v[0] * k - 6, v[1] * k - 6, v[0] * k + 6, v[1] * k + 6], outline=(0, 255, 255), width=2)
            d.text((v[0] * k + 8, v[1] * k - 8), kname, fill=(0, 255, 255), font=fnt())
        elif kname == 'hair':
            d.rectangle([v['x0'] * k, v['y0'] * k, v['x1'] * k, v['y1'] * k], outline=(0, 255, 0), width=2)
        elif kname == 'floorY':
            d.line([(0, v * k), (sp.width * k, v * k)], fill=(255, 128, 0), width=2)
        elif kname == 'backX':
            d.line([(v * k, 0), (v * k, sp.height * k)], fill=(255, 128, 0), width=2)
        elif kname == 'headPx' and 'hair' in m:
            y0 = m['hair']['y0']
            d.line([(0, y0 * k), (sp.width * k, y0 * k)], fill=(255, 0, 255), width=1)
            d.line([(0, (y0 + v) * k), (sp.width * k, (y0 + v) * k)], fill=(255, 0, 255), width=1)
        elif kname == 'dir' and 'lens' in m:
            l = m['lens']
            d.line([(l[0] * k, l[1] * k), ((l[0] + v[0] * 80) * k, (l[1] + v[1] * 80) * k)], fill=(0, 255, 255), width=2)
    bg.save(os.path.join(BO, fn))


HEAD_TARGET = 150  # px: every man is scaled so his head is ~150 px (h-mug2: 159 by hand, others 145-155)


def leg_runs(im, off=12):
    """Opaque runs on the row `off` px above the lowest opaque row: [(centre, width)], plus that row's y."""
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
    if st is not None:
        r.append((round((st + w - 1) / 2), w - st))
    return fy, y, r


def leg_span(im):
    _, _, r = leg_runs(im)
    legs = [c for c, wd in r if wd <= 32]
    return abs(legs[-1] - legs[0]) if len(legs) >= 2 else None


def leg_height(im, cx):
    """Floor to seat underside along the column cx (run width jumps above 100 where the seat slab starts)."""
    a = im.split()[3].load()
    w, h = im.size
    fy = max(y for y in range(h) for x in range(0, w, 2) if a[x, y] > 128)
    for y in range(fy - 12, 0, -1):
        l = r = cx
        while l > 0 and a[l - 1, y] > 128:
            l -= 1
        while r < w - 1 and a[r + 1, y] > 128:
            r += 1
        if r - l > 100:
            return fy - y
    return None


REF_SPAN = leg_span(Image.open(os.path.join(LIV, 'p1', 'h-mug2.png')).convert('RGBA'))  # leg span of the approved chair
REF_LEGH = 231  # floor to seat underside of the approved chair (h-mug2), by eye


def scale_for(short, sp):
    """(sx, sy): seated men = geometric mean of chair-span scale and head scale; standing/floor men = head scale;
    chair2 = non-uniform (its legs splay more than the approved chair); h-ots = 1 (large plate)."""
    m = MEASURED.get(short, {})
    if short == 'h-ots':
        return 1.0, 1.0
    if short == 'chair2':
        _, _, r = leg_runs(sp)
        cx = [c for c, wd in r][-1]
        return REF_SPAN / abs(r[-1][0] - r[0][0]), REF_LEGH / leg_height(sp, cx)
    sh = HEAD_TARGET / m['headPx'] if 'headPx' in m else 1.0
    if short == 'h-stretch':  # head is drawn small and tilted back (arms up): scale by the chair only
        sh = 1.0
    if short in ('h-sleep', 'h-wake'):  # one scale for both: they share the same place on the floor
        sh = HEAD_TARGET / ((MEASURED['h-sleep']['headPx'] + MEASURED['h-wake']['headPx']) / 2)
    span = leg_span(sp) if short in SEATED else None
    if span:
        s = (REF_SPAN / span * sh) ** 0.5
        return s, s
    return sh, sh


SEATED = ('h-type1', 'h-type2', 'h-type3', 'h-stretch', 'h-calm', 'h-torch', 'h-torch-back')


def scaled_meta(m, sx, sy):
    out = {}
    for k, v in m.items():
        if k in POINTS:
            out[k] = [round(v[0] * sx), round(v[1] * sy)]
        elif k == 'hair':
            out[k] = {'x0': round(v['x0'] * sx), 'y0': round(v['y0'] * sy), 'x1': round(v['x1'] * sx), 'y1': round(v['y1'] * sy)}
        elif k == 'headPx' or k == 'cabTopY':
            out[k] = round(v * sy)
        else:
            out[k] = v
    return out


def autos(short, sp):
    """Numbers read from the final pixels: floorY, backX."""
    bb = opaque_bbox(sp)
    out = {}
    a = sp.split()[3].load()
    w, h = sp.size
    if short in ('h-sleep', 'h-wake'):  # seat bottom = lowest opaque row in the right 45% (feet are in the left part)
        out['floorY'] = max(y for y in range(h) for x in range(int(w * 0.55), w) if a[x, y] > 128)
        out['feetY'] = bb[3] - 1
        out['backX'] = max(x for y in range(int(h * 0.3), int(h * 0.8)) for x in range(w) if a[x, y] > 128)
    elif short in SEATED or short in ('chair2', 'h-coffee', 'coffee-cab'):
        out['floorY'] = bb[3] - 1
    return out


meta, sprites, raws, scales = {}, {}, {}, {}


def build(short, scale=None):
    raw = sprite2(CHOSEN[short])
    raws[short] = raw
    overlay(short, raw, 'p2h-measure-%s.png' % short)
    sx, sy = scale if scale else scale_for(short, raw)
    sp = raw if (sx, sy) == (1.0, 1.0) else raw.resize((round(raw.width * sx), round(raw.height * sy)), Image.LANCZOS)
    sprites[short] = sp
    scales[short] = (sx, sy)
    sp.save(os.path.join(OUT2, short + '.png'))
    meta[short] = {'w': sp.width, 'h': sp.height, 'bbox': list(opaque_bbox(sp)),
                   'scale': [round(sx, 4), round(sy, 4)], **scaled_meta({k: v for k, v in MEASURED.get(short, {}).items() if k != 'kb'}, sx, sy)}
    meta[short].update(autos(short, sp))
    overlay(short, sp, 'p2h-check-%s.png' % short, meta[short])
    print(short, sp.size, 'scale %.3f/%.3f' % (sx, sy), meta[short]['bbox'])


for short in CHOSEN:
    if short != 'coffee-cab':
        build(short)
# the cabinet: scaled so the machine's spout sits 15 px above the mug's open top (the man stands beside it, mugTop and spout meet)
cabraw = sprite2(CHOSEN['coffee-cab'])
fcab = max(y for y in range(cabraw.height) for x in range(0, cabraw.width, 2) if cabraw.split()[3].load()[x, y] > 128)
spout_above_floor_raw = fcab - MEASURED['coffee-cab']['spout'][1]
mug_above_floor = meta['h-coffee']['floorY'] - meta['h-coffee']['mugTop'][1]
cs = (mug_above_floor + 15) / spout_above_floor_raw
build('coffee-cab', (cs, cs))
meta['coffee-cab']['spoutMinusMugTop'] = [meta['coffee-cab']['spout'][0] - meta['h-coffee']['mugTop'][0], 'y: spout 15 px above mugTop when floors are aligned']
with open(META2, 'w') as f:
    json.dump(meta, f, indent=1)

trimmed_ref_img = None
# desk2 overlay for the keyboard measurement (desk2 is a Part-1 file: read only)
desk = Image.open(os.path.join(LIV, 'p1', 'desk2.png')).convert('RGBA')
overlay('desk2', desk, 'p2h-measure-desk2.png', MEASURED.get('desk2', {}))

def _ref():
    im = key(os.path.join(POZ, 'ref-insan-kanonik.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


REF = _ref()
# canonical ref: head top-to-chin read by eye on its grid overlay = 0.148 of the figure height (hair top 52, chin 218, feet 1175 of 1227)
MEASURED['ref'] = {'headPx': round(MEASURED['ref']['headFrac'] * REF.height), 'hairY0': 0, 'headFrac': MEASURED['ref']['headFrac']}
overlay('ref', REF, 'p2h-measure-ref.png', {})

# ---------- boards (need the hand-measured headPx / hair) ----------
if 'ref' not in MEASURED or not all('headPx' in meta[n] for n in ('h-type1', 'h-calm', 'h-coffee')):
    raise SystemExit('measured json incomplete: boards skipped')


def trimmed_ref(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


seated = ['h-type1', 'h-type2', 'h-type3', 'h-stretch', 'h-sleep', 'h-wake', 'h-calm', 'h-torch', 'h-torch-back', 'h-coffee']
figs = {n: sprites[n] for n in seated if 'headPx' in meta[n]}
figs['h-mug2'] = Image.open(os.path.join(LIV, 'p1', 'h-mug2.png')).convert('RGBA')
figs['ref'] = REF
seated = [n for n in seated if n in figs]
HH = {n: meta[n]['headPx'] for n in seated}
HH['h-mug2'] = 159  # p1v2-measured.json headOverride
HH['ref'] = MEASURED['ref']['headPx']
HAIR_Y = {n: meta[n]['hair']['y0'] for n in seated}
HAIR_Y['h-mug2'] = 8  # p1v2-measured.json hair y0
HAIR_Y['ref'] = MEASURED['ref']['hairY0']


def same_head(names, fn):
    H = 240
    items = []
    for n in names:
        sc = H / HH[n]
        im = figs[n]
        items.append((n, im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS), HAIR_Y[n] * sc))
    Wd = sum(i.width + 30 for _, i, _ in items) + 30
    Ht = int(max(i.height - hy for _, i, hy in items)) + 120
    b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
    d = ImageDraw.Draw(b)
    x = 30
    for n, i, hy in items:
        b.alpha_composite(i, (x, int(60 - hy)))
        d.text((x, 6), n, fill=(0, 0, 0, 255), font=fnt(18))
        x += i.width + 30
    d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
    d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
    b.convert('RGB').save(os.path.join(BO, fn))


same_head(['ref', 'h-mug2'] + seated, 'p2-human-same-head.png')

# grips: 3x crops around the mug (h-coffee) and the torch lens (h-torch, h-torch-back)
tiles = []
for n, key_ in (('h-coffee', 'mugTop'), ('h-torch', 'lens'), ('h-torch-back', 'lens')):
    cx, cy = meta[n][key_]
    box = (max(0, int(cx - 110)), max(0, int(cy - 90)), min(sprites[n].width, int(cx + 110)), min(sprites[n].height, int(cy + 110)))
    c = sprites[n].crop(box)
    bg = Image.new('RGBA', c.size, (150, 150, 150, 255))
    bg.alpha_composite(c)
    tiles.append(bg.resize((c.width * 3, c.height * 3), Image.LANCZOS).convert('RGB'))
g = Image.new('RGB', (sum(t.width for t in tiles) + 20 * len(tiles), max(t.height for t in tiles)), (80, 80, 80))
x = 0
for t in tiles:
    g.paste(t, (x, 0))
    x += t.width + 20
g.save(os.path.join(BO, 'p2-human-grips.png'))

# type-desk: the man at h-mug2's scale (sprite px 1:1), desk2 at 0.86; desk legs and chair legs on one floor line,
# man moved sideways so his fingertips sit over desk2's keyboard point (desk2.kb, hand-measured); y gap printed.
K = 0.86
dsk = desk.resize((round(desk.width * K), round(desk.height * K)), Image.LANCZOS)
kbx, kby = MEASURED['desk2']['kb']
dfy = MEASURED['desk2']['floorY']
panels = []
for n in ('h-type1', 'h-type2', 'h-type3'):
    man = sprites[n]
    hx, hy = meta[n]['hands']
    fy = meta[n]['floorY']
    W, H = 1700, 1000
    p = Image.new('RGBA', (W, H), (150, 150, 150, 255))
    floor = 930
    dx = 700
    p.alpha_composite(dsk, (dx, floor - round(dfy * K)))
    mx = round(dx + kbx * K - hx)
    p.alpha_composite(man, (mx, floor - fy))
    gap = (floor - fy + hy) - (floor - round(dfy * K) + round(kby * K))
    d = ImageDraw.Draw(p)
    d.line([(0, floor), (W, floor)], fill=(0, 255, 255, 255))
    d.ellipse([mx + hx - 6, floor - fy + hy - 6, mx + hx + 6, floor - fy + hy + 6], outline=(255, 0, 0, 255), width=3)
    kx, ky = dx + round(kbx * K), floor - round(dfy * K) + round(kby * K)
    d.ellipse([kx - 6, ky - 6, kx + 6, ky + 6], outline=(0, 255, 0, 255), width=3)
    d.text((10, 8), '%s  fingertip y minus desk2 keyboard y = %d px (red = fingertips, green = keyboard point)' % (n, gap), fill=(0, 0, 0, 255), font=fnt(20))
    print('TYPE-DESK', n, 'gap', gap)
    panels.append(p.convert('RGB').resize((W // 2, H // 2), Image.LANCZOS))
b = Image.new('RGB', (panels[0].width, sum(p.height for p in panels)), (80, 80, 80))
y = 0
for p in panels:
    b.paste(p, (0, y))
    y += p.height
b.save(os.path.join(BO, 'p2-type-desk.png'))
