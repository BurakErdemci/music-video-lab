"""Cut the AI character's side-profile cut-out puppet (faces LEFT) from stil/hareket/ref-ai.png.

usage:  python stil/kukla/ai-profil/build.py        (needs Pillow + numpy; numpy comes from Blender's bundled Python)

Writes one trimmed RGBA PNG per part plus rig.json next to this script. Units are pixels of the reference
(1 part px = 1 reference px). Method: see stil/kukla/README.md ("How the joints are made").
  1. `clean` = the reference with the near arm lifted off: arm lines erased, the torso under the arm filled with
     cream + light stipple, and the torso's front contour (hidden by the hand) redrawn as a smooth navy line.
  2. every part = a mask on the reference (arms: region between their own outlines; the rest: rectangles on
     `clean`), cut at the joint along a line perpendicular to the limb axis.
  3. every joint (pivot p, radius r): the child (drawn on top) fills the parent-side half disk with plain fill
     out to r - RIM and has no line inside it; the parent (underneath) gets the full disk with a fresh rim on
     its new outer boundary only. Inner detail lines within 1.3 r of a pivot are painted over.
  4. far limbs = darkened copies of the near ones, same pivots, drawn behind the torso.
  5. extra hand shapes come from kaynak/hands-ai-profil.png, scaled so the wrist width equals the reference wrist.
"""
import json
import math
import os
import sys

sys.path.append(r'C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\lib\site-packages')
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REF_PATH = os.path.join(HERE, '..', '..', 'hareket', 'ref-ai.png')
HANDS_PATH = os.path.join(HERE, '..', 'kaynak', 'hands-ai-profil.png')

FILL_DEFAULT = FILL = np.array([251, 243, 219], np.float32)
NAVY = np.array([24, 32, 58], np.float32)
RIM = 4.0          # outline thickness drawn on fresh joint boundaries
FAR_DARKEN = 0.82
STIPPLE = 0.014    # fraction of fill pixels that carry a stipple dot
rng = np.random.RandomState(7)

ref = np.array(Image.open(REF_PATH).convert('RGBA')).astype(np.float32)
H, W = ref.shape[:2]
Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
X += 0.5
Y += 0.5

lum = ref[..., :3].max(axis=2)
navy_px = (ref[..., 3] > 128) & (lum < 110)


def row_runs(y):
    xs = np.where(navy_px[y])[0]
    out = []
    if len(xs):
        s = p = xs[0]
        for x in xs[1:]:
            if x != p + 1:
                out.append((s, p))
                s = x
            p = x
        out.append((s, p))
    return [r for r in out if r[1] - r[0] >= 1]


def track(xc, y0, y1):
    """Follow a navy line row by row from (xc, y0) to y1; returns {y: (start, end)} (pixel indices)."""
    step = 1 if y1 >= y0 else -1
    res = {}
    for y in range(y0, y1 + step, step):
        best = None
        for a, b in row_runs(y):
            c = (a + b) / 2.0
            if abs(c - xc) <= 6 and (best is None or abs(c - xc) < abs((best[0] + best[1]) / 2.0 - xc)):
                best = (a, b)
        if best is None:
            best = res.get(y - step, (int(xc), int(xc)))
        res[y] = best
        xc = (best[0] + best[1]) / 2.0
    return res


def stipple_fill(mask, img):
    """Cream + light stipple into img where mask (alpha 255)."""
    n = int(mask.sum())
    col = np.tile(FILL, (n, 1))
    dots = rng.rand(n) < STIPPLE
    g = rng.randint(85, 150, size=n).astype(np.float32)
    col[dots] = np.stack([g[dots], g[dots], g[dots] + 6], axis=1)
    img[mask, :3] = col
    img[mask, 3] = 255


def poly_mask(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    return np.array(im) > 0


def rows_mask(left, right):
    """left/right: {y: x}; mask of pixels with left[y] <= x <= right[y]."""
    m = np.zeros((H, W), bool)
    for y in left:
        if y in right:
            m[y, int(math.floor(left[y])):int(math.floor(right[y])) + 1] = True
    return m


def erode(m, n):
    for _ in range(n):
        e = m.copy()
        e[1:] &= m[:-1]
        e[:-1] &= m[1:]
        e[:, 1:] &= m[:, :-1]
        e[:, :-1] &= m[:, 1:]
        m = e
    return m


# ----------------------------------------------------------------------------- 1. the clean torso
clean = ref.copy()
A = track(58.5, 229, 428)          # arm front edge: upper-arm front line, then the forearm front line
B = track(96.5, 343, 498)          # forearm back edge from the elbow V down to the wrist, then the hand's back edge
BACK = track(106.0, 271, 339)      # upper-arm back edge / torso waist contour
erase = np.zeros((H, W), bool)
for y in range(210, 229):
    erase[y, 53:61] = True
for y, (a, b) in A.items():
    erase[y, a - 2:b + 3] = True
for y in range(343, 447):
    a, b = B[y]
    erase[y, a - 2:b + 3] = True
for y in range(231, 247):          # the thin upper-arm back line that runs inside the torso contour
    erase[y, 104:110] = True
erase &= clean[..., 3] > 0
stipple_fill(erase, clean)

HAND_ERASE = [(12, 446), (29, 443), (36, 437), (63, 443), (65, 462), (62, 490), (60, 499), (57, 505), (51, 507),
              (50, 512), (12, 512)]
hm = poly_mask(HAND_ERASE)
clean[hm] = 0
# torso front contour that the hand hid: smooth hermite curve from the real contour above to the real one below
P0, T0, P1, T1 = np.array([32.3, 436.0]), np.array([0.07, 1.0]) * 40, np.array([45.5, 518.0]), np.array([0.19, 1.0]) * 40
curve = []
for t in np.linspace(0, 1, 200):
    h00, h10, h01, h11 = 2 * t**3 - 3 * t**2 + 1, t**3 - 2 * t**2 + t, -2 * t**3 + 3 * t**2, t**3 - t**2
    curve.append(tuple(h00 * P0 + h10 * T0 + h01 * P1 + h11 * T1))
cx = {}
for (x, y) in curve:
    cx[int(y)] = x
for y in range(437, 513):
    xs = cx.get(y, None)
    if xs is None:
        continue
    row = hm[y] & (np.arange(W) > xs + 1)
    m = np.zeros((H, W), bool)
    m[y] = row
    stipple_fill(m, clean)
SS = 8
li = Image.new('L', (W * SS, H * SS), 0)
ImageDraw.Draw(li).line([(x * SS, y * SS) for x, y in curve], fill=255, width=int(4.4 * SS), joint='curve')
for (x, y) in (curve[0], curve[-1]):
    ImageDraw.Draw(li).ellipse([x * SS - 2.2 * SS, y * SS - 2.2 * SS, x * SS + 2.2 * SS, y * SS + 2.2 * SS], fill=255)
la = np.array(li.resize((W, H), Image.BOX)).astype(np.float32) / 255.0
la *= ((Y > 436) & (Y < 514)).astype(np.float32)
a0 = clean[..., 3] / 255.0
na = la + a0 * (1 - la)
for c in range(3):
    clean[..., c] = np.where(na > 0, (NAVY[c] * la + clean[..., c] * a0 * (1 - la)) / np.maximum(na, 1e-6), clean[..., c])
clean[..., 3] = na * 255
Image.fromarray(np.clip(clean, 0, 255).astype(np.uint8)).save(os.path.join(HERE, 'clean.png'))

# ----------------------------------------------------------------------------- 2. masks and joints
ELBOW, WRIST_PT = (82, 335), (47, 443)
U_FA = np.array([WRIST_PT[0] - ELBOW[0], WRIST_PT[1] - ELBOW[1]], float)
U_FA /= np.hypot(*U_FA)                                    # elbow -> wrist direction
JOINTS = {   # child: (parent, pivot, child-direction u, radius)
    'chest': ('pelvis', (76, 395), (0, -1), 42),
    'neck': ('chest', (73, 141), (0, -1), 17),
    'head': ('neck', (69, 128), (0, -1), 17),
    'upper_arm_near': ('chest', (80, 188), (0, 1), 21),
    'forearm_near': ('upper_arm_near', ELBOW, tuple(U_FA), 19.5),
    'hand_near_open': ('forearm_near', WRIST_PT, tuple(U_FA), 13),
    'thigh_near': ('pelvis', (78, 520), (0, 1), 32),
    'shin_near': ('thigh_near', (97, 665), (0, 1), 26),
    'foot_near': ('shin_near', (96, 793), (0, 1), 18),
}
CUT_OVERLAP = 6.0     # the parent keeps this many px beyond the cut; the child's outline fades in over the same length
NO_PARENT_CUT = {'upper_arm_near'}     # the arm hangs over the chest; the chest is not cut at the shoulder
rect = lambda x0, y0, x1, y1: poly_mask([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

# arm regions between their own outlines
xl_up, xr_up = {}, {}
for y in range(168, 347):
    xl_up[y] = (A[y][0] - 1) if y >= 229 else 57
    if y < 266:
        xr_up[y] = 108
    else:
        xr_up[y] = BACK.get(y, (0, 105))[1] + 1 if y <= 336 else (105 if y <= 341 else 101)
upper_arm_base = rows_mask(xl_up, xr_up)
xl_fa, xr_fa = {}, {}
for y in range(318, 452):
    xl_fa[y] = (A[y][0] - 1) if y <= 427 else 36
    xr_fa[y] = 100 if y < 343 else B[y][1] + 1
forearm_base = rows_mask(xl_fa, xr_fa)
xr_h = {y: (B[y][1] + 1 if y <= 498 else 54) for y in range(430, 512)}
hand_base = rows_mask({y: 14 for y in xr_h}, xr_h) & (ref[..., 3] > 0)

BASE = {
    'pelvis': (rect(0, 0, W, H), clean),
    'chest': (rect(0, 0, W, H), clean),
    'neck': (poly_mask([(47, 118), (88, 118), (100, 141), (44, 141)]), clean),
    'head': (rect(0, 0, W, 128), clean),
    'upper_arm_near': (upper_arm_base, ref),
    'forearm_near': (forearm_base, ref),
    'hand_near_open': (hand_base, ref),
    'thigh_near': (rect(0, 0, W, H), clean),
    'shin_near': (rect(0, 0, W, H), clean),
    'foot_near': (rect(0, 0, W, H), clean),
}
PARENT_OF = {c: j[0] for c, j in JOINTS.items()}

# Joint-disk fill: the median of the light, line-free pixels around each pivot (so the disk is the same cream as the
# skin around it), with stipple of the same density.
JFILL, JDENS = {}, {}
for c, (par, p, u, r) in JOINTS.items():
    src = BASE[c][1]
    dd = np.hypot(X - p[0], Y - p[1])
    ok = (src[..., 3] == 255) & (src[..., :3].max(axis=2) > 215) & (src[..., 1] < 249) & (dd > 0.6 * r) & (dd < 1.8 * r)
    JFILL[c] = np.median(src[ok][:, :3], axis=0).astype(np.float32) if ok.sum() > 40 else FILL_DEFAULT
    nv = (src[..., 3] > 128) & (src[..., :3].max(axis=2) < 110)
    nvd = nv.copy()
    for _ in range(4):
        n2 = nvd.copy()
        n2[1:] |= nvd[:-1]
        n2[:-1] |= nvd[1:]
        n2[:, 1:] |= nvd[:, :-1]
        n2[:, :-1] |= nvd[:, 1:]
        nvd = n2
    ann = (src[..., 3] == 255) & (dd > 0.6 * r) & (dd < 2.2 * r) & ~nvd
    JDENS[c] = float(((src[..., :3].max(axis=2) < 190) & ann).sum()) / max(1, int(ann.sum()))
NOISE = rng.rand(H, W)
DOTGREY = rng.randint(95, 150, size=(H, W)).astype(np.float32)


def disk_fill(c):
    img = np.empty((H, W, 3), np.float32)
    img[:] = JFILL[c]
    dots = NOISE < JDENS[c]
    img[dots] = np.stack([DOTGREY[dots], DOTGREY[dots], DOTGREY[dots] + 6], axis=1)
    return img


# Crease side of the joints that only bend one way (+1 = back / +x, -1 = front / -x). On that side the parent keeps a
# strip of the limb outline (as long as the radius) and the child's outline fades in over the same length, so a bent
# limb never ends in a blunt navy stub inside the other one.
CREASE = {'forearm_near': -1, 'thigh_near': -1, 'shin_near': +1}
CREASE_LEN = {'forearm_near': 10.0, 'thigh_near': 26.0, 'shin_near': 22.0}   # strip / fade length in px
CREASE_LAT = 0.55     # the strip / fade only applies beyond this fraction of r from the limb centreline


def lateral(name):
    _, p, u, r = JOINTS[name]
    n = (-u[1], u[0])
    if n[0] * CREASE[name] < 0:
        n = (-n[0], -n[1])
    return (X - p[0]) * n[0] + (Y - p[1]) * n[1]


def side(name, q=None):
    """Signed distance along the child direction of joint `name` (>0 = child side)."""
    _, p, u, _ = JOINTS[name]
    return (X - p[0]) * u[0] + (Y - p[1]) * u[1]


def own_mask(name):
    m = BASE[name][0].copy()
    if name in JOINTS:
        m &= side(name) >= 0
    for c, (par, p, u, r) in JOINTS.items():
        if par == name and c not in NO_PARENT_CUT:
            m &= side(c) <= CUT_OVERLAP
            if c in CREASE:
                r = JOINTS[c][3]
                m |= BASE[c][0] & (side(c) > 0) & (side(c) <= CREASE_LEN[c]) & (lateral(c) > CREASE_LAT * r)
    return m


def build_part(name):
    base, src = BASE[name]
    own = own_mask(name)
    light = own & (src[..., 3] == 255) & (src[..., :3].max(axis=2) > 215) & (src[..., 1] < 249)
    FILL = np.median(src[light][:, :3], axis=0) if light.sum() > 50 else FILL_DEFAULT   # the part's own cream
    sil = base & (src[..., 3] > 128)
    out = src.copy()
    sheen = (out[..., 1] >= 249) & (out[..., 3] > 128)      # the reference's pale halo next to contours: plain fill
    out[sheen, :3] = FILL
    out[~own] = 0
    deep = erode(sil, 9)
    navy = (src[..., 3] > 128) & (src[..., :3].max(axis=2) < 110)
    mine = []   # (pivot, u, r, role)
    if name in JOINTS:
        _, p, u, r = JOINTS[name]
        mine.append((p, u, r, 'top'))
    for c, (par, p, u, r) in JOINTS.items():
        if par == name:
            mine.append((p, u, r, 'under'))
    jname = {}
    if name in JOINTS:
        jname[JOINTS[name][1]] = name
    for c, (par, p, u, r) in JOINTS.items():
        if par == name:
            jname[p] = c
    for p, u, r, role in mine:           # inner detail lines near a pivot -> plain fill
        d = np.hypot(X - p[0], Y - p[1])
        m = own & navy & deep & (d <= 1.3 * r)
        out[m, :3] = JFILL[jname[p]]
    for p, u, r, role in mine:
        c = jname[p]
        d = np.hypot(X - p[0], Y - p[1])
        sd = (X - p[0]) * u[0] + (Y - p[1]) * u[1]
        if role == 'top':
            fillimg = disk_fill(c)
            w = np.clip((r - RIM + 1.5 - d) / 3.0, 0, 1)          # soft edge: no pale rim from a hard alpha step
            parent_half = (w > 0) & (sd < 0) & ~own
            out[parent_half, :3] = fillimg[parent_half]
            out[parent_half, 3] = w[parent_half] * 255
            inner = own & (w > 0)
            out[inner, :3] = out[inner, :3] * (1 - w[inner, None]) + fillimg[inner] * w[inner, None]
            # the child's outline fades in at the cut: over the radius on the crease side (the parent carries the same
            # line there), over CUT_OVERLAP px elsewhere, so a turned child never ends in a blunt navy stub
            if name not in NO_PARENT_CUT:
                flen = np.full((H, W), CUT_OVERLAP, np.float32)
                if name in CREASE:
                    flen = np.where(lateral(name) > CREASE_LAT * r, CREASE_LEN[name], flen)
                fade = own & (sd < flen) & (out[..., :3].max(axis=2) < 170) & (out[..., 3] > 0) & (w < 1)
                out[..., 3] = np.where(fade, out[..., 3] * np.clip(sd / flen, 0, 1) ** 2, out[..., 3])
        else:
            sel = (d <= r + 0.5) & ~own & (sd > 0)
            alpha = np.clip(r + 0.5 - d, 0, 1) * 255
            t = np.clip(d - (r - RIM) + 0.5, 0, 1)[..., None]
            col = JFILL[c] * (1 - t) + NAVY * t
            out[sel, :3] = col[sel]
            out[sel, 3] = alpha[sel]
    # Soft alpha on interior cut edges (light pixels bordering another part's opaque pixels). A hard alpha edge makes
    # the resampler overshoot into a pale seam when the part is rotated. The parent's own edge at a child's cut is
    # left hard (the overlap there must stay opaque; the joint disk covers it once the child turns).
    solid = out[..., 3] > 0                      # what this part actually draws, joint disks included
    ob = (~solid) & (src[..., 3] > 128)
    for _ in range(2):
        o2 = ob.copy()
        o2[1:] |= ob[:-1]
        o2[:-1] |= ob[1:]
        o2[:, 1:] |= ob[:, :-1]
        o2[:, :-1] |= ob[:, 1:]
        ob = o2
    depth = np.zeros((H, W), np.float32)
    cur = solid.copy()
    for _ in range(3):
        depth += cur
        cur = erode(cur, 1)
    zone = solid & ob & (out[..., :3].max(axis=2) > 150) & (out[..., 3] > 250) & (depth < 3)
    for c, (par, p, u, r) in JOINTS.items():
        if par == name and c not in NO_PARENT_CUT:
            zone &= np.abs(side(c) - CUT_OVERLAP) > 3
    out[..., 3] = np.where(zone, out[..., 3] * np.clip(depth / 3.0, 0, 1), out[..., 3])
    return out


# ----------------------------------------------------------------------------- 3. extra hands from the sheet
def sheet_hand(x_range, guess, sc=None, ref_palm=None):
    """Cut one hand from the magenta sheet, unmix the navy/magenta fringe, scale so the wrist is wrist_px wide and
    rotate so the wrist->hand axis points down. Returns (RGBA float array, cap-centre (x, y) inside it)."""
    sh = np.array(Image.open(HANDS_PATH).convert('RGB')).astype(np.float32)
    mag = np.array([255, 0, 255], np.float32)
    seg = NAVY - mag
    t = ((sh - mag) @ seg) / (seg @ seg)
    resid = np.linalg.norm(sh - (mag + t[..., None] * seg), axis=2)
    alpha = np.where(resid < 45, np.clip(t * 1.15, 0, 1), 1.0)
    alpha[(sh[..., 0] > 190) & (sh[..., 2] > 190) & (sh[..., 1] < 110) & (resid >= 45)] = 0
    rgb = np.where((resid < 45)[..., None], NAVY, sh)
    x0, x1 = x_range
    alpha, rgb = alpha[:, x0:x1], rgb[:, x0:x1]
    ys, xs = np.where(alpha > 0.5)
    cen = np.array([xs.mean(), ys.mean()])
    g = np.array(guess, np.float32)
    g /= np.linalg.norm(g)
    tip = np.array([xs[np.argmax(xs * g[0] + ys * g[1])], ys[np.argmax(xs * g[0] + ys * g[1])]], np.float32)
    ax = cen - tip
    ax /= np.linalg.norm(ax)                                  # wrist -> hand body
    proj = (xs - tip[0]) * ax[0] + (ys - tip[1]) * ax[1]
    tip_s = np.array([xs[np.argmin(proj)], ys[np.argmin(proj)]], np.float32)
    L = proj.max() - proj.min()
    s0 = proj.min() + 0.14 * L                                # slice across the wrist, a bit behind the tip
    band = np.abs(proj - s0) < 1.0
    perp = (xs - tip_s[0]) * -ax[1] + (ys - tip_s[1]) * ax[0]
    wid = perp[band].max() - perp[band].min()
    palm = (perp.max() - perp.min())
    if sc is None:
        sc = ref_palm / palm
    print('sheet hand', x_range, 'stub', round(float(wid), 1), 'extent', round(float(palm), 1), 'len', round(float(L), 1), 'scale', round(float(sc), 3))
    cap = tip_s + ax * (wid / 2.0)                            # centre of the round wrist end, sheet px
    pm = np.dstack([rgb * alpha[..., None], alpha])
    # premultiplied resize, channel by channel (float images)
    chans = [Image.fromarray(pm[..., c].astype(np.float32), 'F') for c in range(4)]
    nw, nh = int(round(alpha.shape[1] * sc)), int(round(alpha.shape[0] * sc))
    chans = [c.resize((nw, nh), Image.BOX if sc < 1 else Image.BICUBIC) for c in chans]
    arr = np.dstack([np.array(c) for c in chans])
    a = arr[..., 3:4]
    arr[..., :3] = np.where(a > 1e-3, arr[..., :3] / np.maximum(a, 1e-3), 0)
    cap_s = cap * sc
    phi = math.degrees(math.atan2(ax[1], ax[0]))
    theta = math.radians(90 - phi)
    cs, sn = math.cos(theta), math.sin(theta)
    size = int(max(nw, nh) * 1.5) + 8
    po = (size // 2, size // 2)
    # inverse map out -> in: in - cap = R(-theta) (out - po)
    coeffs = (cs, sn, cap_s[0] - (cs * po[0] + sn * po[1]), -sn, cs, cap_s[1] - (-sn * po[0] + cs * po[1]))
    outc = [Image.fromarray(np.ascontiguousarray(arr[..., c]), 'F').transform((size, size), Image.AFFINE, coeffs,
                                                                                 resample=Image.BICUBIC) for c in range(4)]
    o = np.dstack([np.array(c) for c in outc])
    o[..., :3] = np.clip(o[..., :3], 0, 255)
    o[..., 3] = np.clip(o[..., 3], 0, 1) * 255
    o[o[..., 3] < 30] = 0                                     # resampling noise must not widen the trim box
    return o, po, float(wid), float(palm)


def finish_sheet_hand(o, po, r=13.0):
    """Top-role wrist treatment: the forearm-side half disk is plain fill out to r - RIM; the cap arc is removed."""
    h, w = o.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx += 0.5
    yy += 0.5
    d = np.hypot(xx - po[0], yy - po[1])
    up = yy < po[1]
    o[up & (d <= r + 1.5)] = 0
    sel = up & (d <= r - RIM)
    o[sel, :3] = FILL
    o[sel, 3] = 255
    inner = (d <= r - RIM)
    o[inner, :3] = FILL
    o[inner, 3] = 255
    # plain fill in the bend region (detail lines near the wrist)
    nv = (o[..., 3] > 128) & (o[..., :3].max(axis=2) < 110)
    deep = erode(o[..., 3] > 128, 6)
    m = nv & deep & (d <= 1.3 * r)
    o[m, :3] = FILL
    return o


# ----------------------------------------------------------------------------- 4. write parts, far copies, rig
def darken(img):
    out = img.copy()
    l = out[..., :3].max(axis=2)
    k = np.clip((l - 70.0) / 110.0, 0, 1)          # navy stays navy, light fill takes the full darkening
    f = 1.0 - (1.0 - FAR_DARKEN) * k
    out[..., :3] = out[..., :3] * f[..., None]
    return out


parts = {}      # name -> dict(img, origin(x0, y0) in reference px, pivot (ref px), parent, z, ...)


def trim(img):
    a = img[..., 3] > 0
    ys, xs = np.where(a)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    return img[y0:y1, x0:x1], (int(x0), int(y0))


Z = {'pelvis': 10, 'chest': 11, 'neck': 12, 'head': 13, 'thigh_near': 14, 'shin_near': 15, 'foot_near': 16,
     'upper_arm_near': 20, 'forearm_near': 21, 'hand_near_open': 22,
     'upper_arm_far': 2, 'forearm_far': 3, 'hand_far_open': 4, 'thigh_far': 5, 'shin_far': 6, 'foot_far': 7}
ROOT_PIVOT = (78, 520)

for name in BASE:
    img = build_part(name)
    t, org = trim(img)
    p = JOINTS[name][1] if name in JOINTS else ROOT_PIVOT
    parts[name] = dict(img=t, org=org, parent=PARENT_OF.get(name), piv_ref=ROOT_PIVOT if name == 'pelvis' else p)

# wrist pivot of the hand variants
WRIST = JOINTS['hand_near_open'][1]
EXTRA = {'grip': ((430, 700), (0.3, -0.95)), 'point': ((740, 1140), (0.89, -0.45)), 'notebook': ((1200, 1640), (0.95, -0.3))}
sheet_info = {}
REF_PALM = 36.0          # width of the reference open hand across the knuckles (x 23..58)
SHEET_SCALE = REF_PALM / sheet_hand((100, 330), (0.2, -1), sc=1.0)[3]      # the sheet's own open hand sets the scale
for key, (xr, guess) in EXTRA.items():
    o, po, wid_raw, palm_raw = sheet_hand(xr, guess, sc=SHEET_SCALE)
    r_stub = min(JOINTS['hand_near_open'][3], wid_raw * SHEET_SCALE / 2.0)
    o = finish_sheet_hand(o, po, r=r_stub)
    t, org = trim(o)
    parts['hand_near_' + key] = dict(img=t, org=(org[0] - po[0] + WRIST[0], org[1] - po[1] + WRIST[1]),
                                     parent='forearm_near', piv_ref=WRIST, nopad=True)
    sheet_info[key] = (t.shape[1], t.shape[0])

# far copies
for n in list(parts):
    if n.endswith('_near') or '_near_' in n:
        f = n.replace('_near', '_far')
        parts[f] = dict(img=darken(parts[n]['img']), org=parts[n]['org'],
                        parent=(parts[n]['parent'].replace('_near', '_far') if parts[n]['parent'] and '_near' in parts[n]['parent']
                                else parts[n]['parent']),
                        piv_ref=parts[n]['piv_ref'], far_nopad=parts[n].get('nopad', False))

def bleed(img, n=4):
    """Give fully transparent pixels next to the part the colour of their opaque neighbours, so that resampling at an
    angle blends colours instead of ringing against black."""
    img = img.copy()
    has = img[..., 3] > 0
    for _ in range(n):
        acc = np.zeros_like(img[..., :3])
        cnt = np.zeros(has.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(img[..., :3], dy, 0), dx, 1)
            hs = np.roll(np.roll(has, dy, 0), dx, 1)
            acc += sh * hs[..., None]
            cnt += hs
        new = (~has) & (cnt > 0)
        img[new, :3] = acc[new] / cnt[new][:, None]
        has = has | new
    return img


for n, p in parts.items():
    # 4 px transparent border carrying the edge colour, so that resampling at an angle never blends with black
    if p.get('nopad') or p.get('far_nopad'):
        pass
    else:
        p['img'] = bleed(np.pad(p['img'], ((4, 4), (4, 4), (0, 0))))
        p['org'] = (p['org'][0] - 4, p['org'][1] - 4)
    Image.fromarray(np.clip(p['img'], 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(HERE, n + '.png'))

RANGES = {'chest': [-20, 30], 'neck': [-30, 30], 'head': [-35, 35], 'upper_arm': [-40, 95], 'forearm': [0, 120],
          'thigh': [-30, 95], 'shin': [-120, 0], 'foot': [-30, 40], 'hand': [-60, 60]}
JOINT_NAME = {'chest': 'spine', 'neck': 'neck', 'head': 'head', 'upper_arm': 'shoulder', 'forearm': 'elbow',
              'thigh': 'hip', 'shin': 'knee', 'foot': 'ankle'}
rig_parts = {}
order = ['pelvis', 'chest', 'neck', 'head', 'upper_arm_far', 'forearm_far', 'hand_far_open', 'hand_far_grip', 'hand_far_point',
         'hand_far_notebook', 'upper_arm_near', 'forearm_near', 'hand_near_open', 'hand_near_grip', 'hand_near_point',
         'hand_near_notebook', 'thigh_far', 'shin_far', 'foot_far', 'thigh_near', 'shin_near', 'foot_near']
for n in order:
    p = parts[n]
    ox, oy = p['org']
    piv = p['piv_ref']
    entry = {'file': n + '.png', 'pivot': [round(piv[0] - ox, 2), round(piv[1] - oy, 2)], 'parent': p['parent']}
    if p['parent'] is None:
        entry['offset'] = [piv[0], piv[1]]
    else:
        pox, poy = parts[p['parent']]['org']
        entry['offset'] = [round(piv[0] - pox, 2), round(piv[1] - poy, 2)]
    entry['rotation'] = 0
    entry['z'] = Z.get(n, 22)
    base = n.replace('_near', '').replace('_far', '')
    if base in RANGES and not base.startswith('hand'):
        entry['joint'] = JOINT_NAME[base]
        entry['range'] = RANGES[base]
    if n.startswith('hand_') and not n.endswith('_open'):
        entry['hidden'] = True
        entry['variant_of'] = 'hand_near_open' if '_near_' in n else 'hand_far_open'
    rig_parts[n] = entry
for n in ('hand_near_open', 'hand_far_open'):
    rig_parts[n]['joint'] = 'wrist'
    rig_parts[n]['range'] = RANGES['hand']
rig_parts['hand_far_open']['z'] = Z['hand_far_open']
for n in ('hand_far_grip', 'hand_far_point', 'hand_far_notebook'):
    rig_parts[n]['z'] = Z['hand_far_open']
for n in ('hand_near_grip', 'hand_near_point', 'hand_near_notebook'):
    rig_parts[n]['z'] = Z['hand_near_open']

rig = {
    'character': 'ai', 'view': 'profile-left',
    'units': 'pixels of the reference image (1 px = 1 px of the canonical drawing); angles in degrees, '
             'positive = clockwise on screen (y down)',
    'reference': '../../hareket/ref-ai.png',
    'reference_crop': [0, 0, 127, 836],
    'canvas': [127, 836],
    'bend_cell': 120,
    'parts': rig_parts,
    'bend_tests': [
        {'part': 'upper_arm_near', 'sign': 1, 'max': 90},
        {'part': 'forearm_near', 'sign': 1, 'max': 120},
        {'part': 'thigh_near', 'sign': 1, 'max': 90},
        {'part': 'shin_near', 'sign': -1, 'max': 120},
        {'part': 'forearm_far', 'sign': 1, 'max': 120},
        {'part': 'shin_far', 'sign': -1, 'max': 120},
    ],
    'bend_angles': [0, 45, 90, 120],
}
with open(os.path.join(HERE, 'rig.json'), 'w', encoding='utf-8') as fh:
    json.dump(rig, fh, indent=2)
print('parts:', len(parts), 'sheet hand sizes (w, h):', sheet_info)


# ----------------------------------------------------------------------------- 5. hands-test.png
# The assembled figure with the near forearm at +90, once per hand variant swapped in for hand_near_open.
def hands_test():
    import copy
    sys.path.insert(0, os.path.join(HERE, '..'))
    import assemble
    rg, imgs = assemble.load(HERE)
    tiles = []
    for v in ('open', 'grip', 'point', 'notebook'):
        r = copy.deepcopy(rg)
        for n, p in r['parts'].items():
            if n.startswith('hand_near_'):
                p['hidden'] = (n != 'hand_near_' + v)
        pad = 160
        im = assemble.render(r, imgs, extra={'forearm_near': 90}, bg=assemble.BOARD_BG, pad=pad)
        im = im.crop((pad - 140, pad + 280, pad + 127, pad + 420)).resize((3 * 267, 3 * 140), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), v, fill=(255, 255, 255))
        tiles.append(im.convert('RGB'))
    board = Image.new('RGB', (4 * tiles[0].width + 20, tiles[0].height), (40, 40, 44))
    for i, t in enumerate(tiles):
        board.paste(t, (i * (t.width + 5), 0))
    board.save(os.path.join(HERE, 'hands-test.png'))


hands_test()
