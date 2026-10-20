"""Cut character poses out of their flat magenta background.

The generator paints poses on #FF00FF so neither the navy body nor the cream
outline touches the background colour. Flood-fill from the border instead of a
colour threshold: a threshold also eats magenta-ish anti-aliasing inside the
figure, flood-fill cannot cross the outline.

usage: python cutout.py <in_dir> <out_dir> [glob]   (default glob: [ha]*.png)
"""
import glob
import os
import sys

from PIL import Image, ImageDraw

NAVY = (24, 32, 58)
CREAM = (243, 239, 228)


def cut(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    seeds = [(x, y) for x in range(0, w, 40) for y in (1, h - 2)]
    seeds += [(x, y) for y in range(0, h, 40) for x in (1, w - 2)]
    for s in seeds:
        r, g, b, a = im.getpixel(s)
        # Only seed on pixels that are still background magenta.
        if a and r > 180 and b > 180 and g < 90:
            ImageDraw.floodfill(im, s, (0, 0, 0, 0), thresh=90)
    # Magenta fringe left on the outline edge: drop pixels that are clearly magenta.
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r > 170 and b > 150 and g < 110:
                px[x, y] = (0, 0, 0, 0)
            # Anti-aliased hair tips blend navy/cream with magenta into a pink fringe
            # (seen on h03/h05 against navy). No palette colour has both R and B
            # clearly above G, so this tint only ever comes from the background.
            elif a and r - g > 35 and b - g > 35:
                px[x, y] = (0, 0, 0, 0)
    return im.crop(im.getbbox())


def invert(im):
    """Swap navy and cream, keep moon yellow: the "entering the other world" variant.

    Non-yellow pixels are re-placed along the navy->cream axis by luminance, so
    grain and anti-aliased edges survive the swap instead of posterising.
    """
    out = im.copy()
    px = out.load()
    lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    ln, lc = lum(NAVY), lum(CREAM)
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a or (r + g) / 2 - b > 70:  # transparent or yellow
                continue
            t = min(1.0, max(0.0, (lum((r, g, b)) - ln) / (lc - ln)))
            px[x, y] = tuple(round(n + (c - n) * (1 - t)) for n, c in zip(NAVY, CREAM)) + (a,)
    return out


def main(src, dst, pattern="[ha]*.png"):
    os.makedirs(dst, exist_ok=True)
    cuts = []
    for f in sorted(glob.glob(os.path.join(src, pattern))):
        im = cut(f)
        name = os.path.basename(f)
        im.save(os.path.join(dst, name))
        invert(im).save(os.path.join(dst, name.replace(".png", "-ters.png")))
        cuts.append((name, im))
        print(name, im.size)
    # Check sheet: every pose on navy and on cream, scaled to one height.
    th = 300
    tiles = []
    for name, im in cuts:
        s = im.resize((max(1, int(im.width * th / im.height)), th))
        tile = Image.new("RGB", (s.width * 2 + 30, th + 30), (255, 255, 255))
        for i, bg in enumerate((NAVY, CREAM)):
            plate = Image.new("RGB", (s.width + 10, th + 10), bg)
            plate.paste(s, (5, 5), s)
            tile.paste(plate, (i * (s.width + 15), 20))
        ImageDraw.Draw(tile).text((4, 2), name, fill=(0, 0, 0))
        tiles.append(tile)
    cols = 4
    cw = max(t.width for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cw * cols, (th + 30) * rows), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * cw, (i // cols) * (th + 30)))
    sheet.save(os.path.join(dst, "_kontrol.jpg"), quality=85)


if __name__ == "__main__":
    main(*sys.argv[1:4])
