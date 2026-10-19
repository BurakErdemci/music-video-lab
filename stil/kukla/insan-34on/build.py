"""Cut the human 3/4-front cut-out puppet from reference.png (+ extra hand shapes from hands-source.png).

usage (repo root):  python stil/kukla/insan-34on/build.py
Method: see stil/kukla/README.md ("How the joints are made"); same recipe as ai-on/build.py.
near = screen-left limb (closer to the viewer), far = screen-right limb. Needs Pillow + numpy.
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
NAVY = np.array([26, 45, 74])
CREAM = np.array([252, 243, 213])
RIM = 3
AXIS = 800
rng = np.random.RandomState(11)
YY, XX = np.mgrid[0:H, 0:W]


def poly_mask(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    return np.array(im) > 0


def rank(mask, k, kind):
    f = ImageFilter.MinFilter if kind == 'min' else ImageFilter.MaxFilter
    return np.array(Image.fromarray((mask * 255).astype(np.uint8)).filter(f(2 * k + 1))) > 0


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


def speckle(shape):
    out = np.tile(NAVY, shape + (1,)).astype(np.float32)
    dots = rng.rand(*shape) < 0.0025
    mix = rng.uniform(0.25, 0.55, shape)[..., None]
    return np.where(dots[..., None], out * (1 - mix) + np.array([150, 130, 90]) * mix, out)


FILL = speckle((H, W))


def half(pivot, axis, side):
    ax = np.array(axis, float)
    ax /= np.linalg.norm(ax)
    t = (XX - pivot[0]) * ax[0] + (YY - pivot[1]) * ax[1]
    return (t * side) >= 0


def disk(pivot, r):
    return (XX - pivot[0]) ** 2 + (YY - pivot[1]) ** 2 <= r * r


def mirror_x(pts):
    return [(2 * AXIS - x, y) for x, y in pts]


# ---- sticky notes: yellow components; the body underneath is rebuilt as plain fill + rim ----------------
YEL = (A[..., 0] > 190) & (A[..., 1] > 150) & (A[..., 2] < 150) & (A[..., 0] - A[..., 2] > 80) & FIG


def components(mask):
    lab = np.zeros(mask.shape, np.int32)
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        while stack:
            y, x = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
    return lab, n


lab, n_lab = components(rank(YEL, 1, 'max'))
sizes = [(int((lab == i).sum()), i) for i in range(1, n_lab + 1)]
notes = [i for s, i in sorted(sizes, reverse=True) if s > 300]
assert len(notes) == 7, sizes
notes.sort(key=lambda i: (np.nonzero(lab == i)[0].min(), np.nonzero(lab == i)[1].min()))  # reading order
NOTE_MASK = {f'note_{k + 1:02d}': lab == i for k, i in enumerate(notes)}
ALL_NOTES = np.zeros((H, W), bool)
for m in NOTE_MASK.values():
    ALL_NOTES |= m

# clean body image C: notes removed, silhouette bridged with a closing, rim redrawn on the bridged edge
BODY_FIG = FIG & ~ALL_NOTES
CLOSED = rank(rank(BODY_FIG, 22, 'max'), 22, 'min')
under = rank(ALL_NOTES, 3, 'max')
S = (CLOSED | BODY_FIG) & (under | BODY_FIG)
S_edge = S & ~rank(S, RIM, 'min')
C = A.astype(np.float32).copy()
CFIG = FIG.copy()
fillzone = under & S
C[fillzone] = FILL[fillzone]
rimzone = fillzone & S_edge & ~BODY_FIG
C[rimzone] = CREAM
CFIG |= fillzone
# note pixels outside the closed silhouette stay transparent in the body layers
CFIG &= ~(ALL_NOTES & ~S)
INTERIOR = rank(CFIG, RIM + 3, 'min')

# ---- joints -------------------------------------------------------------------------------------------
J = {
    'waist': ((AXIS, 457), 74, (0, -1), 'pelvis', 'chest'),
    'neck': ((791, 205), 25, (0, -1), 'chest', 'neck'),
    'head': ((792, 174), 25, (0, -1), 'neck', 'head'),
    'shoulder_near': ((708, 243), 19, (-20, 197), 'chest', 'upper_arm_near'),
    'elbow_near': ((688, 440), 16, (1, 72), 'upper_arm_near', 'forearm_near'),
    'wrist_near': ((688, 503), 16, (0, 1), 'forearm_near', 'hand_near_open'),
    'shoulder_far': ((876, 262), 17, (10, 178), 'chest', 'upper_arm_far'),
    'elbow_far': ((886, 440), 16, (17, 72), 'upper_arm_far', 'forearm_far'),
    'wrist_far': ((902, 510), 16, (17, 72), 'forearm_far', 'hand_far_open'),
    'hip_near': ((761.5, 575), 35.5, (0, 1), 'pelvis', 'thigh_near'),
    'knee_near': ((740, 695), 26, (0, 1), 'thigh_near', 'shin_near'),
    'ankle_near': ((724, 885), 19, (0, 1), 'shin_near', 'foot_near'),
    'hip_far': ((839.5, 575), 33, (0, 1), 'pelvis', 'thigh_far'),
    'knee_far': ((836, 695), 26, (0, 1), 'thigh_far', 'shin_far'),
    'ankle_far': ((837, 862), 19, (0, 1), 'shin_far', 'foot_far'),
}


def fit_joint(name):
    """Pivot to the limb centreline, r = half the outer-to-outer width, measured perpendicular to the limb."""
    p, r, ax, par, ch = J[name]
    n = math.hypot(*ax)
    perp = (-ax[1] / n, ax[0] / n)

    def inside(t):
        x, y = int(round(p[0] + perp[0] * t)), int(round(p[1] + perp[1] * t))
        return 0 <= x < W and 0 <= y < H and CFIG[y, x]

    assert inside(0), name
    lo = hi = 0
    while inside(lo - 1):
        lo -= 1
    while inside(hi + 1):
        hi += 1
    mid = (lo + hi) / 2.0
    J[name] = ((p[0] + perp[0] * mid, p[1] + perp[1] * mid), (hi - lo + 1) / 2.0, ax, par, ch)


for _n in ('waist', 'elbow_near', 'elbow_far', 'wrist_near', 'wrist_far', 'knee_near', 'knee_far',
           'ankle_near', 'ankle_far', 'head'):
    fit_joint(_n)

# ---- ownership partition ----------------------------------------------------------------------------
BL = [(712, 222), (727, 248), (737, 275), (742, 305), (740, 330), (727, 345), (722, 380), (717, 440),
      (714, 500), (713, 580)]
BR = [(852, 215), (860, 250), (862, 330), (862, 430), (868, 445), (879, 480), (881, 560), (881, 600)]
LA = poly_mask([(600, 215)] + BL[:1] + BL[1:] + [(600, 580)])
RA = poly_mask(BR + [(1000, 600), (1000, 215)])

OWN = {}


def arm_masks(side, region):
    sh, el, wr = (J[k + '_' + side][0] for k in ('shoulder', 'elbow', 'wrist'))
    sa, ea, wa = (J[k + '_' + side][2] for k in ('shoulder', 'elbow', 'wrist'))
    up = CFIG & region & half(sh, sa, +1) & half(el, ea, -1)
    fore = CFIG & region & half(el, ea, +1) & half(wr, wa, -1)
    hand = CFIG & region & half(wr, wa, +1)
    return up, fore, hand


OWN['upper_arm_near'], OWN['forearm_near'], OWN['hand_near_open'] = arm_masks('near', LA)
OWN['upper_arm_far'], OWN['forearm_far'], OWN['hand_far_open'] = arm_masks('far', RA)
taken = np.zeros((H, W), bool)
for k in list(OWN):
    taken |= OWN[k]


def leg(side, x_ok):
    hip, knee, ankle = J['hip_' + side][0], J['knee_' + side][0], J['ankle_' + side][0]
    base = CFIG & ~taken & x_ok & (YY >= hip[1])
    OWN['thigh_' + side] = base & (YY < knee[1])
    OWN['shin_' + side] = base & (YY >= knee[1]) & (YY < ankle[1])
    OWN['foot_' + side] = base & (YY >= ankle[1])


leg('near', XX < AXIS)
leg('far', XX >= AXIS)
for k in ('thigh', 'shin', 'foot'):
    taken |= OWN[k + '_near'] | OWN[k + '_far']
rest = CFIG & ~taken
HAIR_POLY = [(740, 20), (910, 20), (910, 140), (868, 150), (862, 118), (850, 92), (826, 80), (805, 78),
             (792, 100), (793, 135), (782, 152), (740, 152)]
HAIR_ZONE = poly_mask(HAIR_POLY)
head_all = rest & (YY < J['head'][0][1])
OWN['hair'] = head_all & HAIR_ZONE
OWN['head'] = head_all & ~HAIR_ZONE
OWN['neck'] = rest & (YY >= J['head'][0][1]) & (YY < J['neck'][0][1])
OWN['chest'] = rest & (YY >= J['neck'][0][1]) & (YY < J['waist'][0][1])
OWN['pelvis'] = rest & (YY >= J['waist'][0][1])

pix = {k: np.where(m[..., None], C, 0).astype(np.float32) for k, m in OWN.items()}
alpha = {k: m.copy() for k, m in OWN.items()}

# the head is complete under the hair: a skull fill with a cream rim along its upper arc
SKULL = ((XX - 815) / 56.0) ** 2 + ((YY - 100) / 56.0) ** 2 <= 1
SKULL &= CFIG
skull_edge = SKULL & ~rank(SKULL, RIM, 'min') & (YY < 105)
new = SKULL & ~alpha['head']
pix['head'][new] = FILL[new]
pix['head'][new & skull_edge] = CREAM
alpha['head'] |= new

# the chest is a complete torso under the arms: plain fill and its own contour
C_NEAR = [(686, 250), (698, 268), (716, 292), (731, 315), (738, 332)]
C_FAR = [(879, 262), (878, 300), (873, 340), (868, 390), (866, 432)]
chest_extra = np.zeros((H, W), bool)
chest_line = np.zeros((H, W), np.float32)
area_n = poly_mask(C_NEAR + BL[4:0:-1])
area_f = poly_mask(BR[1:5] + C_FAR[::-1])
chest_extra |= (area_n | area_f) & CFIG & ~OWN['chest'] & (LA | RA)
chest_line = np.maximum(line_mask(C_NEAR, RIM), line_mask(C_FAR, RIM))
chest_line_clip = chest_line * rank(chest_extra | OWN['chest'], 3, 'max')
pix['chest'][chest_extra] = FILL[chest_extra]
alpha['chest'] |= chest_extra

# step 4: inner detail lines within 1.3 r of a pivot become plain fill (outline pixels are left alone)
for name, (p, r, ax, par, ch) in J.items():
    if name in ('waist', 'neck', 'head'):  # hem, collar and throat lines sit on these joints; they stay where they are
        continue
    zone = disk(p, 1.3 * r) & INTERIOR
    for part in (par, ch):
        if part in pix:
            sel = zone & alpha[part]
            pix[part][sel] = FILL[sel]

# steps 2/3: joint disks. top = child (plain fill to r - RIM, no line); under = parent (full disk + fresh rim)
for name, (p, r, ax, par, ch) in J.items():
    ring = disk(p, r) & ~disk(p, r - RIM)
    if name == 'waist':  # shirt over trousers: no ring, and the chest does not paint a disk over the trousers
        ring = ring & False
    under_add = disk(p, r) & half(p, ax, +1)
    top_add = disk(p, r - RIM) & half(p, ax, -1)
    if par in pix and not name.startswith('shoulder'):
        fill = np.where(ring[..., None], CREAM, FILL)
        sel = under_add & ~alpha[par]
        pix[par][sel] = fill[sel]
        alpha[par] |= sel
    if ch in pix and name != 'waist':
        sel = top_add & ~alpha[ch]
        pix[ch][sel] = FILL[sel]
        alpha[ch] |= sel

cl = chest_line_clip[..., None]
pix['chest'] = pix['chest'] * (1 - cl) + CREAM * cl
alpha['chest'] |= chest_extra | (chest_line_clip > 0.3)

# ---- extra hand shapes from the Codex hand sheet ------------------------------------------------------
SHEET = Image.open(os.path.join(HERE, 'hands-source.png')).convert('RGB')
SA = np.array(SHEET).astype(np.int32)
SF = ~((SA[..., 0] > 190) & (SA[..., 2] > 190) & (SA[..., 1] < 110))
HAND_SCALE = 0.27  # the sheet hands are drawn larger than the reference hands; scaled to a similar palm width


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


def hand_variant(group, flip, r_wrist):
    x0, x1 = group
    ys = np.where(SF[:, x0:x1 + 1].any(axis=1))[0]
    y0, y1 = ys[0], ys[-1]
    f = SF[y0:y1 + 1, x0:x1 + 1]
    rgba = despill(np.dstack([SA[y0:y1 + 1, x0:x1 + 1], f * 255]))
    xs = np.where(f[8:28].any(axis=0))[0]
    stub_cx = (xs[0] + xs[-1]) / 2.0
    im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    im = im.resize((max(1, int(im.width * HAND_SCALE)), max(1, int(im.height * HAND_SCALE))), Image.LANCZOS)
    px, py = stub_cx * HAND_SCALE, r_wrist
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        px = im.width - px
    return im, (px, py)


# ---- write parts --------------------------------------------------------------------------------------
parts_origin = {}


def save_part(name, a):
    ys, xs = np.where(a[..., 3] > 0)
    x0, x1 = max(xs.min() - 2, 0), min(xs.max() + 3, a.shape[1])
    y0, y1 = max(ys.min() - 2, 0), min(ys.max() + 3, a.shape[0])
    Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(HERE, name + '.png'))
    parts_origin[name] = (int(x0), int(y0))


for k in pix:
    save_part(k, np.dstack([pix[k][..., :3], alpha[k] * 255.0]))
for k, m in NOTE_MASK.items():
    save_part(k, np.dstack([A.astype(np.float32), m * 255.0]))

groups = sheet_hands()
assert len(groups) == 4, groups
variants = {}
for side in ('near', 'far'):
    for g, shape in zip(groups[1:], ('grip', 'point', 'notebook')):
        im, piv = hand_variant(g, flip=(side == 'far'), r_wrist=J['wrist_' + side][1])
        name = f'hand_{side}_{shape}'
        im.save(os.path.join(HERE, name + '.png'))
        variants[name] = (piv, f'hand_{side}_open')

# ---- rig.json -----------------------------------------------------------------------------------------
Z = {'pelvis': 10, 'thigh': 14, 'shin': 16, 'foot': 18, 'chest': 20, 'neck': 22, 'head': 24, 'hair': 26,
     'upper_arm': 30, 'forearm': 32, 'hand': 34, 'note': 40}
RANGE = {'waist': [-20, 20], 'neck': [-25, 25], 'head': [-30, 30], 'shoulder': [-30, 100],
         'elbow': [0, 120], 'wrist': [-45, 45], 'hip': [-10, 45], 'knee': [0, 60], 'ankle': [-25, 25]}


def zof(n):
    for k in Z:
        if n.startswith(k):
            return Z[k]
    raise KeyError(n)


rig = {
    'character': 'insan', 'view': '3/4-front-right',
    'units': 'pixels of the reference image (1 px = 1 px of the generated neutral drawing); angles in degrees, positive = clockwise on screen (y down)',
    'reference': 'reference.png',
    'reference_crop': [640, 20, 940, 960],
    'canvas': [W, H],
    'near_far': 'near = the limb on the screen-left (closer to the viewer), far = the limb on the screen-right',
    'parts': {},
}
pivot_of = {ch: (p, par, name) for name, (p, r, ax, par, ch) in J.items()}
HEAD_JOINTS = {'hair': ((808, 110), 'head', 'hair')}
for name in OWN:
    ox, oy = parts_origin[name]
    if name == 'pelvis':
        p = (AXIS, 575)
        rig['parts'][name] = {'file': name + '.png', 'pivot': [p[0] - ox, p[1] - oy], 'parent': None,
                              'offset': list(p), 'rotation': 0, 'z': zof(name)}
        continue
    p, par, jn = pivot_of.get(name) or HEAD_JOINTS[name]
    pox, poy = parts_origin[par]
    jt = jn.rsplit('_', 1)[0] if jn != 'hair' else 'hair'
    rig['parts'][name] = {'file': name + '.png', 'pivot': [round(p[0] - ox, 1), round(p[1] - oy, 1)], 'parent': par,
                          'offset': [round(p[0] - pox, 1), round(p[1] - poy, 1)], 'rotation': 0, 'z': zof(name),
                          'joint': jt, 'range': RANGE.get(jt, [-15, 15])}
for name in NOTE_MASK:
    ys, xs = np.nonzero(NOTE_MASK[name])
    p = (float(xs.mean()), float(ys.min()) + 6)  # the tab at the top edge: flutter pivot
    ox, oy = parts_origin[name]
    cx, cy = float(xs.mean()), float(ys.mean())
    par = 'upper_arm_near' if cx < 725 and cy > 235 else 'upper_arm_far' if cx > 862 and cy > 235 else 'chest'
    pox, poy = parts_origin[par]
    rig['parts'][name] = {'file': name + '.png', 'pivot': [round(p[0] - ox, 1), round(p[1] - oy, 1)], 'parent': par,
                          'offset': [round(p[0] - pox, 1), round(p[1] - poy, 1)], 'rotation': 0, 'z': Z['note'],
                          'joint': 'note', 'range': [-25, 25]}
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
rig['bend_cell'] = 200
with open(os.path.join(HERE, 'rig.json'), 'w', encoding='utf-8') as fh:
    json.dump(rig, fh, indent=1)
print('parts:', len(rig['parts']))
for k, v in J.items():
    print(k, tuple(round(c, 1) for c in v[0]), round(v[1], 1))
