#!/usr/bin/env python3
"""typeframe.py - the type half of the framing check (scene-map.md "Polish from Gemini's review", item 1).

  uv run --with pillow --with numpy python -I tools/typeframe.py <samples.json> [failures.json]
  uv run --with pillow --with numpy python -I tools/typeframe.py --selftest

samples.json (written by tools/framecheck.mjs --type): [{"frame", "t", "type": png, "world": png, "shot", "faces": [[x0,y0,x1,y1], ...], "cards": [name, ...]}]
where `type` is the frame's type layer alone on a transparent background and `world` the frame without its SVG layers.
Per sample:
  * settled box: the type's bounding box (alpha > 0.5). When the box at the previous or the next sample (0.5 s apart)
    is within 5 % of the frame of it, the type persists (is not mid-animation) and must sit inside a 4 % margin.
  * faces: type pixels may cover at most 3 % of any projected face box.
  * local contrast: the type's fill (and, separately, its outer 2 px edge band: stroke or backing) against the composite
    in a 6 px ring around it, worst case the ring's 85th/15th percentile; the better of the two must give >= 3:1; failing that, the type layer's own colour spread (own_contrast) may carry it.
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


def grow(mask, size):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(size))) > 127


def shrink(mask, size):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(size))) > 127


def vs_plate(L, ring):
    """Contrast of a colour of luminance L against the worst of the plate around it (its 85th or 15th percentile)."""
    hi, lo, mid = np.percentile(ring, 85), np.percentile(ring, 15), np.median(ring)
    return (L + 0.05) / (hi + 0.05) if L >= mid else (lo + 0.05) / (L + 0.05)


def contrast(mask, comp):
    """Local contrast of the type against the plate in a 6 px ring around it (ring taken from the composite, so a
    shadow or scrim counts as plate). The better of the fill (median of the type's interior) and the edge band (the
    outer 2 px of the type: its stroke or backing) counts, since either may carry the 3:1."""
    ring = lum(comp[grow(mask, 13) & ~grow(mask, 3)])
    if len(ring) < 50:
        return 99.0
    inner = shrink(mask, 5)
    fill = lum(comp[inner if inner.sum() > 50 else mask])
    edge = lum(comp[mask & ~inner]) if inner.sum() > 50 else fill
    return float(max(vs_plate(np.median(fill), ring), vs_plate(np.median(edge), ring)))


def own_contrast(s, mask):
    """The type layer's own colour spread (90th / 10th percentile luminance of its opaque pixels): a panel or backing
    drawn in the type layer (terminal window, scrim, stroke) makes the text legible against itself, even when the whole
    form is as dark as the plate. A gradient fill can pass here too; read it with the stills."""
    ty = np.asarray(Image.open(s["type"]).convert("RGB"), dtype=np.float32)
    L = lum(ty[mask])
    return float((np.percentile(L, 90) + 0.05) / (np.percentile(L, 10) + 0.05))


def sides(box):
    """px the box crosses each side of the 4 % margin (only the positive ones)."""
    lim = {"left": MARGIN * W - box[0], "right": box[2] - (1 - MARGIN) * W,
           "top": MARGIN * H - box[1], "bottom": box[3] - (1 - MARGIN) * H}
    return {k: round(float(v)) for k, v in lim.items() if v > 0}


def close(a, b):
    return b is not None and max(abs(a[0] - b[0]) / W, abs(a[2] - b[2]) / W, abs(a[1] - b[1]) / H, abs(a[3] - b[3]) / H) < SETTLE


def analyse(samples):
    """Failures per sample: [{"t", "frame", "shot", "kind": margin|face|contrast, "value", "why"}].
    Settled = the box matches the previous or the next sample's box (it persists 2+ samples, 0.5 s apart)."""
    data = []
    for s in samples:
        mask, comp = load(s)
        data.append((s, mask, comp, bbox(mask)))
    out = []
    for i, (s, mask, comp, box) in enumerate(data):
        if box is None:
            continue
        box = tuple(int(v) for v in box)
        nxt = data[i + 1][3] if i + 1 < len(data) else None
        prv = data[i - 1][3] if i else None
        base = {"t": s["t"], "frame": s.get("frame"), "shot": s.get("shot")}
        over = sides(box)
        if over and (close(box, nxt) or close(box, prv)):
            out.append({**base, "kind": "margin", "value": max(over.values()), "why": f"box {box} crosses the 4 % margin by {over} px"})
        cards = s.get("cards") or [None] * len(s["faces"])
        for f, card in zip(s["faces"], cards):
            x0, y0, x1, y1 = [int(round(v)) for v in f]
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
            if x1 <= x0 or y1 <= y0:
                continue
            cover = float(mask[y0:y1, x0:x1].mean())
            if cover > FACE_COVER:
                out.append({**base, "kind": "face", "value": round(100 * cover), "why": f"type covers {100 * cover:.0f} % of face {card}"})
        ratio = contrast(mask, comp)
        if ratio < CONTRAST:
            ratio = max(ratio, own_contrast(s, mask))
        if ratio < CONTRAST:
            out.append({**base, "kind": "contrast", "value": round(ratio, 2), "why": f"local contrast {ratio:.2f}:1"})
    return out


def selftest():
    """Three drawn cases, each must be flagged by exactly its own check; a clean control must pass."""
    import os
    import tempfile
    d = tempfile.mkdtemp(prefix="typeframe-selftest-")

    def case(name, draw_type, world_rgb, faces):
        ty = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_type(ty)
        wo = Image.new("RGB", (W, H), world_rgb)
        tp, wp = os.path.join(d, name + "-t.png"), os.path.join(d, name + "-w.png")
        ty.save(tp)
        wo.save(wp)
        return {"frame": 0, "t": 0.0, "shot": name, "type": tp, "world": wp, "faces": faces}

    def rect(box, fill):
        def f(im):
            im.paste(fill, box)
        return f

    white, dark, mid = (255, 255, 255, 255), (20, 20, 20), (150, 150, 150)
    samples = [
        case("ok", rect((600, 400, 1300, 600), white), dark, [[100, 100, 200, 200]]),
        case("margin", rect((20, 400, 800, 600), white), dark, []),
        case("face", rect((600, 400, 1300, 600), white), dark, [[900, 450, 1000, 550]]),
        case("contrast", rect((600, 400, 1300, 600), (170, 170, 170, 255)), mid, []),
    ]
    # the same box twice so the settled test sees it persist
    samples = [x for s in samples for x in (s, dict(s, t=0.5))]
    got = {(f["shot"], f["kind"]) for f in analyse(samples)}
    want = {("margin", "margin"), ("face", "face"), ("contrast", "contrast")}
    print("typeframe selftest flagged:", sorted(got))
    ok = got == want
    print("typeframe selftest: " + ("PASS" if ok else "FAIL (wanted " + str(sorted(want)) + ")"))
    sys.exit(0 if ok else 1)


def main():
    if sys.argv[1] == "--selftest":
        selftest()
    samples = json.load(open(sys.argv[1], encoding="utf-8"))
    out = analyse(samples)
    if len(sys.argv) > 2:
        json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
    n = {k: sum(1 for f in out if f["kind"] == k) for k in ("margin", "face", "contrast")}
    print(f"typeframe: {len(samples)} samples; margin {n['margin']}, face {n['face']}, contrast {n['contrast']}")
    for f in out:
        print(f"  {f['t']:7.2f}  {str(f['shot']):22s} {f['kind']:8s} {f['why']}")
    print("typeframe: FAIL" if out else "typeframe: PASS")
    sys.exit(1 if out else 0)


if __name__ == "__main__":
    main()
