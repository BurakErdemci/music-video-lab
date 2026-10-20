# Part 3: removes the faint magenta fringe the keying left on edge pixels of the p3 sprites (hair rims, leaves):
# a visible pixel whose hue leans magenta (r over g by > 20 and b over g by > 10; light pinks = cream mixed with magenta) is re-inked navy or cream by its lightness.
# Idempotent. Run from the repo root: python stil/canli/defringe_p3.py
import glob, os
from PIL import Image
NAVY = (0x18, 0x20, 0x3A)
CREAM = (0xF3, 0xEF, 0xE4)
total = 0
for p in sorted(glob.glob('video/public/living/p3/*.png')):
    im = Image.open(p).convert('RGBA')
    px = im.load()
    n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if r - g > 20 and b - g > 10:
                l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                c = CREAM if l > 0.55 else NAVY
                px[x, y] = (c[0], c[1], c[2], a)
                n += 1
    if n:
        im.save(p)
    total += n
    print(os.path.basename(p), n)
print('total', total)
