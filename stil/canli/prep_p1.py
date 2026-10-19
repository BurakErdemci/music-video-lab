# Part-1 sprites: reuses key/trim/eye_rect/outline from prep.py (exec of its function section, prep.py itself is untouched
# and its pipeline is not run). Writes video/public/living/p1/*.png and video/src/living/sprites-p1.json.
# Run from the repo root: python stil/canli/prep_p1.py
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'prep.py'), encoding='utf-8').read()
exec(compile(src.split('\nmeta = {}')[0], 'prep.py', 'exec'))  # defines ROOT, HAM, key, trim, eye_rect, outline, ...

OUT1 = os.path.join(ROOT, 'video', 'public', 'living', 'p1')
META1 = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p1.json')
os.makedirs(OUT1, exist_ok=True)
meta = {}


def alpha_bbox(sp):
    return list(sp.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox())


def save(name, sp, extra=None):
    sp.save(os.path.join(OUT1, name + '.png'))
    meta[name] = {'w': sp.width, 'h': sp.height, 'bbox': alpha_bbox(sp), **(extra or {})}
    print(name, sp.size, meta[name]['bbox'])


def split_eye(name, sp, rect, dark_only=False):
    ex, ey, ew, eh = rect
    clean = sp.copy()
    cp = clean.load()
    fill = sp.load()[min(sp.width - 1, ex + ew + 6), ey + eh // 2]
    for y in range(ey - 2, ey + eh + 2):
        for x in range(ex - 2, ex + ew + 2):
            q = cp[x, y]
            # tilted eyes: only repaint the eye's own dark/antialiased pixels, never the head outline or the background
            if dark_only and not (q[3] > 200 and sum(q[:3]) < 690 and q[:3] != (0, 0, 0)):
                continue
            if dark_only and (x < ex - 2 or y < ey - 2):
                continue
            cp[x, y] = fill
    clean.save(os.path.join(OUT1, name + '-noeye.png'))
    sp.crop((ex - 2, ey - 2, ex + ew + 2, ey + eh + 2)).save(os.path.join(OUT1, name + '-eye.png'))


def sprite(raw):
    im = key(os.path.join(HAM, 'p1-' + raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12  # one figure per image: trim to the whole opaque bbox, keeping the same 6 px margin as prep.py
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    sp, _ = trim(im, box)
    return sp


def eye_rect_loose(sp, head_frac=0.30):
    # Fallback for tilted heads (the stock detector wants a vertical bar): any enclosed dark blob in the head region.
    w, h = sp.size
    px = sp.load()
    dark = lambda x, y: px[x, y][3] > 200 and sum(px[x, y][:3]) < 330
    seen, best = set(), None
    for y in range(int(h * head_frac)):
        for x in range(w):
            if (x, y) in seen or not dark(x, y):
                continue
            stack, comp, edge = [(x, y)], [], False
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 100:
                        edge = True
                        continue
                    if (nx, ny) not in seen and dark(nx, ny):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if edge or len(comp) < 40:
                continue
            if best is None or len(comp) > len(best):
                best = comp
    if best is None:
        return None
    xs = [p[0] for p in best]
    ys = [p[1] for p in best]
    return (min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)


for short in ['h-rise', 'h-peel', 'h-slide', 'h-hand', 'notebook']:
    save(short, sprite(short))

for short in ['a-raise', 'a-lookback', 'a-pin', 'a-catch', 'a-hand', 'a-lookdown', 'a-kneel', 'a-read', 'a-lookup']:
    sp = sprite(short)
    extra = {}
    loose = False
    try:
        rect = eye_rect(sp)
    except SystemExit:
        loose = True
        rect = eye_rect_loose(sp)
        print('NOTE', short, 'stock eye detector failed, loose fallback ->', rect)
    extra['eye'] = list(rect) if rect else None
    if rect:
        split_eye(short, sp, rect, dark_only=loose)
    extra['outline'] = outline(sp)
    save(short, sp, extra)

# full-frame plates: cover-crop to 1920x1080, no keying
for short in ['page-tag', 'page-road', 'page-cross']:
    im = Image.open(os.path.join(HAM, 'p1-' + short + '.png')).convert('RGB')
    s = max(1920 / im.width, 1080 / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x0, y0 = (im.width - 1920) // 2, (im.height - 1080) // 2
    im = im.crop((x0, y0, x0 + 1920, y0 + 1080))
    im.save(os.path.join(OUT1, short + '.png'))
    meta[short] = {'w': 1920, 'h': 1080}
    print(short, im.size)

# wave rig: raised forearm+hand of the approved ai-wave-a-noeye cut at the elbow (cut line = bisector through the elbow,
# measured by eye on a 4x zoom: outer tip ~(62,288), inner crook ~(88,247)); body gets a round cap with the outline drawn
# only where the cap lies outside the existing silhouette.
import math
from PIL import ImageDraw
LIV = os.path.join(ROOT, 'video', 'public', 'living')
W = Image.open(os.path.join(LIV, 'ai-wave-a-noeye.png')).convert('RGBA')
EX, EY, R = 75, 267, 22
DX, DY = 0.535, -0.845
wp = W.load()
fore = Image.new('RGBA', W.size, (0, 0, 0, 0))
body = W.copy()
fp, bp = fore.load(), body.load()
for y in range(W.height):
    for x in range(W.width):
        if x < 118 and DX * (y - EY) - DY * (x - EX) < 0:
            fp[x, y] = wp[x, y]
            bp[x, y] = (0, 0, 0, 0)
cream = W.load()[EX + 25, EY + 5]
ring = (24, 32, 58, 255)
SS = 4
cap = Image.new('RGBA', (W.width * SS, W.height * SS), (0, 0, 0, 0))
cd = ImageDraw.Draw(cap)
cd.ellipse([(EX - R) * SS, (EY - R) * SS, (EX + R) * SS, (EY + R) * SS], fill=ring)
cd.ellipse([(EX - R + 5) * SS, (EY - R + 5) * SS, (EX + R - 5) * SS, (EY + R - 5) * SS], fill=cream)
cap = cap.resize(W.size, Image.LANCZOS)
cpx = cap.load()
for y in range(EY - R - 2, EY + R + 3):
    for x in range(EX - R - 2, EX + R + 3):
        a = cpx[x, y][3]
        if a == 0:
            continue
        # keep cap pixels that are outside the body or the cream interior; skip ring pixels that would cross the arm interior
        inside_body = bp[x, y][3] > 128
        c = cpx[x, y]
        is_ring = c[:3] != cream[:3] and sum(c[:3]) < 330
        if inside_body and is_ring:
            continue
        if inside_body and not is_ring:
            continue
        bp[x, y] = c
body.save(os.path.join(OUT1, 'a-wave-body.png'))
body.save(os.path.join(OUT1, 'a-wave-body-noeye.png'))
fore.save(os.path.join(OUT1, 'a-wave-forearm.png'))
Image.open(os.path.join(LIV, 'ai-wave-a-eye.png')).save(os.path.join(OUT1, 'a-wave-body-eye.png'))
meta['a-wave'] = {'w': W.width, 'h': W.height, 'bbox': alpha_bbox(W), 'elbow': [EX, EY],
                  'eye': json.load(open(os.path.join(ROOT, 'video', 'src', 'living', 'sprites.json')))['ai-wave-a']['eye']}
print('a-wave', meta['a-wave'])

# rig check board
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
os.makedirs(BO, exist_ok=True)
tiles = []
for ang in (-20, -10, 0, 10, 20):
    t = Image.new('RGBA', (W.width + 160, 420), (200, 200, 200, 255))
    b = body.copy()
    fr = fore.rotate(ang, resample=Image.BICUBIC, center=(EX, EY))
    comp = Image.new('RGBA', W.size, (0, 0, 0, 0))
    comp.alpha_composite(b)
    comp.alpha_composite(fr)
    eye = Image.open(os.path.join(OUT1, 'a-wave-body-eye.png'))
    ex, ey = meta['a-wave']['eye'][:2]
    comp.alpha_composite(eye, (ex - 2, ey - 2))
    t.alpha_composite(comp.crop((0, 60, W.width, 480)), (80, 0))
    ImageDraw.Draw(t).text((8, 4), '%+d deg' % ang, fill=(255, 0, 0, 255))
    tiles.append(t)
board = Image.new('RGBA', (sum(t.width for t in tiles), 420), (200, 200, 200, 255))
x = 0
for t in tiles:
    board.alpha_composite(t, (x, 0))
    x += t.width
board = board.resize((board.width * 2, board.height * 2), Image.LANCZOS)
board.convert('RGB').save(os.path.join(BO, 'p1-wave-rig.png'))

# ---------- boards + head ratios ----------
from PIL import ImageFont
POZ = os.path.join(ROOT, 'stil', 'pozlar')


def trimmed_ref(name):
    im = Image.open(os.path.join(POZ, name)).convert('RGBA')  # references are already RGBA
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


def head_h(sp):
    # top of alpha to the narrowest row of the neck (5-row smoothed alpha width, rows 8-30 % of height, x-range of the head's top rows)
    a = sp.split()[3].point(lambda v: 255 if v > 128 else 0)
    w, h = sp.size
    top = a.getbbox()[1]
    tb = a.crop((0, top, w, top + max(8, int(h * 0.03)))).getbbox()
    x0, x1 = tb[0] - 8, tb[2] + 8
    x0 = max(0, x0)
    widths = []
    for y in range(h):
        row = a.crop((x0, y, min(w, x1), y + 1)).getbbox()
        widths.append(0 if row is None else row[2] - row[0])
    best, by = 10 ** 9, None
    for y in range(int(h * 0.08), int(h * 0.30)):
        m = sum(widths[y - 2:y + 3]) / 5
        if m < best:
            best, by = m, y
    return by - top


STAND = ['h-peel', 'h-slide', 'h-hand', 'a-raise', 'a-lookback', 'a-pin', 'a-catch', 'a-hand', 'a-lookdown']
HEADONLY = ['h-rise', 'a-kneel', 'a-read', 'a-lookup']
HOVR = {'h-rise': 143}  # chin set by hand (row ~150 on a zoom): the neck rule picks a torso row on the bent figure
refs = {'h': trimmed_ref('ref-insan.png'), 'a': trimmed_ref('ref-ai.png')}
figs = {'ref-h': refs['h'], 'ref-a': refs['a']}
for n in ['h-rise', 'h-peel', 'h-slide', 'h-hand', 'a-raise', 'a-lookback', 'a-pin', 'a-catch', 'a-hand', 'a-lookdown', 'a-kneel', 'a-read', 'a-lookup']:
    figs[n] = Image.open(os.path.join(OUT1, n + '.png')).convert('RGBA')
ratios = {}
HH = {}
for n, im in figs.items():
    top = im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
    hh = HOVR.get(n) or head_h(im)
    HH[n] = hh
    hgt = top[3] - top[1]
    ratios[n] = (hh, hgt, hh / hgt)
    print('HEAD', n, 'head', hh, 'height', hgt, 'ratio %.3f' % ratios[n][2])


def font():
    try:
        return ImageFont.truetype('arial.ttf', 18)
    except Exception:
        return None


def same_head(kind, names, fn):
    H = 240
    items = []
    for n in names:
        im = figs[n]
        sc = H / HH[n]
        im2 = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
        items.append((n, im2))
    Wd = sum(i.width + 30 for _, i in items) + 30
    Ht = max(i.height for _, i in items) + 120
    b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
    d = ImageDraw.Draw(b)
    x = 30
    for n, i in items:
        top = i.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()[1]
        b.alpha_composite(i, (x, 60 - top))
        d.text((x, 6), n, fill=(0, 0, 0, 255), font=font())
        x += i.width + 30
    d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
    d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
    b.convert('RGB').save(os.path.join(BO, fn))


hn = ['ref-h'] + [n for n in ['h-rise', 'h-peel', 'h-slide', 'h-hand']]
an = ['ref-a'] + [n for n in ['a-raise', 'a-lookback', 'a-pin', 'a-catch', 'a-hand', 'a-lookdown', 'a-kneel', 'a-read', 'a-lookup']]
same_head('h', hn, 'p1-human-same-head.png')
same_head('a', an, 'p1-ai-same-head.png')

# film scale: standing figures at the reference standing height (human ref height for h-*, AI ref height for a-*)
items = []
for n in ['ref-h', 'h-peel', 'h-slide', 'h-hand', 'ref-a', 'a-raise', 'a-lookback', 'a-pin', 'a-catch', 'a-hand', 'a-lookdown']:
    ref = figs['ref-h' if n.startswith('h') or n == 'ref-h' else 'ref-a']
    rh = ref.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
    rh = rh[3] - rh[1]
    im = figs[n]
    bb = im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
    sc = rh / (bb[3] - bb[1])
    items.append((n, im.crop(bb).resize((round((bb[2] - bb[0]) * sc), round(rh)), Image.LANCZOS)))
Wd = sum(i.width + 30 for _, i in items) + 30
Ht = max(i.height for _, i in items) + 60
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
d = ImageDraw.Draw(b)
x = 30
for n, i in items:
    b.alpha_composite(i, (x, Ht - i.height - 10))
    d.text((x, 6), n, fill=(0, 0, 0, 255), font=font())
    x += i.width + 30
b.convert('RGB').save(os.path.join(BO, 'p1-film-scale.png'))

with open(META1, 'w') as f:
    json.dump(meta, f, indent=1)
