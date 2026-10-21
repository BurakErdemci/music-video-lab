#!/usr/bin/env python3
"""font_metrics.py - per-character advances of the type faces and low-resolution glyph bitmaps, so letter
positions are known when a layout is built (no DOM measuring at render time; the sibling's metrics.ts
pattern).

  uv run --with pillow --with numpy python -I tools/font_metrics.py

Writes:
  video/src/type/metrics.json  {face: {"file", "cap", "adv": {char: em}}} for printable ASCII.
  video/src/type/glyphs.json   {"g7": {char: ["01110", ...7 rows]}, "g14": {char: [...14 rows of 10]}}
                               bitmaps of Bungee for the dot-matrix forms (FLOOR, MARQUEE) and the
                               letter shatter. Deterministic: rendered from the font files at fixed sizes.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

VIDEO = Path(__file__).resolve().parent.parent / 'video'
FONTS = VIDEO / 'public' / 'fonts'
FACES = {
    'anton': 'Anton-Regular.ttf',
    'bebas': 'BebasNeue-Regular.ttf',
    'bungee': 'Bungee-Regular.ttf',
    'monoton': 'Monoton-Regular.ttf',
    'shrikhand': 'Shrikhand-Regular.ttf',
    'righteous': 'Righteous-Regular.ttf',
    'jetbrains': 'JetBrainsMono-Variable.ttf',
    'fraktur': 'UnifrakturMaguntia-Book.ttf',
    'pirata': 'PirataOne-Regular.ttf',
    'metalmania': 'MetalMania-Regular.ttf',
}
CHARS = [chr(c) for c in range(32, 127)]
BITMAP_CHARS = [c for c in CHARS if c.upper() == c and c != ' '] + [' ']


def metrics():
    out = {}
    for key, file in FACES.items():
        font = ImageFont.truetype(str(FONTS / file), 1000)
        adv = {ch: round(font.getlength(ch) / 1000, 4) for ch in CHARS}
        cap = -font.getbbox('H', anchor='ls')[1] / 1000
        out[key] = {'file': file, 'cap': round(cap, 4), 'adv': adv}
    return out


def bitmap(font, ch, cols, rows):
    """Render ch large, crop to the cap box, and area-average down to cols x rows."""
    S = 200
    img = Image.new('L', (S * 2, S * 2), 0)
    d = ImageDraw.Draw(img)
    d.text((S // 2, S + S // 2), ch, font=font, fill=255, anchor='ls')
    a = np.asarray(img, dtype=np.float64) / 255
    cap = -font.getbbox('H', anchor='ls')[1]
    top = S + S // 2 - cap
    box = a[top:S + S // 2, :]
    xs = np.nonzero(box.max(axis=0) > 0.3)[0]
    if ch == ' ' or not len(xs):
        return ['0' * cols] * rows
    box = box[:, xs[0]:xs[-1] + 1]
    h, w = box.shape
    gy = np.linspace(0, h, rows + 1).round().astype(int)
    gx = np.linspace(0, w, cols + 1).round().astype(int)
    lines = []
    for r in range(rows):
        lines.append(''.join('1' if box[gy[r]:gy[r + 1], gx[c]:max(gx[c] + 1, gx[c + 1])].mean() > 0.42 else '0' for c in range(cols)))
    return lines


def glyphs():
    font = ImageFont.truetype(str(FONTS / FACES['bungee']), 200)
    return {
        'g7': {ch: bitmap(font, ch, 5, 7) for ch in BITMAP_CHARS},
        'g14': {ch: bitmap(font, ch, 10, 14) for ch in BITMAP_CHARS},
    }


def main():
    m = metrics()
    (VIDEO / 'src/type/metrics.json').write_text(json.dumps(m, indent=1, sort_keys=True))
    g = glyphs()
    (VIDEO / 'src/type/glyphs.json').write_text(json.dumps(g, separators=(',', ':'), sort_keys=True))
    for k, v in m.items():
        print(f"{k:10s} cap {v['cap']} em  'W' {v['adv']['W']} em")
    print('glyph bitmaps:', len(g['g7']), 'chars')
    print('\n'.join(' '.join(g['g7'][c][r].replace('0', '.').replace('1', '#') for c in 'HEAD42') for r in range(7)))


if __name__ == '__main__':
    main()
