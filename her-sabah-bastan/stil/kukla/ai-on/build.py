"""Cut the AI front-view cut-out puppet from reference.png (+ extra hand shapes from hands-source.png).

usage (repo root):  python stil/kukla/ai-on/build.py
Method: see stil/kukla/README.md ("How the joints are made"). near = screen-left limb, far = screen-right limb.
Needs Pillow + numpy (numpy from Blender's bundled Python, same ABI).
"""
import json
import math
import os
import sys

sys.path.append(r'C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\lib\site-packages')
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REF = Image.open(os.path.join(HERE, 'reference.png')).convert('RGB')
W, H = REF.size
A = np.array(REF).astype(np.int32)
FIG = ~((A[..., 0] > 190) & (A[..., 2] > 190) & (A[..., 1] < 110))  # same key as assemble.py
CREAM = np.array([252, 247, 221])
NAVY = np.array([8, 28, 92])
RIM = 7
AXIS = 511
rng = np.random.RandomState(7)

YY, XX = np.mgrid[0:H, 0:W]


def poly_mask(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    return np.array(im) > 0


def interior(k):
    """FIG eroded by k px: pixels that are not on the outline."""
    im = Image.fromarray((FIG * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * k + 1))
    return np.array(im) > 0


INTERIOR = interior(RIM + 3)


def speckle(shape):
    """plain fill with the reference's sparse navy stipple."""
    out = np.tile(CREAM, shape + (1,)).astype(np.float32)
    dots = rng.rand(*shape) < 0.004
    mix = rng.uniform(0.25, 0.7, shape)[..., None]
    out = np.where(dots[..., None], out * (1 - mix) + NAVY * mix, out)
    return out


FILL = speckle((H, W))


def half(pivot, axis, side):
    """pixels on one side of the line through pivot perpendicular to axis; side=+1 child side, -1 parent side."""
    ax = np.array(axis, float)
    ax /= np.linalg.norm(ax)
    t = (XX - pivot[0]) * ax[0] + (YY - pivot[1]) * ax[1]
    return (t * side) >= 0


def disk(pivot, r):
    return (XX - pivot[0]) ** 2 + (YY - pivot[1]) ** 2 <= r * r


# ---- joints: pivot, radius, limb axis (parent -> child), parent, child -----------------------------
J = {
    'waist': ((AXIS, 585), 84, (0, -1), 'pelvis', 'chest'),
    'neck': ((AXIS, 262), 36, (0, -1), 'chest', 'neck'),
    'head': ((AXIS, 212), 36, (0, -1), 'neck', 'head'),
    'shoulder_near': ((382, 352), 26, (-26, 213), 'chest', 'upper_arm_near'),
    'elbow_near': ((356, 565), 30, (-35, 210), 'upper_arm_near', 'forearm_near'),
    'wrist_near': ((321, 765), 21, (-20, 140), 'forearm_near', 'hand_near_open'),
    'shoulder_far': ((2 * AXIS - 382, 352), 26, (26, 213), 'chest', 'upper_arm_far'),
    'elbow_far': ((2 * AXIS - 356, 565), 30, (35, 210), 'upper_arm_far', 'forearm_far'),
    'wrist_far': ((2 * AXIS - 321, 765), 21, (20, 140), 'forearm_far', 'hand_far_open'),
    'hip_near': ((445, 760), 58, (0, 1), 'pelvis', 'thigh_near'),
    'knee_near': ((434, 1060), 38, (0, 1), 'thigh_near', 'shin_near'),
    'ankle_near': ((422, 1395), 26, (0, 1), 'shin_near', 'foot_near'),
    'hip_far': ((578, 760), 58, (0, 1), 'pelvis', 'thigh_far'),
    'knee_far': ((590, 1060), 38, (0, 1), 'thigh_far', 'shin_far'),
    'ankle_far': ((601, 1395), 26, (0, 1), 'shin_far', 'foot_far'),
}



def fit_joint(name):
    """Move the pivot to the limb centreline and set r to half the outer-to-outer width, measured perpendicular to the limb."""
    p, r, ax, par, ch = J[name]
    n = math.hypot(*ax)
    perp = (-ax[1] / n, ax[0] / n)

    def inside(t):
        x, y = int(round(p[0] + perp[0] * t)), int(round(p[1] + perp[1] * t))
        return 0 <= x < W and 0 <= y < H and FIG[y, x]

    assert inside(0), name
    lo = hi = 0
    while inside(lo - 1):
        lo -= 1
    while inside(hi + 1):
        hi += 1
    mid = (lo + hi) / 2.0
    J[name] = ((p[0] + perp[0] * mid, p[1] + perp[1] * mid), (hi - lo + 1) / 2.0, ax, par, ch)


for _n in list(J):
    if not _n.startswith('shoulder'):
        fit_joint(_n)

# ---- ownership partition of the silhouette ---------------------------------------------------------
# inner boundary between the screen-left arm and the torso (the armpit crease belongs to the arm)
ARM_LINE = [(403, 360), (400.5, 366), (399.5, 372), (402, 380), (406, 392), (410, 404), (412.5, 416), (412, 424)]
BL = ARM_LINE + [(412, 440), (410, 520), (402, 600), (382, 680), (364, 740), (366, 800), (366, 930)]


def left_arm_region():
    pts = [(250, 300)] + BL + [(250, 930)]
    return poly_mask(pts)


def mirror(m):
    out = np.zeros_like(m)
    # reflect about x = AXIS (pixel x -> 2*AXIS - x)
    xs = np.arange(W)
    src = 2 * AXIS - xs
    ok = (src >= 0) & (src < W)
    out[:, xs[ok]] = m[:, src[ok]]
    return out


OWN = {}
LA = left_arm_region()
RA = mirror(LA)


def arm_masks(side, region):
    sh, el, wr = (J[k + '_' + side][0] for k in ('shoulder', 'elbow', 'wrist'))
    sa, ea, wa = (J[k + '_' + side][2] for k in ('shoulder', 'elbow', 'wrist'))
    up = FIG & region & half(sh, sa, +1) & half(el, ea, -1)
    fore = FIG & region & half(el, ea, +1) & half(wr, wa, -1)
    hand = FIG & region & half(wr, wa, +1)
    return up, fore, hand


OWN['upper_arm_near'], OWN['forearm_near'], OWN['hand_near_open'] = arm_masks('near', LA)
OWN['upper_arm_far'], OWN['forearm_far'], OWN['hand_far_open'] = arm_masks('far', RA)
taken = np.zeros((H, W), bool)
for k in list(OWN):
    taken |= OWN[k]


def leg(side, x_ok):
    hip, knee, ankle = J['hip_' + side][0], J['knee_' + side][0], J['ankle_' + side][0]
    base = FIG & ~taken & x_ok & (YY >= hip[1])
    OWN['thigh_' + side] = base & (YY < knee[1])
    OWN['shin_' + side] = base & (YY >= knee[1]) & (YY < ankle[1])
    OWN['foot_' + side] = base & (YY >= ankle[1])


leg('near', XX < AXIS)
leg('far', XX >= AXIS)
for k in ('thigh', 'shin', 'foot'):
    taken |= OWN[k + '_near'] | OWN[k + '_far']
rest = FIG & ~taken
OWN['head'] = rest & (YY < J['head'][0][1])
OWN['neck'] = rest & (YY >= J['head'][0][1]) & (YY < J['neck'][0][1])
OWN['chest'] = rest & (YY >= J['neck'][0][1]) & (YY < J['waist'][0][1])
OWN['pelvis'] = rest & (YY >= J['waist'][0][1])

# the chest is a complete torso on its own: under the arm it gets plain fill and its own side contour
C_LEFT = [(356, 350), (366, 362), (380, 378), (394, 394), (406, 416), (413, 440)]


def mirror_pts(pts):
    return [(2 * AXIS - x, y) for x, y in pts]


def line_mask(pts, width, ss=4):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    x0, y0, x1, y1 = int(min(xs)) - 10, int(min(ys)) - 10, int(max(xs)) + 10, int(max(ys)) + 10
    im = Image.new('L', ((x1 - x0) * ss, (y1 - y0) * ss), 0)
    d = ImageDraw.Draw(im)
    q = [((x - x0) * ss, (y - y0) * ss) for x, y in pts]
    d.line(q, fill=255, width=int(width * ss), joint='curve')
    for x, y in (q[0], q[-1]):
        d.ellipse([x - width * ss / 2, y - width * ss / 2, x + width * ss / 2, y + width * ss / 2], fill=255)
    im = im.resize((x1 - x0, y1 - y0), Image.LANCZOS)
    out = np.zeros((H, W), np.float32)
    out[y0:y1, x0:x1] = np.array(im) / 255.0
    return out


chest_extra = np.zeros((H, W), bool)
chest_line = np.zeros((H, W), np.float32)
for side_pts, region in ((C_LEFT, LA), (mirror_pts(C_LEFT), RA)):
    area = poly_mask(side_pts + [(side_pts[-1][0] + (60 if side_pts is C_LEFT else -60), 440),
                                 (side_pts[0][0] + (130 if side_pts is C_LEFT else -130), 330)])
    chest_extra |= area & FIG & region & ~OWN['chest']
    chest_line = np.maximum(chest_line, line_mask(side_pts, RIM))
chest_line_clip = chest_line * (chest_extra | OWN['chest'])

# ---- build each part's pixels ---------------------------------------------------------------------
pix = {k: np.where(m[..., None], A, 0).astype(np.float32) for k, m in OWN.items()}
alpha = {k: m.copy() for k, m in OWN.items()}

pix['chest'][chest_extra] = FILL[chest_extra]
alpha['chest'] |= chest_extra
# step 4: inner detail lines near a pivot become plain fill (outline pixels are left alone)
for name, (p, r, ax, par, ch) in J.items():
    zone = disk(p, 1.3 * r) & INTERIOR
    for part in (par, ch):
        if part in pix:
            sel = zone & alpha[part]
            pix[part][sel] = FILL[sel]

# steps 2/3: joint disks. top = child (plain fill to r - RIM, no line); under = parent (full disk + fresh rim)
for name, (p, r, ax, par, ch) in J.items():
    ring = disk(p, r) & ~disk(p, r - RIM)
    under_add = disk(p, r) & half(p, ax, +1)  # the half disk that lies on the child's side
    top_add = disk(p, r - RIM) & half(p, ax, -1)  # the half disk that lies on the parent's side
    if par in pix and not name.startswith('shoulder'):
        fill = np.where(ring[..., None], NAVY, FILL)
        sel = under_add & ~alpha[par]
        pix[par][sel] = fill[sel]
        alpha[par] |= sel
    if ch in pix:
        sel = top_add & ~alpha[ch]
        pix[ch][sel] = FILL[sel]
        alpha[ch] |= sel

for nm, pts in (('upper_arm_near', ARM_LINE), ('upper_arm_far', [(2 * AXIS - x, y) for x, y in ARM_LINE])):
    ln = line_mask(pts, RIM)[..., None]
    pix[nm] = pix[nm] * (1 - ln) + NAVY * ln
    alpha[nm] |= ln[..., 0] > 0.35
cl = chest_line_clip[..., None]
pix['chest'] = pix['chest'] * (1 - cl) + NAVY * cl
alpha['chest'] |= chest_extra

# ---- extra hand shapes from the Codex hand sheet ---------------------------------------------------
SHEET = Image.open(os.path.join(HERE, 'hands-source.png')).convert('RGB')
SA = np.array(SHEET).astype(np.int32)
SF = ~((SA[..., 0] > 190) & (SA[..., 2] > 190) & (SA[..., 1] < 110))


def sheet_hands():
    cols = SF.sum(axis=0) > 0
    groups, s = [], None
    for x, c in enumerate(cols):
        if c and s is None:
            s = x
        if not c and s is not None:
            groups.append([s, x - 1])
            s = None
    if s is not None:
        groups.append([s, len(cols) - 1])
    merged = []
    for g in groups:
        if merged and g[0] - merged[-1][1] < 40:
            merged[-1][1] = g[1]
        else:
            merged.append(g)
    return [g for g in merged if g[1] - g[0] > 60]


def despill(rgba):
    a = rgba.astype(np.float32)
    m = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    soft = np.clip(1 - (m - 60) / 80.0, 0, 1)
    a[..., 3] = np.where(a[..., 3] > 0, a[..., 3] * soft, 0)
    return a


def hand_variant(group, flip):
    x0, x1 = group
    sub = SF[:, x0:x1 + 1]
    ys = np.where(sub.any(axis=1))[0]
    y0, y1 = ys[0], ys[-1]
    rgb = SA[y0:y1 + 1, x0:x1 + 1]
    f = SF[y0:y1 + 1, x0:x1 + 1]
    rgba = np.dstack([rgb, f * 255])
    rgba = despill(rgba)
    # stub width: mean width of the first rows below the top edge
    widths = [f[y].sum() for y in range(8, 28)]
    stub_w = float(np.mean(widths))
    xs = np.where(f[8:28].any(axis=0))[0]
    stub_cx = (xs[0] + xs[-1]) / 2.0
    im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    scale = 43.0 / stub_w
    im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    px, py = stub_cx * scale, 21.0  # wrist centre: r below the top edge of the stub
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        px = im.width - px
    return im, (px, py)


# ---- write parts ------------------------------------------------------------------------------------
parts_img, parts_origin = {}, {}


def save_part(name, rgba_arr):
    a = rgba_arr
    ys, xs = np.where(a[..., 3] > 0)
    x0, x1, y0, y1 = max(xs.min() - 2, 0), min(xs.max() + 3, a.shape[1]), max(ys.min() - 2, 0), min(ys.max() + 3, a.shape[0])
    im = Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8), 'RGBA')
    im.save(os.path.join(HERE, name + '.png'))
    parts_origin[name] = (int(x0), int(y0))
    parts_img[name] = im


for k in pix:
    a = np.dstack([pix[k][..., :3], alpha[k] * 255.0])
    save_part(k, a)

groups = sheet_hands()
assert len(groups) == 4, groups
variants = {}
for side in ('near', 'far'):
    for g, shape in zip(groups[1:], ('grip', 'point', 'notebook')):
        im, piv = hand_variant(g, flip=(side == 'far'))
        name = f'hand_{side}_{shape}'
        im.save(os.path.join(HERE, name + '.png'))
        variants[name] = (piv, f'hand_{side}_open')

# ---- rig.json ---------------------------------------------------------------------------------------
Z = {'pelvis': 10, 'thigh': 14, 'shin': 16, 'foot': 18, 'chest': 20, 'neck': 22, 'head': 24,
     'upper_arm': 30, 'forearm': 32, 'hand': 34}
RANGE = {'waist': [-20, 20], 'neck': [-25, 25], 'head': [-30, 30], 'shoulder': [-30, 100],
         'elbow': [0, 120], 'wrist': [-45, 45], 'hip': [-10, 45], 'knee': [0, 60], 'ankle': [-25, 25]}


def zof(n):
    for k in Z:
        if n.startswith(k):
            return Z[k]
    raise KeyError(n)


rig = {
    'character': 'ai', 'view': 'front',
    'units': 'pixels of the reference image (1 px = 1 px of the generated neutral drawing); angles in degrees, positive = clockwise on screen (y down)',
    'reference': 'reference.png',
    'reference_crop': [270, 0, 745, 1536],
    'canvas': [W, H],
    'near_far': 'near = the limb on the screen-left, far = the limb on the screen-right',
    'parts': {},
}
pivot_of = {'pelvis': None}
for name, (p, r, ax, par, ch) in J.items():
    pivot_of[ch] = (p, par, name)

for name in OWN:
    ox, oy = parts_origin[name]
    if name == 'pelvis':
        p = (AXIS, 760)
        rig['parts'][name] = {'file': name + '.png', 'pivot': [p[0] - ox, p[1] - oy], 'parent': None,
                              'offset': list(p), 'rotation': 0, 'z': zof(name)}
        continue
    p, par, jn = pivot_of[name]
    pox, poy = parts_origin[par]
    rig['parts'][name] = {'file': name + '.png', 'pivot': [p[0] - ox, p[1] - oy], 'parent': par,
                          'offset': [p[0] - pox, p[1] - poy], 'rotation': 0, 'z': zof(name),
                          'joint': jn.rsplit('_', 1)[0], 'range': RANGE[jn.rsplit('_', 1)[0]]}
for name, (piv, base) in variants.items():
    b = rig['parts'][base]
    rig['parts'][name] = {'file': name + '.png', 'pivot': [round(piv[0], 1), round(piv[1], 1)], 'parent': b['parent'],
                          'offset': b['offset'], 'rotation': 0, 'z': b['z'], 'hidden': True, 'variant_of': base}
rig['bend_tests'] = [
    {'part': 'forearm_near', 'sign': 1, 'max': 120},
    {'part': 'forearm_far', 'sign': -1, 'max': 120},
    {'part': 'upper_arm_near', 'sign': 1, 'max': 90},
    {'part': 'upper_arm_far', 'sign': -1, 'max': 90},
    {'part': 'thigh_near', 'sign': 1, 'max': 45},
    {'part': 'thigh_far', 'sign': -1, 'max': 45},
    {'part': 'shin_near', 'sign': 1, 'max': 60},
    {'part': 'shin_far', 'sign': -1, 'max': 60},
]
rig['bend_angles'] = [0, 30, 60, 120]
rig['bend_cell'] = 260
with open(os.path.join(HERE, 'rig.json'), 'w', encoding='utf-8') as fh:
    json.dump(rig, fh, indent=1)
print('parts:', len(rig['parts']))
