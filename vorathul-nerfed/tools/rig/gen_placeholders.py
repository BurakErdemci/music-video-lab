"""Deterministic placeholder textures for the Vorathul rig: one flat PNG per texture slot.

    uv run --with pillow --with numpy python tools/rig/gen_placeholders.py

Each PNG is filled with the slot's idColor (from video/src/rig/vorathul.rig.json), has the size the JSON declares
and a black cross at the pivot. Real art replaces a file by path; nothing else changes.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
RIG = json.loads((ROOT / "video/src/rig/vorathul.rig.json").read_text())
OUT = ROOT / "video/public"
SS = 4  # supersampling for smooth alpha edges


def hex_rgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def draw_shape(d, w, h, sh, fill, px_h):
    t = sh.get("t", "rrect")
    if t == "capsule":
        frac = sh.get("frac", 1.0)
        cw = w * frac
        x0 = (w - cw) / 2
        r = cw / 2
        d.rounded_rectangle([x0, 0, x0 + cw, h], radius=r, fill=fill)
    elif t == "disk":
        d.ellipse([0, 0, w, h], fill=fill)
    elif t == "studs":
        r = w * 0.05
        for cx in (w * 0.33, w * 0.67):
            d.ellipse([cx - r, h * 0.3 - r, cx + r, h * 0.3 + r], fill=fill)
    elif t == "collar":
        d.polygon([(0, h), (w * 0.1, 0), (w * 0.3, h * 0.5), (w * 0.5, 0), (w * 0.7, h * 0.5), (w * 0.9, 0), (w, h)], fill=fill)
    elif t == "sword":
        bw = w * 0.2
        d.rectangle([w / 2 - bw / 2, 0, w / 2 + bw / 2, h], fill=fill)
        d.rectangle([0, px_h * 0.095, w, px_h * 0.145], fill=fill)
    elif t == "swordrunes":
        d.rectangle([w / 2 - w * 0.02, px_h * 0.2, w / 2 + w * 0.02, h * 0.8], fill=fill)
    elif t == "hem":
        v = sh.get("v", 0)
        n = 3 + v
        pts = [(0, 0), (w, 0)]
        for i in range(n * 2 + 1):
            pts.append((w * (1 - i / (n * 2)), h if i % 2 == 0 else h * 0.8))
        d.polygon(pts, fill=fill)
    elif t == "helm":
        d.rounded_rectangle([w * 0.2, h * 0.3, w * 0.8, h], radius=w * 0.06, fill=fill)
        for hx, sgn in ((w * 0.2, -1), (w * 0.8, 1)):
            d.polygon([(hx, h * 0.5), (hx + sgn * w * 0.12, h * 0.1), (hx + sgn * w * 0.14, 0), (hx + sgn * w * 0.04, h * 0.45)], fill=fill)
    elif t == "slitsad":
        d.arc([0, h * 0.2, w, h * 1.6], 200, 340, fill=fill, width=int(max(2, h * 0.5)))
    elif t == "crown":
        n = sh.get("spikes", 5)
        pts = [(0, h)]
        for i in range(n):
            x0 = w * i / n
            pts += [(x0, h * 0.4), (x0 + w / n / 2, 0), (x0 + w / n, h * 0.4)]
        pts.append((w, h))
        d.polygon(pts, fill=fill)
    elif t == "gems":
        n = sh.get("n", 3)
        r = w * 0.05
        for i in range(n):
            cx = w * (i + 1) / (n + 1)
            d.ellipse([cx - r, h * 0.7 - r, cx + r, h * 0.7 + r], fill=fill)
    else:
        d.rounded_rectangle([0, 0, w, h], radius=min(w, h) * 0.12, fill=fill)


FIXED_R = {"helm_half_R", "helm_half_L", "crown_half_R", "crown_half_L"}


def joint_disks():
    """Section 1.4 rule 1: a filled disk (p, r) in BOTH images of every rotating joint (child pivot, parent socket)."""
    disks = {}
    parts = {p["id"]: p for p in RIG["parts"]}
    for p in RIG["parts"]:
        r = p.get("jointRadius", 0)
        if not r or p["id"] in FIXED_R or p["parent"] == "root" or not p.get("limits", {}).get("rot"):
            continue
        par = parts.get(p["parent"]) or parts[p["parent"].rsplit("_", 1)[0]]
        for slot in {p["texture"], *p.get("variants", [])}:
            px, py = RIG["textures"][slot]["pivot"]
            disks.setdefault(slot, []).append((px, py, r))
        for slot in {par["texture"], *par.get("variants", [])}:
            disks.setdefault(slot, []).append((p["socket"][0], p["socket"][1], r))
    return disks


DISKS = joint_disks()


def shape_mask(slot, t):
    w, h = t["w"], t["h"]
    big = Image.new("L", (w * SS, h * SS), 0)
    d = ImageDraw.Draw(big)
    sh = t["shape"]
    kind = sh.get("t")
    if kind == "crownhalf":
        full = RIG["textures"]["crown_full"]
        m = shape_mask("crown_full", full)
        return m.crop((0, 0, w, h)) if sh["side"] == "R" else m.crop((full["w"] - w, 0, full["w"], h))
    if kind == "helmhalf":
        full = RIG["textures"]["helm_closed"]
        m = shape_mask("helm_closed", full)
        cut = RIG["helmCut"]
        poly = Image.new("L", (full["w"] * SS, full["h"] * SS), 0)
        pd = ImageDraw.Draw(poly)
        # one-pixel overlap across the cut so the halves reassemble without a hairline crack
        if sh["side"] == "R":
            pts = [(0, 0)] + [((x + 1) * SS, y * SS) for x, y in cut] + [(0, full["h"] * SS)]
        else:
            pts = [(full["w"] * SS, 0)] + [((x - 1) * SS, y * SS) for x, y in cut] + [(full["w"] * SS, full["h"] * SS)]
        pd.polygon(pts, fill=255)
        poly = poly.resize((full["w"], full["h"]), Image.LANCZOS)
        both = Image.fromarray(np.minimum(np.asarray(m), np.asarray(poly)))
        return both.crop((0, 0, w, h)) if sh["side"] == "R" else both.crop((full["w"] - w, 0, full["w"], h))
    draw_shape(d, w * SS, h * SS, {**sh}, 255, h * SS)
    for x, y, r in DISKS.get(slot, []):
        d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], fill=255)
    return big.resize((w, h), Image.LANCZOS)


def main():
    n = 0
    for slot, t in RIG["textures"].items():
        w, h = t["w"], t["h"]
        mask = shape_mask(slot, t)
        img = Image.new("RGBA", (w, h), hex_rgb(t["idColor"]) + (0,))
        img.putalpha(mask)
        px, py = t["pivot"]
        cross = ImageDraw.Draw(img)
        arm = max(4, min(w, h) // 6)
        # the cross is drawn only where the shape is opaque, so the silhouette stays the shape
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.line([(px - arm, py), (px + arm, py)], fill=(0, 0, 0, 255), width=2)
        ld.line([(px, py - arm), (px, py + arm)], fill=(0, 0, 0, 255), width=2)
        keep = Image.new("L", (w, h), 0)
        keep.paste(layer.getchannel("A"), (0, 0))
        img.paste(Image.new("RGBA", (w, h), (0, 0, 0, 255)), (0, 0), Image.fromarray(np.minimum(np.asarray(keep), np.asarray(mask))))
        dest = OUT / t["src"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, optimize=False, compress_level=9)
        n += 1
    print(f"wrote {n} placeholder textures to {OUT / 'rig/placeholder'}")


if __name__ == "__main__":
    sys.exit(main())
