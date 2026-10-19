"""Reassemble a cut-out puppet from its rig.json and write the two check boards.

usage (repo root):
  python stil/kukla/assemble.py stil/kukla/insan-profil            # assembled.png + bend-test.png
  python stil/kukla/assemble.py stil/kukla/insan-profil --pose pose.json --out x.png   # extra rotations

Pure PIL (no numpy) so it runs on any Python with Pillow.

Transform of a part (y down, angles in degrees, positive = clockwise on screen):
  world(part) = world(parent) @ T(offset) @ R(rotation) @ T(-pivot)
`offset` is where this part's pivot sits in the PARENT's part pixels (for the root: in the reference image's pixels; rig['canvas'] = reference size),
`pivot` is the joint in this part's own pixels. Parts are drawn in ascending `z`.
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

BOARD_BG = (128, 128, 136)  # neutral grey: both the cream rim and the navy outline read on it


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def T(x, y):
    return [[1, 0, x], [0, 1, y], [0, 0, 1]]


def R(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]]


def inverse(m):
    a, b, c = m[0]
    d, e, f = m[1]
    det = a * e - b * d
    ia, ib, id_, ie = e / det, -b / det, -d / det, a / det
    return [[ia, ib, -(ia * c + ib * f)], [id_, ie, -(id_ * c + ie * f)], [0, 0, 1]]


def load(rig_dir):
    with open(os.path.join(rig_dir, 'rig.json'), encoding='utf-8') as fh:
        rig = json.load(fh)
    images = {n: Image.open(os.path.join(rig_dir, p['file'])).convert('RGBA') for n, p in rig['parts'].items()}
    return rig, images


def world_matrices(rig, extra=None):
    """extra: {part: degrees added to its rotation}."""
    extra = extra or {}
    parts, cache = rig['parts'], {}

    def get(name):
        if name in cache:
            return cache[name]
        p = parts[name]
        base = get(p['parent']) if p.get('parent') else [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
        m = mat_mul(base, T(*p['offset']))
        m = mat_mul(m, R(p.get('rotation', 0) + extra.get(name, 0)))
        m = mat_mul(m, T(-p['pivot'][0], -p['pivot'][1]))
        cache[name] = m
        return m

    return {n: get(n) for n in parts}


def render(rig, images, extra=None, hide=(), bg=None, pad=0, size=None):
    """Canvas = the reference image's pixel space (+pad on every side); the root offset is in reference px."""
    w, h = size or rig['canvas']
    w, h = w + 2 * pad, h + 2 * pad
    out = Image.new('RGBA', (w, h), bg + (255,) if bg else (0, 0, 0, 0))
    mats = world_matrices(rig, extra)
    for name in sorted(rig['parts'], key=lambda n: rig['parts'][n]['z']):
        if name in hide or rig['parts'][name].get('hidden'):
            continue
        inv = inverse(mat_mul(T(pad, pad), mats[name]))
        coeffs = (inv[0][0], inv[0][1], inv[0][2], inv[1][0], inv[1][1], inv[1][2])
        layer = images[name].transform((w, h), Image.AFFINE, coeffs, resample=Image.BICUBIC)
        out = Image.alpha_composite(out, layer)
    return out


def pivot_world(rig, name, extra=None):
    m = world_matrices(rig, extra)[rig['parts'][name]['parent']]
    x, y = rig['parts'][name]['offset']
    return m[0][0] * x + m[0][1] * y + m[0][2], m[1][0] * x + m[1][1] * y + m[1][2]


def key_magenta(im):
    """The references sit on flat #FF00FF; make it transparent so they compare against an alpha assembly."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if r > 190 and b > 190 and g < 110:
                px[x, y] = (0, 0, 0, 0)
    return im


def board_assembled(rig_dir, rig, images):
    """Reference | reassembly | difference mask, all cropped to rig['reference_crop'] (reference px)."""
    ref = Image.open(os.path.join(rig_dir, rig['reference'])).convert('RGBA')
    box = tuple(rig['reference_crop'])
    asm_ref = render(rig, images, size=ref.size).crop(box)
    ref = key_magenta(ref.crop(box))
    W, H = ref.size
    pad = 20
    board = Image.new('RGB', (W * 3 + pad * 4, H + pad * 2), BOARD_BG)
    flat_ref = Image.new('RGBA', ref.size, BOARD_BG + (255,))
    flat_ref.alpha_composite(ref)
    board.paste(flat_ref.convert('RGB'), (pad, pad))
    flat_asm = Image.new('RGBA', ref.size, BOARD_BG + (255,))
    flat_asm.alpha_composite(asm_ref)
    board.paste(flat_asm.convert('RGB'), (W + pad * 2, pad))
    # difference panel: white where the assembly differs from the reference by more than 40/255
    diff = Image.new('RGB', ref.size, (0, 0, 0))
    a, b, d = flat_ref.load(), flat_asm.load(), diff.load()
    changed = 0
    for y in range(H):
        for x in range(W):
            if max(abs(a[x, y][i] - b[x, y][i]) for i in range(3)) > 40:
                d[x, y] = (255, 255, 255)
                changed += 1
    board.paste(diff, (W * 2 + pad * 3, pad))
    board.save(os.path.join(rig_dir, 'assembled.png'))
    return changed / float(W * H)


def board_bend(rig_dir, rig, images):
    tests = rig.get('bend_tests', [])
    angles = rig.get('bend_angles', [0, 45, 90, 120])
    cell = rig.get('bend_cell', 260)
    rows = []
    for t in tests:
        row = []
        for a in angles:
            deg = min(a, t.get('max', 120)) * t.get('sign', 1)
            extra = {t['part']: deg}
            pad = cell
            img = render(rig, images, extra=extra, hide=t.get('hide', []), bg=BOARD_BG, pad=pad)
            px, py = pivot_world(rig, t['part'], extra)
            px, py = px + pad, py + pad
            half = cell // 2
            crop = img.crop((int(px - half), int(py - half), int(px + half), int(py + half)))
            crop = crop.resize((cell * 2, cell * 2), Image.LANCZOS)
            dr = ImageDraw.Draw(crop)
            dr.text((6, 6), f"{t['part']} {deg:+.0f}", fill=(255, 255, 255))
            row.append(crop)
        rows.append(row)
    if not rows:
        return
    c2 = cell * 2
    board = Image.new('RGB', (len(angles) * (c2 + 8) + 8, len(rows) * (c2 + 8) + 8), (40, 40, 44))
    for r, row in enumerate(rows):
        for c, im in enumerate(row):
            board.paste(im.convert('RGB'), (8 + c * (c2 + 8), 8 + r * (c2 + 8)))
    board.save(os.path.join(rig_dir, 'bend-test.png'))


def main():
    rig_dir = sys.argv[1]
    rig, images = load(rig_dir)
    if '--pose' in sys.argv:
        with open(sys.argv[sys.argv.index('--pose') + 1], encoding='utf-8') as fh:
            extra = json.load(fh)
        out = sys.argv[sys.argv.index('--out') + 1]
        render(rig, images, extra=extra).save(out)
        return
    frac = board_assembled(rig_dir, rig, images)
    board_bend(rig_dir, rig, images)
    print(f'assembled.png: {frac * 100:.2f}% of the reference window differs by >40/255')


if __name__ == '__main__':
    main()
