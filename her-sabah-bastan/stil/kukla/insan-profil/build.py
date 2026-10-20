"""Cut the human side-profile cut-out puppet (stil/kukla/insan-profil) from the canonical drawing.

usage (repo root):  python stil/kukla/insan-profil/build.py
Writes one PNG per part and rig.json next to this file; then run
  python stil/kukla/assemble.py stil/kukla/insan-profil
to get assembled.png and bend-test.png.

Needs numpy: the system Python has Pillow only, so Blender's bundled site-packages (same 3.13 ABI)
is appended to sys.path. All coordinates are reference-image pixels, pixel centres at integers.

Method (see ../README.md): every part is a polygon mask on the reference; at each joint (p, r) both
neighbours get the disk (p, r); the distal part (drawn on top) fills the disk with plain fill out to
r - RIM and has no inner lines inside it, the proximal part gets a plain-fill disk with a fresh cream
rim on its cap arc only; inner detail near the pivot is painted over; areas hidden in the reference
(torso under the arm, body under sticky notes, belly behind the hand) are plain fill plus the
reference speckle with redrawn smooth contours.
"""
import json
import math
import os
import sys

sys.path.append(r'C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\lib\site-packages')
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REF_REL = '../../hareket/ref-insan-kanonik.png'
REF_PATH = os.path.normpath(os.path.join(HERE, REF_REL))
HANDS_PATH = os.path.normpath(os.path.join(HERE, '..', 'kaynak', 'hands-insan-profil.png'))

CREAM = np.array([243, 239, 228], np.float32)
RIM = 3.0          # width of the cream outline
M = 1.0            # overlap (px) of neighbouring parts across a joint cut
FAR_DARK = 0.75

ref = np.asarray(Image.open(REF_PATH).convert('RGB'), np.float32)
H, W = ref.shape[:2]
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
keyed = (ref[..., 0] > 190) & (ref[..., 2] > 190) & (ref[..., 1] < 110)
S0 = ~keyed


# ----------------------------------------------------------------------------- helpers
class Lay:
    """Straight-alpha float layer on the full canvas."""

    def __init__(self, rgb=None, a=None):
        self.rgb = np.zeros((H, W, 3), np.float32) if rgb is None else rgb
        self.a = np.zeros((H, W), np.float32) if a is None else a

    def copy(self):
        return Lay(self.rgb.copy(), self.a.copy())


def paint(L, color, a):
    a = np.clip(a, 0, 1).astype(np.float32)
    keep = L.a * (1 - a)
    na = a + keep
    c = np.asarray(color, np.float32)
    if c.ndim == 1:
        c = np.broadcast_to(c, (H, W, 3))
    num = c * a[..., None] + L.rgb * keep[..., None]
    L.rgb = num / np.maximum(na, 1e-6)[..., None]
    L.a = na


def poly_mask(pts, ss=4):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = int(max(0, math.floor(min(xs)) - 2)), int(max(0, math.floor(min(ys)) - 2))
    x1, y1 = int(min(W, math.ceil(max(xs)) + 3)), int(min(H, math.ceil(max(ys)) + 3))
    w, h = x1 - x0, y1 - y0
    im = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(im).polygon([((x - x0 + .5) * ss - .5, (y - y0 + .5) * ss - .5) for x, y in pts], fill=255)
    out = np.zeros((H, W), np.float32)
    out[y0:y1, x0:x1] = np.asarray(im.resize((w, h), Image.BOX), np.float32) / 255
    return out


def stroke(pts, width, ss=4):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    pad = width + 3
    x0, y0 = int(max(0, math.floor(min(xs) - pad))), int(max(0, math.floor(min(ys) - pad)))
    x1, y1 = int(min(W, math.ceil(max(xs) + pad))), int(min(H, math.ceil(max(ys) + pad)))
    w, h = x1 - x0, y1 - y0
    im = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(im).line([((x - x0 + .5) * ss - .5, (y - y0 + .5) * ss - .5) for x, y in pts], fill=255,
                            width=max(1, int(round(width * ss))), joint='curve')
    out = np.zeros((H, W), np.float32)
    out[y0:y1, x0:x1] = np.asarray(im.resize((w, h), Image.BOX), np.float32) / 255
    return out


def ellipse_mask(c, rx, ry):
    d = np.hypot((XX - c[0]) / rx, (YY - c[1]) / ry)
    edge = 1.0 / max(rx, ry)
    return np.clip((1 - d) / edge + .5, 0, 1).astype(np.float32)


def disk(p, r):
    return np.clip(r + .5 - np.hypot(XX - p[0], YY - p[1]), 0, 1).astype(np.float32)


def side(p, d, margin, sign):
    """Soft half-plane: 1 where sign*s <= margin, s = (x-p).d."""
    s = (XX - p[0]) * d[0] + (YY - p[1]) * d[1]
    return np.clip(.5 + margin - sign * s, 0, 1).astype(np.float32)


def erode(mask, n):
    im = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * n + 1))
    return np.asarray(im, np.float32) / 255


def catmull(pts, n=12):
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(n):
            t = k / n
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                  + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    out.append(tuple(pts[-1]))
    return out


def contour_fn(anchors):
    dense = catmull(anchors)
    ys = np.array([q[1] for q in dense])
    xs = np.array([q[0] for q in dense])
    return lambda y: np.interp(y, ys, xs)


def unit(v):
    n = math.hypot(*v)
    return (v[0] / n, v[1] / n)


class Joint:
    def __init__(self, p, r, dd, dp=None):
        # dd: axis of the distal limb, dp: axis of the proximal limb (both point away from the proximal body);
        # each piece is clipped by the line through the pivot perpendicular to ITS OWN axis
        self.p, self.r, self.dd = p, r, unit(dd)
        self.dp = unit(dp) if dp else self.dd


# ----------------------------------------------------------------------------- fill texture
TILE = ref[515:563, 748:796].copy()


def fill_tex():
    ty = (YY.astype(int) % TILE.shape[0])
    tx = (XX.astype(int) % TILE.shape[1])
    return TILE[ty, tx]


FILL = fill_tex()

# ----------------------------------------------------------------------------- sticky notes
yel = ((ref[..., 0] > 200) & (ref[..., 1] > 150) & (ref[..., 2] < 175) & (ref[..., 2] > 40)
       & (ref[..., 0] - ref[..., 2] > 70) & (YY >= 180))


def label(mask):
    lab = np.zeros(mask.shape, np.int32)
    n = 0
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        if lab[y, x]:
            continue
        n += 1
        st = [(y, x)]
        lab[y, x] = n
        while st:
            cy, cx = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        st.append((ny, nx))
    return lab, n


lab, nlab = label(yel)
sizes = np.bincount(lab.ravel(), minlength=nlab + 1)
cores = [i for i in range(1, nlab + 1) if sizes[i] >= 150]
cores.sort(key=lambda i: (np.nonzero(lab == i)[0].min()))


def comp_box(i):
    ys, xs = np.nonzero(lab == i)
    return xs.min(), ys.min(), xs.max(), ys.max()


# Components found by flood fill: collar sliver, neck-side triangle, big back note (two notes),
# upper-back note, sleeve note, middle-back (two notes), chest note, lower-back note.
comp = {}
for i in cores:
    comp[comp_box(i)[:2]] = i
by_box = sorted(((comp_box(i), i) for i in cores), key=lambda t: (t[0][1], t[0][0]))


def pick(xmin_lo, xmin_hi, ymin_lo, ymin_hi):
    for (bx, i) in by_box:
        if xmin_lo <= bx[0] <= xmin_hi and ymin_lo <= bx[1] <= ymin_hi:
            return i
    raise RuntimeError('note component not found %s' % ((xmin_lo, xmin_hi, ymin_lo, ymin_hi),))


c_collar = pick(715, 730, 178, 190)
c_neck = pick(775, 790, 186, 194)
c_back = pick(725, 732, 195, 202)
c_bigleft = pick(686, 694, 203, 212)
c_sleeve = pick(788, 794, 242, 250)
c_mid = pick(694, 700, 338, 345)
c_chest = pick(800, 806, 338, 346)
c_low = pick(714, 720, 438, 446)

note_core = {}
note_core['collar'] = (lab == c_collar) | (lab == c_neck)
note_core['back'] = lab == c_back
big = lab == c_bigleft
yy_, xx_ = YY, XX
d_a = np.hypot(xx_ - 712, yy_ - 238)
d_b = np.hypot(xx_ - 707, yy_ - 299)
note_core['shoulderblade'] = big & (d_a <= d_b)
note_core['upperback'] = big & (d_a > d_b)
note_core['sleeve'] = lab == c_sleeve
mid = lab == c_mid
d_a = np.hypot(xx_ - 746, yy_ - 366)
d_b = np.hypot(xx_ - 716, yy_ - 412)
note_core['midback'] = mid & (d_a <= d_b)
note_core['lowmid'] = mid & (d_a > d_b)
note_core['chest'] = lab == c_chest
note_core['lowback'] = lab == c_low
# note_01..note_09 in reading order; the first one is the collar pair (two pieces in one layer)
NOTE_ORDER = ['collar', 'back', 'shoulderblade', 'upperback', 'sleeve', 'midback', 'lowmid', 'chest', 'lowback']
NOTE_PARENT = {'sleeve': 'upper_arm_near'}


def dilate_mask(mask, n):
    im = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))
    return np.asarray(im) > 0


note_dil = {k: dilate_mask(v, 2) for k, v in note_core.items()}
# a note's dilation must not eat a neighbour's core
for k in note_dil:
    for k2, v2 in note_core.items():
        if k2 != k:
            note_dil[k] &= ~v2
all_notes = np.zeros((H, W), bool)
for v in note_core.values():
    all_notes |= dilate_mask(v, 2)

# ----------------------------------------------------------------------------- true body contour
BACK_ANCH = [(757, 170), (745, 178), (733, 187), (722, 196), (714, 208), (709, 222), (706, 240), (705, 262),
             (706, 285), (707, 305), (708, 326), (708, 345), (708, 370), (709, 388), (712, 405), (715, 420),
             (718, 432), (720, 441), (721, 470), (722, 490), (725, 498), (730, 506), (735, 514)]
FRONT_ANCH = [(801, 194), (804, 204), (806, 214), (807, 224), (808, 230), (811, 236), (813, 244), (815, 252),
              (816, 262), (817, 272), (818, 284), (818, 300), (818, 314), (819, 330), (820, 340), (821, 352),
              (823, 364), (825, 376), (827, 388), (829, 398), (831, 408)]
back_x = contour_fn(BACK_ANCH)
front_x = contour_fn(FRONT_ANCH)
HID_BACK = [(176, 328), (376, 502)]
HID_FRONT = [(190, 230), (244, 306), (340, 404)]
# the belly contour hidden behind the near hand
BELLY_ANCH = [(839, 478), (839.5, 494), (837, 510), (832, 528), (827, 546), (823, 562), (821, 574), (820, 586)]
belly_x = contour_fn([(x, y) for x, y in BELLY_ANCH])

orig = Lay(ref.copy(), S0.astype(np.float32))
C = orig.copy()                                   # clean base: notes removed, hidden contours redrawn
inside = (XX >= back_x(YY) - .5) & (XX <= front_x(YY) + .5)
# pixels under the notes: body fill where inside the true silhouette, transparent outside
sel = all_notes & inside
C.rgb[sel] = FILL[sel]
C.a[sel] = 1.0
C.a[all_notes & ~inside] = 0.0
# yellow-ish leftovers outside the redrawn silhouette (note edges that were not in a dilation)
left_over = yel & ~inside
C.a[left_over] = 0.0


def rim_stroke(fx, ranges, shift):
    for (y0, y1) in ranges:
        ys = np.arange(y0, y1 + 1, 1.0)
        pts = [(float(fx(y)) + shift, float(y)) for y in ys]
        m_ = stroke(pts, RIM)
        paint(C, CREAM, m_)


rim_stroke(back_x, HID_BACK, +1.5)
rim_stroke(front_x, HID_FRONT, -1.5)

# arm front line hidden under the chest note (between y 366 and 400)
paint(C, CREAM, stroke([(803.5, 364), (804.5, 372), (808, 384), (811.5, 392), (814, 398), (815.5, 402)], 3.0))

# ----------------------------------------------------------------------------- joints
J_shoulder = Joint((776.5, 254), 29.0, (0.0754, 0.997))
J_elbow = Joint((786.4, 385), 24.2, (0.338, 0.941), (0.0754, 0.997))
J_wrist = Joint((826.3, 496), 14.5, (0.342, 0.94), (0.338, 0.941))
J_waist = Joint((779.5, 482), 52.0, (0, -1))
J_neck = Joint((776.5, 183.5), 26.3, (0.361, -0.932))
J_head = Joint((789.5, 153.5), 25.7, (0.485, -0.874))
J_hip = Joint((781.5, 585), 39.0, (-0.144, 0.99), (0, 1))
J_knee = Joint((765.5, 695), 31.5, (-0.022, 1), (-0.144, 0.99))
J_ankle = Joint((761.5, 874), 27.0, (0, 1), (-0.022, 1))

# ----------------------------------------------------------------------------- arm polygons
BL = [(300, 750), (312, 750.5), (320, 754.5), (326, 755.5), (332, 756.5), (338, 757.5), (344, 758.5), (350, 759.2),
      (356, 759.8), (362, 760.5), (368, 761.2), (374, 762), (380, 763), (386, 764.6), (392, 766.6), (398, 768.6),
      (404, 770.3), (410, 772.3), (416, 774.5), (422, 777), (428, 779.6), (434, 782.2), (440, 785), (446, 788),
      (452, 791), (458, 794), (464, 797), (470, 800.4), (476, 803.8), (482, 807), (488, 810), (494, 813),
      (500, 814.8), (506, 814)]
FL = [(300, 803), (368, 803), (376, 805), (384, 808), (391, 811), (398, 814), (404, 816), (410, 817), (416, 818),
      (422, 819), (428, 820), (434, 821.5), (440, 823), (446, 824.5), (452, 825.5), (458, 827), (464, 828.5),
      (470, 830), (476, 832), (482, 833.5), (488, 836), (494, 838.5), (500, 839.8), (506, 840.5)]
LINE_HALF = 2.2


def left_outer(y0, y1):
    return [(x - LINE_HALF, y) for y, x in BL if y0 <= y <= y1]


def right_outer(y0, y1):
    return [(x + LINE_HALF, y) for y, x in FL if y0 <= y <= y1]


UA_POLY = ([(747.5, 228), (747.5, 300)] + left_outer(312, 412) + list(reversed(right_outer(300, 412)))
           + [(805.2, 228)])
FA_POLY = left_outer(366, 508) + list(reversed(right_outer(366, 508)))
HAND_OPEN_POLY = [(811.5, 488), (811.5, 500), (809.5, 510), (810, 520), (812.5, 530), (813, 545), (811, 549),
                  (805, 551), (802, 556), (803, 562), (807, 567), (813, 570.5), (822, 573), (835, 572),
                  (850, 566), (858, 545), (858, 490)]

# ----------------------------------------------------------------------------- generic part builder


def build_part(src, mask, joints, extra=None):
    """src: Lay base; mask: float polygon mask; joints: [(Joint, 'prox'|'dist')]."""
    L = Lay(src.rgb.copy(), (src.a * mask).astype(np.float32))
    solid = erode((L.a > .5).astype(np.float32), 5)
    for J, role in joints:
        d = J.dd if role == 'dist' else J.dp
        s = (XX - J.p[0]) * d[0] + (YY - J.p[1]) * d[1]
        inner = solid * disk(J.p, 1.3 * J.r)
        paint(L, FILL, inner)
        if role == 'dist':
            paint(L, FILL, disk(J.p, J.r - RIM))
        else:
            cap = np.clip(.5 + s, 0, 1)
            paint(L, FILL, cap * disk(J.p, J.r))
            ring = np.clip(disk(J.p, J.r) - disk(J.p, J.r - RIM), 0, 1)
            paint(L, CREAM, cap * ring)
    if extra is not None:
        extra(L)
    return L


def crop_png(L, name):
    ys, xs = np.nonzero(L.a > 0.004)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgb = np.clip(L.rgb[y0:y1, x0:x1] + .5, 0, 255).astype(np.uint8)
    a = np.clip(L.a[y0:y1, x0:x1] * 255 + .5, 0, 255).astype(np.uint8)
    rgb = np.where(a[..., None] > 0, rgb, 0).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, a]), 'RGBA').save(os.path.join(HERE, name + '.png'))
    return (int(x0), int(y0))


def darken(L):
    return Lay((L.rgb * FAR_DARK).astype(np.float32), L.a.copy())


# ----------------------------------------------------------------------------- torso base (arm erased)
arm_mask = np.maximum.reduce([
    poly_mask(UA_POLY),
    poly_mask(FA_POLY),
    poly_mask(HAND_OPEN_POLY),
    disk(J_shoulder.p, J_shoulder.r),
    disk(J_elbow.p, J_elbow.r),
    disk(J_wrist.p, J_wrist.r),
])
C2 = C.copy()
under = (arm_mask > .35) & (C.a > .5)
C2.rgb[under] = FILL[under]
# belly contour behind the hand: cut everything right of it, redraw the rim
gone = (YY >= 478) & (YY <= 590) & (XX > belly_x(YY) + .5)
C2.a[gone] = 0.0
paint(C2, CREAM, stroke([(float(belly_x(y)) - 1.5, float(y)) for y in np.arange(486, 582, 1.0)], RIM))
C2.a[(YY >= 486) & (YY <= 582) & (XX > belly_x(YY) + .5)] = 0.0

parts = {}      # name -> dict(layer, pivot_ref, parent, z, joint, range, hidden, variant_of)


def add(name, L, pivot, parent, z, joint=None, rng=None, hidden=False, variant_of=None):
    parts[name] = dict(L=L, pivot=pivot, parent=parent, z=z, joint=joint, range=rng, hidden=hidden,
                       variant_of=variant_of)


# ----------------------------------------------------------------------------- pelvis / chest / neck / head / hair
sw = lambda J: side(J.p, J.dp, M, +1)    # keep the proximal side of a joint (s <= M)
sd = lambda J: side(J.p, J.dd, M, -1)    # keep the distal side (s >= -M)

pelvis = build_part(C2, sw(J_waist) * sw(J_hip), [(J_waist, 'prox'), (J_hip, 'prox')])
chest = build_part(C2, sd(J_waist) * sw(J_neck), [(J_waist, 'dist'), (J_neck, 'prox')])
neck = build_part(C, sd(J_neck) * sw(J_head), [(J_neck, 'dist'), (J_head, 'prox')])

# hair / head split
HAIR_POLY = [(740, 36), (905, 36), (905, 127), (862, 130), (850, 130), (745, 141)]
hair_area = poly_mask(HAIR_POLY)
K_in = ellipse_mask((811, 112), 41, 52)
hair_mask = ((hair_area > .5) & (K_in < .5) & (C.a > .5)).astype(np.float32)
hair_mask = np.maximum(hair_mask, 0)
hair = Lay(C.rgb.copy(), C.a * hair_mask)
head_mask = sd(J_head) * (1 - hair_mask)
head = build_part(C, head_mask, [(J_head, 'dist')])
skull = ellipse_mask((811, 112), 49, 60)
paint(head, FILL, skull * hair_area * (hair_mask > .5))
ring = np.clip(skull - ellipse_mask((811, 112), 49 - RIM, 60 - RIM), 0, 1)
paint(head, CREAM, ring * hair_area)
add('hair', hair, (806, 100), 'head', 15)

# ----------------------------------------------------------------------------- arms
ua_mask = poly_mask(UA_POLY) * sd(J_shoulder) * sw(J_elbow)
fa_mask = poly_mask(FA_POLY) * sd(J_elbow) * sw(J_wrist)
hand_open_mask = poly_mask(HAND_OPEN_POLY) * sd(J_wrist)

upper_arm = build_part(C, ua_mask, [(J_shoulder, 'dist'), (J_elbow, 'prox')])
forearm = build_part(C, fa_mask, [(J_elbow, 'dist'), (J_wrist, 'prox')])
hand_open = build_part(C, hand_open_mask, [(J_wrist, 'dist')])

# ----------------------------------------------------------------------------- extra hands from the sheet
sheet = np.asarray(Image.open(HANDS_PATH).convert('RGB'), np.float32)
s_keyed = (sheet[..., 0] > 190) & (sheet[..., 2] > 190) & (sheet[..., 1] < 110)


def sheet_hand(x0, x1, y0=340, y1=580):
    """Cut one hand from the sheet, drop the wrist ellipse, scale to the canonical wrist and rotate its tube
    onto the forearm axis; returns a canvas layer whose wrist centre sits on J_wrist.p."""
    sub = ~s_keyed[y0:y1, x0:x1]
    xs = np.nonzero(sub.any(axis=0))[0]
    left = xs.min() + x0
    cut = left + 34
    col = np.nonzero(~s_keyed[y0:y1, cut])[0] + y0
    yc, D = (col.min() + col.max()) / 2.0, float(col.max() - col.min() + 1)
    sc = 2 * J_wrist.r / D
    rgb = sheet.copy()
    rgb[s_keyed] = CREAM
    al = (~s_keyed).astype(np.float32) * 255
    al[:, :cut] = 0
    im = Image.fromarray(np.dstack([rgb.astype(np.uint8), al.astype(np.uint8)]), 'RGBA')
    th = math.atan2(J_wrist.dd[1], J_wrist.dd[0])
    c, s_ = math.cos(th), math.sin(th)
    px, py = J_wrist.p[0] + .5, J_wrist.p[1] + .5
    qx, qy = cut + .5, yc + .5
    # input = q0 + (1/sc) * Rot(-th) * (out - P)
    a_, b_, d_, e_ = c / sc, s_ / sc, -s_ / sc, c / sc
    cc = qx - (a_ * px + b_ * py)
    ff = qy - (d_ * px + e_ * py)
    out = im.transform((W, H), Image.AFFINE, (a_, b_, cc, d_, e_, ff), resample=Image.BICUBIC)
    arr = np.asarray(out, np.float32)
    return Lay(arr[..., :3].copy(), arr[..., 3] / 255.0)


hand_sheet = {'grip': sheet_hand(436, 725), 'point': sheet_hand(812, 1165), 'notebook': sheet_hand(1226, 1612)}
hand_layers = {'open': hand_open}
for k, Lh in hand_sheet.items():
    m_ = Lh.a * sd(J_wrist)
    Lh2 = Lay(Lh.rgb, m_.astype(np.float32))
    paint(Lh2, FILL, disk(J_wrist.p, J_wrist.r - RIM))
    hand_layers[k] = Lh2

# ----------------------------------------------------------------------------- legs
thigh = build_part(C2, sd(J_hip) * sw(J_knee), [(J_hip, 'dist'), (J_knee, 'prox')])
shin = build_part(C2, sd(J_knee) * sw(J_ankle), [(J_knee, 'dist'), (J_ankle, 'prox')])
foot = build_part(C2, sd(J_ankle), [(J_ankle, 'dist')])

# ----------------------------------------------------------------------------- register parts (z: far behind, torso, near on top)
add('pelvis', pelvis, (781, 520), None, 10)
add('chest', chest, J_waist.p, 'pelvis', 12, joint='waist', rng=[-25, 35])
add('neck', neck, J_neck.p, 'chest', 13, joint='neck', rng=[-25, 35])
add('head', head, J_head.p, 'neck', 14, joint='head', rng=[-30, 35])
parts['hair']['parent'] = 'head'

add('upper_arm_near', upper_arm, J_shoulder.p, 'chest', 20, joint='shoulder', rng=[-100, 60])
add('forearm_near', forearm, J_elbow.p, 'upper_arm_near', 21, joint='elbow', rng=[-135, 5])
for k in ('open', 'grip', 'point', 'notebook'):
    add('hand_near_' + k, hand_layers[k], J_wrist.p, 'forearm_near', 22, joint='wrist', rng=[-60, 60],
        hidden=(k != 'open'), variant_of=None if k == 'open' else 'hand_near_open')
add('upper_arm_far', darken(upper_arm), J_shoulder.p, 'chest', 4, joint='shoulder', rng=[-100, 60])
add('forearm_far', darken(forearm), J_elbow.p, 'upper_arm_far', 5, joint='elbow', rng=[-135, 5])
for k in ('open', 'grip', 'point', 'notebook'):
    add('hand_far_' + k, darken(hand_layers[k]), J_wrist.p, 'forearm_far', 6, joint='wrist', rng=[-60, 60],
        hidden=(k != 'open'), variant_of=None if k == 'open' else 'hand_far_open')

add('thigh_near', thigh, J_hip.p, 'pelvis', 16, joint='hip', rng=[-100, 30])
add('shin_near', shin, J_knee.p, 'thigh_near', 17, joint='knee', rng=[-5, 130])
add('foot_near', foot, J_ankle.p, 'shin_near', 18, joint='ankle', rng=[-30, 40])
add('thigh_far', darken(thigh), J_hip.p, 'pelvis', 3, joint='hip', rng=[-100, 30])
add('shin_far', darken(shin), J_knee.p, 'thigh_far', 2, joint='knee', rng=[-5, 130])
add('foot_far', darken(foot), J_ankle.p, 'shin_far', 1, joint='ankle', rng=[-30, 40])

# sticky notes: own layers, hinged at the top edge
for i, k in enumerate(NOTE_ORDER, 1):
    nd = note_dil[k] & S0
    Ln = Lay(ref.copy(), nd.astype(np.float32))
    ys, xs = np.nonzero(nd)
    piv = ((xs.min() + xs.max()) / 2.0, float(ys.min()) + 3)
    add('note_%02d' % i, Ln, piv, NOTE_PARENT.get(k, 'chest'), 40 + i, joint='note')

# ----------------------------------------------------------------------------- crop and write
origin = {}
for name, p in parts.items():
    origin[name] = crop_png(p['L'], name)

rig_parts = {}
for name, p in parts.items():
    ox, oy = origin[name]
    pv = (round(p['pivot'][0] - ox, 2), round(p['pivot'][1] - oy, 2))
    if p['parent'] is None:
        off = [round(p['pivot'][0], 2), round(p['pivot'][1], 2)]
    else:
        px_, py_ = origin[p['parent']]
        off = [round(p['pivot'][0] - px_, 2), round(p['pivot'][1] - py_, 2)]
    e = {'file': name + '.png', 'pivot': [pv[0], pv[1]], 'parent': p['parent'], 'offset': off, 'rotation': 0,
         'z': p['z']}
    if p['joint']:
        e['joint'] = p['joint']
    if p['range']:
        e['range'] = p['range']
    if p['hidden']:
        e['hidden'] = True
        e['variant_of'] = p['variant_of']
    rig_parts[name] = e

rig = {
    'character': 'insan', 'view': 'profile-right',
    'units': 'pixels of the reference image (1 px = 1 px of the canonical drawing); angles in degrees, '
             'positive = clockwise on screen (y down)',
    'reference': REF_REL,
    'reference_crop': [669, 20, 908, 947],
    'canvas': [W, H],
    'parts': rig_parts,
    'bend_tests': [
        {'part': 'upper_arm_near', 'sign': -1, 'max': 90},
        {'part': 'forearm_near', 'sign': -1, 'max': 120},
        {'part': 'thigh_near', 'sign': -1, 'max': 90},
        {'part': 'shin_near', 'sign': 1, 'max': 120},
        {'part': 'forearm_far', 'sign': -1, 'max': 120,
         'hide': ['forearm_near', 'upper_arm_near', 'hand_near_open', 'note_05']},
        {'part': 'shin_far', 'sign': 1, 'max': 120, 'hide': ['thigh_near', 'shin_near', 'foot_near']},
    ],
    'bend_angles': [0, 45, 90, 120],
}
with open(os.path.join(HERE, 'rig.json'), 'w', encoding='utf-8') as fh:
    json.dump(rig, fh, indent=1)
print('wrote %d parts' % len(parts))

# ----------------------------------------------------------------------------- hands check board
sys.path.insert(0, os.path.join(HERE, '..'))
import copy
import assemble as _asm

_rig, _imgs = _asm.load(HERE)
_tiles = []
for k in ('open', 'grip', 'point', 'notebook'):
    r2 = copy.deepcopy(_rig)
    for n in ('open', 'grip', 'point', 'notebook'):
        r2['parts']['hand_near_' + n]['hidden'] = (n != k)
    ex = {'forearm_near': -90}
    img = _asm.render(r2, _imgs, extra=ex, bg=_asm.BOARD_BG)
    wx, wy = _asm.pivot_world(r2, 'hand_near_' + k, ex)
    _tiles.append(img.crop((int(wx - 40), int(wy - 70), int(wx + 110), int(wy + 80))).resize((450, 450), Image.LANCZOS).convert('RGB'))
_b = Image.new('RGB', (4 * 458, 450), (40, 40, 44))
for i, t in enumerate(_tiles):
    _b.paste(t, (i * 458, 0))
_b.save(os.path.join(HERE, 'hands-test.png'))
