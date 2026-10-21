#!/usr/bin/env python3
"""font_metrics.py - per-character advances of the type layer's display font, so letter positions are
known when a schedule is built (no DOM measuring at render time; the sibling's metrics.ts pattern).

  uv run --with pillow python -I tools/font_metrics.py

Writes video/src/type/anton-metrics.json: {"cap": em, "adv": {char: em}} for printable ASCII.
Deterministic: advances come from the font file at 1000 px.
"""
import json
from pathlib import Path
from PIL import ImageFont

VIDEO = Path(__file__).resolve().parent.parent / 'video'
font = ImageFont.truetype(str(VIDEO / 'public/fonts/Anton-Regular.ttf'), 1000)
adv = {chr(c): round(font.getlength(chr(c)) / 1000, 4) for c in range(32, 127)}
cap = -font.getbbox('H', anchor='ls')[1] / 1000
out = {'font': 'Anton-Regular.ttf', 'cap': round(cap, 4), 'adv': adv}
(VIDEO / 'src/type/anton-metrics.json').write_text(json.dumps(out, indent=1, sort_keys=True))
print(f"cap {out['cap']} em, {len(adv)} advances, 'W' {adv['W']} em, '4' {adv['4']} em")
