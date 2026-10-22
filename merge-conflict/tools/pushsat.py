#!/usr/bin/env python3
"""pushsat.py - the saturation half of tools/pushcheck.mjs (GIT! PUSH! FORCE!, round 9).

  uv run --with pillow --with numpy python -I tools/pushsat.py <sat.json>

sat.json: {video, start, samples: [{frame, cards: [{who, card, flip, box: [x0, y0, x1, y1]}]}]}, the cards' whole
projected boxes in 1920x1080 frame pixels. For each sample the frame is decoded from the video (start = the video's
first frame time), each card's alpha (public/cards/manifest.json "file") is warped to its box and thresholded at 0.5,
pixels covered by both cards are dropped, and the mean HSV saturation of the frame pixels under each mask (value
>= 0.08) is taken. Writes <sat>.out.json: {B, O, n} (means over the samples).
"""
import json, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / 'video' / 'public'
W, H = 1920, 1080


def frame_at(video, t):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.4f}', '-i', video, '-frames:v', '1', '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0


def mask_of(card, flip, box, manifest):
    x0, y0, x1, y1 = box
    w, h = int(round(x1 - x0)), int(round(y1 - y0))
    m = np.zeros((H, W), bool)
    if w < 2 or h < 2:
        return m
    a = Image.open(CARDS / manifest[card]['file']).getchannel('A').resize((w, h))
    if flip:
        a = a.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(a) > 127
    X0, Y0 = int(round(x0)), int(round(y0))
    sx0, sy0 = max(0, -X0), max(0, -Y0)
    dx0, dy0 = max(0, X0), max(0, Y0)
    dx1, dy1 = min(W, X0 + w), min(H, Y0 + h)
    if dx1 <= dx0 or dy1 <= dy0:
        return m
    m[dy0:dy1, dx0:dx1] = a[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)]
    return m


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    manifest = json.loads((CARDS / 'cards' / 'manifest.json').read_text())
    sums = {'B': [], 'O': []}
    for s in spec['samples']:
        img = frame_at(spec['video'], s['frame'] / 60 - spec['start'])
        mx, mn = img.max(axis=2), img.min(axis=2)
        sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
        masks = {c['who']: mask_of(c['card'], c['flip'], c['box'], manifest) for c in s['cards']}
        both = masks.get('B', np.zeros((H, W), bool)) & masks.get('O', np.zeros((H, W), bool))
        for who, m in masks.items():
            m = m & ~both & (mx >= 0.08)
            if m.sum() > 500:
                sums[who].append(float(sat[m].mean()))
    out = {'B': float(np.mean(sums['B'])) if sums['B'] else 0.0, 'O': float(np.mean(sums['O'])) if sums['O'] else 0.0, 'n': min(len(sums['B']), len(sums['O']))}
    Path(sys.argv[1].replace('.json', '.out.json')).write_text(json.dumps(out))


main()
