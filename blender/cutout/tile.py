# Boards from rendered PNGs (system Python + Pillow; Blender's Python has no PIL). No text is drawn: the tile order is
# the CSV / the printed legend.
#
#   python blender/cutout/tile.py bend {human|ai} RENDER_DIR OUT.png [--only part,part] [--rigid] [--scale 2]
#       RENDER_DIR/<char>/NNNN.png = the bendtest frames of `board.py --bend`; rows = joints, columns = bend angles;
#       --rigid adds a rigid (preview.py) row under each mesh row
#   python blender/cutout/tile.py joints CSV RENDER_DIR OUT.png [--char human|ai] [--scale 3]
#       CSV from `checks.py --joints` (char, joint, frame, cx, cy), crops of the most bent frames
#   python blender/cutout/tile.py same-person NEUTRAL_DIR OUT.png
#       reference | cut-out render | difference, per character; NEUTRAL_DIR/<char>/0001.png from `board.py --neutral`
import csv
import sys
from pathlib import Path

from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pose as P  # noqa: E402

BG = (128, 128, 136)  # neutral grey: the cream rim and the navy outline both read on it
SIZE = 160  # crop window in film px


def opt(name, default=None, flag=False):
    a = sys.argv[1:]
    if flag:
        return name in a
    return a[a.index(name) + 1] if name in a else default


def on_bg(path):
    bg = Image.new("RGBA", (1920, 1080), BG + (255,))
    bg.alpha_composite(Image.open(path).convert("RGBA"))
    return bg


def crop(img, cx, cy, scale):
    h = SIZE // 2
    return img.crop((int(cx) - h, int(cy) - h, int(cx) + h, int(cy) + h)).resize((SIZE * scale, SIZE * scale),
                                                                              Image.LANCZOS)


def rigid(char, pz, hide):
    import preview as PV
    im = Image.new("RGBA", (1920, 1080), BG + (255,))
    lay = [t for t in PV.layers(char, pz) if Path(t[1]).stem not in hide]
    for z, path, m, al in sorted(lay, key=lambda t: t[0]):
        im.alpha_composite(PV.img(path).transform((1920, 1080), Image.AFFINE, P.inv(m), resample=Image.BICUBIC))
    return im


def bend():
    import bendtest as B
    char, d, out = sys.argv[2], Path(sys.argv[3]), sys.argv[4]
    scale = int(opt("--scale", "2"))
    only = [x for x in opt("--only", "").split(",") if x]
    r = P.rig(char)
    all_poses = B.poses(char)
    cols = max(len(f) for _, _, _, f in B.board(char))
    t = SIZE * scale
    rows = []
    for label, part, hide, frames in B.board(char):
        if only and part not in only:
            continue
        c = P.joint(r, P.world(r, all_poses[0]), part)
        mesh = [crop(on_bg(d / char / f"{f + 1:04d}.png"), c[0], c[1], scale) for f in frames.values()]
        rows.append(mesh)
        if opt("--rigid", flag=True):
            rows.append([crop(rigid(char, all_poses[f], hide), c[0], c[1], scale) for f in frames.values()])
    im = Image.new("RGB", (cols * t, len(rows) * t), (255, 255, 255))
    for y, rw in enumerate(rows):
        for x, tile in enumerate(rw):
            im.paste(tile.convert("RGB"), (x * t, y * t))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print("BOARD", out, im.size, "rows", [(lb, list(f)) for lb, p, h, f in B.board(char) if not only or p in only])


def joints():
    csv_path, d, out = sys.argv[2], Path(sys.argv[3]), sys.argv[4]
    scale = int(opt("--scale", "3"))
    tiles = []
    with open(csv_path) as fh:
        for row in csv.DictReader(fh):
            if opt("--char") and row["char"] != opt("--char"):
                continue
            tiles.append(crop(on_bg(d / row["char"] / f"{int(row['frame']) + 1:04d}.png"), float(row["cx"]),
                              float(row["cy"]), scale))
    t = SIZE * scale
    cols = 5
    im = Image.new("RGB", (cols * t, ((len(tiles) + cols - 1) // cols) * t), (255, 255, 255))
    for i, tile in enumerate(tiles):
        im.paste(tile.convert("RGB"), ((i % cols) * t, (i // cols) * t))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print("BOARD", out, im.size, len(tiles), "tiles")


def same_person():
    import bendtest as B
    d, out = Path(sys.argv[2]), sys.argv[3]
    sheets = []
    for char, ref in (("human", "ref-insan-kanonik.png"), ("ai", "ref-ai.png")):
        r = P.rig(char)
        s = P.CHARS[char]["scale"]
        root = B.ROOT[char]
        x0, y0, x1, y1 = r["reference_crop"]
        rx, ry = r["parts"]["pelvis"]["offset"]
        box = tuple(int(round(v)) for v in (root[0] + s * (x0 - rx), root[1] + s * (y0 - ry), root[0] + s * (x1 - rx),
                                            root[1] + s * (y1 - ry)))
        ref_im = Image.open(P.REPO / "stil" / "hareket" / ref).convert("RGBA")
        if char == "human":  # magenta key
            px = ref_im.load()
            for yy in range(ref_im.size[1]):
                for xx in range(ref_im.size[0]):
                    p = px[xx, yy]
                    if p[0] > 235 and p[1] < 40 and p[2] > 235:
                        px[xx, yy] = (0, 0, 0, 0)
        ref_im = ref_im.crop((x0, y0, x1, y1)).resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
        ref_bg = Image.new("RGBA", ref_im.size, BG + (255,))
        ref_bg.alpha_composite(ref_im)
        ren = on_bg(d / char / "0001.png").crop(box)
        diff = ImageChops.difference(ref_bg.convert("RGB"), ren.convert("RGB")).point(lambda v: min(255, v * 3))
        sheet = Image.new("RGB", (ref_bg.width * 3 + 40, ref_bg.height), (255, 255, 255))
        for i, im in enumerate((ref_bg.convert("RGB"), ren.convert("RGB"), diff)):
            sheet.paste(im, (i * (ref_bg.width + 20), 0))
        sheets.append(sheet)
    board = Image.new("RGB", (max(s.width for s in sheets), sum(s.height for s in sheets) + 20), (255, 255, 255))
    y = 0
    for s in sheets:
        board.paste(s, (0, y))
        y += s.height + 20
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    board.save(out)
    print("BOARD", out, board.size)


if __name__ == "__main__":
    {"bend": bend, "joints": joints, "same-person": same_person}[sys.argv[1]]()
