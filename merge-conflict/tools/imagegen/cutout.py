"""Turn the keyed pose-card round (stil/prompts/h-poses) into alpha cut-outs for the video.

    uv run --with pillow --with numpy --with scipy python -I tools/imagegen/cutout.py [--only O01,B05]

Reads stil/prompts/h-poses/round.json (24 single figures on flat #808080, ids O01..O12 and B01..B12;
the source PNGs live in the git-ignored stil/prompts/h-poses/out/) and writes, relative to the clip root:
  video/public/cards/<id>.png        autocropped cut-out (id is the part before the first "-")
  video/public/cards/manifest.json   id -> file, w, h, bbox (crop box in the 1024x1536 source), source
  video/out/cutout-contact-dark.jpg, cutout-contact-light.jpg   every cut-out on a dark / a light background

Keying: the background colour is measured from the image border, then flood-filled from every border
pixel with a tolerance; enclosed key-coloured holes above HOLE_MIN px are removed too. Desaturated
mid-grey pixels (hair or ink blended with the key) touching the removed background are peeled off.
Edge pixels are pulled to the nearest interior colour (despill), the mask is eroded 1 px and feathered
1 px. A figure the frame bottom cuts off (close-ups) keeps a straight cut: erosion, feathering and the
crop never treat the image border as a background edge.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
ROUND = "h-poses"  # default round; --round picks another keyed single-figure round
CARDS = ROOT / "video" / "public" / "cards"
OUT = ROOT / "video" / "out"

FLOOD_TOL = 42        # max channel distance from the measured background for the border flood fill
HOLE_TOL = 30         # tighter tolerance for enclosed key-colour holes
HOLE_MIN = 120        # enclosed key-colour region must exceed this many px to be cut out
GREY_SAT = 70         # max-min channel spread below this counts as key-like (key blended with hair is brownish or bluish grey)
GREY_SAT_MIN = 20     # below this the pixel is neutral grey or silver (sequins, chains) and is kept
GREY_PEEL = 60        # ... and within this distance of the key colour
GREY_REGION_MAX = 4000  # largest desaturated region peeled off when it touches the background
GREY_REACH = 10       # px a desaturated region may sit from the background and still be peeled
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
    """Return (rgb uint8, alpha float 0..1, measured bg) with the key background removed."""
    rgb = np.asarray(im.convert("RGB"))
    bg = measure_bg(rgb, key)
    dist = np.abs(rgb.astype(float) - bg).max(axis=2)

    lab, _ = ndi.label(dist <= FLOOD_TOL)
    border_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgmask = np.isin(lab, border_labels[border_labels > 0])

    holes = (dist <= HOLE_TOL) & ~bgmask
    hl, hn = ndi.label(holes)
    if hn:
        sizes = ndi.sum(holes, hl, index=np.arange(1, hn + 1))
        big = np.nonzero(sizes > HOLE_MIN)[0] + 1
        bgmask |= np.isin(hl, big)

    sat = rgb.max(axis=2).astype(int) - rgb.min(axis=2)
    greyish = (sat >= GREY_SAT_MIN) & (sat < GREY_SAT) & (dist <= GREY_PEEL)
    # grey key blended into hair gaps: peel whole desaturated regions that touch the background; large ones
    # (GREY_REGION_MAX px) are artwork (grey cloth, silver) and stay
    greyish &= ~bgmask
    gl, gn = ndi.label(greyish)
    if gn:
        touch = np.unique(gl[ndi.binary_dilation(bgmask, iterations=GREY_REACH) & greyish])
        sizes = ndi.sum(greyish, gl, index=np.arange(gn + 1))
        peel = [i for i in touch if i > 0 and sizes[i] <= GREY_REGION_MAX]
        bgmask = bgmask | np.isin(gl, peel)
    fg = ~bgmask
    fg = ndi.binary_opening(fg, structure=np.ones((2, 2)), border_value=1)  # drop 1 px speckle
    # despill: edge band takes the colour of the nearest interior pixel
    interior = ndi.binary_erosion(fg, iterations=FRINGE, border_value=1)
    out = rgb.copy()
    if interior.any():
        idx = ndi.distance_transform_edt(~interior, return_distances=False, return_indices=True)
        band = fg & ~interior
        out[band] = rgb[idx[0][band], idx[1][band]]
    core = ndi.binary_erosion(fg, iterations=1, border_value=1)
    alpha = ndi.uniform_filter(core.astype(float), size=3, mode="nearest")
    return out, alpha, bg


def to_rgba(rgb, alpha):
    a = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a]), "RGBA")


def autocrop(im, margin=MARGIN):
    """Crop to the visible pixels plus a margin clamped to the image, so a bottom cut stays on the image edge."""
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 0)
    if not len(ys):
        return im, (0, 0, im.width, im.height)
    box = (max(int(xs.min()) - margin, 0), max(int(ys.min()) - margin, 0),
           min(int(xs.max()) + 1 + margin, im.width), min(int(ys.max()) + 1 + margin, im.height))
    return im.crop(box), box


def residue(rgba, bg):
    """(all, halo): visible pixels within 24 of the measured key colour, and the subset within 3 px of a
    transparent pixel (a visible halo; the rest is key-like grey inside the artwork)."""
    a = np.asarray(rgba)
    vis = a[..., 3] > 0
    d = np.abs(a[..., :3].astype(float) - bg).max(axis=2)
    like = vis & (d <= 24)
    near = ndi.binary_dilation(a[..., 3] == 0, iterations=3)
    return int(like.sum()), int((like & near).sum())


def contact(files, path_base, th=420, cols=12):
    """Contact sheets of every cut-out on a dark and on a light background, `cols` per row."""
    thumbs = []
    for name, f in files:
        im = Image.open(f).convert("RGBA")
        w = max(1, int(im.width * th / im.height))
        thumbs.append((name, im.resize((w, th), Image.LANCZOS)))
    rows = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
    cell_w = max(t[1].width for t in thumbs) + 10
    for label, bg, fill in (("dark", (10, 10, 14), (230, 230, 120)), ("light", (244, 240, 230), (200, 40, 40))):
        sheet = Image.new("RGB", (cols * cell_w + 10, len(rows) * (th + 30) + 10), bg)
        d = ImageDraw.Draw(sheet)
        for r, row in enumerate(rows):
            for c, (name, im) in enumerate(row):
                x, y = 10 + c * cell_w, 10 + r * (th + 30)
                sheet.paste(im, (x, y + 20), im)
                d.text((x, y + 4), name, fill=fill)
        sheet.save(Path(f"{path_base}-{label}.jpg"), quality=90)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated ids, e.g. O01,B05")
    ap.add_argument("--round", default=ROUND, help="round folder under stil/prompts, e.g. j-dance")
    args = ap.parse_args()
    only = {s for s in args.only.split(",") if s}
    CARDS.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    manifest, report, produced = {}, [], []
    for e in json.loads((ROOT / "stil" / "prompts" / args.round / "round.json").read_text("utf-8")):
        cid = e["id"].split("-")[0]
        if only and cid not in only:
            continue
        src = ROOT / e["out"]
        if not src.exists():
            report.append({"id": cid, "status": "MISSING-SOURCE"})
            continue
        im = Image.open(src)
        rgb, alpha, bg = key_alpha(im, e["key"])
        card, box = autocrop(to_rgba(rgb, alpha))
        dst = CARDS / f"{cid}.png"
        card.save(dst)
        produced.append((cid, dst))
        res, halo = residue(card, bg)
        manifest[cid] = {"file": f"cards/{dst.name}", "w": card.width, "h": card.height, "bbox": list(box), "source": src.name}
        a = np.asarray(card)[..., 3]
        report.append({"id": cid, "status": "ok", "size": [card.width, card.height], "bbox": list(box),
                       "transparent_pct": round(100 * float((a == 0).mean()), 1),
                       "key_like_px": res, "halo_px": halo, "opaque_px_in_last_row": int((a[-1] > 0).sum())})

    mpath = CARDS / "manifest.json"
    merged = json.loads(mpath.read_text("utf-8")) if mpath.exists() else {}
    merged.update(manifest)
    mpath.write_text(json.dumps(dict(sorted(merged.items())), indent=2), "utf-8")
    if produced and not only:
        contact(produced, OUT / f"cutout-contact-{args.round}")
    json.dump(report, sys.stdout, indent=1)
    print()


if __name__ == "__main__":
    main()
