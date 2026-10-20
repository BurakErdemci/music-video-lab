"""Plot helper for living-checks.mjs: python living-checks.py <jumpscan.json> <out.png>"""
import json, sys
from PIL import Image, ImageDraw

d = json.load(open(sys.argv[1]))
L, R = d["leftDiff"], d["rightDiff"]
W, H, M = 1800, 560, 40
img = Image.new("RGB", (W, H), "white")
g = ImageDraw.Draw(img)
n = len(L)
top = max(max(L), max(R), d["floor"] * 2, 1e-6)
x = lambda i: M + i * (W - 2 * M) / max(n - 1, 1)
y = lambda v: H - M - v * (H - 2 * M) / top
g.line([(M, y(d["floor"])), (W - M, y(d["floor"]))], fill=(200, 200, 200))
g.text((M, y(d["floor"]) - 12), "floor %.1f" % d["floor"], fill=(120, 120, 120))
for c in d["cutFrames"]:
    g.line([(x(c), M), (x(c), H - M)], fill=(170, 230, 170))
for series, col in ((L, (30, 90, 220)), (R, (220, 80, 30))):
    g.line([(x(i), y(v)) for i, v in enumerate(series)], fill=col, width=1)
for s in d["spikes"]:
    g.ellipse([x(s["frame"]) - 4, y(s["value"]) - 4, x(s["frame"]) + 4, y(s["value"]) + 4],
              outline=(0, 160, 0) if s["class"] == "ALLOWED" else (220, 0, 0), width=2)
g.text((M, 8), "blue=left half, orange=right half, green line=cut event, circle green=ALLOWED red=UNINTENDED; x=composition frame 0..%d, y max %.1f" % (n, top), fill=(0, 0, 0))
img.save(sys.argv[2])
