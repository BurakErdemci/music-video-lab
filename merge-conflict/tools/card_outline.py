#!/usr/bin/env python3
"""card_outline.py - trace each pose card's outer silhouette for the neon scribble layer.

  uv run --with pillow --with numpy --with scipy python -I tools/card_outline.py [ID ...]

For each card writes video/public/cards/<id>.outline.json:
  {"id", "aspect", "polylines": [[x0, y0, x1, y1, ...], ...]}   (closed loops, first point not repeated)
in the same card units as card_points.py (card 1 tall, x in [-aspect/2, aspect/2], y up, centred).
Steps: alpha > 0.5 on a copy scaled to 400 px tall, holes filled, every component above 0.5 % of the
card area kept (largest first), its outer boundary traced (Moore neighbour), then simplified with
Douglas-Peucker at 1.2 px of the 400 px copy. Deterministic.
"""
import json, sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CARDS = Path(__file__).resolve().parent.parent / 'video' / 'public' / 'cards'
SIZE = 400
EPS = 1.2
MIN_AREA = 0.005

# Moore neighbourhood, clockwise starting west (row, col offsets).
NB = [(0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1)]


def trace(mask):
    """Outer boundary of the single component in `mask` (padded by 1), as (row, col) pixel list."""
    rows, cols = np.nonzero(mask)
    start = (rows[0], cols[0])  # top-most, then left-most pixel: its west neighbour is background
    pts = [start]
    cur, back = start, 0  # we entered `start` from the west
    for _ in range(mask.size * 4):
        for k in range(8):
            d = (back + 1 + k) % 8
            nr, nc = cur[0] + NB[d][0], cur[1] + NB[d][1]
            if mask[nr, nc]:
                # next search starts from the neighbour just before the hit, seen from the new pixel
                back = (d + 4) % 8
                cur = (nr, nc)
                break
        else:
            return pts  # isolated pixel
        if cur == start:
            break
        pts.append(cur)
    return pts


def dp(pts, eps):
    """Douglas-Peucker on an (N, 2) array; iterative to avoid deep recursion."""
    keep = np.zeros(len(pts), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        p, q = pts[a], pts[b]
        seg = q - p
        n = np.hypot(*seg)
        mid = pts[a + 1:b]
        if n == 0:
            dist = np.hypot(*(mid - p).T)
        else:
            dist = np.abs(seg[0] * (mid[:, 1] - p[1]) - seg[1] * (mid[:, 0] - p[0])) / n
        i = int(np.argmax(dist))
        if dist[i] > eps:
            keep[a + 1 + i] = True
            stack += [(a, a + 1 + i), (a + 1 + i, b)]
    return pts[keep]


def outline(card_id, entry):
    im = Image.open(CARDS / Path(entry['file']).name).convert('RGBA')
    w0, h0 = im.size
    aspect = w0 / h0
    w = max(1, round(SIZE * aspect))
    a = np.asarray(im.getchannel('A').resize((w, SIZE), Image.LANCZOS)) > 127
    a = ndimage.binary_fill_holes(a)
    lab, n = ndimage.label(a)
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    order = [i + 1 for i in np.argsort(-sizes) if sizes[i] >= MIN_AREA * w * SIZE]
    polylines = []
    for comp in order:
        m = np.pad(lab == comp, 1)
        pts = np.array(trace(m), dtype=float) - 1  # back to unpadded pixel coords
        # close the loop for simplification, then drop the repeated end
        loop = np.vstack([pts, pts[:1]])
        simp = dp(loop[:, ::-1], EPS)[:-1]  # (x, y)
        if len(simp) < 3:
            continue
        flat = []
        for x, y in simp:
            flat += [round(((x + 0.5) / w - 0.5) * aspect, 4), round(0.5 - (y + 0.5) / SIZE, 4)]
        polylines.append(flat)
    return {'id': card_id, 'aspect': round(aspect, 5), 'polylines': polylines}


def main():
    manifest = json.loads((CARDS / 'manifest.json').read_text())
    ids = sys.argv[1:] or sorted(manifest)
    for card_id in ids:
        out = outline(card_id, manifest[card_id])
        (CARDS / f'{card_id}.outline.json').write_text(json.dumps(out, separators=(',', ':')))
        print(f'{card_id}: {len(out["polylines"])} loop(s), {sum(len(p) // 2 for p in out["polylines"])} points')


if __name__ == '__main__':
    main()
