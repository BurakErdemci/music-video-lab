# Part-1 fix round sprites (desk2, h-sip2, h-mug2, a-turn, a-watch, a-back34). Reuses prep_p1.py's helpers by exec of its
# function section (its pipeline is not run, prep_p1.py is untouched). Run from the repo root: python stil/canli/prep_p1v2.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, eye_rect, outline, save, split_eye, eye_rect_loose, OUT1, meta
exec(compile('def head_h' + P1SRC.split('def head_h')[1].split('\nSTAND =')[0], 'prep_p1.py', 'exec'))
META2 = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p1v2.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
LIV = os.path.join(ROOT, 'video', 'public', 'living')
POZ = os.path.join(ROOT, 'stil', 'pozlar')

# chosen attempts (see README-p1v2.md)
CHOSEN = {'desk2': 'p1v2-desk-b', 'h-sip2': 'p1v2-h-sip-r1', 'h-mug2': 'p1v2-h-mug-r2',
          'a-turn': 'p1v2-a-turn', 'a-watch': 'p1v2-a-watch', 'a-back34': 'p1v2-a-back34'}
# hand-measured on zoomed crops (sprite px), filled after looking at the sprites
MEASURED = json.load(open(os.path.join(HERE, 'p1v2-measured.json'))) if os.path.exists(os.path.join(HERE, 'p1v2-measured.json')) else {}


def sprite2(raw):
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    return trim(im, box)[0]


sprites = {}
for short, raw in CHOSEN.items():
    sp = sprite2(raw)
    sprites[short] = sp
    extra = dict(MEASURED.get(short, {}))
    if short.startswith('a-'):
        try:
            if short == 'a-back34':  # eye is a sliver fused with the head outline (3/4 back view): treated as hidden
                raise SystemExit
            rect = eye_rect(sp)
        except SystemExit:
            rect = None
        if rect:
            extra['eye'] = list(rect)
            split_eye(short, sp, rect)
        else:
            sp.save(os.path.join(OUT1, short + '-noeye.png'))
            Image.new('RGBA', (1, 1), (0, 0, 0, 0)).save(os.path.join(OUT1, short + '-eye.png'))
            print('NOTE', short, 'no eye found: -noeye is a copy, -eye is 1x1 transparent')
        extra['outline'] = outline(sp)
    save(short, sp, extra)
with open(META2, 'w') as f:
    json.dump(meta, f, indent=1)


# ---------- boards + head ratios ----------
def trimmed_ref(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


def opaque_bbox(im):
    return im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()


figs = {'ref-h': trimmed_ref(os.path.join(POZ, 'ref-insan.png')), 'ref-a': trimmed_ref(os.path.join(POZ, 'ref-ai.png')),
        'h-sip2': sprites['h-sip2'], 'h-mug2': sprites['h-mug2'], 'a-turn': sprites['a-turn'], 'a-watch': sprites['a-watch'],
        'a-back34': sprites['a-back34'],
        'old-sit-sip': Image.open(os.path.join(LIV, 'h-sit-sip.png')).convert('RGBA'),
        'old-sit-mug': Image.open(os.path.join(LIV, 'h-sit-mug.png')).convert('RGBA'),
        'ai-stand': Image.open(os.path.join(LIV, 'ai-stand.png')).convert('RGBA')}
HOVR = json.load(open(os.path.join(HERE, 'p1v2-measured.json'))).get('headOverride', {})
HH = {}
for n, im in figs.items():
    hh = HOVR.get(n) or head_h(im)
    HH[n] = hh
    bb = opaque_bbox(im)
    print('HEAD', n, 'head', hh, 'height', bb[3] - bb[1], 'ratio %.3f' % (hh / (bb[3] - bb[1])))


def fnt():
    try:
        return ImageFont.truetype('arial.ttf', 18)
    except Exception:
        return None


def same_head(names, fn):
    H = 240
    items = []
    for n in names:
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
        d.text((x, 6), n, fill=(0, 0, 0, 255), font=fnt())
        x += i.width + 30
    d.line([(0, 60), (Wd, 60)], fill=(255, 0, 0, 255), width=1)
    d.line([(0, 60 + H), (Wd, 60 + H)], fill=(0, 255, 255, 255), width=1)
    b.convert('RGB').save(os.path.join(BO, fn))


same_head(['ref-h', 'h-sip2', 'h-mug2', 'old-sit-sip', 'old-sit-mug'], 'p1v2-human-same-head.png')
same_head(['ref-a', 'a-turn', 'a-watch', 'a-back34', 'ai-stand'], 'p1v2-ai-same-head.png')

# desk next to the seated man: man's chair-leg bottoms and the desk leg bottoms on one line.
# Scale: desk height (top surface to floor) vs seat height. Man scaled so his head matches a 0.133 of his height ... judged by eye:
# the man is drawn at DESK_K x his sprite size; chair legs bottom = his sprite bottom.
desk = figs['desk2'] if 'desk2' in figs else sprites['desk2']
man = sprites['h-mug2']
DESK_K = 0.62  # desk px per man px, chosen so the seat (~y 635 of 813) sits just under the desk top (desk top ~ y 345 of 781 at K=1 -> table height 436)
MAN_K = 0.62
Wd = int(desk.width * 0.62) + int(man.width * 0.62) + 60
mh = int(man.height * MAN_K)
Ht = max(int(desk.height * DESK_K), mh) + 60
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
floor = Ht - 30
dsk = desk.resize((round(desk.width * DESK_K), round(desk.height * DESK_K)), Image.LANCZOS)
mn = man.resize((round(man.width * MAN_K), round(man.height * MAN_K)), Image.LANCZOS)
fy_d = round(meta['desk2']['floorY'] * DESK_K)
mbb = opaque_bbox(mn)
b.alpha_composite(dsk, (20, floor - fy_d))
b.alpha_composite(mn, (20 + dsk.width + 10 - 50, floor - mbb[3]))  # overlap so the man sits at the desk
ImageDraw.Draw(b).line([(0, floor), (Wd, floor)], fill=(0, 255, 255, 255))
b.convert('RGB').save(os.path.join(BO, 'p1v2-desk-with-man.png'))

# mug grip zoom (2x)
tiles = []
for n, box in (('h-sip2', (180, 60, 380, 260)), ('h-mug2', (260, 220, 460, 380))):
    c = sprites[n].crop(box)
    bg = Image.new('RGBA', c.size, (150, 150, 150, 255))
    bg.alpha_composite(c)
    tiles.append(bg.resize((c.width * 3, c.height * 3), Image.LANCZOS))
g = Image.new('RGB', (sum(t.width for t in tiles) + 20, max(t.height for t in tiles)), (80, 80, 80))
g.paste(tiles[0].convert('RGB'), (0, 0))
g.paste(tiles[1].convert('RGB'), (tiles[0].width + 20, 0))
g.save(os.path.join(BO, 'p1v2-mug-grip.png'))
