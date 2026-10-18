"""Split a 4-pose key-pose strip into baseline-aligned frames, plus a preview GIF.

Strips are generated as ONE image (four poses side by side) because poses drawn
in the same image keep the same scale and line weight; separate generations
drift and the drift reads as flicker when the frames are played in sequence.

Every frame of a strip is saved with the SAME height and the SAME baseline (the
lowest opaque row of the strip), so the animation code can anchor every frame at
bottom-centre and the feet stay put.

usage: python split_strip.py <in_dir> <out_dir> [glob]   (default glob: [HA]*.png)
"""
import glob
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from cutout import CREAM, NAVY, cut, invert  # noqa: E402

FRAMES = 4
MIN_GAP = 6  # empty columns that separate two poses


def segments(alpha):
    w, h = alpha.size
    cols = [alpha.crop((x, 0, x + 1, h)).getbbox() is not None for x in range(w)]
    segs, start, gap = [], None, 0
    for x, filled in enumerate(cols + [False] * MIN_GAP):
        if filled:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= MIN_GAP:
                segs.append([start, x - gap + 1])
                start, gap = None, 0
    # Floating bits (a note held away from the body) become tiny segments:
    # merge the narrowest into its nearest neighbour until FRAMES remain.
    while len(segs) > FRAMES:
        i = min(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
        if i == 0:
            j = 1
        elif i == len(segs) - 1:
            j = i - 1
        else:
            j = i - 1 if segs[i][0] - segs[i - 1][1] <= segs[i + 1][0] - segs[i][1] else i + 1
        a, b = sorted((i, j))
        segs[a] = [min(segs[a][0], segs[b][0]), max(segs[a][1], segs[b][1])]
        del segs[b]
    return segs


def split(path, dst):
    im = cut(path)  # trimmed to the union bbox, background transparent
    alpha = im.split()[3]
    segs = segments(alpha)
    name = os.path.splitext(os.path.basename(path))[0]
    if len(segs) != FRAMES:
        print(f"{name}: found {len(segs)} poses, expected {FRAMES} - SKIPPED")
        return None
    frames = []
    for i, (x0, x1) in enumerate(segs, 1):
        f = im.crop((x0, 0, x1, im.height))  # full strip height = shared baseline
        f.save(os.path.join(dst, f"{name}-{i}.png"))
        invert(f).save(os.path.join(dst, f"{name}-{i}-ters.png"))
        frames.append(f)
    print(f"{name}: {[f.width for f in frames]} x {im.height}")
    return name, frames


def gif(name, frames, dst):
    bg = NAVY if name.startswith("H") else CREAM
    w = max(f.width for f in frames) + 40
    h = frames[0].height + 40
    scale = 320 / h
    out = []
    for f in frames:
        c = Image.new("RGB", (w, h), bg)
        c.paste(f, ((w - f.width) // 2, 20), f)  # bottom-centre anchor
        out.append(c.resize((int(w * scale), 320)))
    out[0].save(os.path.join(dst, f"_{name}.gif"), save_all=True, append_images=out[1:],
                duration=180, loop=0)


def main(src, dst, pattern="[HA]*.png"):
    os.makedirs(dst, exist_ok=True)
    for p in sorted(glob.glob(os.path.join(src, pattern))):
        r = split(p, dst)
        if r:
            gif(*r, dst)


if __name__ == "__main__":
    main(*sys.argv[1:4])
