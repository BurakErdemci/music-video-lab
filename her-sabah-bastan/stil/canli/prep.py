# Cuts the chosen Codex drawings (stil/canli/ham/) into transparent sprites for the LivingTest composition:
# magenta key -> alpha (with the magenta unmixed out of the edge pixels), strips split into single poses, each
# trimmed with a small margin. Writes video/public/living/*.png and video/src/living/sprites.json (sizes, feet
# baseline, AI cursor-eye rectangle, AI outline polyline for the pen reveal). PIL only (no numpy on this machine).
# Run from the repo root: python stil/canli/prep.py
import json
import os
from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HAM = os.path.join(ROOT, 'stil', 'canli', 'ham')
OUT = os.path.join(ROOT, 'video', 'public', 'living')
META = os.path.join(ROOT, 'video', 'src', 'living', 'sprites.json')
os.makedirs(OUT, exist_ok=True)

LO, HI = 50, 190  # magenta-ness (min(R,B) - G) where alpha starts to fall / is fully gone


def key(path):
    im = Image.open(path).convert('RGB')
    r, g, b = im.split()
    m = ImageChops.subtract(ImageChops.darker(r, b), g)
    a = m.point(lambda v: 255 if v <= LO else (0 if v >= HI else int(round(255 * (HI - v) / (HI - LO)))))
    out = im.convert('RGBA')
    out.putalpha(a)
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            R, G, B, A = px[x, y]
            if A == 0:
                px[x, y] = (0, 0, 0, 0)
            elif A < 255:
                # unmix: pixel = af * c + (1 - af) * magenta
                af = A / 255
                c = [(R - (1 - af) * 255) / af, (G - 0) / af, (B - (1 - af) * 255) / af]
                px[x, y] = tuple(max(0, min(255, int(round(v)))) for v in c) + (A,)
    return out


def runs(mask_cols, gap=12):
    out, start, last = [], None, None
    for i, on in enumerate(mask_cols):
        if on:
            if start is None:
                start = i
            last = i
        elif start is not None and i - last > gap:
            out.append((start, last + 1))
            start = None
    if start is not None:
        out.append((start, last + 1))
    return out


def split_poses(im, min_w=60):
    a = im.split()[3].point(lambda v: 255 if v > 128 else 0)
    w, h = im.size
    cols = [a.crop((x, 0, x + 1, h)).getbbox() is not None for x in range(w)]
    return [(max(0, a - 10), min(w, b + 10)) for a, b in runs(cols) if b - a >= min_w]


def trim(im, box, pad=6):
    sub = im.crop(box)
    bb = sub.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    x0, y0, x1, y1 = bb
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(sub.width, x1 + pad), min(sub.height, y1 + pad)
    return sub.crop((x0, y0, x1, y1)), (box[0] + x0, box[1] + y0)


def eye_rect(sp):
    # The cursor eye: the dark component inside the head (top 16 % of the figure) that does not touch transparency.
    w, h = sp.size
    px = sp.load()
    head_h = int(h * 0.16)
    dark = lambda x, y: px[x, y][3] > 200 and sum(px[x, y][:3]) < 330
    seen = set()
    best = None
    for y in range(head_h):
        for x in range(w):
            if (x, y) in seen or not dark(x, y):
                continue
            stack, comp, edge = [(x, y)], [], False
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if not (0 <= nx < w and 0 <= ny < h):
                        edge = True
                        continue
                    if px[nx, ny][3] < 100:
                        edge = True
                    if (nx, ny) not in seen and dark(nx, ny):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if edge or len(comp) < 40:
                continue
            xs = [p[0] for p in comp]
            ys = [p[1] for p in comp]
            bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            if bh > bw * 2 and (best is None or len(comp) > best[4]):
                best = (min(xs), min(ys), bw, bh, len(comp))
    if best is None:
        raise SystemExit('no cursor eye found')
    return best[:4]


def outline(sp, step=3):
    # Outer alpha boundary as a closed polyline (marching along boundary pixels), starting at the top of the head.
    w, h = sp.size
    px = sp.load()
    on = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] > 128
    # start: topmost opaque pixel
    start = None
    for y in range(h):
        for x in range(w):
            if on(x, y):
                start = (x, y)
                break
        if start:
            break
    # Moore neighbour tracing
    dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    pts = [start]
    cur, prev_dir = start, 6
    for _ in range(200000):
        found = False
        for k in range(8):
            d = (prev_dir + 6 + k) % 8  # start searching from the left of the previous direction
            nx, ny = cur[0] + dirs[d][0], cur[1] + dirs[d][1]
            if on(nx, ny):
                cur, prev_dir, found = (nx, ny), d, True
                break
        if not found or cur == start:
            break
        pts.append(cur)
    # smooth + decimate
    n = len(pts)
    k = 4
    sm = [(sum(pts[(i + j) % n][0] for j in range(-k, k + 1)) / (2 * k + 1), sum(pts[(i + j) % n][1] for j in range(-k, k + 1)) / (2 * k + 1)) for i in range(n)]
    return [[round(x, 1), round(y, 1)] for x, y in sm[::step]]


meta = {}


def save(name, sp, extra=None):
    sp.save(os.path.join(OUT, name + '.png'))
    bb = sp.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
    meta[name] = {'w': sp.width, 'h': sp.height, 'bbox': list(bb), **(extra or {})}
    print(name, sp.size, bb)


# Human seated pair (P1 mug at chest, P2 mug raised)
im = key(os.path.join(HAM, 'h-otur-a.png'))
poses = split_poses(im)
assert len(poses) == 2, poses
for name, (x0, x1) in zip(['h-sit-mug', 'h-sit-sip'], poses):
    sp, _ = trim(im, (x0, 0, x1, im.height))
    save(name, sp)

# Human at the glass with the note
im = key(os.path.join(HAM, 'h-cam-not-b.png'))
poses = split_poses(im)
assert len(poses) == 1, poses
sp, _ = trim(im, (poses[0][0], 0, poses[0][1], im.height))
save('h-glass-note', sp)

# AI strip: neutral, wave A, wave B
im = key(os.path.join(HAM, 'a-poz-a.png'))
poses = split_poses(im)
assert len(poses) == 3, poses
for i, (name, (x0, x1)) in enumerate(zip(['ai-stand', 'ai-wave-a', 'ai-wave-b'], poses)):
    sp, _ = trim(im, (x0, 0, x1, im.height))
    ex, ey, ew, eh = eye_rect(sp)
    extra = {'eye': [ex, ey, ew, eh]}
    # eyeless copy: the eye area refilled with the head's cream (sampled just right of the eye)
    clean = sp.copy()
    cp = clean.load()
    fill = sp.load()[min(sp.width - 1, ex + ew + 6), ey + eh // 2]
    for y in range(ey - 2, ey + eh + 2):
        for x in range(ex - 2, ex + ew + 2):
            cp[x, y] = fill
    eye = sp.crop((ex - 2, ey - 2, ex + ew + 2, ey + eh + 2))
    clean.save(os.path.join(OUT, name + '-noeye.png'))
    eye.save(os.path.join(OUT, name + '-eye.png'))
    if name == 'ai-stand':
        extra['outline'] = outline(sp)
    save(name, sp, extra)

# Desk + monitor prop
im = key(os.path.join(HAM, 'masa-monitor-a.png'))
bb = im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
sp, _ = trim(im, (0, 0, im.width, im.height))
save('desk', sp)

# Room plate: only the window panes are magenta; keep full frame
im = key(os.path.join(HAM, 'bg-oda-sabah-a.png'))
im.save(os.path.join(OUT, 'room-morning.png'))
meta['room-morning'] = {'w': im.width, 'h': im.height, 'window': list(im.split()[3].point(lambda v: 0 if v > 128 else 255).getbbox())}
print('room', meta['room-morning'])

with open(META, 'w') as f:
    json.dump(meta, f, indent=1)
