"""Turn keyed image-generation output into alpha cut-outs for the video.

    uv run --with pillow --with numpy --with scipy python -I tools/imagegen/cutout.py
        [--rounds a-canonical-fix,b-test,c1-rig-master,c2-rig-views] [--only id,id]

Reads stil/prompts/<round>/round.json (id, out, optional key colour) and writes, relative to the
clip root (the parent of tools/):
  video/public/assets/<id>.png          single cut-out (autocropped)
  video/public/assets/<id>-<n>.png      one file per pose of a pose sheet (left-to-right, row by row)
  video/public/assets/office-plate.png  full-frame plate, copied unchanged
  video/public/rig/drawn/<id>.png       rig sheets: keyed but neither split nor cropped (the canvas
                                        stays registered so the rig lane can map parts across views)
  video/public/assets/manifest.json     id -> files, sizes, count, count_source (merged with the existing file)
  video/out/cutout-contact*.jpg         contact sheets on dark / light backgrounds

Keying: the background colour is measured from the image border, then flood-filled from every border
pixel with a tolerance; enclosed key-coloured holes above HOLE_MIN px are removed too. Edge pixels
are then pulled to the nearest interior colour (despill), the mask is eroded 1 px and feathered 1 px.
A pose sheet whose figure count differs from SPLITS is NOT written; the sheet is reported instead.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "video" / "public" / "assets"
RIG = ROOT / "video" / "public" / "rig" / "drawn"
OUT = ROOT / "video" / "out"
DEFAULT_ROUNDS = ["a-canonical-fix", "b-test", "c1-rig-master", "c2-rig-views", "d-assets"]

# Item counts (and ordered labels where the text names them) taken from the storyboard asset tables and
# prompts. COMPONENTS ids name no count: they split by components and the found count is recorded.
SPLITS = {
    "G15": (7, None), "G16": (7, None), "G17": (7, None), "G18": (7, None), "G32": (7, None),
    "G11": (2, ["helm-left", "helm-right"]),
    "G02": (5, None), "G05": (3, None), "G07": (2, ["group-left", "group-right"]), "G08": (3, None),
    "G09": (2, ["pillar-left", "pillar-right"]),
    "G12": (6, ["fist-grip-hilt", "palm-swat", "pinch-hood", "point", "flat-brush", "fist-frustrated"]),
    "G19": (8, None), "G20": (4, None), "G21": (4, None),
    "G22": (3, ["bolt", "beam", "sigil"]), "G23": (10, None), "G24": (5, None),
    "G25": (3, ["cap-left", "segment", "cap-right"]),
    "G28": (2, ["desk-left", "desk-right"]), "G29": (2, ["plant", "desk-corner"]),
    "G30": (9, ["head-bored", "head-yawn", "torso", "upper-arm-L", "upper-arm-R", "forearm-L",
                "forearm-R", "legs-standing", "legs-step"]),
    "G31": (6, ["pinch", "grip", "pad", "pen", "thumbs-up", "dust"]),
    "G33": (2, ["boot-side", "boot-sole"]), "G34": (12, None),
    "G36": (4, ["banner-1", "banner-2", "banner-3", "steps"]),
    "G38": (3, ["hunched", "cheering", "laughing"]), "G41": (6, ["front", "side", "tipped", "upside-down",
                                                                  "tilted-back", "spin-top"]),
}
COMPONENTS = {"G39"}
REFERENCE_ONLY = {"canon-sheet", "office-frame"}

FLOOD_TOL = 42        # max channel distance from the measured background for the border flood fill
HOLE_TOL = 30         # tighter tolerance for enclosed key-colour holes
HOLE_MIN = 120        # enclosed key-colour region must exceed this many px to be cut out
SPILL_EXCESS = 40     # green key: g - max(r, b) above this counts as key
GREY_SAT = 22         # grey key: max-min channel spread below this is desaturated
GREY_PEEL = 70        # ... and within this distance of the key colour
FRINGE = 2            # px of edge band whose colour is replaced by the nearest interior colour
MARGIN = 8            # autocrop margin


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def measure_bg(rgb, key):
    """Median colour of the border, kept only if it is close to the declared key."""
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(float)
    med = np.median(border, axis=0)
    return med if np.abs(med - hex_rgb(key)).max() < 40 else hex_rgb(key)


def key_alpha(im, key):
    """Return (rgb uint8, alpha float 0..1) with the key background removed."""
    rgb = np.asarray(im.convert("RGB"))
    bg = measure_bg(rgb, key)
    dist = np.abs(rgb.astype(float) - bg).max(axis=2)
    h, w = dist.shape

    cand = dist <= FLOOD_TOL
    green = key.lower() == "#00ff00"
    if green:
        # no palette colour is green, so any strong green excess is key spill or a key/ink blend
        r_, g_, b_ = (rgb[..., c].astype(int) for c in range(3))
        excess = g_ - np.maximum(r_, b_)
        cand |= excess > SPILL_EXCESS
    lab, _ = ndi.label(cand)
    border_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgmask = np.isin(lab, border_labels[border_labels > 0])

    holes = (dist <= HOLE_TOL) & ~bgmask
    hl, hn = ndi.label(holes)
    if hn:
        sizes = ndi.sum(holes, hl, index=np.arange(1, hn + 1))
        big = np.nonzero(sizes > HOLE_MIN)[0] + 1
        bgmask |= np.isin(hl, big)

    if not green:
        # grey key: peel desaturated mid-grey pixels (ink/gold blended with the key) off the edge
        sat = rgb.max(axis=2).astype(int) - rgb.min(axis=2)
        greyish = (sat < GREY_SAT) & (dist <= GREY_PEEL)
        for _ in range(3):
            near = ndi.binary_dilation(bgmask, iterations=2)
            bgmask = bgmask | (greyish & near)
    fg = ~bgmask
    fg = ndi.binary_opening(fg, structure=np.ones((2, 2)))      # drop 1 px speckle
    # despill: edge band takes the colour of the nearest interior pixel
    interior = ndi.binary_erosion(fg, iterations=FRINGE)
    out = rgb.copy()
    if interior.any():
        idx = ndi.distance_transform_edt(~interior, return_distances=False, return_indices=True)
        band = fg & ~interior
        out[band] = rgb[idx[0][band], idx[1][band]]
    if green:
        o = out.astype(int)
        o[..., 1] = np.minimum(o[..., 1], np.maximum(o[..., 0], o[..., 2]))
        out = o.astype(np.uint8)
    # 1 px erode then 1 px feather
    core = ndi.binary_erosion(fg, iterations=1)
    alpha = ndi.uniform_filter(core.astype(float), size=3)
    return out, alpha


def to_rgba(rgb, alpha):
    a = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a]), "RGBA")


def autocrop(im, margin=MARGIN):
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 0)
    if not len(ys):
        return im
    box = (max(xs.min() - margin, 0), max(ys.min() - margin, 0),
           min(xs.max() + 1 + margin, im.width), min(ys.max() + 1 + margin, im.height))
    return im.crop(box)


def split_figures(alpha, expect):
    """Group the alpha into figures. Returns (label image 1..n, n, method)."""
    solid = alpha > 0.5
    lab, n = ndi.label(solid, structure=np.ones((3, 3)))

    def merge(lab, n, keep):
        """Keep the given component labels as figures; every other component joins the nearest one."""
        dist, idx = ndi.distance_transform_edt(~np.isin(lab, keep), return_indices=True)
        filled = lab[idx[0], idx[1]]
        filled[~solid] = 0
        out = np.zeros_like(lab)
        for new, old in enumerate(keep, 1):
            out[filled == old] = new
        return out

    if n >= expect:
        areas = ndi.sum(solid, lab, index=np.arange(1, n + 1))
        order = np.argsort(-areas)
        # the expected figures must clearly out-size the loose islands (detached sword tip, ring, speck)
        if n == expect or areas[order[expect - 1]] >= 3 * areas[order[expect]]:
            keep = [int(i) + 1 for i in order[:expect]]
            return merge(lab, n, keep), expect, "components+islands"
    lab1, n1 = lab, n
    for r in (4, 8, 12, 18, 26, 36, 50, 70, 90, 120):
        grown = ndi.binary_dilation(solid, structure=ndi.generate_binary_structure(2, 2), iterations=r)
        gl, gn = ndi.label(grown, structure=np.ones((3, 3)))
        if gn == expect:
            out = np.where(solid, gl, 0)
            return out, gn, f"dilate-{r}"
    # items laid out in one row whose parts sit one above the other (frame rails): group by x-range overlap
    areas = ndi.sum(solid, lab, index=np.arange(1, n + 1))
    comps = [i + 1 for i, a in enumerate(areas) if a >= 0.01 * areas.max()]
    boxes = {c: ndi.find_objects((lab == c).astype(int))[0][1] for c in comps}
    group = {c: c for c in comps}

    def root(c):
        while group[c] != c:
            c = group[c]
        return c
    for a_ in comps:
        for b_ in comps:
            lo, hi = max(boxes[a_].start, boxes[b_].start), min(boxes[a_].stop, boxes[b_].stop)
            if a_ < b_ and hi - lo > 0.5 * min(boxes[a_].stop - boxes[a_].start, boxes[b_].stop - boxes[b_].start):
                group[root(b_)] = root(a_)
    roots = sorted({root(c) for c in comps})
    if len(roots) == expect:
        remap = np.zeros(n + 1, dtype=int)
        for c in comps:
            remap[c] = roots.index(root(c)) + 1
        grouped = remap[lab]
        _, idx = ndi.distance_transform_edt(grouped == 0, return_indices=True)
        out = grouped[idx[0], idx[1]]
        out[~solid] = 0
        return out, expect, "xrange"
    return lab1, n1, "unresolved"


def split_components(alpha, share=0.15):
    """No named count: figures are the components of at least `share` of the largest; the rest join the nearest."""
    solid = alpha > 0.5
    lab, n = ndi.label(solid, structure=np.ones((3, 3)))
    areas = ndi.sum(solid, lab, index=np.arange(1, n + 1))
    keep = [i + 1 for i, a in enumerate(areas) if a >= share * areas.max()]
    _, idx = ndi.distance_transform_edt(~np.isin(lab, keep), return_indices=True)
    filled = lab[idx[0], idx[1]]
    filled[~solid] = 0
    out = np.zeros_like(lab)
    for new, old in enumerate(keep, 1):
        out[filled == old] = new
    return out, len(keep)


def order_figures(lab, n):
    info = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        info.append((i, xs.mean(), ys.mean(), ys.max() - ys.min() + 1))
    med_h = np.median([t[3] for t in info])
    info.sort(key=lambda t: t[2])
    rows, cur = [], [info[0]]
    for t in info[1:]:
        if abs(t[2] - np.mean([c[2] for c in cur])) > 0.5 * med_h:
            rows.append(cur)
            cur = [t]
        else:
            cur.append(t)
    rows.append(cur)
    return [t[0] for row in rows for t in sorted(row, key=lambda t: t[1])]


def residue(rgba, key, bg):
    """(all, halo): pixels with alpha>0 within 24 of the measured key colour, and the subset within
    3 px of a transparent pixel (a visible halo; the rest is key-like grey inside the artwork)."""
    a = np.asarray(rgba)
    vis = a[..., 3] > 0
    d = np.abs(a[..., :3].astype(float) - bg).max(axis=2)
    like = vis & (d <= 24)
    near = ndi.binary_dilation(a[..., 3] == 0, iterations=3)
    return int(like.sum()), int((like & near).sum())


def stats(rgba):
    a = np.asarray(rgba)[..., 3]
    return round(100 * float((a == 0).mean()), 1)


def contact(files, path_base, th=360):
    """Contact sheets of every cut-out on dark / light backgrounds (thumbnails 360 px tall)."""
    OUT.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for name, f in files:
        im = Image.open(f).convert("RGBA")
        s = th / im.height
        w = max(1, int(im.width * s))
        if w > 640:
            s = 640 / im.width
            w, hh = 640, max(1, int(im.height * s))
        else:
            hh = th
        thumbs.append((name, im.resize((w, hh), Image.LANCZOS)))
    cols_w = 1900
    rows, cur, x = [], [], 0
    for t in thumbs:
        if x + t[1].width + 10 > cols_w and cur:
            rows.append(cur)
            cur, x = [], 0
        cur.append(t)
        x += t[1].width + 10
    rows.append(cur)
    outs = {}
    for label, bg in (("dark", (10, 10, 10)), ("cream", (244, 236, 216)), ("grey", (233, 236, 239))):
        sheet = Image.new("RGB", (cols_w, len(rows) * (th + 30) + 10), bg)
        d = ImageDraw.Draw(sheet)
        fill = (200, 60, 60) if label != "dark" else (230, 230, 120)
        y = 5
        for row in rows:
            x = 5
            for name, im in row:
                sheet.paste(im, (x, y + 20), im)
                d.text((x, y + 4), name, fill=fill)
                x += im.width + 10
            y += th + 30
        p = Path(f"{path_base}-{label}.jpg")
        sheet.save(p, quality=90)
        outs[label] = p
    # combined 3-band overview
    bands = [Image.open(outs[k]) for k in ("dark", "cream", "grey")]
    combo = Image.new("RGB", (cols_w, sum(b.height for b in bands)))
    yy = 0
    for b in bands:
        combo.paste(b, (0, yy))
        yy += b.height
    combo.save(Path(f"{path_base}.jpg"), quality=88)
    return outs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", default=",".join(DEFAULT_ROUNDS))
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    only = {s for s in args.only.split(",") if s}
    ASSETS.mkdir(parents=True, exist_ok=True)
    RIG.mkdir(parents=True, exist_ok=True)

    manifest, report, produced, produced_d = {}, [], [], []
    for rnd in args.rounds.split(","):
        entries = json.loads((ROOT / "stil" / "prompts" / rnd / "round.json").read_text("utf-8"))
        for e in entries:
            i = e["id"]
            if only and i not in only:
                continue
            src = ROOT / e["out"]
            if not src.exists():
                report.append({"id": i, "status": "MISSING-SOURCE"})
                continue
            if i in REFERENCE_ONLY:
                report.append({"id": i, "status": "reference-only"})
                continue
            if not e.get("key"):
                dst = ASSETS / f"{i}.png"
                shutil.copyfile(src, dst)
                im = Image.open(dst)
                manifest[i] = {"kind": "plate", "files": [f"assets/{dst.name}"], "sizes": [list(im.size)],
                               "poses": 1, "count": 1, "count_source": "plate", "mode": im.mode}
                report.append({"id": i, "status": "plate-copied", "mode": im.mode, "size": im.size})
                continue
            key = e["key"]
            im = Image.open(src)
            rgb, alpha = key_alpha(im, key)
            bg = measure_bg(np.asarray(im.convert("RGB")), key)
            sheet = to_rgba(rgb, alpha)
            rec = {"id": i, "key": key}
            if i.startswith("rig-"):
                dst = RIG / f"{i}.png"
                sheet.save(dst)
                produced.append((i, dst))
                manifest[i] = {"kind": "rig-sheet", "files": [f"rig/drawn/{dst.name}"],
                               "sizes": [list(sheet.size)], "poses": 1, "mode": sheet.mode}
                rec.update(status="ok", files=[dst.name], poses=1, residue=residue(sheet, key, bg)[0], halo=residue(sheet, key, bg)[1],
                           transparent_pct=stats(sheet), mode=sheet.mode)
                report.append(rec)
                continue
            expect, labels = SPLITS.get(i, (None, None))
            source = "storyboard"
            if i in COMPONENTS:
                lab0, expect = split_components(alpha)
                labels, source = None, "components"
                if i == "G39" and expect == 12:   # grid read row by row: 4 poses x 3 developers (bored, glasses, bun)
                    labels = [f"{pose}-{dev}" for pose in ("run", "under-desk", "cower", "spit-take")
                              for dev in ("bored", "glasses", "bun")]
            files, sizes, res, halo, tp = [], [], 0, 0, []
            if expect:
                lab, n, method = (lab0, expect, "components") if source == "components" else split_figures(alpha, expect)
                rec.update(expected=expect, found=n, method=method)
                if n != expect:
                    rec.update(status="COUNT-MISMATCH-NOT-WRITTEN", poses=n)
                    report.append(rec)
                    continue
                order = order_figures(lab, n)
                full = np.asarray(sheet)
                for k, fid in enumerate(order, 1):
                    m = lab == fid
                    if method.startswith("dilate"):
                        m = ndi.binary_dilation(m, iterations=2) & (alpha > 0) & ((lab == fid) | (lab == 0))
                    a = np.where(m, alpha, 0.0)
                    pose = autocrop(to_rgba(rgb, a))
                    dst = ASSETS / f"{i}-{k}.png"
                    pose.save(dst)
                    produced.append((f"{i}-{k}", dst))
                    files.append(f"assets/{dst.name}")
                    sizes.append(list(pose.size))
                    r = residue(pose, key, bg); res += r[0]; halo += r[1]
                    tp.append(stats(pose))
                # G11 style sheets keep a whole-sheet file as well
            if not expect or i == "G11":
                whole = autocrop(sheet)
                dst = ASSETS / f"{i}.png"
                whole.save(dst)
                produced.append((i, dst))
                files.insert(0, f"assets/{dst.name}")
                sizes.insert(0, list(whole.size))
                r = residue(whole, key, bg); res += r[0]; halo += r[1]
                tp.insert(0, stats(whole))
            manifest[i] = {"kind": "items" if expect else "single", "files": files, "sizes": sizes,
                           "poses": expect or 1, "count": expect or 1,
                           "count_source": source if expect else "single", "mode": "RGBA"}
            if labels:
                manifest[i]["labels"] = labels
                if i == "G11":
                    manifest[i]["sheet"] = files.pop(0)
                    sizes.pop(0)
            rec.update(status="ok", files=files, poses=expect or 1, residue=res, halo=halo, transparent_pct=tp, mode="RGBA")
            report.append(rec)

    mpath = ASSETS / "manifest.json"
    merged = json.loads(mpath.read_text("utf-8")) if mpath.exists() else {}
    merged.update(manifest)
    text = json.dumps(merged, indent=2)
    mpath.write_text(text, "utf-8")
    cast = ROOT / "video" / "src" / "cast"
    cast.mkdir(parents=True, exist_ok=True)
    (cast / "assets-manifest.json").write_text(text, "utf-8")
    if produced:
        contact([(n, p) for n, p in produced], OUT / "cutout-contact")
    d_ids = {e["id"] for e in json.loads((ROOT / "stil/prompts/d-assets/round.json").read_text("utf-8"))}
    dfiles = [(n, p) for n, p in produced if n.split("-")[0] in d_ids]
    if dfiles:
        contact(dfiles, OUT / "cutout-contact-d", th=300)
    json.dump(report, sys.stdout, indent=1, default=str)
    print()


if __name__ == "__main__":
    main()
