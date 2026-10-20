# Part-4 lane a sprites (AI poses + the pair from behind). Run from the repo root: python stil/canli/prep_p4_a.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, eye_rect, eye_rect_loose, outline, save, split_eye, meta, ROOT, HAM
exec(compile('def head_h' + P1SRC.split('def head_h')[1].split('\nSTAND =')[0], 'prep_p1.py', 'exec'))
OUT1 = os.path.join(ROOT, 'video', 'public', 'living', 'p4')
os.makedirs(OUT1, exist_ok=True)
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p4-a.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
LIV = os.path.join(ROOT, 'video', 'public', 'living')
CHOSEN = {'a-run': 'p4-a-run', 'a-swept': 'p4-a-swept', 'a-cross': 'p4-a-cross', 'pair-back': 'p4-a-pair-back'}
M = json.load(open(os.path.join(HERE, 'p4-a-measured.json')))
sprites, origin, HH = {}, {}, {}


def floor_row(im):
    a = im.split()[3].load()
    for y in range(im.height - 1, -1, -1):
        if sum(1 for x in range(im.width) if a[x, y] > 128) >= 8:
            return y + 1
    return im.height


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
        if len(v) == 1:
            extra[k] = v[0] - ox
        else:
            extra[k] = [v[0] - ox, v[1] - oy]
    if short in M['withFloor']:
        extra['floorY'] = floor_row(sp)
    h0, h1 = M['headRaw'][short]
    extra['headTop'] = h0 - oy
    extra['headH'] = h1 - h0
    HH[short] = h1 - h0
    if short in M['withEye']:
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
with open(META, 'w') as f:
    json.dump(meta, f, indent=1)
json.dump({k: {'origin': v, 'headH': HH[k]} for k, v in origin.items()}, open(os.path.join(HERE, 'p4-a-origin.json'), 'w'))


def trimmed_ref(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


def opaque_bbox(im):
    return im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()


figs = {n: sprites[n] for n in ('a-run', 'a-cross')}
figs['ai-stand'] = Image.open(os.path.join(LIV, 'ai-stand.png')).convert('RGBA')
figs['a-step1'] = Image.open(os.path.join(LIV, 'p2', 'a-step1.png')).convert('RGBA')
figs['ref-a'] = trimmed_ref(os.path.join(ROOT, 'stil', 'pozlar', 'ref-ai.png'))
for n in ('ai-stand', 'a-step1', 'ref-a'):
    HH[n] = head_h(figs[n])
    print('HEAD', n, HH[n])
for n in sprites:
    print('HEAD', n, HH[n], 'sprite', sprites[n].size)
fnt = ImageFont.truetype('arial.ttf', 18)
H = 200
items = []
for n in ['a-run', 'a-cross', 'ai-stand', 'a-step1', 'ref-a']:
    sc = H / HH[n]
    im = figs[n]
    items.append((n, im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)))
Wd = sum(i.width + 30 for _, i in items) + 30
Ht = max(i.height for _, i in items) + 120
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
d = ImageDraw.Draw(b)
x = 30
for n, i in items:
    top = opaque_bbox(i)[1]
    b.alpha_composite(i, (x, 60 - top))
    d.text((x, 6), n, fill=(0, 0, 0, 255), font=fnt)
    x += i.width + 30
d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
b.convert('RGB').save(os.path.join(BO, 'p4-a-same-head.png'))

for n, sp in sprites.items():
    t = Image.new('RGBA', sp.size, (150, 150, 150, 255))
    t.alpha_composite(sp)
    dd = ImageDraw.Draw(t)
    for k, v in meta[n].items():
        if k in ('w', 'h', 'bbox', 'outline', 'headTop', 'headH'):
            continue
        if k == 'floorY':
            dd.line([(0, v - 1), (t.width, v - 1)], fill=(255, 0, 0, 255), width=2)
        elif k == 'seam':
            dd.line([(v, 0), (v, t.height)], fill=(0, 255, 255, 255), width=2)
        elif k == 'eye':
            dd.rectangle([v[0], v[1], v[0] + v[2], v[1] + v[3]], outline=(0, 160, 255, 255), width=3)
        elif isinstance(v, list) and len(v) == 2:
            dd.ellipse([v[0] - 7, v[1] - 7, v[0] + 7, v[1] + 7], outline=(255, 0, 0, 255), width=3)
    dd.line([(0, meta[n]['headTop']), (t.width, meta[n]['headTop'])], fill=(255, 0, 0, 255))
    dd.line([(0, meta[n]['headTop'] + meta[n]['headH']), (t.width, meta[n]['headTop'] + meta[n]['headH'])], fill=(0, 255, 255, 255))
    t.convert('RGB').save(os.path.join(BO, 'p4-a-points-' + n + '.png'))
