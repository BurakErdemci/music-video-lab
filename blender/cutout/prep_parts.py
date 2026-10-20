# Copies the profile puppet parts (stil/kukla/{insan,ai}-profil) into blender/cutout/parts/{human,ai}/ for the build,
# and draws the two props (mug, notebook) into parts/props/. System Python with Pillow:
#
#   python blender/cutout/prep_parts.py
#
# Cleaning: hand_*_grip.png and hand_*_point.png of the human hold leftover hands from the hand sheet (two or three
# separate hands in one PNG, measured 19 Oct 2026). Only the piece nearest the wrist pivot is kept; size and pivot do
# not change, so rig.json stays valid.
import shutil
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pose as P  # noqa: E402

NAVY = (0x18, 0x20, 0x3A)
CREAM = (0xF3, 0xEF, 0xE4)
SS = 4  # props are drawn at SS x their PNG size and downsampled (anti-aliased edges)


def pieces(im, thr=20):
    a = im.getchannel("A").load()
    w, h = im.size
    seen = bytearray(w * h)
    out = []
    for y in range(h):
        for x in range(w):
            if a[x, y] > thr and not seen[y * w + x]:
                q = deque([(x, y)])
                seen[y * w + x] = 1
                pts = []
                while q:
                    px, py = q.popleft()
                    pts.append((px, py))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = px + dx, py + dy
                            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and a[nx, ny] > thr:
                                seen[ny * w + nx] = 1
                                q.append((nx, ny))
                out.append(pts)
    return out


def keep_nearest(im, pivot):
    """Keep the alpha piece nearest the pivot (plus its soft edge), clear every other piece of 200+ px."""
    ps = pieces(im)
    if len(ps) < 2:
        return im, 0
    near = min(ps, key=lambda pts: min((x - pivot[0]) ** 2 + (y - pivot[1]) ** 2 for x, y in pts))
    px = im.load()
    removed = 0
    for pts in ps:
        if pts is near or len(pts) < 200:
            continue
        for x, y in pts:
            px[x, y] = (0, 0, 0, 0)
        removed += 1
    # faint edge pixels (alpha <= threshold) of the removed hands: clear everything farther than 6 px from the kept piece
    keep = set(near)
    xs = [x for x, _ in near]
    ys = [y for _, y in near]
    x0, x1, y0, y1 = min(xs) - 6, max(xs) + 6, min(ys) - 6, max(ys) + 6
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if not (x0 <= x <= x1 and y0 <= y <= y1) and px[x, y][3] > 0:
                px[x, y] = (0, 0, 0, 0)
    return im, removed


SPECK = 20  # isolated opaque bits smaller than this (px) are cut-out leftovers: they count as extra silhouette pieces


def drop_specks(im):
    """Clear alpha pieces under SPECK px (a part's few isolated pixels, measured 19 Oct 2026). Returns how many."""
    px = im.load()
    n = 0
    for thr in (0, 127):  # also bits that only touch the body through faint (alpha < 0.5) edge pixels
        for pts in pieces(im, thr=thr):
            if len(pts) < SPECK:
                for x, y in pts:
                    px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def unkey_edges(im):
    """The AI parts keep a 1 px ring of the reference's magenta key on their outline (e.g. (92,5,145), (170,18,191)):
    recolour key-hued pixels to the outline navy, alpha kept. Returns how many."""
    px = im.load()
    w, h = im.size
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and b > g + 60 and r > g + 40:
                px[x, y] = NAVY + (a,)
                n += 1
    return n


def draw_mug(path):
    """The human's mug, side view, handle to the right (away from him: he holds it by the body, fist over its lower
    half so the rim stays visible). Navy body with the cream rim line of the human's world. PNG 46x50 px (film px)."""
    w, h = 46 * SS, 50 * SS
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = int(2.2 * SS)
    body = (3 * SS, 4 * SS, 33 * SS, 48 * SS)
    d.ellipse((24 * SS, 13 * SS, 44 * SS, 37 * SS), outline=CREAM + (255,), width=int(6 * SS))
    d.ellipse((24 * SS + lw, 13 * SS + lw, 44 * SS - lw, 37 * SS - lw), outline=NAVY + (255,), width=int(6 * SS) - 2 * lw)
    d.rounded_rectangle(body, radius=int(4 * SS), fill=CREAM + (255,))
    d.rounded_rectangle((body[0] + lw, body[1] + lw, body[2] - lw, body[3] - lw), radius=int(2.5 * SS), fill=NAVY + (255,))
    d.line((body[0] + lw, body[1] + int(4.5 * SS), body[2] - lw, body[1] + int(4.5 * SS)), fill=CREAM + (255,), width=int(1.3 * SS))
    im.resize((w // SS, h // SS), Image.LANCZOS).save(path)
    return (18.0, 48.0)  # pivot: bottom centre of the body (stands on the desk)


def draw_book(back_path, page_path):
    """The AI's open notebook, held up and turned partly to the camera: two pages as one cream shape with a navy
    outline (her line language), faint ruled lines; the turning page is a separate right-hand page that mirrors over
    the spine (pose prop sx 1 -> -1). PNG px = film px. Pivot of both: the spine's mid point."""
    lw = int(2.6 * SS)
    # back: both open pages, spine at x = 56, page width 52, height 72, the outer corners dip (a shallow V)
    w, h = 112 * SS, 84 * SS
    sx, top, bot = 56 * SS, 6 * SS, 78 * SS
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    left = [(sx, top), (4 * SS, top + 5 * SS), (4 * SS, bot + 3 * SS), (sx, bot)]
    right = [(sx, top), (w - 4 * SS, top + 5 * SS), (w - 4 * SS, bot + 3 * SS), (sx, bot)]
    for poly in (left, right):
        d.polygon(poly, fill=CREAM + (255,), outline=NAVY + (255,), width=lw)
    for i in range(6):
        y = top + (14 + i * 9) * SS
        d.line((10 * SS, y + 3 * SS, sx - 6 * SS, y), fill=NAVY + (110,), width=int(0.9 * SS))
        d.line((sx + 6 * SS, y, w - 10 * SS, y + 3 * SS), fill=NAVY + (110,), width=int(0.9 * SS))
    d.line((sx, top, sx, bot), fill=NAVY + (255,), width=lw)
    im.resize((w // SS, h // SS), Image.LANCZOS).save(back_path)
    # page: the right page alone, spine at its left edge (x = 0) so sx mirrors it over the spine
    pw = 56 * SS
    pg = Image.new("RGBA", (pw, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(pg)
    d.polygon([(lw // 2, top), (pw - 4 * SS, top + 5 * SS), (pw - 4 * SS, bot + 3 * SS), (lw // 2, bot)], fill=CREAM + (255,),
              outline=NAVY + (255,), width=lw)
    for i in range(6):
        y = top + (14 + i * 9) * SS
        d.line((6 * SS, y, pw - 10 * SS, y + 3 * SS), fill=NAVY + (110,), width=int(0.9 * SS))
    pg.resize((pw // SS, h // SS), Image.LANCZOS).save(page_path)
    return (56.0, 42.0), (0.0, 42.0)


def main():
    out = P.PARTS_DIR
    for char, info in P.CHARS.items():
        dst = out / char
        dst.mkdir(parents=True, exist_ok=True)
        r = P.rig(char)
        for name, p in r["parts"].items():
            src = info["src"] / p["file"]
            if char == "human" and name.startswith("hand_") and ("_grip" in name or "_point" in name):
                im, n = keep_nearest(Image.open(src).convert("RGBA"), p["pivot"])
                drop_specks(im)
                im.save(dst / p["file"])
                print(f"PREP {char}/{p['file']}: removed {n} leftover hand(s)")
            else:
                im = Image.open(src).convert("RGBA")
                n = drop_specks(im)
                k = unkey_edges(im)
                im.save(dst / p["file"])
                if n or k:
                    print(f"PREP {char}/{p['file']}: {n} speck(s) under {SPECK} px removed, {k} key-colour edge px recoloured")
    (out / "props").mkdir(parents=True, exist_ok=True)
    mug_pivot = draw_mug(out / "props" / "mug.png")
    back_pivot, page_pivot = draw_book(out / "props" / "book_back.png", out / "props" / "book_page.png")
    print("PREP props", mug_pivot, back_pivot, page_pivot)


if __name__ == "__main__":
    main()
