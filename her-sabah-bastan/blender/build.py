# Builds the two characters (mesh, armature, weights, flat materials, outline), the props and the orthographic camera,
# then keys the animation (anim.py) and saves blender/test-v1.blend.
#
#   "$BLENDER" -b --factory-startup -P blender/build.py            (see README.md)
#
# Characters are built in their own frame: facing +X, left side +Y, up +Z, origin on the floor between the feet,
# metres. The camera looks along +Y, so a character's -Y side faces the camera.
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

V = Vector


# ---------------------------------------------------------------------------------------------------------------- scene
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = C.W, C.H
    sc.render.resolution_percentage = 100
    sc.render.fps = C.FPS
    sc.frame_start, sc.frame_end = 1, C.FRAMES
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.eevee.taa_render_samples = 16
    sc.render.image_settings.compression = 60
    world = bpy.data.worlds.new("World")
    world.color = (0, 0, 0)
    sc.world = world
    return sc


def make_camera(sc):
    cam = bpy.data.cameras.new("Camera")
    cam.type = "ORTHO"
    cam.ortho_scale = C.W / C.PX_PER_M
    cam.clip_start, cam.clip_end = 0.1, 60.0
    ob = bpy.data.objects.new("Camera", cam)
    sc.collection.objects.link(ob)
    ob.location = (C.px_to_x(C.W / 2), -20.0, C.py_to_z(C.H / 2))
    ob.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = ob
    return ob


def flat_material(name, hex_color, cull=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = C.srgb_to_linear(hex_color)
    em.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    m.use_backface_culling = cull
    m.diffuse_color = C.srgb_to_linear(hex_color)
    return m


def add_outline(ob, fill, line, thickness):
    """Inverted hull: a solidify shell pushed outwards, normals flipped, back faces culled -> a line of constant
    width on an orthographic camera (thickness * PX_PER_M px)."""
    ob.data.materials.clear()
    ob.data.materials.append(fill)
    ob.data.materials.append(line)
    mod = ob.modifiers.new("Outline", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    # no even-offset / quality normals: both scale the offset by the corner angle and throw long spikes where a joint
    # folds the skin (measured: cream spikes at the stretch and the floor sit)
    mod.use_even_offset = False
    mod.use_quality_normals = False
    mod.material_offset = 1
    return mod


def link(ob, coll):
    coll.objects.link(ob)
    return ob


# ------------------------------------------------------------------------------------------------------- body pieces
class Piece:
    """A convex hull of two (possibly scaled) spheres, mapped to one bone. Gives a signed distance for weighting."""

    def __init__(self, bone, c1, s1, c2=None, s2=None):
        self.bone = bone
        self.c1 = np.array(c1, float)
        self.s1 = np.array(s1 if hasattr(s1, "__len__") else (s1, s1, s1), float)
        self.c2 = np.array(c2 if c2 is not None else c1, float)
        s2 = s2 if s2 is not None else s1
        self.s2 = np.array(s2 if hasattr(s2, "__len__") else (s2, s2, s2), float)

    def points(self, n=14):
        pts = []
        for c, s in ((self.c1, self.s1), (self.c2, self.s2)):
            for i in range(n + 1):
                th = math.pi * i / n
                for j in range(2 * n):
                    ph = 2 * math.pi * j / (2 * n)
                    d = np.array((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
                    pts.append(c + d * s)
        return pts

    def sdist(self, P):
        ab = self.c2 - self.c1
        L2 = float(ab @ ab)
        t = np.zeros(len(P)) if L2 < 1e-12 else np.clip(((P - self.c1) @ ab) / L2, 0, 1)
        c = self.c1 + t[:, None] * ab
        s = self.s1 + t[:, None] * (self.s2 - self.s1)
        q = np.linalg.norm((P - c) / s, axis=1)
        return (q - 1.0) * s.min(axis=1)


def chain(bones, pts):
    """Pieces along a chain of (point, radius); bones[i] owns the segment pts[i] -> pts[i+1]."""
    return [Piece(b, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) for i, b in enumerate(bones)]


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def spec(kind):
    """Joints (character frame, rest pose) and body pieces of 'human' or 'ai'."""
    ai = kind == "ai"
    J = {
        "pelvis": (0.0, 0, 0.93), "waist": (0.005, 0, 1.08), "chest": (0.015, 0, 1.25), "neck": (0.025, 0, 1.42),
        "headbase": (0.04, 0, 1.53), "headtop": (0.04, 0, 1.72 if not ai else 1.75),
    }
    for side, s in (("L", 1), ("R", -1)):
        J[f"clav.{side}"] = (0.02, s * 0.03, 1.40)
        J[f"shoulder.{side}"] = (0.0, s * 0.175, 1.405)
        J[f"elbow.{side}"] = (-0.025, s * 0.235, 1.13)
        J[f"wrist.{side}"] = (-0.005, s * 0.275, 0.885)
        J[f"handtip.{side}"] = (0.005, s * 0.29, 0.71)
        J[f"hip.{side}"] = (0.0, s * 0.09, 0.90)
        J[f"knee.{side}"] = (0.015, s * 0.10, 0.49)
        J[f"ankle.{side}"] = (0.0, s * 0.10, 0.08)
        J[f"ball.{side}"] = (0.13, s * 0.10, 0.03)

    k = 0.9 if ai else 1.0  # the AI is a slimmer mannequin
    P = []
    # torso: pelvis -> waist -> chest -> shoulder line
    pel = Piece("hips", (-0.01, 0, 0.92), (0.095 * k, 0.145 * k, 0.10), (0.0, 0, 1.07), (0.085 * k, 0.125 * k, 0.07))
    P.append(pel)
    P.append(Piece("spine", (0.0, 0, 1.07), (0.085 * k, 0.125 * k, 0.07), (0.015, 0, 1.25), (0.105 * k, 0.155 * k, 0.11)))
    P.append(Piece("chest", (0.015, 0, 1.25), (0.105 * k, 0.155 * k, 0.11), (0.0, 0, 1.375), (0.085 * k, 0.18 * k, 0.06)))
    if not ai:
        for s in (1, -1):
            P.append(Piece("hips", (-0.035, s * 0.06, 0.87), (0.07, 0.07, 0.08)))
    # neck
    P.append(Piece("neck", (0.02, 0, 1.38), 0.05 * k if not ai else 0.038, (0.045, 0, 1.54), 0.042 if not ai else 0.034))
    # head
    if ai:
        P.append(Piece("head", (0.03, 0, 1.625), 0.126))
    else:
        P.append(Piece("head", (0.05, 0, 1.615), (0.098, 0.083, 0.108)))
        P.append(Piece("head", (0.06, 0, 1.572), 0.058, (0.12, 0, 1.546), 0.03))  # jaw -> chin, forward of the brow
        P.append(Piece("head", (0.146, 0, 1.605), 0.019))  # nose
        # hair: a cap and messy tufts (stil/hareket/ref-insan-kanonik.png)
        hc, hs = np.array((0.03, 0, 1.66)), np.array((0.114, 0.098, 0.1))
        P.append(Piece("head", tuple(hc), tuple(hs)))
        P.append(Piece("head", (-0.03, 0, 1.625), (0.082, 0.086, 0.08)))  # mass over the nape
        tufts = [  # (base angle on the cap in the XZ plane, tip direction, length, y offset): a fringe falling forward,
            # clumps on top and at the back (stil/hareket/ref-insan-kanonik.png)
            (52, -70, 0.04, 0.025), (64, -55, 0.038, -0.03), (84, 20, 0.03, 0.03), (104, 70, 0.022, -0.025),
            (124, 140, 0.045, 0.035), (140, 160, 0.06, -0.03), (156, 180, 0.055, 0.025),
            # no tufts below the back of the head: at the nape they read as a second face (measured on frame 190)
        ]
        for a, d, L, y in tufts:
            ar, dr = math.radians(a), math.radians(d)
            base = hc + np.array((math.cos(ar) * hs[0] * 0.85, y, math.sin(ar) * hs[2] * 0.85))
            tip = base + L * np.array((math.cos(dr), y * 0.5, math.sin(dr)))
            P.append(Piece("head", tuple(base), 0.034, tuple(tip), 0.009))
    for side in ("L", "R"):
        sh, el, wr, ht = J[f"shoulder.{side}"], J[f"elbow.{side}"], J[f"wrist.{side}"], J[f"handtip.{side}"]
        a = 0.88 if ai else 1.0
        P += chain([f"upper_arm.{side}"] * 2 + [f"forearm.{side}"] * 2,
                   [(sh, 0.05 * a), (lerp(sh, el, 0.45), 0.043 * a), (el, 0.035 * a), (lerp(el, wr, 0.3), 0.037 * a), (wr, 0.026 * a)])
        # hand: a mitten with a thumb on the forward side
        P += chain([f"hand.{side}"] * 2, [(wr, 0.025 * a), (lerp(wr, ht, 0.45), 0.03 * a), (lerp(wr, ht, 0.95), 0.017 * a)])
        t0 = V(lerp(wr, ht, 0.15)) + V((0.024, 0, 0))
        t1 = V(lerp(wr, ht, 0.5)) + V((0.042, 0, 0))
        P.append(Piece(f"hand.{side}", tuple(t0), 0.016 * a, tuple(t1), 0.012 * a))
        hp, kn, an = J[f"hip.{side}"], J[f"knee.{side}"], J[f"ankle.{side}"]
        b = 0.9 if ai else 1.0
        calf = lerp(kn, an, 0.3)
        calf = (calf[0] - 0.012, calf[1], calf[2])
        P += chain([f"thigh.{side}"] * 2 + [f"shin.{side}"] * 2,
                   [(hp, 0.08 * b), (lerp(hp, kn, 0.45), 0.068 * b), (kn, 0.05 * b), (calf, 0.055 * b), (an, 0.034 * b)])
        y = J[f"ankle.{side}"][1]
        foot = [((0.0, y, 0.08), 0.036), ((-0.045, y, 0.035), 0.033), ((0.12, y, 0.03), 0.03), ((0.185, y, 0.022), 0.02)]
        for i in range(len(foot)):
            for j in range(i + 1, len(foot)):
                P.append(Piece(f"foot.{side}", foot[i][0], foot[i][1], foot[j][0], foot[j][1]))
    return J, P


def body_mesh(name, pieces, voxel):
    bm = bmesh.new()
    for p in pieces:
        vs = [bm.verts.new(V(tuple(q))) for q in p.points()]
        res = bmesh.ops.convex_hull(bm, input=vs)
        bmesh.ops.delete(bm, geom=list({g for g in res["geom_interior"] + res["geom_unused"] if isinstance(g, bmesh.types.BMVert)}), context="VERTS")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    rm = ob.modifiers.new("Union", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    sm = ob.modifiers.new("Soften", "SMOOTH")
    sm.factor = 0.6
    sm.iterations = 4
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me2 = bpy.data.meshes.new_from_object(ev)
    ob.modifiers.clear()
    ob.data = me2
    bpy.data.meshes.remove(me)
    for poly in me2.polygons:
        poly.use_smooth = True
    bpy.context.scene.collection.objects.unlink(ob)
    return ob


def skin_weights(ob, pieces, k=0.014, keep=3):
    me = ob.data
    P = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", P)
    P = P.reshape(-1, 3)
    bones = sorted({p.bone for p in pieces})
    sd = np.full((len(P), len(bones)), np.inf)
    for p in pieces:
        bi = bones.index(p.bone)
        sd[:, bi] = np.minimum(sd[:, bi], p.sdist(P))
    w = np.exp(-(sd - sd.min(axis=1, keepdims=True)) / k)
    order = np.argsort(-w, axis=1)
    mask = np.zeros_like(w, bool)
    np.put_along_axis(mask, order[:, :keep], True, axis=1)
    w = np.where(mask, w, 0)
    w /= w.sum(axis=1, keepdims=True)
    for bi, b in enumerate(bones):
        vg = ob.vertex_groups.new(name=b)
        idx = np.nonzero(w[:, bi] > 1e-3)[0]
        for i in idx:
            vg.add([int(i)], float(w[i, bi]), "REPLACE")
    return bones


def best_bone(pieces, p, k=0.014):
    best, bd = None, 1e9
    P = np.array([tuple(p)])
    for pc in pieces:
        d = pc.sdist(P)[0]
        if d < bd:
            best, bd = pc.bone, d
    return best


# ------------------------------------------------------------------------------------------------------------- rig
BONES = [
    # name, head joint, tail joint, parent, connected, roll axis (bone Z points along it)
    ("hips", "pelvis", "waist", None, False, (1, 0, 0)),
    ("spine", "waist", "chest", "hips", True, (1, 0, 0)),
    ("chest", "chest", "neck", "spine", True, (1, 0, 0)),
    ("neck", "neck", "headbase", "chest", True, (1, 0, 0)),
    ("head", "headbase", "headtop", "neck", True, (1, 0, 0)),
]
for _s in ("L", "R"):
    BONES += [
        (f"clav.{_s}", f"clav.{_s}", f"shoulder.{_s}", "chest", False, (1, 0, 0)),
        (f"upper_arm.{_s}", f"shoulder.{_s}", f"elbow.{_s}", f"clav.{_s}", True, (1, 0, 0)),
        (f"forearm.{_s}", f"elbow.{_s}", f"wrist.{_s}", f"upper_arm.{_s}", True, (1, 0, 0)),
        (f"hand.{_s}", f"wrist.{_s}", f"handtip.{_s}", f"forearm.{_s}", True, (1, 0, 0)),
        (f"thigh.{_s}", f"hip.{_s}", f"knee.{_s}", "hips", False, (1, 0, 0)),
        (f"shin.{_s}", f"knee.{_s}", f"ankle.{_s}", f"thigh.{_s}", True, (1, 0, 0)),
        (f"foot.{_s}", f"ankle.{_s}", f"ball.{_s}", f"shin.{_s}", True, (0, 0, 1)),
    ]


def make_rig(name, J, coll):
    arm = bpy.data.armatures.new(name)
    ob = bpy.data.objects.new(name, arm)
    coll.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.edit_bones
    for bname, h, t, par, conn, roll in BONES:
        b = eb.new(bname)
        b.head, b.tail = V(J[h]), V(J[t])
        b.align_roll(V(roll))
        if par:
            b.parent = eb[par]
            b.use_connect = conn
    for s in ("L", "R"):
        for src, dst in ((f"hand.{s}", f"hand_ik.{s}"), (f"foot.{s}", f"foot_ik.{s}")):
            b = eb.new(dst)
            b.head, b.tail, b.roll = eb[src].head.copy(), eb[src].tail.copy(), eb[src].roll
            b.use_deform = False
        sy = 1 if s == "L" else -1
        for pole, at in ((f"pole_arm.{s}", (-0.5, sy * 0.3, 1.15)), (f"pole_leg.{s}", (0.6, sy * 0.1, 0.5))):
            b = eb.new(pole)
            b.head, b.tail = V(at), V(at) + V((0, 0, 0.08))
            b.use_deform = False
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in ob.pose.bones:
        pb.rotation_mode = "QUATERNION" if (pb.name == "hips" or "_ik" in pb.name or "pole" in pb.name) else "XYZ"
    for s in ("L", "R"):
        for chain_end, tgt, pole, end, copy in ((f"forearm.{s}", f"hand_ik.{s}", f"pole_arm.{s}", f"hand.{s}", f"hand_ik.{s}"),
                                                 (f"shin.{s}", f"foot_ik.{s}", f"pole_leg.{s}", f"foot.{s}", f"foot_ik.{s}")):
            ik = ob.pose.bones[chain_end].constraints.new("IK")
            ik.target, ik.subtarget = ob, tgt
            ik.pole_target, ik.pole_subtarget = ob, pole
            ik.chain_count = 2
            ik.use_tail = True
            cr = ob.pose.bones[end].constraints.new("COPY_ROTATION")
            cr.target, cr.subtarget = ob, copy
    return ob


def set_pos(pb, p):
    M = pb.matrix.copy()
    M.translation = V(p)
    pb.matrix = M


def fit_pole_angles(rig):
    """Pick each IK pole angle so the elbow/knee bends towards its pole (measured, not assumed)."""
    pb = rig.pose.bones
    tests = []
    for s, sy in (("L", 1), ("R", -1)):
        tests.append((f"forearm.{s}", f"hand_ik.{s}", f"pole_arm.{s}", "upper_arm." + s, V((0.0, 0, 0.30)), V((-0.6, sy * 0.15, 1.2))))
        tests.append((f"shin.{s}", f"foot_ik.{s}", f"pole_leg.{s}", "thigh." + s, V((0.0, 0, 0.30)), V((0.8, sy * 0.1, 0.5))))
    for chain_end, tgt, pole, upper, lift, pole_at in tests:
        ik = pb[chain_end].constraints["IK"]
        rest_t = rig.data.bones[tgt].head_local.copy()
        set_pos(pb[tgt], rest_t + lift)  # pull the target up so the chain must bend
        set_pos(pb[pole], pole_at)
        def score(deg):
            ik.pole_angle = math.radians(deg)
            bpy.context.view_layer.update()
            mid = rig.matrix_world @ pb[upper].tail
            root = rig.matrix_world @ pb[upper].head
            end = rig.matrix_world @ (rest_t + lift)
            axis = (end - root).normalized()
            off = (mid - root) - axis * (mid - root).dot(axis)
            want = (pole_at - root) - axis * (pole_at - root).dot(axis)
            return off.normalized().dot(want.normalized()) if off.length > 1e-6 else -1

        best = max((score(d), d) for d in range(-180, 180, 15))
        best = max((score(d), d) for d in range(best[1] - 14, best[1] + 15))
        ik.pole_angle = math.radians(best[1])
        pb[tgt].location = (0, 0, 0)
        pb[pole].location = (0, 0, 0)
        bpy.context.view_layer.update()
        print(f"POLE {chain_end}: {best[1]} deg (alignment {best[0]:.3f})")
    bpy.context.view_layer.update()


def bone_parent(ob, rig, bone):
    M = ob.matrix_world.copy()
    ob.parent = rig
    ob.parent_type = "BONE"
    ob.parent_bone = bone
    bpy.context.view_layer.update()
    ob.matrix_world = M


def box(name, size, coll):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=V(size), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me), coll)


def ring_on_surface(name, body, center, axis, coll, n=56, lift=0.0022, tube=0.0026, ref=V((0, 0, 1))):
    """A thin tube following the body surface around `axis` through `center` (a hem line)."""
    axis = V(axis).normalized()
    u = ref - axis * ref.dot(axis)
    if u.length < 1e-4:
        u = V((1, 0, 0)) - axis * axis.x
    u.normalize()
    v = axis.cross(u)
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        d = u * math.cos(a) + v * math.sin(a)
        # from the limb's axis outwards: the first hit is this limb's own skin, never a neighbouring part
        hit, loc, nor, _ = body.ray_cast(V(center), d, distance=0.3)
        if hit:
            nor = nor if nor.dot(d) > 0 else -nor
            pts.append(loc + nor * lift)
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    sp.use_cyclic_u = True
    cu.bevel_depth = tube
    cu.bevel_resolution = 1
    ob = bpy.data.objects.new(name, cu)
    coll.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    coll.objects.unlink(ob)
    bpy.data.objects.remove(ob)
    return link(bpy.data.objects.new(name, me), coll)


# -------------------------------------------------------------------------------------------------------- characters
def build_character(kind, coll, mats):
    J, pieces = spec(kind)
    body = body_mesh(f"{kind}_body", pieces, voxel=0.0055)
    coll.objects.link(body)
    rig = make_rig(f"{kind}_rig", J, coll)
    skin_weights(body, pieces)
    body.parent = rig
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    if kind == "human":
        add_outline(body, mats["navy"], mats["cream_line"], 0.0048)
    else:
        add_outline(body, mats["ai_fill"], mats["navy_line"], 0.009)
    fit_pole_angles(rig)
    extras = []
    if kind == "ai":
        # the single vertical slit eye on the camera-side (+Y in the AI's frame: the rig is turned 180 deg) front of the head
        hc, r = V((0.03, 0, 1.625)), 0.126
        d = V((math.cos(math.radians(38)), math.sin(math.radians(38)), 0.0))
        eye = box("ai_eye", (0.006, 0.014, 0.062), coll)
        eye.data.materials.append(mats["navy"])
        eye.matrix_world = Matrix.Translation(hc + d * (r + 0.002)) @ Matrix.Rotation(math.atan2(d.y, d.x), 4, "Z")
        bone_parent(eye, rig, "head")
        extras.append(eye)
    else:
        # sticky notes: small yellow cards on the body, each parented to the bone under it
        # Cards stuck along his back and side, turned mostly to the camera so they read as squares (as in the drawings):
        # (height, ray angle: 0 = from straight behind, 90 = from the camera side; how much the card faces the camera
        # instead of the skin; spin in degrees)
        notes = [(1.37, 20, 0.75, 8), (1.27, 15, 0.8, -12), (1.17, 22, 0.75, 6), (1.07, 15, 0.8, -9), (0.98, 25, 0.7, 12),
                 (1.32, 90, 0.0, -6), (1.12, 95, 0.0, 9), (1.40, 60, 0.4, -14)]
        cam = V((0, -1, 0))
        for i, (z, ang, face, spin) in enumerate(notes):
            d = V((math.cos(math.radians(ang)), math.sin(math.radians(ang)), 0))  # ray direction (into the body)
            hit, loc, nor, _ = body.ray_cast(V((0.0, 0, z)) - d * 1.0, d, distance=3)
            if not hit:
                print("NOTE MISS", i)
                continue
            n = (nor.normalized() * (1 - face) + cam * face).normalized()
            up = V((0, 0, 1)) - n * n.z
            up.normalize()
            side = up.cross(n)
            R = Matrix((side, up, n)).transposed().to_4x4()
            card = box(f"note_{i}", (0.082, 0.082, 0.003), coll)
            # pivot at the glued top edge; back cards hang half over the silhouette
            over = V((-0.03, 0, 0)) if ang < 45 else V((0, 0, 0))
            M = (Matrix.Translation(loc + nor.normalized() * 0.012 + over) @ R @ Matrix.Rotation(math.radians(spin), 4, "Z")
                 @ Matrix.Translation((0, -0.041, 0.0)))
            card.matrix_world = M
            bone = best_bone(pieces, loc)
            add_outline(card, mats["yellow"], mats["navy_line"], 0.0035)
            bone_parent(card, rig, bone)
            extras.append(card)
        # hem lines: the T-shirt sleeves and waist (thin cream lines like the drawn character)
        for s in ("L", "R"):
            sh, el = V(J[f"shoulder.{s}"]), V(J[f"elbow.{s}"])
            ring = ring_on_surface(f"sleeve_{s}", body, sh.lerp(el, 0.5), el - sh, coll)
            ring.data.materials.append(mats["cream"])
            bone_parent(ring, rig, f"upper_arm.{s}")
            extras.append(ring)
        ring = ring_on_surface("shirt_hem", body, V((-0.005, 0, 0.985)), V((0.05, 0, 1)), coll)
        ring.data.materials.append(mats["cream"])
        bone_parent(ring, rig, "hips")
        extras.append(ring)
    return rig, body, extras


def build_mug(coll, mats):
    me = bpy.data.meshes.new("mug")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.038, radius2=0.04, depth=0.095)
    bmesh.ops.translate(bm, vec=V((0, 0, 0.0475)), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    mug = link(bpy.data.objects.new("mug", me), coll)
    # handle: a torus on the +X side in the XZ plane (he holds the mug by its body, the handle points away from him)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.024, minor_radius=0.0075, major_segments=24, minor_segments=10,
                                     location=(0.043, 0, 0.05), rotation=(math.radians(90), 0, 0))
    hd = bpy.context.active_object
    hd.name = "mug_handle"
    for c in hd.users_collection:
        c.objects.unlink(hd)
    coll.objects.link(hd)
    hd.parent = mug
    hd.data.materials.append(mats["navy"])
    add_outline(hd, mats["navy"], mats["cream_line"], 0.0055)
    add_outline(mug, mats["navy"], mats["cream_line"], 0.0055)
    return mug


BOOK_OPEN_DEG = 12  # each half tilts towards the reader: the open book is a shallow V


def build_book(coll, mats, rig):
    """Open notebook. Book frame: spine along +Z, halves along +-X, pages face +Y (towards the reader)."""
    root = bpy.data.objects.new("book", None)
    coll.objects.link(root)
    root.empty_display_size = 0.05
    root.parent = rig
    parts = []
    for sx in (1, -1):
        half = bpy.data.objects.new(f"book_half_{'R' if sx > 0 else 'L'}", None)
        coll.objects.link(half)
        half.parent = root
        half.rotation_euler = (0, 0, sx * math.radians(BOOK_OPEN_DEG))
        cover = box(f"cover_{sx}", (0.17, 0.007, 0.24), coll)
        cover.location = (sx * 0.085, -0.004, 0)
        cover.parent = half
        add_outline(cover, mats["navy"], mats["navy_line"], 0.003)
        pages = box(f"pages_{sx}", (0.158, 0.012, 0.226), coll)
        pages.location = (sx * 0.081, 0.006, 0)
        pages.parent = half
        add_outline(pages, mats["cream"], mats["navy_line"], 0.0035)
        parts += [cover, pages]
    # the page that turns: pivot on the spine, lying on the right half at angle 0, on the left half at 180
    pivot = bpy.data.objects.new("page_pivot", None)
    coll.objects.link(pivot)
    pivot.parent = root
    pivot.rotation_mode = "XYZ"
    page = box("turn_page", (0.156, 0.0025, 0.222), coll)
    page.location = (0.079, 0.0135, 0)
    page.parent = pivot
    add_outline(page, mats["cream"], mats["navy_line"], 0.0035)
    for ob in (root, pivot):
        ob.rotation_mode = "XYZ"
    return root, pivot


def main():
    sc = reset_scene()
    make_camera(sc)
    mats = {
        "navy": flat_material("navy", C.NAVY),
        "cream": flat_material("cream", C.CREAM),
        "ai_fill": flat_material("ai_fill", C.AI_FILL),
        "yellow": flat_material("yellow", C.YELLOW),
        "navy_line": flat_material("navy_line", C.NAVY, cull=True),
        "cream_line": flat_material("cream_line", C.CREAM, cull=True),
    }
    colls = {}
    for kind in ("human", "ai"):
        coll = bpy.data.collections.new(kind)
        sc.collection.children.link(coll)
        colls[kind] = coll
    h_rig, h_body, _ = build_character("human", colls["human"], mats)
    a_rig, a_body, _ = build_character("ai", colls["ai"], mats)
    mug = build_mug(colls["human"], mats)
    book, pivot = build_book(colls["ai"], mats, a_rig)
    import anim
    anim.animate(sc, h_rig, a_rig, mug, book, pivot)
    out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else str(C.BLEND)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print("SAVED", out)


if __name__ == "__main__":
    main()
