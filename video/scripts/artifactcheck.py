"""Artifact check of the morph images: does any in-between frame of a drawing change break the body apart?

usage (repo root): python video/scripts/artifactcheck.py [--verbose] [--key <tween key>]

For every morph listed in video/out/tween-pairs.json, the seven images in video/public/tweens/ are compared with
the two drawings they go between (placed on the same canvas, video/scripts/make-tweens.py canvases()). Measured
on the silhouette at half resolution (alpha > 100), per frame:
  pieces  - separate parts of at least PIECE px (a detached leg, a crumb): more than either drawing has
  holes   - enclosed gaps of at least HOLE px that are not (mostly) a gap of either drawing: a hole the morph made
  outline - perimeter longer than OUTLINE x the longer of the two drawings' (a crumbled, jagged edge)
  thin    - area smaller than THIN x the smaller drawing's (the body melting into a strip)
  short   - silhouette height under SHORT x the shorter drawing's (a head shrinking away between two places)
  bloat   - area larger than BLOAT x the larger drawing's (two heads or two arms side by side: the union of both
            drawings instead of one body in between; it read as a ponytail on the human, test90-v4 30.7 s)
  double  - double contour (test90-v4, AI 28.5 s): rim-coloured line pixels DC_IN..DC_OUT px inside the frame's
            outline that sit on the outline of the drawing whose detail the frame shows (an old outline left inside the new one), per
            outline pixel, above DC_MAX. One clean outline has its line at the edge and nothing parallel just inside.
A frame with any of these is flagged; the exit code is 1 when any frame is.
"""
import importlib.util
import json
import os
import sys

from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAIRS = os.path.join(ROOT, 'video', 'out', 'tween-pairs.json')
DST = os.path.join(ROOT, 'video', 'public', 'tweens')

PIECE = 6  # half-res px (24 screen px): a visible crumb
HOLE = 12
OUTLINE = 1.25
THIN = 0.8
SHORT = 0.94
BLOAT = 1.08
DC_IN = 4
DC_OUT = 12
DC_MAX = 0.12
RIM = {'ai': (24, 32, 58), 'human': (243, 239, 228)}
Q = 2
KINDS = {}

_spec = importlib.util.spec_from_file_location('make_tweens', os.path.join(os.path.dirname(__file__), 'make-tweens.py'))
mt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mt)


def mask(im):
    a = im.split()[3].resize((im.width // Q, im.height // Q), Image.BILINEAR)
    return a.width, a.height, bytearray(1 if v > 100 else 0 for v in a.tobytes())


def components(w, h, m, val=1):
    """Sizes of the 4-connected components of pixels equal to val, and whether each touches the border."""
    seen = bytearray(w * h)
    out = []
    for s in range(w * h):
        if m[s] != val or seen[s]:
            continue
        stack = [s]
        seen[s] = 1
        n = 0
        border = False
        while stack:
            i = stack.pop()
            n += 1
            x, y = i % w, i // w
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                border = True
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w if y else -1, i + w if y < h - 1 else -1):
                if j >= 0 and m[j] == val and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        out.append((n, border))
    return out


def hole_mask(w, h, m):
    """Pixels of the enclosed gaps of m."""
    lab = [-1] * (w * h)
    out = bytearray(w * h)
    seen = bytearray(w * h)
    for s0 in range(w * h):
        if m[s0] or seen[s0]:
            continue
        stack = [s0]
        seen[s0] = 1
        pts = []
        border = False
        while stack:
            i = stack.pop()
            pts.append(i)
            x, y = i % w, i // w
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                border = True
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w if y else -1, i + w if y < h - 1 else -1):
                if j >= 0 and not m[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        if not border:
            for i in pts:
                out[i] = 1
    return out


def new_holes(w, h, m, known):
    """Enclosed gaps of at least HOLE px of which less than half lies in a gap the drawings have."""
    hm = hole_mask(w, h, m)
    n = 0
    seen = bytearray(w * h)
    for s0 in range(w * h):
        if not hm[s0] or seen[s0]:
            continue
        stack = [s0]
        seen[s0] = 1
        size = 0
        hit = 0
        while stack:
            i = stack.pop()
            size += 1
            hit += known[i]
            x = i % w
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and hm[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        if size >= HOLE and hit < 0.5 * size:
            n += 1
    return n


def metrics(w, h, m):
    pieces = sum(1 for n, _ in components(w, h, m, 1) if n >= PIECE)
    holes = sum(1 for n, b in components(w, h, m, 0) if n >= HOLE and not b)
    area = sum(m)
    rows = [y for y in range(h) if any(m[y * w:(y + 1) * w])]
    height = (rows[-1] - rows[0] + 1) if rows else 0
    per = 0
    for i in range(w * h):
        if not m[i]:
            continue
        x, y = i % w, i // w
        if x == 0 or y == 0 or x == w - 1 or y == h - 1 or not m[i - 1] or not m[i + 1] or not m[i - w] or not m[i + w]:
            per += 1
    return {'pieces': pieces, 'holes': holes, 'area': area, 'per': per, 'height': height}


def edge_band(im, r):
    """Pixels within r px of the outline of an image's silhouette (both sides)."""
    a = im.split()[3].point(lambda v: 255 if v > 100 else 0)
    edge = ImageChops.subtract(a, a.filter(ImageFilter.MinFilter(3)))
    return edge.filter(ImageFilter.MaxFilter(2 * r + 1))


def double_contour(im, who, old_edges):
    """Old outlines left inside the new one: rim-coloured pixels that lie DC_IN..DC_OUT px inside this image's
    outline AND on (within 3 px of) the outline of one of the two drawings, per outline pixel."""
    a = im.split()[3].point(lambda v: 255 if v > 100 else 0)
    band = ImageChops.subtract(a.filter(ImageFilter.MinFilter(2 * DC_IN + 1)), a.filter(ImageFilter.MinFilter(2 * DC_OUT + 1)))
    diff = ImageChops.difference(im.convert('RGB'), Image.new('RGB', im.size, RIM[who])).convert('L')
    line = diff.point(lambda v: 255 if v < 60 else 0)
    n = ImageChops.multiply(ImageChops.multiply(band, line), old_edges).histogram()[255]
    per = ImageChops.subtract(a, a.filter(ImageFilter.MinFilter(3))).histogram()[255]
    return n / max(1, per)


def check_pair(pair):
    ca, cb, W, H, _, _ = mt.canvases(pair)
    ma, mb = mask(ca), mask(cb)
    ea = metrics(*ma)
    eb = metrics(*mb)
    w2, h2 = ma[0], ma[1]
    known = bytearray(x | y for x, y in zip(hole_mask(*ma), hole_mask(*mb)))
    who = pair['a']['who']
    # the frame shows the first drawing's detail before t = 1/2 and the second's after (make-tweens.py): an outline
    # left behind is that drawing's own
    old_edges = (edge_band(ca, 3), edge_band(cb, 3))
    bad = []
    for i in range(mt.STEPS):
        p = os.path.join(DST, f"{pair['key']}-{i}.webp")
        if not os.path.exists(p):
            bad.append((i, ['missing']))
            continue
        im = Image.open(p).convert('RGBA')
        if im.size != (W, H):
            im = im.resize((W, H))
        fm = mask(im)
        f = metrics(*fm)
        f['holes'] = new_holes(w2, h2, fm[2], known)
        why = []
        if f['pieces'] > max(ea['pieces'], eb['pieces']):
            why.append(f"pieces {f['pieces']} (drawings {ea['pieces']}/{eb['pieces']})")
        if f['holes']:
            why.append(f"{f['holes']} new hole(s)")
        if f['per'] > OUTLINE * max(ea['per'], eb['per']):
            why.append(f"outline {f['per'] / max(ea['per'], eb['per']):.2f}x")
        if f['height'] < SHORT * min(ea['height'], eb['height']):
            why.append(f"short {f['height'] / min(ea['height'], eb['height']):.2f}x")
        if f['area'] > BLOAT * max(ea['area'], eb['area']):
            why.append(f"bloat {f['area'] / max(ea['area'], eb['area']):.2f}x")
        dc = double_contour(im, who, old_edges[0 if (i + 1) / (mt.STEPS + 1) < 0.5 else 1])
        if dc > DC_MAX:
            why.append(f"double {dc:.2f}")
        if f['area'] < THIN * min(ea['area'], eb['area']):
            why.append(f"thin {f['area'] / min(ea['area'], eb['area']):.2f}x")
        if why:
            bad.append((i, why))
            for w_ in why:
                k = w_.split()[0] if not w_[0].isdigit() else 'holes'
                KINDS[k] = KINDS.get(k, 0) + 1
    return bad


def main():
    pairs = json.load(open(PAIRS, encoding='utf-8'))
    if '--key' in sys.argv:
        k = sys.argv[sys.argv.index('--key') + 1]
        pairs = [p for p in pairs if p['key'] == k]
    verbose = '--verbose' in sys.argv
    flagged_pairs = 0
    flagged_frames = 0
    for pair in pairs:
        bad = check_pair(pair)
        if bad:
            flagged_pairs += 1
            flagged_frames += len(bad)
            print(f"FLAG {pair['key']}: " + '; '.join(f"#{i} {', '.join(w)}" for i, w in bad))
        elif verbose:
            print(f"ok   {pair['key']}")
    print(f'artifactcheck: {flagged_pairs} of {len(pairs)} morphs flagged, {flagged_frames} of {len(pairs) * mt.STEPS} frames')
    for k, n in sorted(KINDS.items()):
        print(f'   {k}: {n} frames')
    return 1 if flagged_pairs else 0


if __name__ == '__main__':
    sys.exit(main())
