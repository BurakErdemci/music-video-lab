# Part-3 plates/props (lane pl). Run from the repo root: python stil/canli/prep_p3_pl.py
import json
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'prep.py'), encoding='utf-8').read()
exec(compile(src.split('\nmeta = {}')[0], 'prep.py', 'exec'))  # ROOT, HAM, key, trim
OUT = os.path.join(ROOT, 'video', 'public', 'living', 'p3')
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p3-pl.json')
BO = os.path.join(ROOT, 'stil', 'canli', 'boards')
os.makedirs(OUT, exist_ok=True)
M = json.load(open(os.path.join(HERE, 'p3-pl-measured.json')))
CHOSEN = {'st-shops-a': 'p3-pl-shops-a', 'st-shops-b': 'p3-pl-shops-b', 'st-tv': 'p3-pl-tv', 'st-cafe': 'p3-pl-cafe',
          'st-table': 'p3-pl-table', 'st-props': 'p3-pl-props'}
meta = {}


def abbox(im):
    return list(im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox())


def components(mask, minpx):
    w, h = mask.size
    px = mask.load()
    seen = [[False] * w for _ in range(h)]
    out = []
    for y in range(h):
        for x in range(w):
            if px[x, y] and not seen[y][x]:
                st, n = [(x, y)], 0
                x0 = x1 = x
                y0 = y1 = y
                seen[y][x] = True
                pts = []
                while st:
                    cx, cy = st.pop()
                    pts.append((cx, cy))
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            st.append((nx, ny))
                if len(pts) >= minpx:
                    out.append(((x0, y0, x1 + 1, y1 + 1), pts))
    return out


def trimmed(im, pad=12):
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    return im.crop(box), box


keyed = {n: key(os.path.join(HAM, r + '.png')) for n, r in CHOSEN.items()}
for n in ('st-shops-a', 'st-shops-b', 'st-tv', 'st-cafe'):
    im = keyed[n]
    im.save(os.path.join(OUT, n + '.png'))
    meta[n] = {'w': im.width, 'h': im.height, **M[n]}

# TV screens: transparent holes inside the window that do not touch the sky (hole components, left-to-right, top-to-bottom)
tv = keyed['st-tv']
wx, wy, ww, wh = meta['st-tv']['window']
hole = tv.split()[3].point(lambda v: 255 if v < 128 else 0).crop((wx, wy, wx + ww, wy + wh))
scr = [(b[0] + wx, b[1] + wy, b[2] - b[0], b[3] - b[1]) for b, _ in components(hole, 3000)]
rows = []
for s in sorted(scr, key=lambda s: s[1]):
    for r in rows:
        if abs(r[0][1] - s[1]) < 60:
            r.append(s)
            break
    else:
        rows.append([s])
meta['st-tv']['screens'] = [list(s) for r in rows for s in sorted(r)]
print('screens', len(scr))

# table prop (trimmed)
tb, box = trimmed(keyed['st-table'])
tb.save(os.path.join(OUT, 'st-table.png'))
a = tb.split()[3].point(lambda v: 255 if v > 128 else 0)
bb = a.getbbox()
floor = bb[3] - 1
legs = [(x0, x1 - 1) for (x0, y0, x1, y1), _ in sorted(components(a.crop((0, floor - 20, tb.width, floor + 1)), 100))]
meta['st-table'] = {'w': tb.width, 'h': tb.height, 'bbox': abbox(tb), 'topY': bb[1], 'floorY': floor, 'legs': [list(l) for l in legs]}

# props: split by connected component
pr = keyed['st-props']
al = pr.split()[3].point(lambda v: 255 if v > 128 else 0)
comps = sorted(components(al, 3000), key=lambda c: c[0][0])
big = [c for c in comps if (c[0][2] - c[0][0]) * (c[0][3] - c[0][1]) > 20000]
print('prop components', len(comps), 'big', len(big))
parts = {}
for name, (b, pts) in zip(('st-tree', 'st-lamp'), big):
    # leaves may be disconnected from the crown: take every component whose bbox sits inside the horizontal span
    p = 12
    sp = pr.crop((max(0, b[0] - p), max(0, b[1] - p), min(pr.width, b[2] + p), min(pr.height, b[3] + p)))
    if name == 'st-tree':  # magenta spill between leaves reads as pink: clear it
        q = sp.load()
        for yy in range(sp.height):
            for xx in range(sp.width):
                r, g, bl, al = q[xx, yy]
                if al and r > 190 and bl > g + 40 and bl > 120 and not (g > 200 and bl > 200):
                    q[xx, yy] = (0, 0, 0, 0)
    sp.save(os.path.join(OUT, name + '.png'))
    meta[name] = {'w': sp.width, 'h': sp.height, 'bbox': abbox(sp), 'baseY': abbox(sp)[3] - 1}
    parts[name] = (b, sp)
json.dump(meta, open(META, 'w'), indent=1)

# ---------- boards ----------
RED = (255, 0, 0)
for n in ('st-shops-a', 'st-shops-b', 'st-tv', 'st-cafe'):
    bg = Image.new('RGBA', keyed[n].size, (40, 160, 90, 255))
    bg.alpha_composite(keyed[n])
    d = ImageDraw.Draw(bg)
    m = meta[n]
    for k in ('windows', 'upperWindows', 'screens'):
        for x, y, w, h in m.get(k, []):
            d.rectangle((x, y, x + w, y + h), outline=RED if k != 'upperWindows' else (0, 255, 255), width=3)
    if 'window' in m:
        x, y, w, h = m['window']
        d.rectangle((x, y, x + w, y + h), outline=(255, 128, 0), width=4)
    for k in ('sidewalkY', 'roofY'):
        if k in m:
            d.line((0, m[k], bg.width, m[k]), fill=(255, 128, 0), width=3)
    if 'frame' in m:
        for x in m['frame']:
            d.line((x, 0, x, bg.height), fill=RED, width=3)
        d.line((m['glassX'], 0, m['glassX'], bg.height), fill=(0, 255, 255), width=2)
    bg.convert('RGB').save(os.path.join(BO, 'p3-pl-' + n[3:] + '-points.png'))
# table + props board
W = 1700
bd = Image.new('RGB', (W, 700), (40, 160, 90))
t = meta['st-table']
bd.paste(tb, (20, 20), tb)
d = ImageDraw.Draw(bd)
d.line((20, 20 + t['topY'], 20 + tb.width, 20 + t['topY']), fill=RED, width=2)
d.line((20, 20 + t['floorY'], 20 + tb.width, 20 + t['floorY']), fill=(0, 255, 255), width=2)
for x0, x1 in t['legs']:
    d.rectangle((20 + x0, 20, 20 + x1, 20 + t['floorY']), outline=(255, 255, 0), width=1)
x = 1560 - 900
for name in ('st-tree', 'st-lamp'):
    sp = Image.open(os.path.join(OUT, name + '.png'))
    sp = sp.resize((sp.width * 3 // 4, sp.height * 3 // 4))
    y = 690 - sp.height
    bd.paste(sp, (x, y), sp)
    d.line((x, 690, x + sp.width, 690), fill=(0, 255, 255), width=2)
    x += sp.width + 40
bd.save(os.path.join(BO, 'p3-pl-table-props.png'))
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk not in ('upperWindows',)} for k, v in meta.items()}))
