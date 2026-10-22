"""Repair face holes in existing cards in place (see tools/holecheck.py for how a hole is found).

    uv run --with pillow --with numpy --with scipy python -I tools/imagegen/fillholes.py [IDs...] [--dry]

With no ids, repairs every card holecheck fails. Inside the chin-extended face box only: pixels that are
transparent, inside the closed silhouette and not the flat key colour get their alpha back, with the colour
taken from the card's source image. Restored pixels at the new edge take the colour of the nearest restored or
opaque interior pixel and a 1 px feather (3x3 mean of the mask), so no grey key halo survives; nothing outside
the closed silhouette is touched. Size, crop and every JSON stay as they are. The HD copies are not touched:
regenerate them with tools/hdcards.py.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import holecheck as H  # noqa: E402


def repair(rgba, face, entry):
    """Return (new rgba, restored pixel count) or None when no source matches the card."""
    hit = H.source_rgb(entry, rgba)
    if hit is None:
        return None
    full = rgba.copy()
    full[..., :3] = hit[1]
    holes = H.hole_mask(full, face)
    if holes is None or not holes.any():
        return rgba, 0
    opaque = rgba[..., 3] > 127
    # tiny gaps between hole fragments (skin close to the key) are filled too, but never outside the closed silhouette
    pad = H.CLOSE + 2
    closed = ndi.binary_closing(np.pad(opaque, pad, mode="edge"), structure=ndi.generate_binary_structure(2, 1),
                                iterations=H.CLOSE)[pad:-pad, pad:-pad]
    inside = ndi.binary_fill_holes(closed) & ~opaque
    ya, yb, xa, xb = H.face_region(rgba.shape, face)
    box = np.zeros(opaque.shape, bool)
    box[ya:yb, xa:xb] = True
    restored = ndi.binary_closing(holes, structure=np.ones((3, 3))) & inside & box
    mask = opaque | restored
    # like cutout.py: the outer 2 px of the restored area take the interior colour, the mask is eroded 1 px, then feathered
    interior = ndi.binary_erosion(mask, iterations=2, border_value=1) & (opaque | ndi.binary_erosion(restored, iterations=2))
    band = restored & ~interior
    core = ndi.binary_erosion(mask, iterations=1, border_value=1)
    out = rgba.copy()
    out[restored, :3] = hit[1][restored]
    if interior.any():
        idx = ndi.distance_transform_edt(~interior, return_distances=False, return_indices=True)
        out[band, :3] = out[idx[0][band], idx[1][band], :3]
    feather = ndi.uniform_filter(core.astype(float), size=3, mode="nearest")
    new_a = np.clip(feather * 255 + 0.5, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(restored, np.maximum(new_a, rgba[..., 3]), rgba[..., 3])
    return out, int(restored.sum())


def main():
    args = sys.argv[1:]
    frames = json.loads((H.CARDS / "frames.json").read_text("utf-8"))
    manifest = json.loads((H.CARDS / "manifest.json").read_text("utf-8"))
    ids = [a for a in args if not a.startswith("-")]
    cards = {}
    for cid in ids or sorted(frames):
        rgba = np.asarray(Image.open(H.CARDS / f"{cid}.png").convert("RGBA"))
        pct = H.hole_pct(H.with_source(manifest[cid], rgba), frames[cid]["face"])
        if ids or (pct is not None and pct > H.LIMIT):
            cards[cid] = (rgba, pct)
    for cid, (rgba, before) in cards.items():
        res = repair(rgba, frames[cid]["face"], manifest[cid])
        if res is None:
            print(f"{cid}: no matching source image, skipped")
            continue
        out, n = res
        after = H.hole_pct(H.with_source(manifest[cid], out), frames[cid]["face"])
        print(f"{cid}: {before:.2f}% -> {after:.2f}%  ({n} px restored)")
        if "--dry" not in args and n:
            Image.fromarray(out, "RGBA").save(H.CARDS / f"{cid}.png")


if __name__ == "__main__":
    main()
