"""Detail gates of the morph images: does a drawing change keep the drawings' own detail and stay one body?

usage (repo root): python video/scripts/morphcheck.py [--verbose] [--key <tween key>] [--dir <tweens dir>]

For every morph in video/out/tween-pairs.json the STEPS images in video/public/tweens/ are compared with the two
drawings they go between, placed on the same canvas (make-tweens.py canvases()). Four gates (test90-v6):
  G1 end pop  - the share of an endpoint drawing's interior (its alpha eroded by G1_ERODE px, so the outline the
                morph redraws does not count) that the nearest morph image (first / last) shows in another colour
                or not at all. Above G1_MAX the morph's end jumps (a held book appearing in one frame, 48.3 s v5).
  G2 detail   - per image, the count of detail pixels inside the body (human: yellow note and cream prop/page
                pixels; AI: navy line/face pixels) stays within G2_TOL of the straight line between the two
                drawings' counts (with a floor of G2_FLOOR px for tiny counts). Notes vanishing for 15 frames
                (v5, 51.7 s) fail it.
  G3 one body - the largest 8-connected opaque component holds at least G3_MIN of the opaque area (a head
                floating free, v5 44 s, fails it). Measured relative to the drawings: if a drawing itself is
                split (a desk prop beside the figure), the image may be split as much as the worse drawing.
  G4 head     - IoU of the head disc (make-tweens find_head on the endpoint drawing) between the first/last image
                and that drawing, at least G4_MIN (hair tufts lost to a smooth dome, v5, fail it).
The exit code is 1 when any morph fails any gate.
"""
import importlib.util
import json
import os
import sys

from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAIRS = os.path.join(ROOT, 'video', 'out', 'tween-pairs.json')

G1_ERODE = 4
G1_DIFF = 150  # summed |RGB| difference that counts as recoloured
G1_MAX = 0.06
G2_TOL = 0.35
G2_FLOOR = 250
G2_NEAR = 90  # summed |RGB| distance to a detail colour
G2_ERODE = 4  # 'inside the body': the outline (cream on the human, navy on the AI) is not detail
DETAIL = {'human': ((240, 211, 90), (243, 239, 228)), 'ai': ((24, 32, 58),)}
G3_MIN = 0.98
G4_MIN = 0.85

_spec = importlib.util.spec_from_file_location('make_tweens', os.path.join(os.path.dirname(__file__), 'make-tweens.py'))
mt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mt)


def solid(im):
    return im.split()[3].point(lambda v: 255 if v >= 128 else 0)


def interior(im, r):
    return solid(im).filter(ImageFilter.MinFilter(2 * r + 1))


def near(im, col):
    diff = ImageChops.difference(im.convert('RGB'), Image.new('RGB', im.size, col))
    r, g, b = diff.split()
    # sum of the three channel differences < G2_NEAR (via two adds, clipped at 255)
    s = ImageChops.add(ImageChops.add(r, g), b)
    return s.point(lambda v: 255 if v < G2_NEAR else 0)


def g1(draw, frame):
    m = interior(draw, G1_ERODE)
    n = m.histogram()[255]
    d = ImageChops.difference(draw.convert('RGB'), frame.convert('RGB'))
    r, g, b = d.split()
    s = ImageChops.add(ImageChops.add(r, g), b)  # clipped at 255 > G1_DIFF
    bad = ImageChops.lighter(s.point(lambda v: 255 if v > G1_DIFF else 0), ImageChops.invert(solid(frame)))
    return ImageChops.multiply(m, bad).histogram()[255] / max(1, n)


def detail_count(im, who):
    m = interior(im, G2_ERODE)
    tot = 0
    for col in DETAIL[who]:
        tot += ImageChops.multiply(m, near(im, col)).histogram()[255]
    return tot


def biggest_share(im):
    """Largest 8-connected component of the opaque pixels / opaque area (at half resolution: the gate is about
    pieces, and a 1 px hairline gap at full resolution is not a detached body part)."""
    a = solid(im).resize((im.width // 2, im.height // 2), Image.BILINEAR).point(lambda v: 255 if v >= 128 else 0)
    w, h = a.size
    m = bytearray(1 if v else 0 for v in a.tobytes())
    total = sum(m)
    if not total:
        return 1.0
    seen = bytearray(w * h)
    best = 0
    for s0 in range(w * h):
        if not m[s0] or seen[s0]:
            continue
        stack = [s0]
        seen[s0] = 1
        n = 0
        while stack:
            i = stack.pop()
            n += 1
            x = i % w
            for dy in (-w, 0, w):
                for dx in (-1, 0, 1):
                    if (dx == -1 and x == 0) or (dx == 1 and x == w - 1):
                        continue
                    j = i + dy + dx
                    if 0 <= j < w * h and m[j] and not seen[j]:
                        seen[j] = 1
                        stack.append(j)
        best = max(best, n)
    return best / total


def head_iou(draw, frame, who):
    q = mt.Q
    md = mt.alpha_mask(draw, q)
    w, h = md.size
    A = [1 if v else 0 for v in md.tobytes()]
    head = mt.find_head(A, w, h, who)
    if not head:
        return 1.0
    R = mt.HEAD[who][0] * mt.HEAD[who][3] + 2
    cx, cy = head['cx'], head['cy']
    mf = [1 if v else 0 for v in mt.alpha_mask(frame, q).tobytes()]
    inter = union = 0
    for y in range(max(0, int(cy - R)), min(h, int(cy + R) + 1)):
        for x in range(max(0, int(cx - R)), min(w, int(cx + R) + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 > R * R:
                continue
            i = y * w + x
            inter += A[i] & mf[i]
            union += A[i] | mf[i]
    return inter / max(1, union)


def check_pair(pair, dst):
    ca, cb, W, H, _, _ = mt.canvases(pair)
    who = pair['a']['who']
    frames = []
    for i in range(mt.STEPS):
        p = os.path.join(dst, f"{pair['key']}-{i}.webp")
        im = Image.open(p).convert('RGBA')
        if im.size != (W, H):
            im = im.resize((W, H))
        frames.append(im)
    res = {'g1': (g1(ca, frames[0]), g1(cb, frames[-1]))}
    c0, c1 = detail_count(ca, who), detail_count(cb, who)
    worst = 0.0
    g2bad = []
    for i, im in enumerate(frames):
        t = (i + 1) / (mt.STEPS + 1)
        exp = (1 - t) * c0 + t * c1
        c = detail_count(im, who)
        dev = abs(c - exp) / max(exp * G2_TOL, G2_FLOOR) * G2_TOL  # deviation as a share, floored
        worst = max(worst, dev)
        if dev > G2_TOL:
            g2bad.append(i)
    res['g2'] = (worst, g2bad, c0, c1)
    lim = min(G3_MIN, biggest_share(ca), biggest_share(cb))
    shares = [biggest_share(im) for im in frames]
    res['g3'] = (min(shares), [i for i, s in enumerate(shares) if s < lim], lim)
    res['g4'] = (head_iou(ca, frames[0], who), head_iou(cb, frames[-1], who))
    fails = []
    if max(res['g1']) > G1_MAX:
        fails.append('G1')
    if g2bad:
        fails.append('G2')
    if res['g3'][1]:
        fails.append('G3')
    if min(res['g4']) < G4_MIN:
        fails.append('G4')
    return res, fails


def main():
    pairs = json.load(open(PAIRS, encoding='utf-8'))
    if '--key' in sys.argv:
        k = sys.argv[sys.argv.index('--key') + 1]
        pairs = [p for p in pairs if p['key'] == k]
    dst = sys.argv[sys.argv.index('--dir') + 1] if '--dir' in sys.argv else mt.DST
    verbose = '--verbose' in sys.argv
    count = {'G1': 0, 'G2': 0, 'G3': 0, 'G4': 0}
    worst = {'G1': (0, ''), 'G2': (0, ''), 'G3': (1, ''), 'G4': (1, '')}
    for pair in pairs:
        r, fails = check_pair(pair, dst)
        k = pair['key']
        for f in fails:
            count[f] += 1
        if max(r['g1']) > worst['G1'][0]:
            worst['G1'] = (max(r['g1']), k)
        if r['g2'][0] > worst['G2'][0]:
            worst['G2'] = (r['g2'][0], k)
        if r['g3'][0] < worst['G3'][0]:
            worst['G3'] = (r['g3'][0], k)
        if min(r['g4']) < worst['G4'][0]:
            worst['G4'] = (min(r['g4']), k)
        if fails or verbose:
            print(f"{'FAIL' if fails else 'ok  '} {k}: G1 {r['g1'][0]:.3f}/{r['g1'][1]:.3f}  G2 {r['g2'][0]:.2f} "
                  f"(detail {r['g2'][2]}->{r['g2'][3]}, bad #{r['g2'][1]})  G3 {r['g3'][0]:.3f} (min {r['g3'][2]:.3f}, bad #{r['g3'][1]})  "
                  f"G4 {r['g4'][0]:.2f}/{r['g4'][1]:.2f}  {' '.join(fails)}", flush=True)
    print(f'morphcheck: {len(pairs)} morphs; failing G1 (end pop > {G1_MAX}) {count["G1"]}, G2 (detail off by > {G2_TOL:.0%}) {count["G2"]}, '
          f'G3 (one body < {G3_MIN}) {count["G3"]}, G4 (head IoU < {G4_MIN}) {count["G4"]}')
    for g, (v, k) in worst.items():
        print(f'   worst {g}: {v:.3f} {k}')
    return 1 if any(count.values()) else 0


if __name__ == '__main__':
    sys.exit(main())
