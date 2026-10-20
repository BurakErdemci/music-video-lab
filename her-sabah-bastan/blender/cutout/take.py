# The cut-out test take: one continuous shot per character, as 2D poses (pose.py) for every film frame. Pure Python;
# build.py keys these into the Blender armatures, preview.py draws them rigidly for blocking.
#
# Timeline (30 fps, FRAMES = 510):
#   human  0-45 typing | 45-125 stretch up and back | 125-232 mug: reach, lift, sip, put down | 232-290 typing
#          290-335 stands up | 335-425 walks across the room | 425-500 sits down cross-legged | 500-510 settles
#   AI     0-160 reads | 160-215 turns a page | 215-290 reads | 290-340 looks up toward the glass | 340-510 holds
#
# Controls are keyed tracks (Track: piecewise cubic, flat at extremes so nothing overshoots) on: the pelvis pivot
# (root), the spine chain (local rotations), wrist and ankle targets (two-bone IK, lengths never change), absolute
# hand/foot angles and hand variants. Feet in the walk are solved from locked contact points (heel, then ball), so a
# planted foot cannot slide. Hands on the mug and the notebook are solved from the prop, so contact holds every frame.
# Hair and sticky notes follow with damped springs (secondary motion).
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pose as P  # noqa: E402

FRAMES = 510
FLOOR_H = 997.0  # the human's floor line in the room plate (chair and desk feet)
FLOOR_A = 1010.0  # the AI's floor line (video/src/layout.ts FLOOR_Y)
XF = 6  # hand-variant crossfade, frames (>= 4: never a visible pop)

# contact points on the sole, foot px (measured on parts/*/foot_near.png)
HEEL = {"human": (14.0, 76.0), "ai": (110.0, 60.0)}
TOE = {"human": (124.0, 72.0), "ai": (8.0, 52.0)}
BALL = {"human": (95.0, 77.0), "ai": (35.0, 61.0)}


# ------------------------------------------------------------------------------------------------------- tracks
class Track:
    """Keys [(frame, value)] (value: number or tuple). Cubic Hermite between keys; the tangent at a key is the
    neighbours' slope, set flat where the value turns (no overshoot) and limited like Fritsch-Carlson."""

    def __init__(self, keys):
        keys = sorted(keys, key=lambda k: k[0])
        self.t = [float(k[0]) for k in keys]
        self.tuple = isinstance(keys[0][1], (tuple, list))
        self.v = [tuple(k[1]) if self.tuple else (float(k[1]),) for k in keys]
        n, dim = len(self.t), len(self.v[0])
        self.m = [[0.0] * dim for _ in range(n)]
        for i in range(1, n - 1):
            for c in range(dim):
                d0 = (self.v[i][c] - self.v[i - 1][c]) / (self.t[i] - self.t[i - 1])
                d1 = (self.v[i + 1][c] - self.v[i][c]) / (self.t[i + 1] - self.t[i])
                if d0 * d1 <= 0:
                    continue
                m = (self.v[i + 1][c] - self.v[i - 1][c]) / (self.t[i + 1] - self.t[i - 1])
                self.m[i][c] = math.copysign(min(abs(m), 3 * abs(d0), 3 * abs(d1)), m)

    def __call__(self, f):
        t, v = self.t, self.v
        if f <= t[0]:
            out = v[0]
        elif f >= t[-1]:
            out = v[-1]
        else:
            i = max(j for j in range(len(t) - 1) if t[j] <= f)
            h = t[i + 1] - t[i]
            s = (f - t[i]) / h
            h00, h10, h01, h11 = 2 * s**3 - 3 * s**2 + 1, s**3 - 2 * s**2 + s, -2 * s**3 + 3 * s**2, s**3 - s**2
            out = tuple(h00 * v[i][c] + h10 * h * self.m[i][c] + h01 * v[i + 1][c] + h11 * h * self.m[i + 1][c]
                        for c in range(len(v[i])))
        return out if self.tuple else out[0]


def ease(s):
    s = min(1.0, max(0.0, s))
    return s * s * (3 - 2 * s)


def wrap(d):
    return (d + 180.0) % 360.0 - 180.0


def lerp(a, b, s):
    if isinstance(a, tuple):
        return tuple(x + (y - x) * s for x, y in zip(a, b))
    return a + (b - a) * s


def variants(schedule, f, side, kinds=("open", "grip", "point", "notebook")):
    """Hand-variant alphas at frame f from [(frame, kind)]: the incoming hand fades in over XF frames on top of the
    outgoing one, which fades out over the second half and after (no dip in coverage, no pop)."""
    cur, prev, f0 = schedule[0][1], None, -1e9
    for fs, k in schedule:
        if fs <= f:
            if k != cur:
                prev, cur, f0 = cur, k, fs
        else:
            break
    alpha, z = {}, {}
    s = (f - f0) / XF
    for k in kinds:
        a = 0.0
        if k == cur:
            a = ease(s) if prev else 1.0
        elif k == prev:
            a = 1.0 - ease((s - 0.5) / 1.0)
        alpha[f"hand_{side}_{k}"] = a
    if prev and s < 1.5:
        z[f"hand_{side}_{cur}"] = None  # filled in by the caller: incoming hand above the outgoing one
    return alpha, z


# ---------------------------------------------------------------------------------------------------- pose solve
def solve(char, c):
    """Build a pose from controls c:
    root, pelvis, chest, neck, head (degrees, local), arms {side: (wrist xy, hand abs deg)},
    legs {side: (ankle xy, foot abs deg)}, len {}, hands {side: schedule}, f, props {}."""
    r = P.rig(char)
    face = P.CHARS[char]["face"]
    pz = {"root": c["root"], "rot": {"pelvis": c["pelvis"], "chest": c["chest"], "neck": c["neck"], "head": c["head"]},
          "len": dict(c.get("len", {})), "alpha": {}, "z": {}, "props": c.get("props", {})}
    floor = FLOOR_H if char == "human" else FLOOR_A
    for side in ("near", "far"):
        if len(c["legs"][side]) == 3:  # forward kinematics: (thigh angle, shin angle, foot) on screen (folded legs:
            # near 180 degrees of knee bend two-bone IK is too close to its singular pose to hold an angle)
            a_th, a_sh, foot = c["legs"][side]
            for _ in range(40):  # a sole point under the floor: the shin turns further into depth (shorter on screen)
                P.set_world_angle(r, pz, f"thigh_{side}", a_th)
                P.set_world_angle(r, pz, f"shin_{side}", a_sh)
                P.set_abs_rot(r, pz, f"foot_{side}", foot)
                W = P.world(r, pz)
                low = max(P.apply(W[f"foot_{side}"], pt)[1] for pt in (HEEL[char], BALL[char], TOE[char]))
                if low <= floor + 0.5 or pz["len"].get(f"shin_{side}", 1.0) <= 0.25:
                    break
                pz["len"][f"shin_{side}"] = pz["len"].get(f"shin_{side}", 1.0) - 0.02
            continue
        ankle, foot = c["legs"][side]
        for _ in range(2):  # a sole point under the floor lifts the ankle target by that much and solves again
            P.two_bone_ik(r, pz, f"thigh_{side}", f"shin_{side}", ankle, bend=face)
            P.set_abs_rot(r, pz, f"foot_{side}", foot)
            W = P.world(r, pz)
            low = max(P.apply(W[f"foot_{side}"], pt)[1] for pt in (HEEL[char], BALL[char], TOE[char]))
            if low <= floor + 0.5:
                break
            ankle = (ankle[0], ankle[1] - (low - floor))
    for side in ("near", "far"):
        wrist, hand = c["arms"][side]
        P.two_bone_ik(r, pz, f"upper_arm_{side}", f"forearm_{side}", wrist, bend=-face)
        names = [n for n in r["parts"] if n.startswith(f"hand_{side}_")]
        P.set_abs_rot(r, pz, names[0], hand)
        for n in names[1:]:
            pz["rot"][n] = pz["rot"][names[0]]
        alpha, z = variants(c["hands"][side], c["f"], side)
        pz["alpha"].update(alpha)
        for n in z:
            pz["z"][n] = r["parts"][n]["z"] + 0.5
    return pz


def foot_on(char, contact, contact_xy, angle):
    """Ankle position that puts the sole point `contact` (foot px) at contact_xy with the foot at `angle` (abs)."""
    r = P.rig(char)
    s = P.CHARS[char]["scale"]
    px, py = r["parts"]["foot_near"]["pivot"]
    dx, dy = (contact[0] - px) * s, (contact[1] - py) * s
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    return (contact_xy[0] - (ca * dx - sa * dy), contact_xy[1] - (sa * dx + ca * dy))


def flat_ankle(char, x, floor):
    """Ankle of a flat foot standing on the floor with its ankle at screen x."""
    r = P.rig(char)
    s = P.CHARS[char]["scale"]
    return (x, floor - (BALL[char][1] - r["parts"]["foot_near"]["pivot"][1]) * s)


# --------------------------------------------------------------------------------------------------------- human
DESK_TOP = 725.0
MUG_HOME = (262.0, DESK_TOP + 1.0)
MOUTH = (88.0, 97.0)  # on parts/human/head.png
MUG_RIM = (5.0, 7.0)  # mug px: the near rim corner that touches the lip
MUG_GRIP = (-27.0, -13.0)  # wrist relative to the mug pivot, mug px: the fist wraps the lower half of the body


def breathe(f, amp=0.8, period=110.0, phase=0.0):
    return amp * math.sin(2 * math.pi * (f / period + phase))


def human_tracks():
    T = Track
    seat = (168.0, 752.0)
    stand_x = 214.0
    k = {}
    # root path: seated | stand up | walk (root y bobs: low after each strike, high at passing) | sit on the floor
    k["root"] = T([(0, seat), (48, seat), (75, (166, 750)), (100, (162, 751)), (125, seat), (150, (172, 752)),
                   (180, (166, 751)), (230, seat), (290, seat), (300, (176, 752)), (308, (188, 752)), (318, (204, 738)),
                   (327, (212, 718)), (336, (stand_x, 713)),
                   (345, (236, 717)), (361, (300, 724)), (369, (334, 716)), (379, (380, 724)), (387, (414, 716)),
                   (397, (460, 724)), (405, (494, 716)), (415, (535, 723)), (424, (556, 714)),
                   (430, (558, 716)), (446, (548, 768)), (460, (530, 860)), (472, (516, 919)), (480, (514, 924)),
                   (510, (516, 924))])
    k["pelvis"] = T([(0, -4), (290, -4), (306, 6), (318, 8), (336, 0), (424, 0), (446, 8), (462, 0), (474, -14), (490, -8),
                     (510, -8)])
    k["chest"] = T([(0, 20), (45, 20), (58, 12), (76, 2), (90, -12), (104, -16), (116, -2), (128, 14), (148, 22),
                    (172, 8), (196, 4), (214, 12), (232, 20), (290, 20), (300, 26), (312, 34), (324, 18), (336, 4),
                    (424, 5), (446, 30), (462, 26), (478, 16), (510, 14)])
    k["neck"] = T([(0, -6), (45, -6), (76, -10), (98, -16), (116, -6), (148, -4), (176, -8), (196, -10), (214, -4),
                   (290, -6), (312, -12), (336, 0), (424, 0), (446, -12), (470, -8), (490, 2), (510, 4)])
    k["head"] = T([(0, -8), (24, -6), (45, -8), (76, -14), (100, -26), (116, -8), (148, -4), (178, -10), (194, -16),
                   (212, -6), (232, -8), (290, -8), (312, -10), (336, 2), (424, 2), (446, -8), (470, -6), (490, 4),
                   (510, 6)])
    # wrists (near, far): typing | stretch | near on the mug (solved from the mug, see below) | typing | stand up
    type_n, type_f = (318.0, 706.0), (330.0, 702.0)
    thigh_n, thigh_f = (228.0, 772.0), (222.0, 770.0)
    up_n, up_f = (196.0, 392.0), (206.0, 388.0)
    k["wn"] = T([(0, type_n), (46, type_n), (56, (296, 688)), (66, (236, 560)), (78, up_n), (92, (170, 398)),
                 (106, (160, 404)), (118, (172, 494)), (129, (206, 664)), (137, thigh_n), (139, thigh_n),
                 (146, (236, 702)), (232, (250, 704)), (242, type_n), (290, type_n), (296, (262, 716)),
                 (316, (266, 716)), (326, (250, 740)), (336, (stand_x + 30, 698))])
    k["wf"] = T([(0, type_f), (48, type_f), (58, (302, 684)), (68, (244, 556)), (80, up_f), (94, (180, 394)),
                 (108, (170, 400)), (120, (180, 492)), (131, (212, 664)), (139, thigh_f), (226, thigh_f),
                 (238, (300, 712)), (246, type_f), (290, type_f), (297, (270, 714)), (316, (274, 714)), (327, (258, 738)),
                 (336, (stand_x + 26, 698))])
    k["hn"] = T([(0, -50), (46, -50), (62, -150), (78, -175), (106, -185), (118, -120), (129, -50), (137, -40),
                 (146, -90), (242, -50), (290, -50), (296, -85), (316, -85), (326, -40), (336, -8)])
    k["hf"] = T([(0, -50), (48, -50), (64, -150), (80, -175), (108, -185), (120, -120), (131, -50), (226, -40),
                 (246, -50), (290, -50), (297, -85), (316, -85), (327, -40), (336, -8)])
    # mug: 0 at home, 1 at the lips; tilt in degrees (negative tips the rim towards him)
    k["mug_u"] = T([(0, 0), (150, 0), (178, 1), (204, 1), (226, 0), (510, 0)])
    k["mug_tilt"] = T([(0, 0), (152, 0), (170, -8), (182, -22), (192, -42), (202, -30), (212, -8), (224, 0), (510, 0)])
    # seated feet (on tiptoe: the 2D legs are shorter than the chair is high), then back under the seat to stand up
    k["an"] = T([(0, (240, 948)), (290, (240, 948)), (294, (232, 942)), (299, (214, 948)), (304, (206, 960)),
                 (336, (206, 960))])
    k["af"] = T([(0, (230, 946)), (292, (230, 946)), (297, (224, 938)), (303, (212, 948)), (308, (200, 960)),
                 (336, (200, 960))])
    k["fn"] = T([(0, 28), (290, 28), (299, 16), (304, 0), (336, 0)])
    k["ff"] = T([(0, 30), (292, 30), (303, 16), (308, 0), (336, 0)])
    return k


def toe_off(ch, x, floor, ang):
    """Ankle of a foot (flat ankle x) whose heel has risen by ang, rolling over the ball onto the toe tip: the contact
    moves from the ball to the toe so no part of the sole dips under the floor."""
    sc = P.CHARS[ch]["scale"]
    px, py = P.rig(ch)["parts"]["foot_near"]["pivot"]
    ball = foot_on(ch, BALL[ch], (x + (BALL[ch][0] - px) * sc, floor), ang)
    toe_xy = (x + (TOE[ch][0] - px) * sc, floor - (BALL[ch][1] - TOE[ch][1]) * sc)
    toe = foot_on(ch, TOE[ch], toe_xy, ang)
    return toe if toe[1] < ball[1] else ball


def walk_feet(f, ch="human", floor=FLOOR_H):
    """Ankle and foot angle of both feet in the walk (335-425) from locked contacts.
    Steps: (side, lift, strike, ankle x from, ankle x to)."""
    steps = [("near", 345, 361, 206, 318), ("far", 357, 377, 200, 428), ("near", 375, 395, 318, 538),
             ("far", 393, 412, 428, 562), ("near", 410, 424, 538, 572)]
    out = {}
    for side in ("near", "far"):
        mine = [s for s in steps if s[0] == side]
        x_now = mine[0][3]
        res = None
        for _, lift, strike, x0, x1 in mine:
            if f < lift - 8:
                break
            if f <= lift:  # toe-off: the heel rises about the planted ball
                s = ease((f - (lift - 8)) / 8)
                ang = 26 * s
                res = (toe_off(ch, x0, floor, ang), ang)
                break
            if f < strike:  # swing: from toe-off to heel strike on an arc
                s = (f - lift) / (strike - lift)
                a0 = toe_off(ch, x0, floor, 26)
                heel1 = (x1 + (HEEL[ch][0] - 33.5) * P.CHARS[ch]["scale"], floor)
                a1 = foot_on(ch, HEEL[ch], heel1, -14)
                ex = ease(min(1.0, s * 1.1))  # along the floor first, so the heel comes down vertically
                ankle = (lerp(a0[0], a1[0], ex), lerp(a0[1], a1[1], ease(s)) - 26 * math.sin(math.pi * s))
                ang = lerp(26, -14, ease(min(1, s * 1.3)))
                res = (ankle, ang)
                break
            if f <= strike + 6:  # heel strike: foot comes down about the heel
                s = ease((f - strike) / 6)
                ang = -14 * (1 - s)
                heel1 = (x1 + (HEEL[ch][0] - 33.5) * P.CHARS[ch]["scale"], floor)
                res = (foot_on(ch, HEEL[ch], heel1, ang), ang)
                break
            x_now = x1
        if res is None:
            res = (flat_ankle(ch, x_now, floor), 0.0)
        out[side] = res
    return out


def human_controls():
    k = human_tracks()
    r = P.rig("human")
    hands = {"near": [(0, "point"), (48, "open"), (138, "grip"), (230, "open"), (236, "point"), (292, "open")],
             "far": [(0, "point"), (50, "open"), (238, "point"), (293, "open")]}
    out = []
    for f in range(FRAMES):
        c = {"f": f, "root": k["root"](f), "pelvis": k["pelvis"](f), "chest": k["chest"](f) + breathe(f),
             "neck": k["neck"](f), "head": k["head"](f), "hands": hands, "len": {}, "props": {}}
        # typing taps: alternate hands press 5 px every 4-5 frames
        wn, wf = k["wn"](f), k["wf"](f)
        typing = (f < 46) or (242 <= f < 290)
        if typing:
            ph = f % 9
            wn = (wn[0], wn[1] + (5 * math.sin(math.pi * ph / 4.5) if ph < 4.5 else 0))
            wf = (wf[0], wf[1] + (5 * math.sin(math.pi * (ph - 4.5) / 4.5) if ph >= 4.5 else 0))
        hn, hf = k["hn"](f), k["hf"](f)
        # legs: seated / standing up | walk | floor sit
        if f < 336:
            legs = {"near": (k["an"](f), k["fn"](f)), "far": (k["af"](f), k["ff"](f))}
        elif f < 426:
            wk = walk_feet(f)
            legs = {"near": wk["near"], "far": wk["far"]}
        else:
            legs = floor_sit_legs(f, c["root"], c["pelvis"])
            c["len"] = legs.pop("len")
        c["legs"] = legs
        # walk: arms swing against the legs, the far arm against the near leg
        if 336 <= f < 430:
            x, y = c["root"]
            ph = walk_phase(f)
            fade = ease((f - 336) / 10) * (1 - ease((f - 418) / 12))
            wn = (x + 30 - 24 * ph * fade, y - 16 + 4 * abs(ph) * fade)
            wf = (x + 26 + 24 * ph * fade, y - 16 + 4 * abs(ph) * fade)
            hn, hf = -8 + 14 * ph * fade, -8 - 14 * ph * fade
        if f >= 426:
            wn, hn, wf, hf = floor_sit_arms(f, c, r)
        c["arms"] = {"near": (wn, hn), "far": (wf, hf)}
        c["mug"] = (k["mug_u"](f), k["mug_tilt"](f))
        out.append(c)
    return out


def walk_phase(f):
    """-1..1: +1 when the near leg is forward (just struck), -1 when the far one is."""
    marks = [(336, 0), (359, 1), (377, -1), (395, 1), (412, -1), (424, 0.3), (430, 0)]
    return Track(marks)(f)


def hip_of(char, root, pelvis):
    r = P.rig(char)
    W = P.world(r, {"root": root, "rot": {"pelvis": pelvis}})
    return P.joint(r, W, "thigh_near")


def leg_lengths(char, lens=(1.0, 1.0)):
    r = P.rig(char)
    s = P.CHARS[char]["scale"]
    out = []
    for part, k in zip(("thigh_near", "shin_near"), lens):
        px, py = r["parts"][part]["pivot"]
        tx, ty = r["tail"][part]
        out.append(math.hypot(tx - px, ty - py) * s * k)
    return out


def fk_ankle(hip, a_thigh, a_shin, lt, ls):
    """Ankle from the screen angles of the thigh and shin bones (degrees, clockwise from +x)."""
    return (hip[0] + lt * math.cos(math.radians(a_thigh)) + ls * math.cos(math.radians(a_shin)),
            hip[1] + lt * math.sin(math.radians(a_thigh)) + ls * math.sin(math.radians(a_shin)))


def ik_angles(char, hip, ankle, bend, lt, ls):
    """Screen angles (thigh, shin) of a two-bone leg reaching ankle from hip."""
    dx, dy = ankle[0] - hip[0], ankle[1] - hip[1]
    d = max(abs(lt - ls) + 1e-6, min(math.hypot(dx, dy), lt + ls - 1e-6))
    a = math.degrees(math.acos((lt * lt + d * d - ls * ls) / (2 * lt * d)))
    b = math.degrees(math.acos((lt * lt + ls * ls - d * d) / (2 * lt * ls)))
    up = math.degrees(math.atan2(dy, dx)) - bend * a
    return up, up + bend * (180 - b)


# crossed legs (screen angles of thigh and shin bones; lengths foreshortened: in profile the crossed shins run across
# the body, towards or away from the camera)
CROSS = {"human": {"near": (-8.0, 174.0), "far": (-18.0, 168.0), "len": (1.0, 0.5), "foot": (-60.0, -30.0)},
         "ai": {"near": (194.0, 15.0), "far": (196.0, 21.0), "len": (0.9, 0.5), "foot": (25.0, 25.0)}}


def crossed_legs(char, hip, s=1.0, start=None, start_len=(1.0, 1.0)):
    """Legs crossed (s = 1), or blended from `start` {side: (thigh angle, shin angle, foot angle)} by s."""
    cr = CROSS[char]
    out = {"len": {}}
    face = P.CHARS[char]["face"]
    for i, side in enumerate(("near", "far")):
        at, ash = cr[side]
        foot = cr["foot"][i]
        # the shin folds (and foreshortens) first while the knee is still up, then the thigh comes down: folding
        # both at once swings the shin straight down through the floor
        s_sh, s_th = min(1.0, s * 1.3), max(0.0, s * 1.3 - 0.3) / 1.0
        # mid-fold the shin turns through depth (towards the camera): it reads shortest when pointing at the floor
        lens = (lerp(start_len[0], cr["len"][0], s_th),
                lerp(start_len[1], cr["len"][1], s_sh))
        if start is not None and s < 1:
            st, ss, sf = start[side]
            at, ash = st + wrap(at - st) * s_th, ss + wrap(ash - ss) * s_sh
            foot = lerp(sf, foot, s_sh)
        out[side] = (at, ash, foot)
        out["len"][f"thigh_{side}"] = lens[0]
        out["len"][f"shin_{side}"] = lens[1]
        out["len"][f"foot_{side}"] = lerp(1.0, 0.75, s)
    return out


SLIDE_LEN = 0.75  # shin foreshortening reached while the heels slide in (the knees turn outwards)


def floor_sit_legs(f, root, pelvis):
    """425-510: knees bend, the seat goes down and back to the floor while the feet slide forward on their heels (the
    2D thigh is much shorter than the shin, so planted feet under a low seat would throw the knees above the hips);
    476-488 the heels slide back in towards the seat, knees up and turning out; 488-504 the knees come down and the
    legs fold into CROSS (forward kinematics from the slid-in pose)."""
    sc = P.CHARS["human"]["scale"]
    feet = {"near": Track([(446, (572, 0)), (452, (572, 8)), (470, (640, -18)), (476, (642, -18)), (486, (598, -6))]),
            "far": Track([(448, (562, 0)), (454, (562, 8)), (472, (628, -16)), (478, (630, -16)), (486, (588, -6))])}
    shin_len = lerp(1.0, SLIDE_LEN, ease((f - 476) / 10))

    def planted(side, ff):
        x, ang = feet[side](ff)
        if ang >= 0:  # heel up about the ball
            return foot_on("human", BALL["human"], (x + (BALL["human"][0] - 33.5) * sc, FLOOR_H), ang), ang
        return foot_on("human", HEEL["human"], (x + (HEEL["human"][0] - 33.5) * sc, FLOOR_H), ang), ang

    lens = {"shin_near": shin_len, "shin_far": shin_len}
    if f < 486:
        return {"near": planted("near", f), "far": planted("far", f), "len": lens}
    s = ease((f - 486) / 20)
    hip = hip_of("human", root, pelvis)
    lt, ls = leg_lengths("human", (1.0, SLIDE_LEN))
    start = {}
    for side in ("near", "far"):
        ank, ang = planted(side, 486)
        start[side] = ik_angles("human", hip, ank, 1, lt, ls) + (ang,)
    return crossed_legs("human", hip, s, start, start_len=(1.0, SLIDE_LEN))


def floor_sit_arms(f, c, r):
    """Hands forward for balance, then back to the floor behind the hip to take the weight as the seat lands, then
    onto the knees once the legs are crossed."""
    x, y = c["root"]
    pre_n = Track([(426, (x + 30, y - 16)), (440, (x + 84, y - 30)), (452, (x + 60, y + 20)), (464, (492, 972)),
                   (478, (490, 974))])
    pre_f = Track([(428, (x + 26, y - 16)), (442, (x + 80, y - 28)), (454, (x + 58, y + 22)), (466, (500, 970)),
                   (480, (498, 972))])
    s = ease((f - 482) / 16)
    pz = solve("human", {**c, "arms": {"near": ((x + 30, y), 0), "far": ((x + 30, y), 0)}})
    W = P.world(r, pz)
    kn = P.joint(r, W, "shin_near")
    kf = P.joint(r, W, "shin_far")
    wn = lerp(pre_n(f), (kn[0] - 8, kn[1] - 16), s)
    wf = lerp(pre_f(f), (kf[0] - 16, kf[1] - 18), s)
    h = Track([(426, -8), (440, -70), (452, -30), (464, 30), (478, 30)])(f)  # fingers back, palm down on the floor
    return wn, lerp(h, -55, s), wf, lerp(h + 4, -60, s)


# -------------------------------------------------------------------------------------------------------------- AI
BOOK_SPINE_LOCAL_PAGE_CORNER = (50.0, 72.0)  # book_page px: the outer bottom corner her near hand turns


def ai_controls():
    T = Track
    root = (1196.0, 985.0)
    k = {}
    k["chest"] = T([(0, -12), (160, -12), (190, -14), (215, -12), (290, -12), (322, -6), (340, -3), (420, -4), (510, -3)])
    k["neck"] = T([(0, -6), (290, -6), (326, 6), (342, 10), (510, 8)])
    k["head"] = T([(0, -18), (40, -16), (80, -19), (125, -15), (160, -18), (188, -21), (215, -18), (250, -16),
                   (290, -18), (318, 4), (334, 14), (346, 12), (420, 12), (450, 15), (480, 13), (510, 12)])
    # the book (spine pivot): held up in front of her, lowered a little when she looks up
    k["book"] = T([(0, (1086, 806)), (160, (1086, 806)), (188, (1083, 803)), (215, (1086, 806)), (290, (1086, 806)),
                   (336, (1092, 840)), (510, (1092, 842))])
    k["book_rot"] = T([(0, 6), (290, 6), (336, 14), (510, 14)])
    k["page"] = T([(0, 1.0), (176, 1.0), (196, -0.15), (204, -1.0), (510, -1.0)])
    k["page_lift"] = T([(0, 0), (176, 0), (188, -10), (200, -6), (206, 0), (510, 0)])
    # near hand: on the right page edge; 170-210 it takes the page corner over the spine
    k["turn"] = T([(0, 0), (166, 0), (176, 1), (204, 1), (214, 0), (510, 0)])
    hands = {"near": [(0, "notebook"), (170, "grip"), (210, "notebook")], "far": [(0, "notebook")]}
    out = []
    for f in range(FRAMES):
        bpos, brot = k["book"](f), k["book_rot"](f)
        sx = k["page"](f)
        back = {"pos": bpos, "rot": brot, "z": 19}
        page = {"pos": bpos, "rot": brot, "sx": sx, "sy": 1.0, "z": 19.2}
        Mb = P.prop_matrix("book_back", back)
        Mp = P.prop_matrix("book_page", page)
        rest_n = P.apply(Mb, (104.0, 66.0))  # near hand: right page, low outer edge
        corner = P.apply(Mp, BOOK_SPINE_LOCAL_PAGE_CORNER)
        u = k["turn"](f)
        wn = lerp((rest_n[0] + 10, rest_n[1] + 2), (corner[0] + 10, corner[1] + 4 + k["page_lift"](f)), u)
        wf = P.apply(Mb, (60.0, 80.0))  # far hand: behind the book, under the spine
        c = {"f": f, "root": root, "pelvis": 6, "chest": k["chest"](f) + breathe(f, 0.7, 120, 0.3),
             "neck": k["neck"](f), "head": k["head"](f), "hands": hands, "len": {}, "props": {"book_back": back,
                                                                                               "book_page": page}}
        c["arms"] = {"near": (wn, brot + 70), "far": (wf, brot + 170)}
        legs = crossed_legs("ai", hip_of("ai", root, c["pelvis"]))
        c["len"] = legs.pop("len")
        c["legs"] = legs
        out.append(c)
    return out


# ----------------------------------------------------------------------------------------------- secondary motion
def spring(target, omega, zeta, clamp=None):
    """Damped spring following a target sequence (one value per frame); returns the followed values."""
    x, v = target[0], 0.0
    out = []
    dt = 1.0 / 30.0
    for tg in target:
        for _ in range(4):  # substeps for stability
            a = omega * omega * (tg - x) - 2 * zeta * omega * v
            v += a * dt / 4
            x += v * dt / 4
        if clamp is not None:
            x = max(tg - clamp, min(tg + clamp, x))
        out.append(x)
    return out


def add_secondary(char, poses):
    r = P.rig(char)
    Ws = [P.world(r, pz) for pz in poses]
    if "hair" in r["parts"]:
        head = [P.abs_rot(W, "head") for W in Ws]
        hp = [P.joint(r, W, "hair") for W in Ws]
        # lag the head's turns, and swing back against horizontal acceleration of the head
        acc = [0.0] + [hp[i + 1][0] - 2 * hp[i][0] + hp[i - 1][0] for i in range(1, len(hp) - 1)] + [0.0]
        tgt = [h + 2.2 * a for h, a in zip(head, acc)]
        hair = spring(tgt, 2 * math.pi * 2.2, 0.45, clamp=9.0)
        for pz, W, h in zip(poses, Ws, hair):
            P.set_abs_rot(r, pz, "hair", h)
    notes = [n for n in r["parts"] if n.startswith("note_")]
    for n in notes:
        par = r["parts"][n]["parent"]
        base = [P.abs_rot(W, par) for W in Ws]
        pv = [P.joint(r, W, n) for W in Ws]
        acc = [0.0] + [pv[i + 1][0] - 2 * pv[i][0] + pv[i - 1][0] for i in range(1, len(pv) - 1)] + [0.0]
        vel = [0.0] + [pv[i][1] - pv[i - 1][1] for i in range(1, len(pv))]
        # a note is stuck at its top edge: it flutters only on big moves (lateral push, fast drops)
        tgt = [b + 3.0 * a + 0.12 * max(0.0, -v) for b, a, v in zip(base, acc, vel)]
        fl = spring(tgt, 2 * math.pi * 3.0, 0.3, clamp=6.0)
        for pz, b, x in zip(poses, base, fl):
            pz["rot"][n] = x - b
    return poses


# ------------------------------------------------------------------------------------------------------- entry
_CACHE = {}


def poses(char):
    if char in _CACHE:
        return _CACHE[char]
    if char == "human":
        out = []
        r = P.rig("human")
        for c in human_controls():
            # mug: pose the body first (head drives the mouth target), then the mug, then lock the near hand to it
            u, tilt = c.pop("mug")
            pz0 = solve("human", c)
            W = P.world(r, pz0)
            mouth = P.apply(W["head"], MOUTH)
            mug = {"pos": MUG_HOME, "rot": 0.0, "z": 23.0}
            if u > 0:
                at_lip = _mug_at(mouth, tilt)
                e = ease(u)
                pos = lerp(MUG_HOME, at_lip, e)
                pos = (pos[0], pos[1] - 18 * math.sin(math.pi * e))  # lift clear of the desk, not along it
                mug = {"pos": pos, "rot": tilt * e if u < 1 else tilt, "z": 23.0}
            c["props"] = {"mug": mug}
            f = c["f"]
            if 146 <= f <= 230:  # holding: wrist and fist from the mug
                Mm = P.prop_matrix("mug", mug)
                mpx, mpy = P.PROPS["mug"]["pivot"]
                hold = P.apply(Mm, (mpx + MUG_GRIP[0], mpy + MUG_GRIP[1]))
                reach = ease((f - 146) / 6) * (1 - ease((f - 224) / 6))
                wn, hn = c["arms"]["near"]
                c["arms"]["near"] = (lerp(wn, hold, reach), lerp(hn, mug["rot"] - 90, reach))
            out.append(solve("human", c))
        _CACHE[char] = add_secondary("human", out)
    else:
        _CACHE[char] = add_secondary("ai", [solve("ai", c) for c in ai_controls()])
    return _CACHE[char]


def _mug_at(mouth, tilt):
    """Mug pivot that puts its rim corner MUG_RIM a little in front of the mouth at this tilt."""
    px, py = P.PROPS["mug"]["pivot"]
    dx, dy = MUG_RIM[0] - px, MUG_RIM[1] - py
    ca, sa = math.cos(math.radians(tilt)), math.sin(math.radians(tilt))
    rim = (ca * dx - sa * dy, sa * dx + ca * dy)
    return (mouth[0] + 4 - rim[0], mouth[1] + 2 - rim[1])


if __name__ == "__main__":
    for ch in ("human", "ai"):
        ps = poses(ch)
        print("TAKE", ch, len(ps), "poses")
