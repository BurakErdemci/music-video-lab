#!/usr/bin/env python3
"""card_points.py - sample every pose card into a point cloud for the card <-> particle dissolve.

  uv run --with pillow --with numpy --with scipy python -I tools/card_points.py [ID ...]

For each card in video/public/cards/manifest.json (or only the given ids) writes
video/public/cards/<id>.points.json:
  {"id", "cols", "rows", "aspect", "n", "xy": [x0, y0, x1, y1, ...], "rgb": [r0, g0, b0, ...]}
The grid has about 120 x 68 = 8160 cells laid over the card at its own aspect (portrait cards get
fewer columns than rows). A cell becomes a point when its mean alpha is > 0.5; its colour is the
alpha-weighted mean RGB of the cell. Card units: the card is 1 tall, x in [-aspect/2, aspect/2],
y in [-0.5, 0.5] with y up, centred on the card. Deterministic: no randomness, fixed rounding.
"""
import json, sys
from pathlib import Path

import numpy as np
from PIL import Image

CARDS = Path(__file__).resolve().parent.parent / 'video' / 'public' / 'cards'
CELLS = 120 * 68


def sample(card_id, entry):
    im = np.asarray(Image.open(CARDS / Path(entry['file']).name).convert('RGBA'), dtype=np.float64) / 255.0
    h, w = im.shape[:2]
    aspect = w / h
    cols = max(8, round((CELLS * aspect) ** 0.5))
    rows = max(8, round(CELLS / cols))
    xs = np.linspace(0, w, cols + 1).round().astype(int)
    ys = np.linspace(0, h, rows + 1).round().astype(int)
    xy, rgb = [], []
    for r in range(rows):
        for c in range(cols):
            cell = im[ys[r]:ys[r + 1], xs[c]:xs[c + 1]]
            a = cell[..., 3]
            if a.mean() <= 0.5:
                continue
            col = (cell[..., :3] * a[..., None]).sum((0, 1)) / a.sum()
            cx = (c + 0.5) / cols
            cy = (r + 0.5) / rows
            xy += [round((cx - 0.5) * aspect, 4), round(0.5 - cy, 4)]
            rgb += [int(round(v * 255)) for v in col]
    return {'id': card_id, 'cols': cols, 'rows': rows, 'aspect': round(aspect, 5), 'n': len(xy) // 2, 'xy': xy, 'rgb': rgb}


def main():
    manifest = json.loads((CARDS / 'manifest.json').read_text())
    ids = sys.argv[1:] or sorted(manifest)
    for card_id in ids:
        out = sample(card_id, manifest[card_id])
        (CARDS / f'{card_id}.points.json').write_text(json.dumps(out, separators=(',', ':')))
        print(f'{card_id}: {out["cols"]}x{out["rows"]} grid, {out["n"]} points')


if __name__ == '__main__':
    main()
