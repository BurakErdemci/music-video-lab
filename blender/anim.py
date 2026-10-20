# Keyframes of the test, called by build.py. All motion is keyed on the rig controls (hips, FK spine/neck/head, IK
# hand/foot targets and their poles); bone lengths never change. Props are keyed first and the hands are then locked
# to them (the mug handle, the book's page corner), sampled from the evaluated scene, so contact holds on every frame.
#
# Units: metres. The human's rig sits at the world origin, so its coordinates are screen coordinates (common.px_to_x /
# py_to_z). The AI's rig is turned 180 degrees about Z and placed at AI_X; its keys are in its own frame (facing +X).
#
# Timeline (30 fps), one continuous take:
#   human   0-50 typing | 50-128 stretch up and back | 128-248 mug: reach, lift, sip, put down | 248-288 typing
#           288-335 stand up | 335-420 walk across the room | 420-510 sit down cross-legged | 510-540 settle
#   AI      0-170 reads | 170-225 turns a page | 225-300 reads | 300-345 looks up towards the glass | 345-540 holds
import math

import bpy
from mathutils import Matrix, Quaternion, Vector

import common as C

V = Vector
AI_X = C.px_to_x(1185)


def RX(a):
    return Matrix.Rotation(a, 4, "X")


def RY(a):
    return Matrix.Rotation(a, 4, "Y")


def RZ(a):
    return Matrix.Rotation(a, 4, "Z")


def T(p):
    return Matrix.Translation(V(p))


def nrm(v):
    return V(v).normalized()


class Keyer:
    """Collects keys per control and writes them in time order (quaternion sign kept continuous)."""

    def __init__(self, rig, head_bias=0.0):
        self.rig = rig
        self.head_bias = head_bias  # added to every head bend: the human's face looks slightly up at rest
        self.mat = {}  # bone -> {frame: armature-space matrix}
        self.eul = {}  # bone -> {frame: (x, y, z)}
        self.last_q = {}  # bone -> last written quaternion (flushes are called in time order per bone)

    def rest_rot(self, name):
        return self.rig.data.bones[name].matrix_local.to_3x3().to_4x4()

    def matrix(self, f, name, M):
        self.mat.setdefault(name, {})[f] = M

    def hips(self, f, pos, pitch=0.0, roll=0.0, yaw=0.0):
        self.matrix(f, "hips", T(pos) @ RZ(yaw) @ RY(pitch) @ RX(roll) @ self.rest_rot("hips"))

    def fk(self, f, bone, x=0.0, y=0.0, z=0.0):
        self.eul.setdefault(bone, {})[f] = (x, y, z)

    def spine(self, f, spine=0.0, chest=0.0, neck=0.0, head=0.0, head_yaw=0.0, head_tilt=0.0):
        self.fk(f, "spine", spine)
        self.fk(f, "chest", chest)
        self.fk(f, "neck", neck)
        self.fk(f, "head", head + self.head_bias, head_yaw, head_tilt)

    def hand(self, f, side, wrist, d, palm):
        """Wrist position, finger direction d, palm normal (both in armature space)."""
        s = 1 if side == "L" else -1
        Y = nrm(d)
        palm = V(palm)
        X = (palm - Y * palm.dot(Y)).normalized() * s
        Z = X.cross(Y)
        M = Matrix((X, Y, Z)).transposed().to_4x4()
        M.translation = V(wrist)
        self.matrix(f, f"hand_ik.{side}", M)

    def foot(self, f, side, ankle, pitch=0.0, yaw=0.0, roll=0.0):
        self.matrix(f, f"foot_ik.{side}", T(ankle) @ RZ(yaw) @ RY(pitch) @ RX(roll) @ self.rest_rot(f"foot.{side}"))

    def foot_ball(self, f, side, ball, pitch):
        """Foot pivoting on its ball (heel up for pitch > 0)."""
        self.foot(f, side, V(ball) + RY(pitch).to_3x3() @ V((-0.13, 0, 0.05)), pitch)

    def foot_heel(self, f, side, heel, pitch):
        """Foot pivoting on its heel (toes up for pitch < 0)."""
        self.foot(f, side, V(heel) + RY(pitch).to_3x3() @ V((0.045, 0, 0.077)), pitch)

    def pole(self, f, name, pos):
        self.matrix(f, name, T(pos) @ self.rest_rot(name))

    def flush(self):
        pbs = self.rig.pose.bones
        for name, keys in self.mat.items():
            pb = pbs[name]
            inv = self.rig.data.bones[name].matrix_local.inverted()
            prev = self.last_q.get(name)
            for f in sorted(keys):
                loc, q, _ = (inv @ keys[f]).decompose()
                if prev is not None and prev.dot(q) < 0:
                    q = Quaternion((-q.w, -q.x, -q.y, -q.z))
                prev = q
                self.last_q[name] = q
                pb.location = loc
                pb.rotation_quaternion = q
                pb.keyframe_insert("location", frame=f)
                pb.keyframe_insert("rotation_quaternion", frame=f)
        for name, keys in self.eul.items():
            pb = pbs[name]
            for f in sorted(keys):
                pb.rotation_euler = keys[f]
                pb.keyframe_insert("rotation_euler", frame=f)
        self.mat.clear()
        self.eul.clear()


def key_object(ob, f, M):
    ob.matrix_basis = M
    ob.keyframe_insert("location", frame=f)
    ob.keyframe_insert("rotation_euler", frame=f)


def frame_of(t):
    """Blender frame of film frame t (the PNG sequence starts at 1)."""
    return t + 1


# ----------------------------------------------------------------------------------------------------------- human
DESK_TOP = C.py_to_z(735)
SEAT_Z = C.py_to_z(822)
SEAT_HIPS = V((C.px_to_x(160), 0, SEAT_Z + 0.115))
MUG_HOME = V((C.px_to_x(268), -0.17, DESK_TOP))
TYPE_D = (1, 0, -0.25)
DOWN = (0, 0, -1)


def human(k: Keyer, sc, rig, mug):
    F = frame_of
    sx = SEAT_HIPS.x

    def seated_body(f, lean=0.0, look=0.0):
        k.hips(F(f), SEAT_HIPS, pitch=-0.12 + lean * 0.3)
        k.spine(F(f), spine=0.10 + lean * 0.3, chest=0.22 + lean, neck=0.16 - look, head=0.08 - look)

    def seated_legs(f):
        for s, y in (("L", 0.1), ("R", -0.1)):
            k.foot(F(f), s, (C.px_to_x(330) + (0.02 if s == "L" else 0.0), y, 0.08))
            k.pole(F(f), f"pole_leg.{s}", (sx + 1.0, y * 1.2, 1.0))

    def arm_poles(f, p):
        for s, y in (("L", 1), ("R", -1)):
            k.pole(F(f), f"pole_arm.{s}", (p[0], y * p[1], p[2]))

    def typing_hands(f, tap=0.0, side_tap="L"):
        for s, y in (("L", 0.13), ("R", -0.13)):
            dz = tap if s == side_tap else 0.0
            k.hand(F(f), s, (C.px_to_x(292) + (0.015 if s == "L" else 0.0), y, 0.785 + dz), TYPE_D, DOWN)

    # 0-50 typing --------------------------------------------------------------------------------------------------
    seated_legs(0)
    seated_body(0)
    arm_poles(0, (sx - 0.1, 0.45, 0.55))
    taps = [(0, 0, "L"), (5, 0.016, "L"), (9, 0.0, "R"), (13, 0.014, "R"), (17, 0.0, "L"), (22, 0.018, "L"), (27, 0.0, "R"),
            (31, 0.012, "R"), (36, 0.0, "L"), (40, 0.015, "L"), (45, 0.0, "R"), (50, 0.0, "R")]
    for f, tap, s in taps:
        typing_hands(f, tap, s)
    k.spine(F(24), spine=0.10, chest=0.24, neck=0.18, head=0.06)
    seated_body(50)

    # 50-128 stretch up and back ------------------------------------------------------------------------------------
    for s, y in (("L", 0.14), ("R", -0.14)):
        k.hand(F(58), s, (C.px_to_x(285), y, 0.84), (1, 0, 0.15), DOWN)
    seated_body(58, lean=0.06)
    for s, y in (("L", 0.16), ("R", -0.16)):
        k.hand(F(72), s, (sx + 0.15, y, 1.28), (0.35, 0, 1), (1, 0, 0))
        k.hand(F(86), s, (sx + 0.0, y * 1.2, 1.56), (0, 0, 1), (1, 0, 0))
        k.hand(F(98), s, (sx - 0.12, y * 1.35, 1.49), (-0.35, 0, 1), (1, 0, 0.3))
        k.hand(F(108), s, (sx - 0.11, y * 1.35, 1.505), (-0.3, 0, 1), (1, 0, 0.3))
        # arms come down in two beats: out to the sides at shoulder height, then onto the thighs (calm, not a drop)
        k.hand(F(122), s, (sx + 0.02, y * 1.6, 1.12), (0.4, 0, -1), (0, -y / abs(y), 0))
        k.hand(F(134), s, (sx + 0.2, y * 0.95, 0.67), (1, 0, -0.5), DOWN)
        k.hand(F(140), s, (sx + 0.22, y * 0.95, 0.66), (1, 0, -0.45), DOWN)
    arm_poles(58, (sx - 0.1, 0.45, 0.55))
    arm_poles(76, (sx - 0.35, 0.55, 1.15))
    arm_poles(100, (sx - 0.45, 0.55, 1.25))
    arm_poles(122, (sx - 0.4, 0.6, 1.0))
    arm_poles(134, (sx - 0.15, 0.5, 0.6))
    k.hips(F(74), SEAT_HIPS, pitch=-0.14)
    k.spine(F(74), spine=0.05, chest=0.08, neck=0.05, head=0.0)
    k.hips(F(90), SEAT_HIPS, pitch=-0.15)
    k.spine(F(90), spine=-0.03, chest=-0.14, neck=-0.08, head=-0.14)
    k.hips(F(101), SEAT_HIPS, pitch=-0.16)
    k.spine(F(101), spine=-0.06, chest=-0.22, neck=-0.12, head=-0.32)
    k.spine(F(111), spine=-0.05, chest=-0.21, neck=-0.1, head=-0.3)
    k.hips(F(126), SEAT_HIPS, pitch=-0.12)
    k.spine(F(132), spine=0.10, chest=0.2, neck=0.12, head=0.06)

    # 128-248 the mug: the left hand rests on the thigh, the right one reaches, lifts, sips, puts it down -------------
    k.hand(F(240), "L", (sx + 0.22, 0.15, 0.66), (1, 0, -0.45), DOWN)
    k.hand(F(144), "R", (C.px_to_x(205), -0.17, 0.8), (1, 0, 0.1), (0, 1, 0))
    seated_body(140, lean=0.05)
    arm_poles(140, (sx - 0.2, 0.5, 0.65))
    k.spine(F(166), spine=0.06, chest=0.12, neck=0.1, head=0.06)
    k.spine(F(184), spine=0.04, chest=0.06, neck=0.04, head=-0.25)
    k.spine(F(200), spine=0.04, chest=0.04, neck=0.02, head=-0.34)
    k.spine(F(212), spine=0.06, chest=0.12, neck=0.12, head=0.04)
    seated_body(228, lean=0.05)
    arm_poles(228, (sx - 0.2, 0.5, 0.65))
    seated_body(246)
    k.flush()

    # the mug's path (world), then the right hand locked to its handle
    mouth_local = rig.data.bones["head"].matrix_local.inverted() @ V((0.145, 0, 1.565))

    def mouth(f):
        sc.frame_set(F(f))
        return rig.matrix_world @ rig.pose.bones["head"].matrix @ mouth_local

    def at_mouth(f, tilt, gap):
        R = RY(tilt)
        rim = V((-0.04, 0, 0.095))
        return T(mouth(f) + V((gap, 0, -0.012)) - R.to_3x3() @ rim) @ R

    mug_keys = [(0, T(MUG_HOME)), (150, T(MUG_HOME)), (162, T(MUG_HOME + V((-0.02, 0.02, 0.1))) @ RY(-0.05)),
                (176, at_mouth(176, -0.45, 0.05)), (186, at_mouth(186, -0.62, 0.012)), (200, at_mouth(200, -0.9, 0.012)),
                (210, at_mouth(210, -0.35, 0.06)), (222, T(MUG_HOME + V((0, 0, 0.035)))), (229, T(MUG_HOME)), (540, T(MUG_HOME))]
    for f, M in mug_keys:
        key_object(mug, F(f), M)
    grip = V((-0.13, -0.047, 0.045))  # wrist in the mug's frame: the hand wraps the camera side of the mug

    def mug_hand(f):
        sc.frame_set(F(f))
        M = mug.matrix_world
        R = M.to_3x3()
        k.hand(F(f), "R", M @ grip, R @ V((1, 0, 0.0)), R @ V((0, 1, 0)))

    for f in range(146, 230, 2):
        mug_hand(f)
    k.hand(F(235), "R", (MUG_HOME.x - 0.19, -0.17, 0.8), (1, 0, -0.1), DOWN)
    typing_hands(248)

    # 248-288 typing ------------------------------------------------------------------------------------------------
    seated_legs(248)
    arm_poles(246, (sx - 0.1, 0.45, 0.55))
    for f, tap, s in [(252, 0.015, "R"), (256, 0, "R"), (260, 0.016, "L"), (264, 0, "L"), (268, 0.013, "R"), (272, 0, "R"),
                      (276, 0.017, "L"), (280, 0, "L"), (284, 0.012, "R"), (288, 0, "R")]:
        typing_hands(f, tap, s)
    seated_body(288)

    # 288-335 stand up: hands to the desk edge, feet back under the seat, lean, push, rise --------------------------
    for s, y in (("L", 0.15), ("R", -0.15)):
        k.hand(F(298), s, (C.px_to_x(235), y, DESK_TOP + 0.035), (1, 0, -0.55), DOWN)
        k.hand(F(316), s, (C.px_to_x(238), y, DESK_TOP + 0.035), (1, 0, -0.6), DOWN)
    seated_body(296, lean=0.1)
    fx = C.px_to_x(330)
    stand_x = C.px_to_x(245)
    for s, y, f0 in (("R", -0.1, 298), ("L", 0.1, 302)):
        k.foot(F(f0), s, (fx + (0.02 if s == "L" else 0.0), y, 0.08))
        k.foot(F(f0 + 4), s, ((fx + stand_x) / 2, y, 0.11), pitch=0.1)
        k.foot(F(f0 + 8), s, (stand_x - (0.02 if s == "R" else 0.0), y, 0.08))
    k.hips(F(310), (C.px_to_x(195), 0, SEAT_Z + 0.13), pitch=0.2)
    k.spine(F(312), spine=0.15, chest=0.42, neck=0.14, head=0.1)
    k.hips(F(323), (C.px_to_x(232), 0, 0.80), pitch=0.12)
    k.spine(F(325), spine=0.1, chest=0.22, neck=0.08, head=0.08)
    k.hips(F(335), (stand_x + 0.01, 0, 0.912), pitch=0.02)
    k.spine(F(338), spine=0.03, chest=0.07, neck=0.16, head=0.08)
    for s in ("L", "R"):
        k.pole(F(298), f"pole_leg.{s}", (sx + 1.0, (0.12 if s == "L" else -0.12), 1.0))
        k.pole(F(335), f"pole_leg.{s}", (stand_x + 0.8, (0.12 if s == "L" else -0.12), 0.5))
    arm_poles(316, (C.px_to_x(150), 0.45, 0.8))
    arm_poles(335, (stand_x - 0.5, 0.35, 1.1))

    def hang(f, hx, hz, swing_l=0.0, swing_r=0.0):
        for s, y, sw in (("L", 0.235, swing_l), ("R", -0.235, swing_r)):
            sgn = 1 if s == "L" else -1
            k.hand(F(f), s, (hx + sw, y, hz - 0.04 + abs(sw) * 0.25), (0.05 + sw * 0.6, 0, -1), (0, -sgn, 0))

    hang(333, stand_x + 0.02, 0.912, 0.03, 0.03)

    # 335-420 walk: four steps, heel strike / flat / toe-off, hips low on contact and high on passing ------------------
    steps = [  # (foot, lift frame, strike frame, from ball x, to ball x); ball = ankle + 0.13
        ("R", 340, 360, stand_x - 0.02 + 0.13, 1.02 + 0.13),
        ("L", 357, 378, stand_x + 0.13, 1.40 + 0.13),
        ("R", 375, 396, 1.02 + 0.13, 1.78 + 0.13),
        ("L", 393, 412, 1.40 + 0.13, C.px_to_x(722) + 0.13),
    ]
    ys = {"L": 0.1, "R": -0.1}
    for s, f0, f1, b0, b1 in steps:
        y = ys[s]
        k.foot_ball(F(f0 - 4), s, (b0, y, 0.03), 0.0)
        k.foot_ball(F(f0), s, (b0, y, 0.03), 0.35)
        mid = (f0 + f1) // 2
        k.foot(F(mid), s, ((b0 + b1) / 2 - 0.13, y * 0.9, 0.15), pitch=-0.15)
        heel = (b1 - 0.13 - 0.045, y, 0.003)
        k.foot_heel(F(f1), s, heel, -0.3)
        k.foot_ball(F(f1 + 4), s, (b1, y, 0.03), 0.0)
        k.pole(F(mid), f"pole_leg.{s}", ((b0 + b1) / 2 + 0.7, y * 1.2, 0.6))
    hips_path = [(342, stand_x + 0.03, 0.905, 0.02), (352, 0.86, 0.925, -0.02), (362, 0.98, 0.895, 0.02), (370, 1.12, 0.925, -0.02),
                 (380, 1.30, 0.895, 0.02), (388, 1.46, 0.925, -0.02), (398, 1.66, 0.895, 0.02), (406, 1.80, 0.92, -0.02),
                 (416, 1.85, 0.90, 0.0)]
    for f, hx, hz, roll in hips_path:
        k.hips(F(f), (hx, roll * 0.5, hz), pitch=0.05, roll=roll)
        sw = {362: (0.12, -0.12), 380: (-0.13, 0.13), 398: (0.12, -0.12), 416: (-0.04, 0.04)}.get(f)
        if sw:
            hang(f, hx, hz, sw[0], sw[1])
        arm_poles(f, (hx - 0.5, 0.35, 1.1))
    hang(350, 0.80, 0.92, -0.04, 0.05)
    k.spine(F(350), spine=0.05, chest=0.1, neck=0.2, head=0.1)
    k.spine(F(400), spine=0.05, chest=0.1, neck=0.22, head=0.12)

    # 420-510 sit down cross-legged on the floor ---------------------------------------------------------------------
    rx, lx = 1.78 + 0.13, C.px_to_x(722) + 0.13  # balls of the feet after the walk
    k.hips(F(424), (1.85, 0, 0.905), pitch=0.08)
    k.spine(F(426), spine=0.06, chest=0.12, neck=0.3, head=0.12)
    k.hips(F(444), (1.79, 0, 0.50), pitch=0.45)
    k.spine(F(446), spine=0.2, chest=0.32, neck=0.1, head=0.05)
    k.hips(F(462), (1.70, 0, 0.21), pitch=0.15)
    k.spine(F(464), spine=0.16, chest=0.25, neck=0.06, head=0.06)
    k.hips(F(476), (1.66, 0, 0.122), pitch=-0.02)
    k.hips(F(500), (1.67, 0, 0.12), pitch=-0.05)
    k.spine(F(492), spine=0.16, chest=0.26, neck=0.22, head=0.1)
    k.spine(F(512), spine=0.15, chest=0.27, neck=0.26, head=0.12)
    k.hips(F(540), (1.67, 0, 0.12), pitch=-0.04)
    k.spine(F(540), spine=0.14, chest=0.25, neck=0.24, head=0.12)
    for s, bx in (("R", rx), ("L", lx)):
        y = ys[s]
        k.foot_ball(F(424), s, (bx, y, 0.03), 0.0)
        k.foot_ball(F(462), s, (bx, y, 0.03), 0.0)
    # feet slide in and cross (left foot under the right knee), knees fall outwards
    cross = {"L": ((1.86, -0.09, 0.055), -1.4, 1.1), "R": ((1.91, 0.1, 0.065), 1.4, -1.1)}
    for s, f0 in (("R", 470), ("L", 476)):
        y = ys[s]
        a, yaw, roll = cross[s]
        k.foot(F(f0 + 8), s, ((a[0] + (rx if s == "R" else lx) - 0.13) / 2 + 0.03, y * 0.9, 0.09), yaw=yaw * 0.4, roll=roll * 0.4)
        k.foot(F(f0 + 22), s, a, yaw=yaw, roll=roll)
        k.foot(F(540), s, a, yaw=yaw, roll=roll)
    for s, y in (("L", 1), ("R", -1)):
        k.pole(F(424), f"pole_leg.{s}", (2.6, y * 0.12, 0.6))
        k.pole(F(462), f"pole_leg.{s}", (2.5, y * 0.2, 0.9))
        k.pole(F(498), f"pole_leg.{s}", (1.85, y * 1.4, 0.15))
    # hands: forward for balance, down to the floor beside the feet, then onto the knees
    for s, y in (("L", 0.2), ("R", -0.2)):
        sgn = 1 if s == "L" else -1
        k.hand(F(440), s, (1.98, y, 0.62), (1, 0, -0.6), (0, -sgn * 0.3, -1))
        k.hand(F(458), s, (1.98, y * 1.1, 0.07), (1, 0, -0.25), DOWN)
        k.hand(F(474), s, (1.90, y * 1.15, 0.065), (1, 0, -0.2), DOWN)
        k.hand(F(500), s, (1.86, y * 1.3, 0.2), (1, 0, -0.4), DOWN)
        k.hand(F(540), s, (1.87, y * 1.3, 0.195), (1, 0, -0.4), DOWN)
    arm_poles(440, (1.5, 0.45, 0.8))
    arm_poles(474, (1.6, 0.6, 0.5))
    arm_poles(500, (1.5, 0.7, 0.5))
    k.flush()


# -------------------------------------------------------------------------------------------------------------- AI
def ai(k: Keyer, sc, rig, book, pivot):
    F = frame_of
    HIPS = V((0.0, 0, 0.118))
    # cross-legged for the whole take (her frame: facing +X, camera on her +Y side)
    for f in (0, 540):
        k.hips(F(f), HIPS, pitch=-0.06)
        k.foot(F(f), "L", (0.26, -0.075, 0.055), yaw=-1.35, roll=1.0)
        k.foot(F(f), "R", (0.31, 0.085, 0.065), yaw=1.35, roll=-1.0)
        for s, y in (("L", 1), ("R", -1)):
            k.pole(F(f), f"pole_leg.{s}", (0.25, y * 1.0, 0.6))
            k.pole(F(f), f"pole_arm.{s}", (-0.2, y * 0.6, 0.35))
    read = dict(spine=0.14, chest=0.24, neck=0.16, head=0.18)
    # reading: the head follows the lines (small turns), breathing in the chest
    for f, yaw, ch in [(0, -0.03, 0.0), (40, 0.04, 0.012), (80, -0.03, 0.0), (125, 0.05, 0.012), (165, 0.0, 0.0),
                       (232, -0.04, 0.0), (270, 0.04, 0.012), (300, 0.0, 0.0)]:
        k.spine(F(f), spine=read["spine"], chest=read["chest"] + ch, neck=read["neck"], head=read["head"], head_yaw=yaw)
    k.spine(F(196), spine=0.14, chest=0.25, neck=0.15, head=0.14, head_yaw=0.06)  # watches the page go over
    # 300-345 looks up towards the glass, then holds (breath, one small curious tilt)
    k.spine(F(322), spine=0.09, chest=0.1, neck=0.12, head=-0.02)
    k.spine(F(346), spine=0.06, chest=0.06, neck=-0.02, head=-0.1)
    k.spine(F(400), spine=0.06, chest=0.075, neck=-0.02, head=-0.1)
    k.spine(F(440), spine=0.06, chest=0.06, neck=-0.03, head=-0.11, head_tilt=0.12)
    k.spine(F(480), spine=0.06, chest=0.075, neck=-0.03, head=-0.11, head_tilt=0.1)
    k.spine(F(540), spine=0.06, chest=0.065, neck=-0.02, head=-0.1, head_tilt=0.04)
    k.flush()

    # the book: in both hands in front of her, pages towards her face and turned a little to the camera
    def book_matrix(pos, n, turn):
        """Pages face n (towards her face), +X of the book on her near (camera) side, then the book is turned about its
        spine by `turn` so the open pages face the camera partly (seen edge-on otherwise)."""
        Y = nrm(n)
        X = V((0, 1, 0))
        X = (X - Y * X.dot(Y)).normalized()
        Z = X.cross(Y)
        M = Matrix((X, Y, Z)).transposed().to_4x4() @ RZ(turn)
        M.translation = V(pos)
        return M

    reading = book_matrix((0.38, 0.02, 0.43), (-0.55, 0, 0.8), -0.75)
    lowered = book_matrix((0.36, 0.02, 0.37), (-0.3, 0, 0.9), -0.7)
    for f, M in ((0, reading), (300, reading), (340, lowered), (540, lowered)):
        key_object(book, F(f), M)
    import build  # noqa: F401  (BOOK_OPEN_DEG)
    open_a = math.radians(build.BOOK_OPEN_DEG)
    for f, a in ((0, open_a), (178, open_a), (186, open_a + 0.25), (206, math.pi - open_a - 0.05), (212, math.pi - open_a), (540, math.pi - open_a)):
        pivot.rotation_euler = (0, 0, a)
        pivot.keyframe_insert("rotation_euler", frame=F(f))

    def hold(f):
        """Right (far) hand under the spine, left (near) hand on the near page edge; returns the near-edge wrist."""
        sc.frame_set(F(f))
        B = book.matrix_basis
        Bx, By, Bz = (B.to_3x3() @ V(a) for a in ((1, 0, 0), (0, 1, 0), (0, 0, 1)))
        k.hand(F(f), "R", B @ V((-0.01, -0.04, -0.13)), Bz, By)
        Hn = B @ RZ(open_a)
        hx, hy, hz = (Hn.to_3x3() @ V(a) for a in ((1, 0, 0), (0, 1, 0), (0, 0, 1)))
        return Hn @ V((0.26, 0.035, -0.05)), -hx, -hy

    def near_hand(f):
        w, d, p = hold(f)
        k.hand(F(f), "L", w, d, p)

    for f in (0, 60, 120, 168):
        near_hand(f)
    # 170-225: the near hand lifts, takes the page corner, carries it over the spine and comes back
    w, d, p = hold(174)
    k.hand(F(174), "L", w + V((0, 0.0, 0.03)), d, p)
    for f in range(178, 214, 2):
        sc.frame_set(F(f))
        B = book.matrix_basis
        a = pivot.rotation_euler.z
        P = B @ RZ(a)
        half = B @ RZ(open_a + (a - open_a) * 0.5)
        px_, py_ = (P.to_3x3() @ V(v) for v in ((1, 0, 0), (0, 1, 0)))
        hx_, hy_ = (half.to_3x3() @ V(v) for v in ((1, 0, 0), (0, 1, 0)))
        corner = P @ V((0.14, 0.016, -0.07))
        k.hand(F(f), "L", corner + hx_ * 0.1 + hy_ * 0.035 - (P.to_3x3() @ V((0, 0, 1))) * 0.03, -hx_, -hy_)
    sc.frame_set(F(214))
    B = book.matrix_basis
    k.hand(F(220), "L", B @ RZ(open_a) @ V((0.26, 0.07, -0.02)), -(B.to_3x3() @ V((1, 0, 0))), -(B.to_3x3() @ V((0, 1, 0))))
    for f in (230, 270, 300, 320, 340, 400, 540):
        near_hand(f)
    k.flush()


def animate(sc, h_rig, a_rig, mug, book, pivot):
    sc.frame_set(1)
    a_rig.location = (AI_X, 0, C.AI_FLOOR_Z)
    a_rig.rotation_euler = (0, 0, math.pi)
    human(Keyer(h_rig, head_bias=0.18), sc, h_rig, mug)
    ai(Keyer(a_rig), sc, a_rig, book, pivot)
    sc.frame_set(1)
