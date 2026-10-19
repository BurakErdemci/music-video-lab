# Part-3 bus lane: plate bus-int (mirrored raw, magenta keyed, untrimmed) + man poses hb-*. Reuses prep_p1.py helpers.
# Run from the repo root: python stil/canli/prep_p3_bus.py
import json
import os
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, save, ROOT, HAM, meta
OUT3 = os.path.join(ROOT, 'video', 'public', 'living', 'p3')
META3 = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p3-bus.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
os.makedirs(OUT3, exist_ok=True)
M = json.load(open(os.path.join(HERE, 'p3-bus-measured.json')))
out = {}

# plate: the raw image was mirrored (window on the right, seat facing right) - ham/p3-bus-int-flip.png
plate_rgb = Image.open(os.path.join(HAM, 'p3-bus-int-flip.png')).convert('RGB')
plate = key(os.path.join(HAM, 'p3-bus-int-flip.png'))
plate.save(os.path.join(OUT3, 'bus-int.png'))
out['bus-int'] = {'w': plate.width, 'h': plate.height, **M['plate']}

sprites = {}
for short, raw in M['chosen'].items():
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    sp, (ox, oy) = trim(im, box)
    sprites[short] = sp
    sp.save(os.path.join(OUT3, short + '.png'))
    r = M['raw'][short]
    e = {'w': sp.width, 'h': sp.height, 'bbox': list(sp.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox())}
    for k, v in r.items():
        if k == 'note':
            e[k] = [v[0] - ox, v[1] - oy, v[2], v[3]]
        elif k == 'backX':
            e[k] = v - ox
        elif k == 'floorY':
            e[k] = v - oy
        else:
            e[k] = [v[0] - ox, v[1] - oy]
    if short in M['scale']:
        s = M['scale'][short]
        px, py = M['plate']['seat']
        e['fit'] = {'scale': s, 'dx': round(px - s * e['hips'][0]), 'dy': round(py - s * e['hips'][1])}
    out[short] = e
    print(short, e)
json.dump(out, open(META3, 'w'), indent=1)

# plate board: window quad and points
b = plate_rgb.copy()
d = ImageDraw.Draw(b)
w = M['plate']['window']
d.polygon([tuple(p) for p in w], outline=(0, 255, 0))
d.line([tuple(p) for p in M['plate']['sill']], fill=(255, 0, 0), width=3)
for k in ('seat', 'seatBack'):
    x, y = M['plate'][k]
    d.ellipse([x - 8, y - 8, x + 8, y + 8], outline=(0, 255, 255), width=3)
    d.text((x + 12, y - 6), k, fill=(255, 255, 255))
b.save(os.path.join(BO, 'p3-bus-plate-points.png'))

# fit boards: each pose on the plate
bg = Image.new('RGBA', plate.size, (40, 90, 170, 255))  # stand-in for the later-filled glass
bg.alpha_composite(plate)
for short in M['scale']:
    e = out[short]
    s = e['fit']['scale']
    sp = sprites[short].resize((round(sprites[short].width * s), round(sprites[short].height * s)), Image.LANCZOS)
    c = bg.copy()
    # man behind the seat's front cushion is not modelled; the sprite is drawn over the plate
    c.alpha_composite(sp, (e['fit']['dx'], e['fit']['dy']))
    dd = ImageDraw.Draw(c)
    for k in ('temple', 'mouth', 'hips', 'headTop'):
        if k in e:
            x = e['fit']['dx'] + e[k][0] * s
            y = e['fit']['dy'] + e[k][1] * s
            dd.ellipse([x - 5, y - 5, x + 5, y + 5], outline=(255, 0, 0), width=2)
    c.convert('RGB').save(os.path.join(BO, 'p3-bus-fit-%s.png' % short))

# same-person board: refs + the four poses at one head height (head ~ top 14% of each figure)
poz = key(os.path.join(ROOT, 'stil', 'hareket', 'ref-insan-kanonik.png'))
figs = [('ref', poz)] + [(k, v) for k, v in sprites.items()]
H = 300
items = []
for n, im in figs:
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(bb)
    sc = H / (im.height * 0.16)  # head ~ 16 % of figure height (judged by eye; same rule for all)
    items.append((n, im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)))
sheet = Image.new('RGBA', (sum(i.width + 20 for _, i in items) + 20, max(i.height for _, i in items) + 60), (150, 150, 150, 255))
x = 20
for n, i in items:
    sheet.alpha_composite(i, (x, 40))
    ImageDraw.Draw(sheet).text((x, 5), n, fill=(0, 0, 0, 255))
    x += i.width + 20
sheet.convert('RGB').save(os.path.join(BO, 'p3-bus-same-person.png'))
