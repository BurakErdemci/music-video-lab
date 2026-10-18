"""Render the silhouette morphs between consecutive drawings of the acting timeline.

usage (repo root): node video/scripts/tween-pairs.mjs && python video/scripts/make-tweens.py [--force]

For every drawing change listed in video/out/tween-pairs.json, fifteen in-between images (t = 1/16 .. 15/16) go to
video/public/tweens/ and their placement to video/src/characters/tweenData.ts.

Why a distance-field morph: the strips have 4 key drawings and no in-betweens. A cut between two of them
jumps; a cross-dissolve shows two half-transparent bodies (rejected by the director as ghosting). Blending
the two silhouettes' signed distance fields gives ONE solid body whose outline flows from the first shape
into the second: an arm that overlaps its old place extends or bends, the torso stays put. Inside the
morphed outline the first drawing's detail (notes, lines) is shown until t = 1/2, the second's after, over
the body's flat fill; the rim line is redrawn on the morphed edge. Measured on H12 2->3 (arm reaching out)
it reads as the arm moving; it cannot rotate a limb that does not overlap its old place (that limb thins
and regrows), which is why big moves got extra drawings (H04v2, the walk in-betweens).

If the second drawing stands somewhere else (d px), it is first aligned onto the first one (the offset that
overlaps it best) and the canvas slides the rest of the way while it morphs, so a step does not melt.
"""
import hashlib
import json
import os
import sys

from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAIRS = os.path.join(ROOT, 'video', 'out', 'tween-pairs.json')
DST = os.path.join(ROOT, 'video', 'public', 'tweens')
OUT = os.path.join(ROOT, 'video', 'src', 'characters', 'tweenData.ts')
INDEX = os.path.join(DST, 'index.json')

STEPS = 15
Q = 2  # distance fields at half resolution
RING = 2.6  # (v4) rim line width on screen, px
RING_PX = 2  # rim: the morphed mask minus its erosion by this many px (a 5x5 min filter: ~3 px line)
DETAIL_IN = 6  # px: a drawing's lines and notes are shown only this far inside its own silhouette
COLORS = {'human': ((24, 32, 58), (243, 239, 228)), 'ai': ((243, 239, 228), (24, 32, 58))}  # fill, rim
ALIGN_RANGE = 120
ALIGN_GAIN = 0.06  # realign only if the overlap gets this much better than at the true offset


def load(d):
    im = Image.open(os.path.join(ROOT, d['file'])).convert('RGBA')
    s = d['scale']
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    ax = d['ax'] * s
    if d.get('flip'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        ax = im.width - ax
    if d.get('prop'):
        return over_prop(im, ax, d['x'], d['prop'])
    return im, ax


def over_prop(fig, fax, x, P):
    """The drawing over the desk prop, placed as world/Desk.tsx places it (chair part as is, desk part scaled in x
    about the desk leg). Returns the composite and the drawing's anchor in it."""
    src = Image.open(os.path.join(ROOT, P['file'])).convert('RGBA')
    ps = P['scale']
    pw, ph = round(src.width * ps), round(src.height * ps)
    prop = src.resize((pw, ph), Image.LANCZOS)
    left = P['x'] - P['ax'] * ps  # world x of the prop image
    split = left + P['split'] * ps
    chair = prop.crop((0, 0, max(1, round(split - left)), ph))
    dw = max(1, round(pw * P['sx']))
    desk = prop.resize((dw, ph), Image.LANCZOS)
    dleft = P['x'] - P['ax'] * ps * P['sx']
    dcut = P['x'] - (P['x'] - split) * P['sx']
    desk = desk.crop((max(0, round(dcut - dleft)), 0, dw, ph))
    dleft = max(dleft, dcut)
    parts = [(chair, left + P['chairShift']), (desk, dleft), (fig, x - fax)]
    wl = min(p[1] for p in parts)
    wr = max(p[1] + p[0].width for p in parts)
    H = max(p[0].height for p in parts)
    out = Image.new('RGBA', (int(round(wr - wl)) + 1, H))
    for im, l in parts:
        out.alpha_composite(im, (int(round(l - wl)), H - im.height))
    return out, x - wl


def alpha_mask(im, q=1):
    a = im.split()[3]
    if q > 1:
        a = a.resize((max(1, im.width // q), max(1, im.height // q)), Image.BILINEAR)
    return a.point(lambda v: 255 if v > 100 else 0)


def overlap(ma, mb, ox):
    """IoU of two quarter-res masks (bottoms aligned), mb shifted by ox px (quarter res)."""
    left = min(0, ox)
    right = max(ma.width, ox + mb.width)
    h = max(ma.height, mb.height)
    ca = Image.new('L', (right - left, h))
    cb = Image.new('L', (right - left, h))
    ca.paste(ma, (-left, h - ma.height))
    cb.paste(mb, (ox - left, h - mb.height))
    inter = ImageChops.multiply(ca, cb).histogram()[255]
    union = ImageChops.lighter(ca, cb).histogram()[255]
    return inter / max(1, union)


def align(A, axA, B, axB, d):
    """Offset of B's anchor from A's anchor (screen px) that overlaps it best, near the true offset d."""
    q = 4
    ma, mb = alpha_mask(A, q), alpha_mask(B, q)
    base = lambda off: round((axA - axB + off) / q)
    true = overlap(ma, mb, base(d))
    best = (true, d)
    for off in range(d - ALIGN_RANGE, d + ALIGN_RANGE + 1, 6):
        v = overlap(ma, mb, base(off))
        if v > best[0]:
            best = (v, off)
    return best[1] if best[0] > true + ALIGN_GAIN else d


def edt(m):
    """Chamfer 3-4 distance from every 'on' pixel to the nearest 'off' pixel (units: px * 3)."""
    w, h = m.size
    px = m.tobytes()
    INF = 1 << 28
    d = [INF if v else 0 for v in px]
    for y in range(h):
        r = y * w
        for x in range(w):
            i = r + x
            v = d[i]
            if not v:
                continue
            if x and d[i - 1] + 3 < v:
                v = d[i - 1] + 3
            if y:
                j = i - w
                if d[j] + 3 < v:
                    v = d[j] + 3
                if x and d[j - 1] + 4 < v:
                    v = d[j - 1] + 4
                if x < w - 1 and d[j + 1] + 4 < v:
                    v = d[j + 1] + 4
            d[i] = v
    for y in range(h - 1, -1, -1):
        r = y * w
        for x in range(w - 1, -1, -1):
            i = r + x
            v = d[i]
            if not v:
                continue
            if x < w - 1 and d[i + 1] + 3 < v:
                v = d[i + 1] + 3
            if y < h - 1:
                j = i + w
                if d[j] + 3 < v:
                    v = d[j] + 3
                if x < w - 1 and d[j + 1] + 4 < v:
                    v = d[j + 1] + 4
                if x and d[j - 1] + 4 < v:
                    v = d[j - 1] + 4
            d[i] = v
    return d


def sdf(m):
    """Signed distance (negative inside) in half-res px."""
    inside = edt(m)
    outside = edt(ImageChops.invert(m))
    return [(o - i) / 3.0 for i, o in zip(inside, outside)]


def field_image(vals, size):
    im = Image.new('F', size)
    im.putdata(vals)
    return im


# Distances are clamped to +-TRUNC (half-res px) before blending. With the plain field a thin limb that is far
# from the other shape only appears at the very end of the morph (its far side stays positive until t ~ 0.95),
# so the last frame jumped; clamped, the change spreads evenly. Measured on 5 pairs (share of the whole change
# in the biggest of 16 steps): plain 0.11-0.33, TRUNC 30: 0.08-0.22, TRUNC 15: 0.12-0.20 but uneven elsewhere.
TRUNC = 30.0
ISLAND_KEEP = 0.3
REPAIR = 8.0  # half-res px: how far outside the blended outline the grown/retracted shape may add body  # a detached piece stays only if at least this share of it lies in BOTH drawings


def islands(vals, size, ma, mb):
    """Half-res mask (255) of the detached pieces to drop: every inside component but the largest that is not
    mostly inside both drawings. A pinned note floating beside the body is in both and stays; the leftover of a
    foot that only one drawing has (seen for a frame or two at the end of walks and turns) goes."""
    w, h = size
    inside = bytearray(1 if v < 0 else 0 for v in vals)
    seen = bytearray(w * h)
    comps = []
    for start in range(w * h):
        if not inside[start] or seen[start]:
            continue
        stack = [start]
        seen[start] = 1
        pts = []
        while stack:
            i = stack.pop()
            pts.append(i)
            x = i % w
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and inside[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        comps.append(pts)
    out = bytearray(w * h)
    if comps:
        big = max(comps, key=len)
        for c in comps:
            if c is big:
                continue
            both = sum(1 for i in c if ma[i] and mb[i]) / len(c)
            if both < ISLAND_KEEP:
                for i in c:
                    out[i] = 255
    return Image.frombytes('L', size, bytes(out))


def canvases(pair):
    """Both drawings on one canvas: A's foot anchor at (ox, H), B aligned onto it. Returns (ca, cb, W, H, ox, a)."""
    A, axA = load(pair['a'])
    B, axB = load(pair['b'])
    d = pair['d']
    a = d if pair.get('fixed') else align(A, axA, B, axB, d)
    pad = 8
    left = min(-axA, a - axB) - pad
    right = max(A.width - axA, a + B.width - axB) + pad
    H = max(A.height, B.height) + pad
    W = int(round(right - left))
    W += W % 2
    H += H % 2
    ox = -left  # A's anchor x on the canvas
    ca = Image.new('RGBA', (W, H))
    cb = Image.new('RGBA', (W, H))
    ca.paste(A, (int(round(ox - axA)), H - A.height))
    cb.paste(B, (int(round(ox + a - axB)), H - B.height))
    return ca, cb, W, H, ox, a


def components(w, h, m):
    """4-connected components of the set pixels of m (sequence of 0/1): (label per pixel, -1 off; list of sizes)."""
    lab = [-1] * (w * h)
    sizes = []
    for s0 in range(w * h):
        if not m[s0] or lab[s0] >= 0:
            continue
        c = len(sizes)
        lab[s0] = c
        stack = [s0]
        n = 0
        while stack:
            i = stack.pop()
            n += 1
            x = i % w
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and m[j] and lab[j] < 0:
                    lab[j] = c
                    stack.append(j)
        sizes.append(n)
    return lab, sizes


def geodesic(w, h, inside, seeds):
    """Chamfer (3-4) distance from the seed pixels to every pixel of `inside`, walking only inside; -1 = unreachable.
    (Plain 8-connected steps made square wavefronts: a growing limb came out as a box.)"""
    dist = [-1] * (w * h)
    buckets = [[i for i in range(w * h) if seeds[i]]]
    for i in buckets[0]:
        dist[i] = 0
    d = 0
    while d < len(buckets):
        for i in buckets[d]:
            if dist[i] != d:
                continue
            x = i % w
            l = x > 0
            r = x < w - 1
            for j, c in ((i - 1 if l else -1, 3), (i + 1 if r else -1, 3), (i - w, 3), (i + w, 3),
                         (i - w - 1 if l else -1, 4), (i - w + 1 if r else -1, 4), (i + w - 1 if l else -1, 4), (i + w + 1 if r else -1, 4)):
                if 0 <= j < w * h and inside[j] and (dist[j] < 0 or dist[j] > d + c):
                    dist[j] = d + c
                    while len(buckets) <= d + c:
                        buckets.append([])
                    buckets[d + c].append(j)
        d += 1
    return dist


def reach(w, h, m, core, lab_core_free):
    """Per pixel of m outside the core: its geodesic distance to the core divided by the largest one in its branch
    (a branch = a connected piece of m minus the core). 0 in the core; 2 where the core cannot be reached."""
    g = geodesic(w, h, m, core)
    lab, sizes = lab_core_free
    top = [0] * len(sizes)
    for i in range(w * h):
        if lab[i] >= 0 and g[i] > top[lab[i]]:
            top[lab[i]] = g[i]
    r = [0.0] * (w * h)
    for i in range(w * h):
        if not m[i] or core[i]:
            continue
        r[i] = 2.0 if g[i] < 0 else g[i] / max(1, top[lab[i]])
    return r


def enclosed(w, h, m):
    """Background pixels not connected to the canvas border (the holes of m)."""
    bg = [0 if v else 1 for v in m]
    lab, sizes = components(w, h, bg)
    open_ = set()
    for x in range(w):
        open_.add(lab[x])
        open_.add(lab[(h - 1) * w + x])
    for y in range(h):
        open_.add(lab[y * w])
        open_.add(lab[y * w + w - 1])
    return [1 if bg[i] and lab[i] not in open_ else 0 for i in range(w * h)], lab


# Moved pieces (test90-v4). A part that only changed place (a head going from bowed to raised, a hand moved to the
# face) does not overlap its old self, so retracting it and growing it back shrank it to nothing halfway: the AI's
# head vanished for two frames. Such a pair of pieces, one only in the first drawing and one only in the second, of
# similar size and shape, is carried instead: both are slid to the same in-between place and their distance fields
# blended there, so the piece keeps its size while it travels.
PIECE_MIN = 60  # half-res px: smaller differences are left to the blend
PIECE_IOU = 0.45  # shape match after centring the two pieces


def pieces_of(w, h, m, core):
    lab, sizes = components(w, h, [x & (1 - c) for x, c in zip(m, core)])
    out = []
    for c, n in enumerate(sizes):
        if n < PIECE_MIN:
            continue
        out.append({'id': c, 'n': n, 'px': []})
    byid = {p['id']: p for p in out}
    for i in range(w * h):
        p = byid.get(lab[i])
        if p is not None:
            p['px'].append(i)
    for p in out:
        xs = [i % w for i in p['px']]
        ys = [i // w for i in p['px']]
        p['cx'] = sum(xs) / len(xs)
        p['cy'] = sum(ys) / len(ys)
    return out


def match_pieces(w, h, PA, PB):
    """Pairs (a, b, dx, dy) of first-drawing and second-drawing pieces that look like one piece moved."""
    pairs = []
    used = set()
    taken = set()
    for a in sorted(PA, key=lambda p: -p['n']):
        if taken & set(a['px']):
            continue
        best = None
        for j, b in enumerate(PB):
            if j in used or not 0.55 <= b['n'] / a['n'] <= 1.8:
                continue
            dx = round(b['cx'] - a['cx'])
            dy = round(b['cy'] - a['cy'])
            if abs(dx) + abs(dy) < 6:
                continue
            sa = set(a['px'])
            inter = sum(1 for i in b['px'] if (i - dx - dy * w) in sa)
            iou = inter / (a['n'] + b['n'] - inter)
            if iou >= PIECE_IOU and (best is None or iou > best[0]):
                best = (iou, j, dx, dy)
        if best and not (taken & set(PB[best[1]]['px'])):
            used.add(best[1])
            taken |= set(a['px']) | set(PB[best[1]]['px'])
            pairs.append((a, PB[best[1]], best[2], best[3]))
    return pairs


def piece_field(w, h, px):
    m = bytearray(w * h)
    for i in px:
        m[i] = 1
    im = Image.frombytes('L', (w, h), bytes(255 if v else 0 for v in m))
    return [max(-TRUNC, min(TRUNC, v)) for v in sdf(im)]


def carried(t, w, h, pr):
    """Pixels of a carried piece at t: both pieces slid to the in-between place, their fields blended."""
    a, b, dx, dy, fa, fb = pr
    sx, sy = t * dx, t * dy  # where the first piece has got to
    ax, ay = round(sx), round(sy)
    bx, by = round(sx - dx), round(sy - dy)
    xs = [i % w for i in a['px'] + b['px']]
    ys = [i // w for i in a['px'] + b['px']]
    x0 = max(0, min(xs) + min(0, dx) - 4)
    x1 = min(w - 1, max(xs) + max(0, dx) + 4)
    y0 = max(0, min(ys) + min(0, dy) - 4)
    y1 = min(h - 1, max(ys) + max(0, dy) + 4)
    out = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            qa = (x - ax, y - ay)
            qb = (x - bx, y - by)
            va = fa[qa[1] * w + qa[0]] if 0 <= qa[0] < w and 0 <= qa[1] < h else TRUNC
            vb = fb[qb[1] * w + qb[0]] if 0 <= qb[0] < w and 0 <= qb[1] < h else TRUNC
            if (1 - t) * va + t * vb < 0:
                out.append(y * w + x)
    return out, (ax, ay) if t < 0.5 else (bx, by)


# The shape of an in-between (test90-v4). The blended distance field alone (v3) melts whatever the two drawings do
# not share: a limb that does not overlap its old place thins into a strip, breaks off or leaves a crumb (the
# artifact check flagged 47 of 134 morphs). Now every in-between is built from the part both drawings share (the
# core, their largest common piece): the first drawing's parts retract into it, tip first (pixels farthest from the
# core along the body go first), and the second drawing's parts grow out of it, root first. That shape is connected
# by construction. The blended field is added on top where it touches that shape (it keeps a limb that only shifts a
# little sliding instead of shrinking and regrowing); its detached bits are dropped and holes neither drawing has
# are filled.
def shape_at(t, w, h, A, B, rA, rB, core, holesAB, vals, keep=()):
    m = bytearray(w * h)
    for i in range(w * h):
        # the grown/retracted shape only near the blended one: it bridges a break or fattens a strip, but a whole
        # second torso next to the first (a body turning) would read as two bodies
        if vals[i] < REPAIR and (core[i] or (A[i] and rA[i] <= 1 - t) or (B[i] and rB[i] <= t)):
            m[i] = 1
    for i in range(w * h):
        if vals[i] < 0:
            m[i] = 2 if not m[i] else 1
    # round off the stair steps of the half-res mask (before the clean-up, so it cannot open a crumb or a hole)
    sm = Image.frombytes('L', (w, h), bytes(255 if v == 1 else (254 if v else 0) for v in m)).filter(ImageFilter.GaussianBlur(1.0)).tobytes()
    raw = bytes(m)
    m = bytearray((1 if raw[i] == 1 else 2) if sm[i] > 127 else 0 for i in range(w * h))
    for i in keep:
        m[i] = 1
    # keep the field's pieces only where they touch the grown/retracted shape
    lab, sizes = components(w, h, m)
    good = set(lab[i] for i in range(w * h) if m[i] == 1)
    out = bytearray(1 if m[i] and lab[i] in good else 0 for i in range(w * h))
    # the largest piece plus pieces that both drawings have (a pinned note floating beside the body)
    lab, sizes = components(w, h, out)
    if len(sizes) > 1:
        big = max(range(len(sizes)), key=lambda c: sizes[c])
        both = [0] * len(sizes)
        for i in range(w * h):
            if lab[i] >= 0 and A[i] and B[i]:
                both[lab[i]] += 1
        stay = {c for c in range(len(sizes)) if c == big or both[c] >= ISLAND_KEEP * sizes[c]}
        stay |= {lab[i] for i in keep if lab[i] >= 0}
        out = bytearray(1 if out[i] and lab[i] in stay else 0 for i in range(w * h))
    # fill holes that neither drawing has
    holes, hlab = enclosed(w, h, out)
    hit = {}
    tot = {}
    for i in range(w * h):
        if holes[i]:
            tot[hlab[i]] = tot.get(hlab[i], 0) + 1
            if holesAB[i]:
                hit[hlab[i]] = hit.get(hlab[i], 0) + 1
    fill = {c for c in tot if hit.get(c, 0) < 0.5 * tot[c]}
    for i in range(w * h):
        if holes[i] and hlab[i] in fill:
            out[i] = 1
    return out


def plain_mask(im, fill):
    """Alpha of the pixels whose colour is near the body fill (no notes, no lines)."""
    r, g, b, a = im.split()
    near = Image.merge('RGB', (r, g, b))
    diff = ImageChops.difference(near, Image.new('RGB', im.size, fill)).convert('L')
    return ImageChops.multiply(a, diff.point(lambda v: 255 if v < 28 else 0))


def core_mask(im):
    """Alpha of a drawing's pixels at least DETAIL_IN px inside its silhouette (its outline line excluded)."""
    a = im.split()[3].point(lambda v: 255 if v > 100 else 0)
    core = a.filter(ImageFilter.MinFilter(2 * DETAIL_IN + 1)).filter(ImageFilter.GaussianBlur(1.0))
    return ImageChops.multiply(core, im.split()[3])


def body_colour(ca, cb):
    """Median colour of the two drawings' opaque pixels: the body fill as drawn (the palette navy is darker than the
    printed texture, and a flat patch of it showed)."""
    px = []
    for im in (ca, cb):
        sm = im.resize((max(1, im.width // 4), max(1, im.height // 4)), Image.NEAREST)
        px += [p[:3] for p in sm.getdata() if p[3] == 255]
    if not px:
        return (24, 32, 58)
    return tuple(sorted(c[k] for c in px)[len(px) // 2] for k in range(3))


# The head (test90-v5). Blended or grown/retracted, a head that moved melted into a lump with a tail (the "ponytail" of
# test90-v4, human 30.7 s / 72.5 s, and the AI's head knob). It is now found in both drawings and carried whole: it
# keeps its size and slides from one place to the other while the body morphs without it. The head is the round part
# that sticks out: the inside point at about the head's radius from the edge whose surrounding ring is the emptiest
# (a head has only its neck around it; a torso has arms and legs). Checked by eye on every drawing
# (scratchpad heads_ai / heads_h sheets): right on all AI drawings; on the human's wrong where an arm or a
# notebook is the roundest thing near the top, listed in HEAD_SKIP (those pairs morph the old way).
HEAD = {'ai': (21, 34, 1.0, 1.25), 'human': (17, 28, 0.4, 1.55)}  # half-res: inner radius, ring radius, top share searched, carried disc / inner radius (the human's hair reaches further)
HEAD_SKIP = {'H03v2-gerin-1.png', 'H07v2-cam-3.png', 'H08-yorgun-1.png', 'H11v2-defter-goster-2.png', 'H11v2-defter-goster-3.png',
             'H11v2-defter-goster-4.png', 'H18-yer-2.png', 'H21-otur-1.png'}


def find_head(mask, w, h, who):
    r_in, r_out, topf, rf = HEAD[who]
    rows = [y for y in range(h) if any(mask[y * w:(y + 1) * w])]
    if not rows:
        return None
    lim = rows[0] + (rows[-1] - rows[0]) * topf
    d = edt(Image.frombytes('L', (w, h), bytes(255 if v else 0 for v in mask)))
    best = None
    for i in [i for i in range(w * h) if r_in * 3 * 0.7 <= d[i] <= r_in * 3 * 1.3 and i // w <= lim][::3]:
        cx, cy = i % w, i // w
        ring = tot = 0
        for yy in range(max(0, cy - r_out), min(h, cy + r_out + 1), 2):
            for xx in range(max(0, cx - r_out), min(w, cx + r_out + 1), 2):
                q = (xx - cx) ** 2 + (yy - cy) ** 2
                if (r_in * 1.25) ** 2 < q <= r_out ** 2:
                    tot += 1
                    ring += mask[yy * w + xx]
        sc = ring / max(1, tot) + 0.002 * cy / h
        if best is None or sc < best[0]:
            best = (sc, cx, cy)
    if not best:
        return None
    _, cx, cy = best
    R = r_in * rf
    px = [i for i in range(max(0, int(cy - R)) * w, min(h, int(cy + R) + 1) * w) if mask[i] and (i % w - cx) ** 2 + (i // w - cy) ** 2 <= R * R]
    return {'px': px, 'cx': cx, 'cy': cy, 'n': len(px), 'id': -1}


def neck(m, w, h, head_px, r_in):
    """Join a carried head to the body: a capsule from the head's centre to the nearest body pixel (the head slides on
    a straight line while the body morphs, and the gap between them read as a floating head)."""
    hs = set(head_px)
    if not hs:
        return
    cx = sum(i % w for i in hs) / len(hs)
    cy = sum(i // w for i in hs) / len(hs)
    best = None
    R = int(r_in * 3)
    for y in range(max(0, int(cy - R)), min(h, int(cy + R) + 1)):
        for x in range(max(0, int(cx - R)), min(w, int(cx + R) + 1)):
            i = y * w + x
            if m[i] and i not in hs:
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d > (r_in * 0.9) ** 2 and (best is None or d < best[0]):
                    best = (d, x, y)
    if not best:
        return
    _, bx, by = best
    rn = max(2, r_in * 0.42)
    steps = int(max(abs(bx - cx), abs(by - cy))) + 1
    for k in range(steps + 1):
        px = cx + (bx - cx) * k / steps
        py = cy + (by - cy) * k / steps
        for y in range(int(py - rn), int(py + rn) + 1):
            for x in range(int(px - rn), int(px + rn) + 1):
                if 0 <= x < w and 0 <= y < h and (x - px) ** 2 + (y - py) ** 2 <= rn * rn:
                    m[y * w + x] = 1


def unsliver(mi, opened, w, h):
    """The opened shape, plus every removed thin part that joins two pieces of it (a thin wrist or neck is a bridge
    and stays; a hook hanging off one piece goes)."""
    o = [1 if v else 0 for v in opened.tobytes()]
    full = [1 if v else 0 for v in mi.tobytes()]
    lab_o, _ = components(w, h, o)
    diff = [f & (1 - x) for f, x in zip(full, o)]
    lab_d, sizes = components(w, h, diff)
    touch = [set() for _ in sizes]
    for i in range(w * h):
        c = lab_d[i]
        if c < 0:
            continue
        x = i % w
        for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
            if 0 <= j < w * h and lab_o[j] >= 0:
                touch[c].add(lab_o[j])
    keep = [len(t) >= 2 for t in touch]
    return Image.frombytes('L', (w, h), bytes(255 if o[i] or (lab_d[i] >= 0 and keep[lab_d[i]]) else 0 for i in range(w * h)))


def morph(pair):
    ca, cb, W, H, ox, a = canvases(pair)
    d = pair['d']
    half = (W // Q, H // Q)
    w, h = half
    mqa = alpha_mask(ca, Q)
    mqb = alpha_mask(cb, Q)
    fa = [max(-TRUNC, min(TRUNC, v)) for v in sdf(mqa)]
    fb = [max(-TRUNC, min(TRUNC, v)) for v in sdf(mqb)]
    A = [1 if v else 0 for v in mqa.tobytes()]
    B = [1 if v else 0 for v in mqb.tobytes()]
    # the head is carried whole (see HEAD)
    heads = None
    who = pair['a']['who']
    if not any(os.path.basename(pair[k]['file']) in HEAD_SKIP for k in ('a', 'b')):
        ha = find_head(A, w, h, who)
        hb = find_head(B, w, h, who)
        if ha and hb:
            heads = (ha, hb, round(hb['cx'] - ha['cx']), round(hb['cy'] - ha['cy']))
            for i in ha['px']:
                A[i] = 0
            for i in hb['px']:
                B[i] = 0
            ma_ = Image.frombytes('L', half, bytes(255 if v else 0 for v in A))
            mb_ = Image.frombytes('L', half, bytes(255 if v else 0 for v in B))
            fa = [max(-TRUNC, min(TRUNC, v)) for v in sdf(ma_)]
            fb = [max(-TRUNC, min(TRUNC, v)) for v in sdf(mb_)]
    both = [x & y for x, y in zip(A, B)]
    both_img = Image.frombytes('L', half, bytes(255 if a_ and b_ else 0 for a_, b_ in zip(mqa.tobytes(), mqb.tobytes())))
    lab, sizes = components(w, h, both)
    if sizes:
        big = max(range(len(sizes)), key=lambda c: sizes[c])
        core = [1 if lab[i] == big else 0 for i in range(w * h)]
    else:  # nothing in common: grow from (and retract into) the bottom middle
        core = [0] * (w * h)
        core[(h - 1) * w + w // 2] = 1
    rA = reach(w, h, A, core, components(w, h, [x & (1 - c) for x, c in zip(A, core)]))
    rB = reach(w, h, B, core, components(w, h, [x & (1 - c) for x, c in zip(B, core)]))
    carry = []
    rA_saved, rB_saved = list(rA), list(rB)
    for pa, pb, dx, dy in match_pieces(w, h, pieces_of(w, h, A, core), pieces_of(w, h, B, core)):
        for i in pa['px']:
            rA[i] = 9.0
        for i in pb['px']:
            rB[i] = 9.0
        carry.append((pa, pb, dx, dy, piece_field(w, h, pa['px']), piece_field(w, h, pb['px'])))
    hA, _ = enclosed(w, h, A)
    hB, _ = enclosed(w, h, B)
    # a carried piece must stay attached halfway (a head on its neck); one that would float free (a hand and the
    # notebook it holds, torn off the arm) is morphed like the rest instead
    holesAB0 = [x | y for x, y in zip(hA, hB)]
    ok = []
    for pr in carry:
        others = [q for q in carry if q is not pr]
        hid = set(i for q in carry for i in q[0]['px'] + q[1]['px'])
        v0 = [(x + y) / 2 for x, y in zip(fa, fb)]
        for i in hid:
            v0[i] = TRUNC
        rest = shape_at(0.5, w, h, A, B, rA, rB, core, holesAB0, v0, [i for q in others for i in carried(0.5, w, h, q)[0]])
        px, _ = carried(0.5, w, h, pr)
        touch = any(rest[j] for i in px for j in (i - 2, i + 2, i - 2 * w, i + 2 * w) if 0 <= j < w * h)
        if touch:
            ok.append(pr)
        else:
            for i in pr[0]['px']:
                rA[i] = rA_saved[i]
            for i in pr[1]['px']:
                rB[i] = rB_saved[i]
    carry = ok
    if heads:
        ha, hb, dx, dy = heads
        carry.append((ha, hb, dx, dy, piece_field(w, h, ha['px']), piece_field(w, h, hb['px'])))
    hide = set(i for pr in carry for i in pr[0]['px'] + pr[1]['px'])
    holesAB = [x | y for x, y in zip(hA, hB)]
    fill, rim = body_colour(ca, cb), COLORS[pair['a']['who']][1]
    # the other drawing lends only its plain body texture (its notes and lines would show twice)
    plain = [plain_mask(ca, fill), plain_mask(cb, fill)]
    cores = [core_mask(ca), core_mask(cb)]
    frames = []
    for i in range(1, STEPS + 1):
        t = i / (STEPS + 1)
        vals = [(1 - t) * x + t * y for x, y in zip(fa, fb)]
        for i in hide:
            vals[i] = TRUNC
        moved = [carried(t, w, h, pr) for pr in carry]
        m = shape_at(t, w, h, A, B, rA, rB, core, holesAB, vals, [i for px, _ in moved for i in px])
        if heads:
            neck(m, w, h, moved[-1][0], HEAD[who][0])
        mi = Image.frombytes('L', half, bytes(255 if v else 0 for v in m))
        # drop slivers thinner than ~8 px (a crescent of the old head's back or a hair tuft left behind by the carried
        # head read as a hook, test90-v5 walk): open the shape, but keep whatever both drawings share there
        opened = ImageChops.lighter(mi.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)), ImageChops.multiply(mi, both_img))
        mi = unsliver(mi, opened, w, h)
        # ONE outline (test90-v5): the edge comes from the morphed mask alone, smoothed at full resolution, and the
        # drawings' own outlines never reach the frame (v4 pasted the current drawing's pixels, its rim line
        # included, inside the new rim: two parallel outlines, AI 28.5 s). The current drawing lends its detail
        # only DETAIL_IN px inside its own silhouette; between that and the new rim, body-coloured texture only.
        full = mi.filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.BICUBIC).point(lambda v: 255 if v > 127 else 0)
        full = full.filter(ImageFilter.GaussianBlur(1.8)).point(lambda v: 255 if v > 127 else 0)
        outer = full.filter(ImageFilter.GaussianBlur(0.7))
        inner = full.filter(ImageFilter.MinFilter(2 * RING_PX + 1)).filter(ImageFilter.GaussianBlur(0.7))
        k = 0 if t < 0.5 else 1
        src, other = (ca, cb) if k == 0 else (cb, ca)
        out = Image.new('RGBA', (W, H), rim + (0,))
        out.putalpha(outer)
        body = Image.new('RGBA', (W, H), fill + (255,))
        out.paste(body, (0, 0), inner)
        # where the current drawing has no body, the other one's body texture; then the current one's body texture;
        # its lines and notes only well inside its own outline
        out.paste(other, (0, 0), ImageChops.multiply(inner, plain[1 - k]))
        out.paste(src, (0, 0), ImageChops.multiply(inner, plain[k]))
        out.paste(src, (0, 0), ImageChops.multiply(inner, cores[k]))
        # a carried piece brings its own drawing along (the AI's cursor slit stays in her head)
        for pr, (_, (ox_, oy_)) in zip(carry, moved):
            piece = pr[0] if t < 0.5 else pr[1]
            pm = bytearray(w * h)
            for i in piece['px']:
                pm[i] = 255
            pmask = Image.frombytes('L', half, bytes(pm)).resize((W, H), Image.NEAREST).filter(ImageFilter.MaxFilter(3))
            layer = Image.new('RGBA', (W, H))
            layer.paste(src, (0, 0), ImageChops.multiply(pmask, cores[k]))
            shifted = Image.new('RGBA', (W, H))
            shifted.paste(layer, (ox_ * Q, oy_ * Q))
            out.paste(shifted, (0, 0), ImageChops.multiply(inner, shifted.split()[3]))
        frames.append(out)
    # how different the two shapes are once aligned (1 - IoU): the Actor gives bigger changes longer morphs
    size = 1 - overlap(alpha_mask(ca, 4), alpha_mask(cb, 4), 0)
    return frames, {'w': W, 'h': H, 'ax': round(ox, 2), 'slide': d - a, 'size': round(size, 3)}


def stamp(pair):
    h = hashlib.sha1(json.dumps(pair, sort_keys=True).encode())
    for side in ('a', 'b'):
        p = os.path.join(ROOT, pair[side]['file'])
        h.update(str(os.path.getmtime(p)).encode())
    h.update(f'{STEPS}{Q}{RING}{ALIGN_GAIN}{ISLAND_KEEP}{TRUNC}{REPAIR}{PIECE_MIN}{PIECE_IOU}{RING_PX}{DETAIL_IN}{HEAD}open5v12'.encode())
    return h.hexdigest()[:16]


def main():
    force = '--force' in sys.argv
    pairs = json.load(open(PAIRS, encoding='utf-8'))
    os.makedirs(DST, exist_ok=True)
    index = {} if force or not os.path.exists(INDEX) else json.load(open(INDEX, encoding='utf-8'))
    table = {}
    done = 0
    for n, pair in enumerate(pairs):
        key = pair['key']
        st = stamp(pair)
        files = [os.path.join(DST, f'{key}-{i}.webp') for i in range(STEPS)]
        hit = index.get(key)
        if hit and hit['stamp'] == st and all(os.path.exists(f) for f in files):
            table[key] = hit['meta']
            continue
        frames, meta = morph(pair)
        for f, im in zip(files, frames):
            im.save(f, 'WEBP', quality=90, method=4)
        index[key] = {'stamp': st, 'meta': meta}
        table[key] = meta
        done += 1
        print(f'[{n + 1}/{len(pairs)}] {key} slide={meta["slide"]} {meta["w"]}x{meta["h"]}', flush=True)
    # drop the images and index entries of morphs the timeline no longer uses
    index = {k: v for k, v in index.items() if k in table}
    keep = {f'{k}-{i}.webp' for k in table for i in range(STEPS)}
    stale = [f for f in os.listdir(DST) if f.endswith('.webp') and f not in keep]
    for f in stale:
        os.remove(os.path.join(DST, f))
    json.dump(index, open(INDEX, 'w', encoding='utf-8'))
    lines = [
        '// Generated by video/scripts/make-tweens.py. Do not edit by hand.',
        '/** Morph images per drawing change (t = 1/8 .. 7/8 of the way from the first drawing to the second). */',
        f'export const TWEEN_STEPS = {STEPS};',
        'export interface TweenMeta {',
        "  /** Canvas size in screen px; the canonical first drawing's foot anchor sits at (ax, h). */",
        '  w: number;',
        '  h: number;',
        '  ax: number;',
        "  /** World px the canvas slides during the morph (the second drawing's own place minus where it was aligned). */",
        '  slide: number;',
        '  /** 1 - IoU of the two aligned silhouettes: how big the change is. */',
        '  size: number;',
        '}',
        'export const TWEENS: Record<string, TweenMeta> = ' + json.dumps(dict(sorted(table.items())), indent=1) + ';',
        '',
    ]
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'make-tweens: {len(table)} morphs ({done} rendered now, {len(stale)} stale images removed) -> {OUT}')


if __name__ == '__main__':
    sys.exit(main())
