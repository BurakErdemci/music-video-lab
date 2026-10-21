#!/usr/bin/env python3
"""metal_temp_cards.py - TEMPORARY metal-form cards cut from the approved metal sheets, until the 16 metal
pose cards (stil/prompts/m-metal-poses, OM1-8 / BM1-8) are cut out.

  uv run --with pillow --with numpy --with scipy python -I tools/metal_temp_cards.py

Crops the front view of stil/onayli/04-karakter-turuncu-metal.png (-> card OMT) and
05-karakter-mavi-metal.png (-> card BMT), keys the flat sheet background by a border flood fill (cutout.py's tolerance,
without its grey peeling, which ate the blue girl's pale skin), keeps the largest connected figure (drops slivers of the neighbouring side view), autocrops, and
writes video/public/cards/<id>.png plus its manifest entry. Deterministic.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools' / 'imagegen'))
import cutout  # noqa: E402

CARDS = ROOT / 'video' / 'public' / 'cards'
# front-view boxes (x0, y0, x1, y1) in the 1536x1024 sheets, measured from the sheets by eye
SHEETS = {
    'OMT': ('stil/onayli/04-karakter-turuncu-metal.png', (0, 0, 474, 1010)),
    'BMT': ('stil/onayli/05-karakter-mavi-metal.png', (0, 0, 458, 1024)),
}


def main():
    manifest = json.loads((CARDS / 'manifest.json').read_text())
    for cid, (src, box) in SHEETS.items():
        im = Image.open(ROOT / src).convert('RGB').crop(box)
        rgb = np.asarray(im)
        border = np.concatenate([rgb[0], rgb[:, 0], rgb[:, -1]]).astype(float)
        key = '#%02x%02x%02x' % tuple(int(v) for v in np.median(border, axis=0))
        # Border flood only (no grey peeling: the blue girl's pale skin is desaturated and would be peeled off)
        bg = cutout.hex_rgb(key)
        dist = np.abs(rgb.astype(float) - bg).max(axis=2)
        lab0, _ = ndi.label(dist <= cutout.FLOOD_TOL)
        edge = np.unique(np.concatenate([lab0[0], lab0[-1], lab0[:, 0], lab0[:, -1]]))
        fg = ~np.isin(lab0, edge[edge > 0])
        # enclosed pockets of sheet grey between hair strands (tight tolerance: skin stays)
        holes = (dist <= cutout.HOLE_TOL) & fg
        hl, hn = ndi.label(holes)
        if hn:
            sizes = ndi.sum(holes, hl, index=np.arange(1, hn + 1))
            fg &= ~np.isin(hl, np.nonzero(sizes > 40)[0] + 1)
        fg = ndi.binary_opening(fg, structure=np.ones((2, 2)), border_value=1)
        core = ndi.binary_erosion(fg, iterations=1, border_value=1)
        alpha = ndi.uniform_filter(core.astype(float), size=3, mode='nearest')
        out = rgb
        lab, n = ndi.label(alpha > 0.05)
        if n > 1:
            sizes = ndi.sum(alpha > 0.05, lab, index=np.arange(1, n + 1))
            keep = lab == (int(np.argmax(sizes)) + 1)
            alpha = alpha * ndi.binary_dilation(keep, iterations=2)
        card, crop = cutout.autocrop(cutout.to_rgba(out, alpha))
        card.save(CARDS / f'{cid}.png')
        manifest[cid] = {'file': f'cards/{cid}.png', 'w': card.width, 'h': card.height,
                         'bbox': [box[0] + crop[0], box[1] + crop[1], box[0] + crop[2], box[1] + crop[3]],
                         'source': Path(src).name, 'temporary': True}
        print(cid, card.size, 'key', key)
    (CARDS / 'manifest.json').write_text(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
