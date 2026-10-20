"""Pixel measurements for tools/rigcheck.mjs.

    uv run --with pillow --with numpy python -I tools/rigcheck/analyze.py < spec.json > result.json

spec = {"palette": {id: "#rrggbb"}, "ops": [{"op": ..., ...}]}. Frames are PNGs (RGBA, 1920x1080) in `dir` named frame-NNNNN.png
(renderFrames) or any explicit path. Alpha > 127 is "covered"; ID pixels are matched exactly against the palette (edge pixels
that blend two cards match nothing and count as -1).
"""
import hashlib
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SPEC = json.load(sys.stdin)
PAL_IDS = list(SPEC["palette"].keys())
PAL_KEYS = np.array([int(SPEC["palette"][k][1:], 16) for k in PAL_IDS], dtype=np.int64)
ORDER = np.argsort(PAL_KEYS)
SORTED_KEYS = PAL_KEYS[ORDER]
IDX_OF = {k: i for i, k in enumerate(PAL_IDS)}
_cache = {}


def path_of(d, frame):
    return Path(d) / f"frame-{frame:05d}.png" if isinstance(frame, int) else Path(frame)


def load(d, frame):
    key = (d, frame)
    if key not in _cache:
        if len(_cache) > 8:
            _cache.clear()
        _cache[key] = np.asarray(Image.open(path_of(d, frame)).convert("RGBA"))
    return _cache[key]


def interior(arr):
    """Keeps a label only where it equals all four neighbours. Edge pixels blend two cards (or a card and the background) and
    can land on a third palette colour by accident (levels are multiples of 51), so they are never trusted as an id."""
    h, w = arr.shape
    pad = np.full((h + 2, w + 2), -2, dtype=arr.dtype)
    pad[1:-1, 1:-1] = arr
    ok = (arr == pad[:-2, 1:-1]) & (arr == pad[2:, 1:-1]) & (arr == pad[1:-1, :-2]) & (arr == pad[1:-1, 2:])
    out = arr.copy()
    out[~ok] = -1
    return out


def id_map(rgba, thresh=127):
    """int16 map: palette index of exactly matching interior pixels of a card, -1 elsewhere (edges, uncovered)."""
    cov = rgba[..., 3] > thresh
    key = (rgba[..., 0].astype(np.int64) << 16) | (rgba[..., 1].astype(np.int64) << 8) | rgba[..., 2].astype(np.int64)
    pos = np.clip(np.searchsorted(SORTED_KEYS, key), 0, len(SORTED_KEYS) - 1)
    ok = cov & (SORTED_KEYS[pos] == key)
    out = np.full(key.shape, -1, dtype=np.int16)
    out[ok] = ORDER[pos[ok]]
    return interior(out), cov


def disk(r):
    r = int(round(r))
    yy, xx = np.mgrid[-r : r + 1, -r : r + 1]
    return [(int(y), int(x)) for y, x in zip(yy.ravel(), xx.ravel()) if y * y + x * x <= r * r + 0.5]


def shift(m, dy, dx, fill=False):
    out = np.full_like(m, fill)
    h, w = m.shape
    ys, ye = max(0, dy), min(h, h + dy)
    xs, xe = max(0, dx), min(w, w + dx)
    out[ys:ye, xs:xe] = m[ys - dy : ye - dy, xs - dx : xe - dx]
    return out


def dilate(m, r):
    out = np.zeros_like(m)
    for dy, dx in disk(r):
        out |= shift(m, dy, dx, False)
    return out


def erode(m, r):
    return ~dilate(~m, r)


def components(mask, eight=True):
    """Labels of connected pieces (run-length union-find). Returns (labels int32, count)."""
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    parent = [0]

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    prev = []  # runs of the previous row: (start, end_exclusive, label)
    for y in range(h):
        row = mask[y]
        if not row.any():
            prev = []
            continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        starts = np.flatnonzero(d == 1)
        ends = np.flatnonzero(d == -1)
        cur = []
        j = 0
        for s, e in zip(starts, ends):
            l = 0
            lo, hi = (s - 1, e + 1) if eight else (s, e)
            for ps, pe, pl in prev:
                if pe > lo and ps < hi:
                    if l == 0:
                        l = find(pl)
                    else:
                        a, b = find(l), find(pl)
                        if a != b:
                            parent[max(a, b)] = min(a, b)
                            l = min(a, b)
            if l == 0:
                parent.append(len(parent))
                l = len(parent) - 1
            lab[y, s:e] = l
            cur.append((int(s), int(e), l))
        prev = cur
    roots = {}
    remap = np.zeros(len(parent), dtype=np.int32)
    for i in range(1, len(parent)):
        r = find(i)
        roots.setdefault(r, len(roots) + 1)
        remap[i] = roots[r]
    return remap[lab], len(roots)


def component_sizes(mask, eight=True):
    lab, n = components(mask, eight)
    return np.bincount(lab.ravel(), minlength=n + 1)[1:]


def crop_box(cx, cy, rad, shape):
    h, w = shape[:2]
    x0, x1 = max(0, int(cx - rad)), min(w, int(cx + rad) + 1)
    y0, y1 = max(0, int(cy - rad)), min(h, int(cy + rad) + 1)
    return y0, y1, x0, x1


def op_joints(o):
    out = []
    for e in o["entries"]:
        rgba = load(o["dir"], e["frame"])
        cov = rgba[..., 3] > 127
        cx, cy, r = e["cx"], e["cy"], e["r"]
        # A: enclosed background inside the circle (window padded so a hole touching the circle edge is still enclosed)
        pad = int(1.5 * r) + 14
        y0, y1, x0, x1 = crop_box(cx, cy, pad, cov.shape)
        win = cov[y0:y1, x0:x1]
        yy, xx = np.mgrid[y0:y1, x0:x1]
        circ = (yy - cy) ** 2 + (xx - cx) ** 2 <= (1.5 * r) ** 2
        bg = ~win
        lab, n = components(bg, eight=False)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist()) - {0}
        enclosed = bg & circ & ~np.isin(lab, list(border))
        holes = int(enclosed.sum())
        # B: closing with a 6 px disk minus the union, inside the circle
        closed = erode(dilate(win, 6), 6)
        notch = int(((closed & ~win) & circ).sum())
        # C: the union eroded by 3 px is still one 8-connected piece (measured on the bounding crop of the union)
        ys, xs = np.nonzero(cov)
        if len(ys) == 0:
            out.append({"frame": e["frame"], "holes": holes, "notch": notch, "pieces": 0})
            continue
        sub = cov[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
        er = erode(sub, 3)
        sizes = component_sizes(er)
        out.append({"frame": e["frame"], "holes": holes, "notch": notch, "pieces": int((sizes >= 12).sum())})
    return out


def op_pieces(o):
    out = []
    for f in o["frames"]:
        rgba = load(o["dir"], f["frame"])
        ys, xs = np.nonzero(rgba[..., 3] > 20)
        if len(ys) == 0:
            out.append({"frame": f["frame"], "pieces": 0, "area": 0})
            continue
        rgba = rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
        ids, cov = id_map(rgba, 20)
        skip = [IDX_OF[i] for i in f.get("extra", []) if i in IDX_OF]
        main = cov & ~np.isin(ids, skip) if skip else cov
        sizes = component_sizes(main)
        big = sizes[sizes >= 24]
        out.append({"frame": f["frame"], "pieces": int(len(big)), "area": int(main.sum())})
    return out


def op_iou(o):
    out = []
    prev = None
    for f in o["frames"]:
        cov = load(o["dir"], f)[..., 3] > 127
        if prev is not None:
            inter = int((cov & prev).sum())
            union = int((cov | prev).sum())
            out.append({"frame": f, "iou": inter / union if union else 1.0})
        prev = cov
    return out


def op_hidden(o):
    out = []
    for f in o["frames"]:
        rgba = load(o["dir"], f["frame"])
        ys, xs = np.nonzero(rgba[..., 3] > 127)
        if len(ys) == 0:
            out.append({"frame": f["frame"], "leaked": {i: 0 for i in []}})
            continue
        ids, _ = id_map(rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1])
        leaked = {}
        for i in f["ids"]:
            if i in IDX_OF:
                n = int((ids == IDX_OF[i]).sum())
                if n:
                    leaked[i] = n
        out.append({"frame": f["frame"], "leaked": leaked})
    return out


def op_near(o):
    out = []
    for f in o["frames"]:
        ids, _ = id_map(load(o["dir"], f["frame"]))
        bad = {}
        for item in f["items"]:
            ys, xs = np.nonzero(ids == IDX_OF[item["id"]])
            if len(ys):
                n = int((((xs - item["x"]) ** 2 + (ys - item["y"]) ** 2) <= item["r"] ** 2).sum())
                if n:
                    bad[item["id"]] = n
        out.append({"frame": f["frame"], "visible_near_root": bad})
    return out


def op_centroid(o):
    out = []
    for f in o["frames"]:
        ids, _ = id_map(load(o["dir"], f["frame"]))
        ys, xs = np.nonzero(ids == IDX_OF[f["id"]])
        out.append({"frame": f["frame"], "id": f["id"], "n": int(len(ys)), "cx": float(xs.mean()) if len(ys) else None, "cy": float(ys.mean()) if len(ys) else None,
                    "ymax": int(ys.max()) if len(ys) else None})
    return out


def op_diff(o):
    """Between two frames: which cards' pixels changed (by the earlier frame's id), and how many mixed pixels changed."""
    out = []
    for p in o["pairs"]:
        a, _ = id_map(load(o["dir"], p["a"]))
        b, _ = id_map(load(o["dir"], p["b"]))
        ch = a != b
        by_before = {}
        for i in np.unique(a[ch]).tolist():
            by_before[PAL_IDS[i] if i >= 0 else "mixed/none"] = int(((a == i) & ch).sum())
        out.append({"a": p["a"], "b": p["b"], "changed": int(ch.sum()), "by_before": by_before})
    return out


def op_overlap(o):
    """Alpha overlap (px) of cards placed by affines (px space) over their placeholder textures."""
    out = []
    for item in o["items"]:
        masks = []
        for c in item["cards"]:
            tex = np.asarray(Image.open(Path(o["public"]) / c["src"]).convert("RGBA"))[..., 3] > 127
            m = np.array(c["m"])  # texture px (x right, y down) -> screen px
            inv = np.linalg.inv(np.array([[m[0], m[2], m[4]], [m[1], m[3], m[5]], [0, 0, 1]]))
            h, w = tex.shape
            corners = [(0, 0), (w, 0), (0, h), (w, h)]
            pts = np.array([[m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] for x, y in corners])
            x0, y0 = np.floor(pts.min(0)).astype(int)
            x1, y1 = np.ceil(pts.max(0)).astype(int)
            yy, xx = np.mgrid[y0:y1, x0:x1]
            u = inv[0, 0] * (xx + 0.5) + inv[0, 1] * (yy + 0.5) + inv[0, 2]
            v = inv[1, 0] * (xx + 0.5) + inv[1, 1] * (yy + 0.5) + inv[1, 2]
            ui, vi = np.floor(u).astype(int), np.floor(v).astype(int)
            ok = (ui >= 0) & (ui < w) & (vi >= 0) & (vi < h)
            full = np.zeros((1080, 1920), dtype=bool)
            sel = np.zeros(ok.shape, dtype=bool)
            sel[ok] = tex[vi[ok], ui[ok]]
            yy2, xx2 = np.clip(yy, 0, 1079), np.clip(xx, 0, 1919)
            inb = (yy >= 0) & (yy < 1080) & (xx >= 0) & (xx < 1920)
            full[yy2[inb & sel], xx2[inb & sel]] = True
            masks.append(full)
        out.append({"name": item["name"], "overlap": int((masks[0] & masks[1]).sum())})
    return out


def op_maskxor(o):
    def groups(frame, ids):
        # raw exact matches, ids of one group merged into one label so a seam inside the group is not an edge
        rgba = load(o["dir"], frame)
        cov = rgba[..., 3] > 127
        key = (rgba[..., 0].astype(np.int64) << 16) | (rgba[..., 1].astype(np.int64) << 8) | rgba[..., 2].astype(np.int64)
        pos = np.clip(np.searchsorted(SORTED_KEYS, key), 0, len(SORTED_KEYS) - 1)
        raw = np.where(cov & (SORTED_KEYS[pos] == key), ORDER[pos], -1)
        g = np.full(raw.shape, -1, dtype=np.int16)
        g[(raw >= 0)] = 0
        g[np.isin(raw, [IDX_OF[i] for i in ids])] = 1
        return interior(g) == 1

    ma = groups(o["a"], o["idsA"])
    mb = groups(o["b"], o["idsB"])
    return {"xor": int((ma ^ mb).sum()), "areaA": int(ma.sum()), "areaB": int(mb.sum())}


def op_pixdiff(o):
    out = []
    for a, b in o["pairs"]:
        x = np.asarray(Image.open(a).convert("RGBA")).astype(int)
        y = np.asarray(Image.open(b).convert("RGBA")).astype(int)
        d = np.abs(x - y)
        out.append({"px": int((d.sum(-1) > 0).sum()), "max": int(d.max())})
    return out


def op_md5(o):
    out = []
    for f in o["files"]:
        rgba = np.asarray(Image.open(f).convert("RGBA"))
        out.append({"file": f, "pixels": hashlib.md5(rgba.tobytes()).hexdigest()})
    return out


OPS = {"joints": op_joints, "pieces": op_pieces, "iou": op_iou, "hidden": op_hidden, "near": op_near, "centroid": op_centroid,
       "diff": op_diff, "maskxor": op_maskxor, "overlap": op_overlap, "md5": op_md5, "pixdiff": op_pixdiff}
json.dump([OPS[o["op"]](o) for o in SPEC["ops"]], sys.stdout)
