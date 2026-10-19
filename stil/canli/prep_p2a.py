# Part-2 AI sprites (a-sit rig, a-step1..3, a-trip, a-tap, a-thumb, a-squint). Reuses prep_p1.py helpers (exec of its function
# section). Run from the repo root: python stil/canli/prep_p2a.py
# Output: video/public/living/p2/a-*.png (+ -eye/-noeye), video/src/living/sprites-p2a.json, boards/p2-*.png
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, eye_rect, outline, save, split_eye, eye_rect_loose, alpha_bbox, ROOT, HAM, meta
exec(compile('def head_h' + P1SRC.split('def head_h')[1].split('\nSTAND =')[0], 'prep_p1.py', 'exec'))
OUT = os.path.join(ROOT, 'video', 'public', 'living', 'p2')
OUT1 = OUT  # save() / split_eye() write to OUT1
os.makedirs(OUT, exist_ok=True)
META2 = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p2a.json')
BO = os.path.join(HERE, 'boards')
LIV = os.path.join(ROOT, 'video', 'public', 'living')
POZ = os.path.join(ROOT, 'stil', 'pozlar')
MEAS = json.load(open(os.path.join(HERE, 'p2a-measured.json')))
NAMES = ['a-sit', 'a-step1', 'a-step2', 'a-step3', 'a-trip', 'a-tap', 'a-thumb', 'a-squint']


def sprite2(n):
    im = key(os.path.join(HAM, 'p2-' + n + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    return trim(im, box)[0]


def opaque_bbox(im):
    return im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()


sprites = {}
for n in NAMES:
    sp = sprite2(n)
    sprites[n] = sp
    extra = dict(MEAS.get(n, {}))
    try:
        rect = eye_rect(sp)
    except SystemExit:
        rect = eye_rect_loose(sp)
        print('NOTE', n, 'stock eye detector failed, loose fallback ->', rect)
    extra['eye'] = list(rect)
    split_eye(n, sp, rect)
    extra['outline'] = outline(sp)
    if n != 'a-sit':
        extra['floorY'] = opaque_bbox(sp)[3] - 1
    save(n, sp, extra)

# ---------- a-sit rig: both lower legs rotate about the knee ----------
SIT = sprites['a-sit']
M = MEAS['a-sit']
KX, KY = M['knee']
CUT, BACK, THIGH_BOTTOM, TUCK = M['cut'], M['shinBackX'], M['thighBottomY'], M.get('tuck', 14)
W, H = SIT.size
sp_px = SIT.load()
noeye = Image.open(os.path.join(OUT, 'a-sit-noeye.png')).convert('RGBA')
shins = Image.new('RGBA', SIT.size, (0, 0, 0, 0))
body = noeye.copy()  # body without the cursor eye; the -eye layer is composited on top as for other sprites
sh_px, bd_px = shins.load(), body.load()
for y in range(H):
    for x in range(W):
        if y >= CUT and x < (BACK if y <= THIGH_BOTTOM + 6 else BACK + 25):
            sh_px[x, y] = sp_px[x, y]
            if y >= CUT + TUCK:
                bd_px[x, y] = (0, 0, 0, 0)
shins.save(os.path.join(OUT, 'a-sit-shins.png'))
body.save(os.path.join(OUT, 'a-sit-body-noeye.png'))
# a-sit-body keeps the cursor line (as a-wave-body does); -eye is the same eye crop as a-sit-eye
ex, ey, ew, eh = meta['a-sit']['eye']
bodyeye = body.copy()
bodyeye.alpha_composite(Image.open(os.path.join(OUT, 'a-sit-eye.png')), (ex - 2, ey - 2))
bodyeye.save(os.path.join(OUT, 'a-sit-body.png'))
Image.open(os.path.join(OUT, 'a-sit-eye.png')).save(os.path.join(OUT, 'a-sit-body-eye.png'))
seat_y = max(y for y in range(H) for x in range(290, W) if sp_px[x, y][3] > 128 and y < 600)
seat_xs = [x for x in range(290, W) if sp_px[x, seat_y][3] > 128]
meta['a-sit'].update({'knee': [KX, KY], 'seat': [(seat_xs[0] + seat_xs[-1]) // 2, seat_y], 'cut': CUT})
meta['a-sit-shins'] = {'w': W, 'h': H, 'bbox': alpha_bbox(shins), 'pivot': [KX, KY]}
meta['a-sit-body'] = {'w': W, 'h': H, 'bbox': alpha_bbox(bodyeye), 'eye': meta['a-sit']['eye']}
print('a-sit', meta['a-sit']['knee'], meta['a-sit']['seat'])


# cream RGB under the transparent shin pixels so the rotated edge does not blend with black
bleed = Image.new('RGBA', SIT.size, sp_px[95, 600][:3] + (0,))
bleed.paste(shins, (0, 0), shins)


def sit_pose(ang, bgc=(200, 200, 200, 255)):
    comp = Image.new('RGBA', SIT.size, (0, 0, 0, 0))
    comp.alpha_composite(body)
    comp.alpha_composite(bleed.rotate(ang, resample=Image.BICUBIC, center=(KX, KY)))
    comp.alpha_composite(Image.open(os.path.join(OUT, 'a-sit-eye.png')), (ex - 2, ey - 2))
    t = Image.new('RGBA', (W + 20, H - 380), bgc)
    t.alpha_composite(comp.crop((0, 380, W, H)), (10, 0))
    ImageDraw.Draw(t).text((8, 4), '%+d deg' % ang, fill=(255, 0, 0, 255))
    return t


tiles = [sit_pose(a) for a in (-15, 0, 15)]
bd = Image.new('RGBA', (sum(t.width for t in tiles), tiles[0].height), (200, 200, 200, 255))
x = 0
for t in tiles:
    bd.alpha_composite(t, (x, 0))
    x += t.width
bd.resize((bd.width * 2, bd.height * 2), Image.LANCZOS).convert('RGB').save(os.path.join(BO, 'p2-sit-rig.png'))
zt = []
for a in (-15, 0, 15):
    t = sit_pose(a).crop((0, 60, 260, 300))
    zt.append(t.resize((t.width * 3, t.height * 3), Image.LANCZOS))
zb = Image.new('RGB', (sum(t.width for t in zt), zt[0].height))
x = 0
for t in zt:
    zb.paste(t.convert('RGB'), (x, 0))
    x += t.width
zb.save(os.path.join(BO, 'p2-sit-rig-knee.png'))


# ---------- head heights (neck rule) + boards ----------
def trimmed_ref(path):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    return trim(im, bb)[0]


figs = {'ref-a': trimmed_ref(os.path.join(POZ, 'ref-ai.png')), 'ai-stand': Image.open(os.path.join(LIV, 'ai-stand.png')).convert('RGBA')}
for n in NAMES:
    figs[n] = sprites[n]
HH = {}
for n, im in figs.items():
    hh = MEAS.get('headOverride', {}).get(n) or head_h(im)
    HH[n] = hh
    bb = opaque_bbox(im)
    print('HEAD', n, 'head', hh, 'height', bb[3] - bb[1], 'ratio %.3f' % (hh / (bb[3] - bb[1])))
    if n in meta:
        meta[n]['headPx'] = hh


def fnt():
    try:
        return ImageFont.truetype('arial.ttf', 18)
    except Exception:
        return None


def same_head(names, fn, Hh=240):
    items = []
    for n in names:
        sc = Hh / HH[n]
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
    d.line([(0, 60 + Hh), (Wd, 60 + Hh)], fill=(0, 255, 255, 255), width=1)
    b.convert('RGB').save(os.path.join(BO, fn))


same_head(['ref-a', 'ai-stand'] + NAMES, 'p2-ai-same-head.png')

ST = ['a-step1', 'a-step2', 'a-step3']
Wd = sum(sprites[n].width for n in ST) + 80
Ht = max(sprites[n].height for n in ST) + 60
b = Image.new('RGBA', (Wd, Ht), (150, 150, 150, 255))
d = ImageDraw.Draw(b)
floor = Ht - 30
x = 20
for n in ST:
    b.alpha_composite(sprites[n], (x, floor - meta[n]['floorY'] - 1))
    bb = opaque_bbox(sprites[n])
    d.text((x, 6), '%s h=%d' % (n, bb[3] - bb[1]), fill=(0, 0, 0, 255), font=fnt())
    x += sprites[n].width + 20
d.line([(0, floor), (Wd, floor)], fill=(0, 255, 255, 255))
b.convert('RGB').save(os.path.join(BO, 'p2-ai-strides.png'))

with open(META2, 'w') as f:
    json.dump(meta, f, indent=1)
