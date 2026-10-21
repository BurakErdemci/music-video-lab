#!/usr/bin/env python3
"""card_coverage.py - which quads of a card's 40x60 rig mesh cover paint (alpha > 0.1).

  uv run --with pillow --with numpy python -I tools/card_coverage.py [ID ...]

Writes video/public/cards/<id>.cover.json: {"cols": 40, "rows": 60, "cells": "0101..."}, row-major from the
top row, '1' where the quad's max alpha > 0.1. tools/rigcheck.mjs measures the area of those quads only.
The grid matches video/src/cards/Card.tsx (PlaneGeometry COLS x ROWS over the whole card). Deterministic.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

CARDS = Path(__file__).resolve().parent.parent / 'video' / 'public' / 'cards'
COLS, ROWS = 40, 60

def main():
    manifest = json.loads((CARDS / 'manifest.json').read_text())
    for cid in sys.argv[1:] or sorted(manifest):
        a = np.asarray(Image.open(CARDS / f'{cid}.png').getchannel('A'), dtype=np.float64) / 255
        h, w = a.shape
        xs = np.linspace(0, w, COLS + 1).round().astype(int)
        ys = np.linspace(0, h, ROWS + 1).round().astype(int)
        cells = ''.join('1' if a[ys[r]:ys[r + 1], xs[c]:xs[c + 1]].max() > 0.1 else '0' for r in range(ROWS) for c in range(COLS))
        (CARDS / f'{cid}.cover.json').write_text(json.dumps({'cols': COLS, 'rows': ROWS, 'cells': cells}))
        print(cid, cells.count('1'), 'painted quads')

if __name__ == '__main__':
    main()
