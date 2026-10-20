# Part-2 magnifier plate: magenta key -> alpha, trim, measure the lens hole (centre + inner radius, sprite px).
# Run from the repo root: python stil/canli/prep_p2m.py
import json
import os
from collections import deque
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
P1SRC = open(os.path.join(HERE, 'prep_p1.py'), encoding='utf-8').read()
exec(compile(P1SRC.split('\nfor short in')[0], 'prep_p1.py', 'exec'))  # key, trim, ROOT, HAM
OUT2 = os.path.join(ROOT, 'video', 'public', 'living', 'p2')
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites-p2m.json')
CHOSEN = {'h-ots-lens': 'p2m-h-lens-c'}

meta = {}
for short, raw in CHOSEN.items():
    im = key(os.path.join(HAM, raw + '.png'))
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 12
    # the plate is cut by the bottom edge: keep that edge
    box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), im.height)
    sp = trim(im, box)[0]
    a = sp.split()[3].load()
    w, h = sp.size
    # transparent pixels not connected to the border = the lens hole
    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if a[x, y] < 128 and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if a[x, y] < 128 and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and a[nx, ny] < 128:
                seen[ny][nx] = True
                q.append((nx, ny))
    pts = [(x, y) for y in range(h) for x in range(w) if a[x, y] < 128 and not seen[y][x]]
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    r = (len(pts) / 3.14159265) ** 0.5
    sp.save(os.path.join(OUT2, short + '.png'))
    meta[short] = {'w': w, 'h': h, 'bbox': list(sp.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()), 'lens': [round(cx, 1), round(cy, 1), round(r, 1)], 'hole_px': len(pts)}
    print(short, meta[short])
json.dump(meta, open(META, 'w'), indent=1)
