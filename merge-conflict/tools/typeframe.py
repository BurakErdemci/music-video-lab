#!/usr/bin/env python3
"""typeframe.py - the type half of the framing check (scene-map.md "Polish from Gemini's review", item 1).

  uv run --with pillow --with numpy python -I tools/typeframe.py <samples.json>

samples.json (written by tools/framecheck.mjs --type): [{"frame", "t", "type": png, "world": png, "faces": [[x0,y0,x1,y1], ...]}]
where `type` is the frame's type layer alone on a transparent background and `world` the frame without its SVG layers.
Per sample:
  * settled box: the type's bounding box (alpha > 0.5). When the box at the next sample (0.5 s later) is within 5 % of
    the frame of it, the type has settled and must sit inside a 4 % margin.
  * faces: type pixels may cover at most 3 % of any projected face box.
  * local contrast: the type composited over the world, inside its footprint grown by 6 px: the 85th and 15th
    percentile relative luminance give (Lhi + 0.05) / (Llo + 0.05) >= 3 (text against its own backing or the scene).
Exit 1 on any failure. Prints failing samples with time and reason, and a count per check.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 1920, 1080
MARGIN = 0.04
SETTLE = 0.05
FACE_COVER = 0.03
CONTRAST = 3.0


def lum(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]


def load(s):
    ty = np.asarray(Image.open(s["type"]).convert("RGBA"), dtype=np.float32)
    wo = np.asarray(Image.open(s["world"]).convert("RGB"), dtype=np.float32)
    a = ty[..., 3:] / 255.0
    comp = ty[..., :3] * a + wo * (1 - a)
    return ty[..., 3] > 127, comp


def bbox(mask):
    ys, xs = np.nonzero(mask)
    if len(xs) < 200:
        return None
    return (xs.min(), ys.min(), xs.max(), ys.max())


def main():
    samples = json.load(open(sys.argv[1], encoding="utf-8"))
    data = []
    for s in samples:
        mask, comp = load(s)
        data.append((s, mask, comp, bbox(mask)))
    fails = {"margin": [], "face": [], "contrast": []}
    for i, (s, mask, comp, box) in enumerate(data):
        if box is None:
            continue
        # settled: the next sample's box is close to this one
        nxt = data[i + 1][3] if i + 1 < len(data) else None
        if nxt is not None and max(abs(box[0] - nxt[0]) / W, abs(box[2] - nxt[2]) / W, abs(box[1] - nxt[1]) / H, abs(box[3] - nxt[3]) / H) < SETTLE:
            if box[0] < MARGIN * W or box[2] > (1 - MARGIN) * W or box[1] < MARGIN * H or box[3] > (1 - MARGIN) * H:
                fails["margin"].append((s["t"], f"type box {box} outside the 4 % margin"))
        for f in s["faces"]:
            x0, y0, x1, y1 = [int(round(v)) for v in f]
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
            if x1 <= x0 or y1 <= y0:
                continue
            cover = mask[y0:y1, x0:x1].mean()
            if cover > FACE_COVER:
                fails["face"].append((s["t"], f"type covers {100 * cover:.0f} % of a face box"))
        grown = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13))) > 127
        L = lum(comp[grown])
        lo, hi = np.percentile(L, 15), np.percentile(L, 85)
        ratio = (hi + 0.05) / (lo + 0.05)
        if ratio < CONTRAST:
            fails["contrast"].append((s["t"], f"local contrast {ratio:.2f}:1"))
    n = sum(len(v) for v in fails.values())
    print(f"typeframe: {len(samples)} samples; margin {len(fails['margin'])}, face {len(fails['face'])}, contrast {len(fails['contrast'])}")
    for k, v in fails.items():
        for t, why in v:
            print(f"  {t:7.2f}  {k:8s} {why}")
    print("typeframe: FAIL" if n else "typeframe: PASS")
    sys.exit(1 if n else 0)


if __name__ == "__main__":
    main()
