# 2D pose model of the cut-out puppets (stil/kukla/{insan,ai}-profil/rig.json), shared by the take (take.py), the
# Blender build (build.py) and the fast PIL preview (preview.py). Pure Python (no numpy, no bpy): it runs in Blender's
# bundled Python and in the system Python.
#
# Screen space = film pixels, 1920x1080, y down, angles in degrees, positive = clockwise on screen (the rig.json
# convention). A pose is a dict:
#   root:  (x, y)  screen position of the pelvis pivot
#   rot:   {part: degrees}  added to the part's neutral rotation (0 when absent)
#   len:   {part: factor}   scale along the part's bone axis (foreshortening; 1 when absent)
#   alpha: {part: 0..1}     opacity (hand variants; default 1 for visible parts, 0 for "hidden" ones)
#   z:     {part: z}        draw-order override (rig.json z when absent)
#   props: {name: {"pos": (x, y), "rot": deg, "sx": 1.0, "sy": 1.0, "alpha": 1.0, "z": z}}  rigid prop planes
#          (PROPS below: file and pivot); sx < 0 mirrors (a page turning over its spine)
#
# world(part) = world(parent) . T(offset) . R(rotation + rot) . A(axis, len) . T(-pivot)
# world(root) = T(root) . S(scale) . R(rot) . A(axis, len) . T(-pivot)
# where A scales along the part's bone axis (pivot -> bone tail, in the part's own pixels).
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
PARTS_DIR = HERE / "parts"  # cleaned part PNGs (prep_parts.py); same names, sizes and pivots as stil/kukla

CHARS = {
    # scale: reference px -> film px. Heights match the 3D test (human 1.72 m, AI 1.75 m at 380 px/m):
    # the human's reference is 927 px from soles to hair top, the AI's 836 px.
    "human": {"src": REPO / "stil" / "kukla" / "insan-profil", "scale": 654.0 / 927.0, "face": 1},
    "ai": {"src": REPO / "stil" / "kukla" / "ai-profil", "scale": 665.0 / 836.0, "face": -1},
}

# Main child of each part: its bone runs from the part's pivot to that child's joint, so bones have the parts' real
# lengths. Leaves (head, hands, feet, hair, notes) get a tail from LEAF_TAIL (part px, relative to the pivot).
MAIN_CHILD = {
    "pelvis": "chest", "chest": "neck", "neck": "head",
    "upper_arm_near": "forearm_near", "forearm_near": "hand_near_open",
    "upper_arm_far": "forearm_far", "forearm_far": "hand_far_open",
    "thigh_near": "shin_near", "shin_near": "foot_near",
    "thigh_far": "shin_far", "shin_far": "foot_far",
}

# Rigid props (drawn by prep_parts.py into parts/props/), pivot in the prop's own pixels, size in film px = PNG px.
PROPS = {
    "mug": {"file": "props/mug.png", "pivot": (18.0, 48.0), "char": "human"},  # bottom centre of the body
    "book_back": {"file": "props/book_back.png", "pivot": (56.0, 42.0), "char": "ai"},  # spine mid point
    "book_page": {"file": "props/book_page.png", "pivot": (0.0, 42.0), "char": "ai"},  # its spine edge
}


def prop_matrix(name, st):
    """Affine prop px -> screen px of a prop state {"pos", "rot", "sx", "sy"}."""
    px, py = PROPS[name]["pivot"]
    m = mul(T(*st["pos"]), R(st.get("rot", 0.0)))
    m = mul(m, S(st.get("sx", 1.0), st.get("sy", 1.0)))
    return mul(m, T(-px, -py))


# ------------------------------------------------------------------------------------------------- 2D affine maths
# An affine is a 6-tuple (a, b, c, d, e, f): x' = a x + b y + c, y' = d x + e y + f.
def mul(m, n):
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + b * D, a * B + b * E, a * C + b * F + c, d * A + e * D, d * B + e * E, d * C + e * F + f)


def T(x, y):
    return (1.0, 0.0, x, 0.0, 1.0, y)


def R(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return (c, -s, 0.0, s, c, 0.0)


def S(sx, sy=None):
    return (sx, 0.0, 0.0, 0.0, sx if sy is None else sy, 0.0)


def axis_scale(u, k):
    """Scale by k along the unit vector u, 1 across it."""
    ux, uy = u
    return (1 + (k - 1) * ux * ux, (k - 1) * ux * uy, 0.0, (k - 1) * ux * uy, 1 + (k - 1) * uy * uy, 0.0)


def inv(m):
    a, b, c, d, e, f = m
    det = a * e - b * d
    ia, ib, id_, ie = e / det, -b / det, -d / det, a / det
    return (ia, ib, -(ia * c + ib * f), id_, ie, -(id_ * c + ie * f))


def apply(m, p):
    a, b, c, d, e, f = m
    return (a * p[0] + b * p[1] + c, d * p[0] + e * p[1] + f)


def angle_of(v):
    """Screen angle of a vector, degrees, clockwise from +x (y down)."""
    return math.degrees(math.atan2(v[1], v[0]))


# ------------------------------------------------------------------------------------------------------- the rigs
_RIGS = {}


def rig(char):
    """rig.json of a character with derived data: tail[part] (bone tail, part px), axis[part] (unit), order (parents
    before children)."""
    if char in _RIGS:
        return _RIGS[char]
    with open(CHARS[char]["src"] / "rig.json", encoding="utf-8") as fh:
        r = json.load(fh)
    parts = r["parts"]
    tails = {}
    for name, p in parts.items():
        px, py = p["pivot"]
        if name in MAIN_CHILD:
            # the child's offset is in this part's pixels
            tails[name] = tuple(parts[MAIN_CHILD[name]]["offset"])
        else:
            lx, ly = LEAF_TAIL.get(_leaf_kind(name), (0, 40))
            tails[name] = (px + lx * CHARS[char]["face"], py + ly)
    axis = {}
    for name, p in parts.items():
        dx, dy = tails[name][0] - p["pivot"][0], tails[name][1] - p["pivot"][1]
        n = math.hypot(dx, dy) or 1.0
        axis[name] = (dx / n, dy / n)
    order = []

    def visit(n):
        if n in order:
            return
        par = parts[n].get("parent")
        if par:
            visit(par)
        order.append(n)

    for n in parts:
        visit(n)
    r["tail"], r["axis"], r["order"] = tails, axis, order
    r["char"] = char
    _RIGS[char] = r
    return r


def _leaf_kind(name):
    for k in ("hand", "foot", "head", "hair", "note"):
        if name.startswith(k):
            return k
    return name


# Leaf bone tails relative to the pivot, part px (direction the leaf points in its neutral drawing).
LEAF_TAIL = {"hand": (0, 60), "foot": (70, 20), "head": (0, -95), "hair": (0, -50), "note": (0, 45)}


def world(r, pose):
    """{part: affine part px -> screen px} for a pose."""
    parts = r["parts"]
    s = CHARS[r["char"]]["scale"]
    rot, ln = pose.get("rot", {}), pose.get("len", {})
    out, rigid = {}, {}
    for name in r["order"]:
        p = parts[name]
        px, py = p["pivot"]
        if p.get("parent"):
            # a parent's foreshortening moves this joint along the parent's bone but does not squash this part
            par = parts[p["parent"]]
            k = ln.get(p["parent"], 1.0)
            ox, oy = p["offset"]
            if k != 1.0:
                ox, oy = apply(axis_scale(r["axis"][p["parent"]], k), (ox - par["pivot"][0], oy - par["pivot"][1]))
                ox, oy = ox + par["pivot"][0], oy + par["pivot"][1]
            base = mul(rigid[p["parent"]], T(ox, oy))
        else:
            base = mul(T(*pose["root"]), S(s))
        m = mul(base, R(p.get("rotation", 0) + rot.get(name, 0.0)))
        rigid[name] = mul(m, T(-px, -py))
        k = ln.get(name, 1.0)
        out[name] = mul(mul(m, axis_scale(r["axis"][name], k)), T(-px, -py)) if k != 1.0 else rigid[name]
    return out


def joint(r, W, part):
    """Screen position of a part's pivot (its joint) in world matrices W."""
    return apply(W[part], r["parts"][part]["pivot"])


def tail(r, W, part):
    return apply(W[part], r["tail"][part])


def visible_alpha(r, pose, part):
    a = pose.get("alpha", {})
    if part in a:
        return a[part]
    return 0.0 if r["parts"][part].get("hidden") else 1.0


def z_of(r, pose, part):
    return pose.get("z", {}).get(part, r["parts"][part]["z"])


def neutral(char, root=(0.0, 0.0)):
    return {"root": root, "rot": {}, "len": {}, "alpha": {}, "z": {}, "props": {}}


# ------------------------------------------------------------------------------------------------------------- IK
def bone_dir_angle(r, W, part):
    """Current screen angle of a part's bone (pivot -> tail)."""
    a, b = joint(r, W, part), tail(r, W, part)
    return angle_of((b[0] - a[0], b[1] - a[1]))


def bone_len(r, W, part):
    a, b = joint(r, W, part), tail(r, W, part)
    return math.hypot(b[0] - a[0], b[1] - a[1])


def two_bone_ik(r, pose, upper, lower, target, bend):
    """Set pose['rot'][upper] and pose['rot'][lower] so the lower bone's tail (wrist / ankle) lands on target (screen
    px). bend = +1 or -1 picks the elbow/knee side (+1: the joint bends clockwise from the upper bone). Out-of-reach
    targets straighten the limb towards the target (lengths never change). Returns the reach error in px."""
    rot = pose.setdefault("rot", {})
    rot[upper] = 0.0
    rot[lower] = 0.0
    W = world(r, pose)
    a = joint(r, W, upper)
    l1, l2 = bone_len(r, W, upper), bone_len(r, W, lower)
    dx, dy = target[0] - a[0], target[1] - a[1]
    d = max(1e-6, min(math.hypot(dx, dy), (l1 + l2) * 0.99999, ))
    d = max(d, abs(l1 - l2) + 1e-6)
    # angle at the shoulder between the target line and the upper bone
    cos_a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    alpha = math.degrees(math.acos(max(-1.0, min(1.0, cos_a))))
    cos_b = (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)
    beta = math.degrees(math.acos(max(-1.0, min(1.0, cos_b))))  # inner angle at the elbow
    tgt = angle_of((dx, dy))
    up_angle = tgt - bend * alpha
    rot[upper] = _wrap(up_angle - bone_dir_angle(r, W, upper))
    W = world(r, pose)
    low_angle = up_angle + bend * (180.0 - beta)
    rot[lower] = _wrap(low_angle - bone_dir_angle(r, W, lower))
    W = world(r, pose)
    e = tail(r, W, lower)
    return math.hypot(e[0] - target[0], e[1] - target[1])


def abs_rot(W, part):
    """Screen rotation of a part relative to its neutral drawing (degrees, clockwise +); scale-free."""
    a, b, c, d, e, f = W[part]
    return math.degrees(math.atan2(d, a))


def set_abs_rot(r, pose, part, deg):
    """Rotate a part so it sits at `deg` relative to its neutral drawing on screen, whatever its parents do."""
    rot = pose.setdefault("rot", {})
    rot[part] = 0.0
    rot[part] = _wrap(deg - abs_rot(world(r, pose), part))


def set_world_angle(r, pose, part, angle):
    """Rotate a part so its bone points at the given screen angle."""
    rot = pose.setdefault("rot", {})
    rot[part] = 0.0
    W = world(r, pose)
    rot[part] = _wrap(angle - bone_dir_angle(r, W, part))


def _wrap(a):
    return (a + 180.0) % 360.0 - 180.0
