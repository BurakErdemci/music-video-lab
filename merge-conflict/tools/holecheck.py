"""Fail when a card cut-out has face pixels the keying turned transparent.

    uv run --with pillow --with numpy --with scipy python -I tools/holecheck.py [IDs...] [--selftest]

cutout.py once removed enclosed key-coloured holes and peeled desaturated grey pixels touching the background; a
pale lavender eyeshadow or a skin shadow is close to that grey, so a bite appeared in the face (often open to the
silhouette, so a pure "enclosed hole" test misses it). The RGB under such pixels is intact, so a hole is a
transparent pixel that (a) sits inside the closed silhouette (closing, then hole fill: a bite open to the edge
still counts), (b) is not the flat key colour nor a grey or blue-grey hair blend (key measured from the card's own transparent border), and (c) belongs
to a blob wider than 2 px (the opening drops the thin blended fringe at the edge).
Measured on the PNG cards (video/public/cards/<ID>.png): the HD webp is made from it, and webp zeroes the RGB
under transparent pixels. Loop in-betweens also lost the RGB under alpha 0, so the colour comes from the card's
source image (stil/prompts/*/out/<source>, found at the manifest bbox, used only when the opaque pixels match it)
and falls back to the card's own RGB. Region = the frames.json `face` box extended
down by CHIN of its height. Exit 1 when any card has more than LIMIT percent of the region in holes.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "video" / "public" / "cards"
CHIN = 0.10        # face box extension downwards, as a fraction of its height
CLOSE = 8          # closing radius in px: how far a bite may reach back from the silhouette
KEY_TOL = 14       # max channel distance from the flat key that still counts as background
GREY_SAT = 12      # channel spread at or below this is neutral grey
BLUE_LEAN = 20     # blue minus red above this is a hair blend (lavender eyeshadow stays below it)
DARK_DIST = 60     # ... unless it is this far from the key (black liner, pupils, iris, hair)
RING_CLOSE = 2     # closing radius in px of the silhouette used for rings
RING_DEPTH = 3     # px the closed silhouette is eroded before partial alpha counts as a ring
LIMIT = 0.3        # percent of the face region that may be hole


def face_region(shape, face):
    h, w = shape[:2]
    x0, y0, x1, y1 = face
    y1 = y1 + CHIN * (y1 - y0)
    return (max(int(y0 * h), 0), min(int(round(y1 * h)), h), max(int(x0 * w), 0), min(int(round(x1 * w)), w))


def source_rgb(entry, rgba):
    """Source-image pixels under the card (same crop box), or None when no source file matches the opaque pixels."""
    x0, y0 = entry["bbox"][:2]
    h, w = rgba.shape[:2]
    inner = ndi.binary_erosion(rgba[..., 3] == 255, iterations=2)
    for f in (ROOT / "stil" / "prompts").glob(f"*/out/{entry['source']}"):
        src = np.asarray(Image.open(f).convert("RGB"))
        crop = src[y0:y0 + h, x0:x0 + w]
        if crop.shape[:2] != (h, w) or not inner.any():
            continue
        if (np.abs(crop[inner].astype(int) - rgba[..., :3][inner]).max(axis=1) <= 6).mean() >= 0.9:
            return src, crop
    return None


def border_key(rgba):
    """Flat key colour from the transparent pixels on the 3 px image border; None when the card has none
    or their RGB is not a neutral grey (RGB under alpha 0 was not kept)."""
    a = rgba[..., 3] <= 127
    edge = np.zeros(a.shape, bool)
    edge[:3] = edge[:, :3] = edge[:, -3:] = True
    sel = a & edge
    if sel.sum() < 50:
        sel = a
    if sel.sum() < 50:
        return None
    key = np.median(rgba[..., :3][sel], axis=0)
    return key if np.ptp(key) <= 12 and 90 <= key.mean() <= 160 else None


def with_source(entry, rgba):
    """rgba whose RGB under transparent pixels is the source image's (when it can be found)."""
    hit = source_rgb(entry, rgba)
    if hit is None:
        return rgba
    out = rgba.copy()
    out[..., :3] = hit[1]
    return out


def hole_mask(rgba, face):
    """Boolean mask of hole pixels in the face region, or None when the key cannot be measured."""
    key = border_key(rgba)
    if key is None:
        return None
    alpha = rgba[..., 3]
    opaque = alpha > 127
    pad = CLOSE + 2
    closed = ndi.binary_closing(np.pad(opaque, pad, mode="edge"), structure=ndi.generate_binary_structure(2, 1),
                                iterations=CLOSE)[pad:-pad, pad:-pad]
    inside = ndi.binary_fill_holes(closed) & ~opaque
    rgb = rgba[..., :3].astype(int)
    dist = np.abs(rgb - key).max(axis=2)
    # grey and bluish-grey pixels near the key are key blended into hair gaps, not skin: a pixel must be skin or lavender toned, or far from the key
    warm = ((rgb.max(axis=2) - rgb.min(axis=2)) > GREY_SAT) & (rgb[..., 2] - rgb[..., 0] <= BLUE_LEAN)
    far = (dist > KEY_TOL) & ((dist > DARK_DIST) | warm)
    # a feathered repair edge (alpha 1/3..2/3) is not a hole; only near-transparent pixels count
    holes = ndi.binary_opening(inside & far & (alpha < 64), structure=np.ones((3, 3)))
    # a ring: partial alpha deeper than RING_DEPTH px inside the silhouette is the edge of an old hole, any size
    # (the silhouette is closed only by RING_CLOSE px here, so hair gaps wider than that are not bridged)
    tight = ndi.binary_closing(np.pad(opaque, 4, mode="edge"), structure=ndi.generate_binary_structure(2, 1),
                               iterations=RING_CLOSE)[4:-4, 4:-4]
    deep = ndi.binary_erosion(ndi.binary_fill_holes(tight), iterations=RING_DEPTH, border_value=1)
    # (pixels within 2 px of transparent key-coloured pixels are the edge of a thin real gap, not a ring)
    gap = ndi.binary_dilation((alpha < 64) & ~far, iterations=2)
    holes |= deep & far & (alpha < 200) & ~gap
    ya, yb, xa, xb = face_region(alpha.shape, face)
    box = np.zeros(alpha.shape, bool)
    box[ya:yb, xa:xb] = True
    return holes & box


def hole_pct(rgba, face):
    m = hole_mask(rgba, face)
    if m is None:
        return None
    ya, yb, xa, xb = face_region(rgba.shape, face)
    return 100.0 * float(m.sum()) / max(1, (yb - ya) * (xb - xa))


def selftest():
    n = 400
    rgba = np.zeros((n, n, 4), np.uint8)
    rgba[..., :3] = 128
    rgba[40:, 80:320] = (200, 150, 130, 255)
    face = [0.3, 0.2, 0.7, 0.5]
    clean = hole_pct(rgba, face)
    rgba[90:140, 190:240, 3] = 0           # enclosed hole, face colour underneath
    rgba[110:150, 120:170, 3] = 0
    rgba[100:130, 80:130, 3] = 0           # bite open to the silhouette edge
    ring = hole_pct(rgba, face)
    rgba[100:130, 80:130, 3] = 255
    rgba[110:150, 120:170, 3] = 255
    rgba[90:140, 190:240, 3] = 255
    rgba[100:160, 150:230, 3] = 255
    rgba[100:160, 150, 3] = 100            # a 1 px partial-alpha ring only
    rgba[100:160, 229, 3] = 100
    rgba[100, 150:230, 3] = 100
    rgba[159, 150:230, 3] = 100
    only_ring = hole_pct(rgba, face)
    print(f"selftest 1 px ring only={only_ring:.2f}%")
    if only_ring <= LIMIT:
        return 0
    planted = ring
    print(f"selftest clean={clean:.2f}% planted={planted:.2f}% limit={LIMIT}%")
    return 1 if planted > LIMIT and clean <= LIMIT else 0


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        rc = selftest()
        print("selftest: planted hole detected" if rc else "selftest: planted hole MISSED")
        sys.exit(rc)
    frames = json.loads((CARDS / "frames.json").read_text("utf-8"))
    manifest = json.loads((CARDS / "manifest.json").read_text("utf-8"))
    ids = [a for a in args if not a.startswith("-")] or sorted(frames)
    bad = skipped = 0
    for cid in ids:
        rgba = with_source(manifest[cid], np.asarray(Image.open(CARDS / f"{cid}.png").convert("RGBA")))
        pct = hole_pct(rgba, frames[cid]["face"])
        if pct is None:
            skipped += 1
            print(f"{cid:8s}   n/a   key not measurable (RGB under alpha 0 not kept)")
            continue
        bad += pct > LIMIT
        print(f"{cid:8s} {pct:6.2f}%  {'FAIL' if pct > LIMIT else 'ok'}")
    print(f"{len(ids)} cards, {bad} over {LIMIT}%, {skipped} not measurable")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
