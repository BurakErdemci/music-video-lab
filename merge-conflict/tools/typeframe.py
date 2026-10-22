#!/usr/bin/env python3
"""typeframe.py - the type half of the framing check (scene-map.md "Polish from Gemini's review", item 1).

  uv run --with pillow --with numpy python -I tools/typeframe.py <samples.json> [failures.json]
  uv run --with pillow --with numpy python -I tools/typeframe.py --selftest

samples.json (written by tools/framecheck.mjs --type): [{"frame", "t", "type": png, "world": png, "final": png, "shot", "faces": [[x0,y0,x1,y1], ...], "cards": [name, ...]}]
where `type` is the frame's type layer alone on a transparent background, `world` the frame without its SVG layers and
`final` (optional) the whole frame as it renders.
Per sample:
  * settled box: the type's bounding box (alpha > 0.5). When the box at the previous or the next sample (0.5 s apart)
    is within 5 % of the frame of it, the type persists (is not mid-animation) and must sit inside a 4 % margin.
  * faces: settled type pixels may cover at most 3 % of any projected face box (down to the chin).
  * hidden (round 7d, "Type is never hidden by a card"): where the type layer is opaque (alpha >= 0.95), the final
    frame must show the type's own colour; a settled form with more than 2 % of those pixels changed (any channel off
    by more than 48) is covered by a card, an effect or a cover.
  * glyph size (round 7d, "a form never shrinks to clear a face"): every settled text line keeps a glyph cap height of
    >= 3.5 % of the frame height. Glyphs are the letter-shaped connected components of the type layer (its opaque
    pixels, and inside a panel the pixels that stand out from the panel); components on one baseline group into a
    line, and the line's cap height is the 90th percentile of its glyph heights (caps and ascenders), measured on lines
    of 5+ glyphs. A sample with "cap_exempt" (a span another lane owns) skips it.
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
HIDDEN = 0.02
HIDDEN_DIFF = 48
CAP_MIN = 0.035


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


def hidden(s):
    """Share of the type layer's opaque pixels that the final frame does not show in the type's colour."""
    ty = np.asarray(Image.open(s["type"]).convert("RGBA"), dtype=np.float32)
    fin = np.asarray(Image.open(s["final"]).convert("RGB"), dtype=np.float32)
    solid = ty[..., 3] >= 0.95 * 255
    if solid.sum() < 200:
        return 0.0
    off = np.abs(fin - ty[..., :3]).max(axis=-1) > HIDDEN_DIFF
    return float((off & solid).sum() / solid.sum())


OVERLAP = 0.02  # share of a settled form's own pixels another type form may cover


def overlaps(s):
    """Type over type (round 9): with each type-plan entry rendered alone (s["overlap"]["forms"]) and with none of
    them (["none"], the type outside the plan), a settled form's own pixels are its alone-render's opaque pixels minus
    the none-render's. Where another form's own pixels fall on them, the full type layer shows whichever is drawn on
    top: if it matches the other form there, the settled one is covered. Returns [(id, other, share)] over OVERLAP."""
    ov = s.get("overlap")
    if not ov:
        return []
    rgba = lambda p: np.asarray(Image.open(p).convert("RGBA"), dtype=np.float32)
    none = rgba(ov["none"])[..., 3] > 127
    full = rgba(s["type"])[..., :3]
    forms = []
    for f in ov["forms"]:
        im = rgba(f["png"])
        forms.append((f, im[..., :3], (im[..., 3] > 127) & ~none))
    out = []
    for f, _, own in forms:
        if not f.get("settled") or own.sum() < 200:
            continue
        for g, grgb, gown in forms:
            if g is f:
                continue
            both = own & gown
            if both.sum() < 50:
                continue
            frgb = next(r for h, r, _ in forms if h is f)
            # covered where the full layer shows the other form's colour rather than this one's
            d_self = np.abs(full[both] - frgb[both]).max(axis=-1)
            d_other = np.abs(full[both] - grgb[both]).max(axis=-1)
            covered = int(((d_other < d_self) & (d_self > HIDDEN_DIFF)).sum())
            share = covered / float(own.sum())
            if share > OVERLAP:
                out.append((f["id"], g["id"], share))
    return out


def box_mean(a, r):
    """Mean of a over a (2r+1)^2 box, by summed-area table."""
    c = np.pad(a, ((r + 1, r), (r + 1, r)), mode="edge").cumsum(0).cumsum(1)
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def components(mask, iters=400):
    """Connected components (4-neighbour) of a boolean mask: a list of (y0, x0, y1, x1, area)."""
    h, w = mask.shape
    idx = np.arange(1, h * w + 1, dtype=np.int64).reshape(h, w)
    lab = np.where(mask, idx, 0)
    big = h * w + 1
    for _ in range(iters):
        m = np.where(lab > 0, lab, big)
        n = m.copy()
        n[1:, :] = np.minimum(n[1:, :], m[:-1, :])
        n[:-1, :] = np.minimum(n[:-1, :], m[1:, :])
        n[:, 1:] = np.minimum(n[:, 1:], m[:, :-1])
        n[:, :-1] = np.minimum(n[:, :-1], m[:, 1:])
        n = np.where(mask, n, 0)
        # pointer jumping: a label points at a pixel whose own label may be smaller
        flat = n.ravel()
        j = np.where(flat > 0, flat[np.maximum(flat - 1, 0)], 0)
        n = np.where(mask, np.minimum(n, j.reshape(h, w)), 0)
        if np.array_equal(n, lab):
            break
        lab = n
    ys, xs = np.nonzero(lab)
    if len(ys) == 0:
        return []
    l = lab[ys, xs]
    order = np.argsort(l, kind="stable")
    l, ys, xs = l[order], ys[order], xs[order]
    cut = np.flatnonzero(np.diff(l)) + 1
    out = []
    for a, b in zip(np.r_[0, cut], np.r_[cut, len(l)]):
        out.append((int(ys[a:b].min()), int(xs[a:b].min()), int(ys[a:b].max()) + 1, int(xs[a:b].max()) + 1, int(b - a)))
    return out


def cap_lines(s, scale=2):
    """The text lines of the type layer with their cap height in full-frame px: [(cap, x0, y0, n_glyphs)]."""
    im = Image.open(s["type"]).convert("RGBA")
    im = im.resize((im.width // scale, im.height // scale), Image.BOX)
    a = np.asarray(im, dtype=np.float32) / 255.0
    solid = a[..., 3] > 0.5
    L = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    # inside a panel: the pixels that differ from the panel around them
    near = box_mean(L * solid, 10) / np.maximum(box_mean(solid.astype(np.float32), 10), 1e-3)
    ink = solid & (np.abs(L - near) > 0.18)
    rgb = a[..., :3] * 255
    glyphs = []
    for mask in (solid, ink):
        # a flap tile's black split line cuts its letter in two: bridge 2 px vertically (and take it off the height)
        grown = mask.copy()
        for d in (1, 2):
            grown[d:, :] |= mask[:-d, :]
            grown[:-d, :] |= mask[d:, :]
        for y0, x0, y1, x1, area in components(grown):
            gh, gw = (y1 - y0 - 4) * scale, (x1 - x0) * scale
            fill = area * scale * scale / max(1, (y1 - y0) * scale * gw)
            if not (5 <= gh <= 320 and gw <= 2.5 * gh and 0.12 <= fill <= 0.98):
                continue
            # the editor chrome is not lyric: its grey title and gutter text, and the three window dots
            sel = mask[y0:y1, x0:x1]
            # its brightest pixels (thin bright text averages toward grey once anti-aliased)
            col = np.percentile(rgb[y0:y1, x0:x1][sel], 90, axis=0) if sel.any() else np.zeros(3)
            if any(np.abs(col - np.array(c)).max() < 22 for c in ((139, 148, 158), (110, 118, 129))):
                continue
            if fill > 0.6 and 0.7 < gw / max(1, gh) < 1.4 and gh <= 24:
                continue  # a window dot, or one dot of a dot-matrix letter
            glyphs.append((y0 * scale, x0 * scale, y0 * scale + gh, x1 * scale))
    # group glyphs sharing a baseline band and close horizontally into lines
    glyphs = sorted(set(glyphs), key=lambda g: (g[0], g[1]))
    parent = list(range(len(glyphs)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for i, g in enumerate(glyphs):
        for j in range(i + 1, len(glyphs)):
            h_ = glyphs[j]
            if h_[0] > g[2]:
                break
            hi, hj = g[2] - g[0], h_[2] - h_[0]
            same = abs(g[2] - h_[2]) < 0.35 * max(hi, hj) and 0.5 < hi / hj < 2.0
            close = max(g[1], h_[1]) - min(g[3], h_[3]) < 1.5 * max(hi, hj)
            if same and close:
                parent[find(i)] = find(j)
    lines = {}
    for i, g in enumerate(glyphs):
        lines.setdefault(find(i), []).append(g)
    out = []
    for gs in lines.values():
        if len(gs) >= 5:
            hs = sorted(g[2] - g[0] for g in gs)
            out.append((float(np.percentile(hs, 90)), min(g[1] for g in gs), min(g[0] for g in gs), len(gs)))
    return out


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


DIM_FLOOR = 0.3  # an unsung dot-matrix word's bulbs: at least this share of the same bulbs lit (round 11)
# a line pressed flat beside the form's biggest (round 11, "ALL YOUR SORRIES INTO" at 3.8 % under a 14.4 % SQUASHED):
# under FLAT_REL of the form's largest line and under FLAT_ABS of the frame
FLAT_REL, FLAT_ABS = 1 / 3, 0.05


def bright(p):
    """Per-pixel brightness of a type render: its strongest channel times its alpha, 0..1."""
    im = np.asarray(Image.open(p).convert("RGBA"), dtype=np.float32) / 255.0
    return im[..., :3].max(axis=-1) * im[..., 3]


def dim_ratio(e):
    """A dot-matrix panel's dimmest bulbs now against the same bulbs with every word lit (its "lit" render): the 10th
    percentile over the bulbs of (mean brightness now / mean brightness lit). Bulbs: components of the lit render
    brighter than 0.25 (the panel behind them is near black), halved for speed."""
    now, lit = bright(e["png"]), bright(e["lit"])
    now, lit = now[::2, ::2], lit[::2, ::2]
    ratios = []
    for y0, x0, y1, x1, area in components(lit > 0.25):
        if area < 3 or (y1 - y0) > 20 or (x1 - x0) > 20:
            continue
        m = lit[y0:y1, x0:x1] > 0.25
        ratios.append(float(now[y0:y1, x0:x1][m].mean() / max(1e-3, lit[y0:y1, x0:x1][m].mean())))
    return float(np.percentile(ratios, 10)) if len(ratios) >= 10 else 1.0


# the forms whose own box the margin rule measures alone (round 11): the ones drawn turned or projected, which the
# whole-layer box misses while they move - the control line's leaning backing, a line lying on the floor. (A sweep of
# every form on proof232-r10 also found plane-carried and flying forms crossing the margin while they move: v-head,
# the Stamps, the Logo halves, r-rebased, r-gone, r-data2, v-orange, f-equals; left to the architect.)
EDGE_FORMS = ("GlitchText", "RunwayLine")


def entry_checks(s, base):
    """Each type-plan entry on screen, rendered alone (round 11): at its settled state its own box (glyphs, backing,
    turned or projected) keeps inside the 4 % margin, its text lines keep the 3.5 % cap height, and a dot-matrix
    panel shows its unsung words at DIM_FLOOR or more of their lit brightness."""
    out = []
    for e in s.get("entries") or []:
        if not e.get("settled"):
            continue
        im = np.asarray(Image.open(e["png"]).convert("RGBA"), dtype=np.float32)
        box = bbox(im[..., 3] > 127)
        if box is None:
            continue
        box = tuple(int(v) for v in box)
        over = sides(box)
        if over and e["form"] in EDGE_FORMS:
            out.append({**base, "kind": "edge", "value": max(over.values()), "why": f"form {e['id']} ({e['form']}) box {box} crosses the 4 % margin by {over} px"})
        if not s.get("cap_exempt"):
            lines = cap_lines({"type": e["png"]})
            small = [ln for ln in lines if ln[0] < CAP_MIN * H]
            if small:
                c, x, y, n = min(small)
                out.append({**base, "kind": "small", "value": round(100 * c / H, 1), "why": f"form {e['id']}: a text line of {n} glyphs at ({x}, {y}) has a cap height of {100 * c / H:.1f} % (min {100 * CAP_MIN:.1f} %)"})
            elif lines:
                top = max(ln[0] for ln in lines)
                flat = [ln for ln in lines if ln[0] < FLAT_REL * top and ln[0] < FLAT_ABS * H]
                if flat:
                    c, x, y, n = min(flat)
                    out.append({**base, "kind": "small", "value": round(100 * c / H, 1), "why": f"form {e['id']}: a text line of {n} glyphs at ({x}, {y}) is pressed to {100 * c / H:.1f} % under a {100 * top / H:.1f} % line"})
        if e.get("lit"):
            r = dim_ratio(e)
            if r < DIM_FLOOR:
                out.append({**base, "kind": "dim", "value": round(r, 2), "why": f"form {e['id']}: its unsung words show at {100 * r:.0f} % of their lit brightness (min {100 * DIM_FLOOR:.0f} %)"})
    return out


def analyse(samples):
    """Failures per sample: [{"t", "frame", "shot", "kind": margin|face|contrast|hidden|small|overlap, "value", "why"}].
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
        settled = close(box, nxt) or close(box, prv)
        if over and settled:
            out.append({**base, "kind": "margin", "value": max(over.values()), "why": f"box {box} crosses the 4 % margin by {over} px"})
        if settled and not s.get("cap_exempt"):
            small = [ln for ln in cap_lines(s) if ln[0] < CAP_MIN * H]
            if small:
                c, x, y, n = min(small)
                out.append({**base, "kind": "small", "value": round(100 * c / H, 1), "why": f"a text line of {n} glyphs at ({x}, {y}) has a cap height of {100 * c / H:.1f} % of the frame (min {100 * CAP_MIN:.1f} %)"})
        if settled and s.get("final"):
            h = hidden(s)
            if h > HIDDEN:
                out.append({**base, "kind": "hidden", "value": round(100 * h), "why": f"{100 * h:.0f} % of the type's opaque pixels hidden in the final frame"})
        for fid, gid, share in overlaps(s):
            out.append({**base, "kind": "overlap", "value": round(100 * share), "why": f"settled form {fid} is {100 * share:.0f} % covered by the form {gid}"})
        cards = s.get("cards") or [None] * len(s["faces"])
        # round 7d: the face rule binds a form at its settled state (a form flying in may cross a face on its way)
        for f, card in zip(s["faces"] if settled else [], cards):
            x0, y0, x1, y1 = [int(round(v)) for v in f]
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
            if x1 <= x0 or y1 <= y0:
                continue
            cover = float(mask[y0:y1, x0:x1].mean())
            if cover > FACE_COVER:
                out.append({**base, "kind": "face", "value": round(100 * cover), "why": f"type covers {100 * cover:.0f} % of face {card}"})
        out.extend(entry_checks(s, base))
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

    def case(name, draw_type, world_rgb, faces, cover=None):
        ty = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_type(ty)
        wo = Image.new("RGB", (W, H), world_rgb)
        fin = wo.copy()
        fin.paste(ty, (0, 0), ty)
        if cover:
            fin.paste((200, 60, 20), cover)  # a card drawn over the end of the word
        tp, wp, fp = os.path.join(d, name + "-t.png"), os.path.join(d, name + "-w.png"), os.path.join(d, name + "-f.png")
        ty.save(tp)
        wo.save(wp)
        fin.save(fp)
        return {"frame": 0, "t": 0.0, "shot": name, "type": tp, "world": wp, "final": fp, "faces": faces}

    def overlap_case(name, cover):
        # two forms: a settled counter (A) and a marquee (B) drawn after it - over A's right half, or beside it
        a_box, b_box = (600, 400, 1100, 600), ((900, 380, 1500, 640) if cover else (1200, 380, 1700, 640))
        fa, fb, fn = [Image.new("RGBA", (W, H), (0, 0, 0, 0)) for _ in range(3)]
        fa.paste((240, 200, 40, 255), a_box)
        fb.paste((40, 120, 240, 255), b_box)
        ty = fa.copy()
        ty.alpha_composite(fb)
        paths = {k: os.path.join(d, f"{name}-{k}.png") for k in ("a", "b", "n")}
        fa.save(paths["a"]), fb.save(paths["b"]), fn.save(paths["n"])
        c = case(name, lambda im: im.alpha_composite(ty), (20, 20, 20), [])
        c["overlap"] = {"none": paths["n"], "forms": [{"id": "A", "png": paths["a"], "settled": True}, {"id": "B", "png": paths["b"], "settled": False}]}
        return c

    def rect(box, fill):
        def f(im):
            im.paste(fill, box)
        return f

    white, dark, mid = (255, 255, 255, 255), (20, 20, 20), (150, 150, 150)

    def text(words, size):
        # a terminal: light glyphs on a dark panel, the panel in the type layer as the forms draw it
        def f(im):
            from PIL import ImageDraw, ImageFont
            d = ImageDraw.Draw(im)
            d.rectangle((560, 380, 1500, 700), fill=(13, 17, 23, 240))
            d.text((600, 500), words, font=ImageFont.truetype("consola.ttf", size), fill=(230, 237, 243, 255))
        return f
    def entry_case(name, draw_entry, draw_lit=None, settled=True):
        # a form rendered alone (round 11): the full type layer is a clean box, the entry's own render the defect
        c = case(name, rect((600, 400, 1300, 600), white), dark, [])
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_entry(im)
        ep = os.path.join(d, name + "-e.png")
        im.save(ep)
        e = {"id": name, "form": "Marquee" if draw_lit else ("GlitchText" if name in ("edge", "flying") else "Stack"), "png": ep, "settled": settled}
        if draw_lit:
            lit = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw_lit(lit)
            e["lit"] = os.path.join(d, name + "-l.png")
            lit.save(e["lit"])
        c["entries"] = [e]
        return c

    def turned(im):
        # a backing turned 30 degrees whose corner leaves the frame at the bottom left
        from PIL import ImageDraw
        ImageDraw.Draw(im).polygon([(60, 900), (700, 530), (800, 700), (160, 1075)], fill=(5, 3, 10, 200))

    def bulbs(level):
        def f(im):
            from PIL import ImageDraw
            dr = ImageDraw.Draw(im)
            dr.rectangle((300, 380, 1620, 700), fill=(5, 3, 10, 230))
            for i in range(40):
                for j in range(5):
                    x, y = 340 + i * 30, 440 + j * 30
                    dr.ellipse((x, y, x + 16, y + 16), fill=(int(255 * level), int(60 * level), int(60 * level), 255))
        return f

    def tiny(im):
        text("ALL YOUR SORRIES INTO", 22)(im)

    def flat(im):
        # a big key line and a row pressed under it, still over the 3.5 % floor
        from PIL import ImageDraw, ImageFont
        d = ImageDraw.Draw(im)
        d.text((300, 200), "SQUASHED", font=ImageFont.truetype("consola.ttf", 200), fill=(230, 40, 40, 255))
        d.text((300, 500), "ALL YOUR SORRIES INTO", font=ImageFont.truetype("consola.ttf", 58), fill=(230, 40, 40, 255))

    samples = [
        case("ok", rect((600, 400, 1300, 600), white), dark, [[100, 100, 200, 200]]),
        entry_case("edge", turned),
        entry_case("dim", bulbs(0.15), bulbs(1.0)),
        entry_case("brightdim", bulbs(0.4), bulbs(1.0)),
        entry_case("esmall", tiny),
        entry_case("eflat", flat),
        entry_case("flying", turned, settled=False),
        case("margin", rect((20, 400, 800, 600), white), dark, []),
        case("face", rect((600, 400, 1300, 600), white), dark, [[900, 450, 1000, 550]]),
        case("contrast", rect((600, 400, 1300, 600), (170, 170, 170, 255)), mid, []),
        case("hidden", rect((600, 400, 1300, 600), white), dark, [], cover=(1150, 380, 1400, 640)),
        case("small", text("You wrote a comment that just says", 22), (120, 120, 120), []),
        case("bigtext", text("I WROTE THAT COMMENT", 64), (120, 120, 120), []),
        overlap_case("overlap", cover=True),
        overlap_case("sidebyside", cover=False),
    ]
    # the same box twice so the settled test sees it persist
    samples = [x for s in samples for x in (s, dict(s, t=0.5))]
    got = {(f["shot"], f["kind"]) for f in analyse(samples)}
    want = {("margin", "margin"), ("face", "face"), ("contrast", "contrast"), ("hidden", "hidden"), ("small", "small"), ("overlap", "overlap"),
            ("edge", "edge"), ("dim", "dim"), ("esmall", "small"), ("eflat", "small")}
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
    n = {k: sum(1 for f in out if f["kind"] == k) for k in ("margin", "face", "contrast", "hidden", "small", "overlap", "edge", "dim")}
    print(f"typeframe: {len(samples)} samples ({sum(1 for x in samples if x.get('overlap'))} with forms rendered alone); margin {n['margin']}, face {n['face']}, contrast {n['contrast']}, hidden {n['hidden']}, small {n['small']}, overlap {n['overlap']}, edge {n['edge']}, dim {n['dim']}")
    for f in out:
        print(f"  {f['t']:7.2f}  {str(f['shot']):22s} {f['kind']:8s} {f['why']}")
    print("typeframe: FAIL" if out else "typeframe: PASS")
    sys.exit(1 if out else 0)


if __name__ == "__main__":
    main()
