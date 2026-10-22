#!/usr/bin/env python3
"""soles.py - measure where each full-body card's soles are and store it in video/public/cards/frames.json.

Round 7d (grounding): the contact shadow and the floor reflection sit at the soles, not at the card's bottom edge
(the cut-outs keep 0.6-3 % of transparent margin under the boots, so a shadow at the edge floated below her).
For every card of kind "full", "soles" = [u0, u1, v] in normalised card coordinates (y down): v is the lowest opaque
row, u0..u1 the horizontal extent of the opaque pixels in the band 2.5 % of the card height above it (both boots
when both stand, one when the other is lifted). The file read is the one the manifest loads. Drawn-loop in-betweens keep their base card's entry (tools/loopcards.py).

  uv run --with pillow --with numpy python -I tools/soles.py [--check]
--check only reports cards whose stored soles differ from a fresh measurement (exit 1 if any).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'video', 'public', 'cards')
BAND = 0.025


def measure(path):
    a = np.asarray(Image.open(path).convert('RGBA'))[:, :, 3] > 128
    h, w = a.shape
    rows = np.where(a.any(1))[0]
    low = int(rows.max())
    band = a[max(0, int(low - BAND * h)):low + 1]
    cols = np.where(band.any(0))[0]
    return [round(float(cols.min()) / w, 4), round(float(cols.max() + 1) / w, 4), round(float(low + 1) / h, 4)]


def main():
    frames_path = os.path.join(ROOT, 'frames.json')
    frames = json.load(open(frames_path))
    manifest = json.load(open(os.path.join(ROOT, 'manifest.json')))
    changed = []
    for cid, f in frames.items():
        if f.get('kind') != 'full' or cid not in manifest:
            continue
        # a drawn-loop in-between (<base>b, <base>c) inherits its base card's boxes (tools/loopcards.py), soles too
        if cid[-1] in 'bc' and cid[:-1] in frames:
            continue
        s = measure(os.path.join(ROOT, manifest[cid]['file'].replace('cards/', '', 1)))
        if f.get('soles') != s:
            changed.append((cid, f.get('soles'), s))
            f['soles'] = s
    if '--check' in sys.argv:
        for c in changed:
            print(f'{c[0]}: stored {c[1]} measured {c[2]}')
        print(f'soles: {len(changed)} cards differ')
        sys.exit(1 if changed else 0)
    with open(frames_path, 'w', newline='\n') as fh:
        json.dump(frames, fh, indent=1, sort_keys=True)
        fh.write('\n')
    print(f'soles: wrote {len(changed)} cards')


if __name__ == '__main__':
    main()
