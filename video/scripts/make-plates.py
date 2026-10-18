# Splits stil/pozlar/oda-levha-masasiz.png (the deskless plate; the desk comes with pose h06) (left half = room) into print plates for the intro:
#   room-key.png   navy/cream key plate, yellow pixels knocked back to a dim navy
#   room-moon.png  yellow plate, window moon only (RGBA)
#   room-notes.png yellow plate, everything outside the window (RGBA)
# All three are 960x1080 (plate scaled to 1920x1080, left half).
from PIL import Image, ImageChops
src = Image.open('../stil/pozlar/oda-levha-masasiz.png').convert('RGB').resize((1920, 1080), Image.LANCZOS).crop((0, 0, 960, 1080))
r, g, b = src.split()
# yellowness = R - B, ramped 40..100 into an alpha mask
rb = ImageChops.subtract(r, b)
mask = rb.point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 255 / 60)))
dim = Image.new('RGB', src.size, (43, 53, 88))
key = Image.composite(dim, src, mask)
key.save('public/plates/room-key.png')
yellow = src.convert('RGBA')
yellow.putalpha(mask)
win = Image.new('L', src.size, 0)
win.paste(255, (340, 8, 592, 486))
moon_a = ImageChops.multiply(mask, win)
notes_a = ImageChops.subtract(mask, moon_a)
m = src.convert('RGBA'); m.putalpha(moon_a); m.save('public/plates/room-moon.png')
n = src.convert('RGBA'); n.putalpha(notes_a); n.save('public/plates/room-notes.png')
print('ok', mask.getbbox(), moon_a.getbbox(), notes_a.getbbox())
