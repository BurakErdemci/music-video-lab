# Builds the 2D cut-out scene: per character one armature (bones = rig.json parts), one deformable image-plane mesh per
# part and one rigid plane per prop, keyed from a take module (take.py, or bendtest.py for tuning the joints).
#
#   "$BLENDER" -b --factory-startup -P blender/cutout/build.py -- [--take take|bendtest] [--out FILE.blend]
#       [--k 1.2] [--cell 3] [--dq 1|0]
#
# Weights (see README.md): at the joint between parent Pa and child C the pivot p, C's bone axis u and the half limb
# width hw give a band of half-width b = k * hw; s = (v - p) . u; w_C = smoothstep(-b, b, s), w_Pa = 1 - w_C, for the
# vertices of C and for the vertices of Pa near the joint. Outside the bands every vertex is 100 % on its own bone.
import importlib
import math
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lib as L  # noqa: E402
from lib import C, P  # noqa: E402
from mathutils import Matrix, Quaternion  # noqa: E402

BAND_JOINTS = {"waist", "neck", "head", "shoulder", "elbow", "wrist", "hip", "knee", "ankle"}
# band half-width = K * kj * hw; stiff joints (head, wrist, ankle) get a narrow band so the art there stays rigid
KJ = {"waist": 1.0, "neck": 0.8, "head": 0.6, "shoulder": 1.0, "elbow": 1.0, "wrist": 0.7, "hip": 1.0, "knee": 1.0,
      "ankle": 0.7}
# parent-side vertices follow the child only near the joint: full inside R0 * b (and LAT0 * hw from the limb axis),
# gone at R1 * b (LAT1 * hw)
R0, R1, LAT0, LAT1 = 1.5, 2.5, 1.0, 1.7


def smooth(x, e0, e1):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ------------------------------------------------------------------------------------------------------------- scene
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = C.W, C.H
    sc.render.resolution_percentage = 100
    sc.render.fps = C.FPS
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.render.image_settings.compression = 60
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.eevee.taa_render_samples = 32
    world = bpy.data.worlds.new("World")
    world.color = (0, 0, 0)
    sc.world = world
    cam = bpy.data.cameras.new("Camera")
    cam.type = "ORTHO"
    cam.ortho_scale = C.W / C.PX_PER_M
    cam.clip_start, cam.clip_end = 0.1, 60.0
    ob = bpy.data.objects.new("Camera", cam)
    sc.collection.objects.link(ob)
    ob.location = (C.px_to_x(C.W / 2), -20.0, C.py_to_z(C.H / 2))
    ob.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = ob
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    return sc


def make_material(name, image):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    tex.extension = "EXTEND"
    val = nt.nodes.new("ShaderNodeValue")
    val.name = "Opacity"
    val.outputs[0].default_value = 1.0
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lk = nt.links.new
    lk(tex.outputs["Alpha"], mul.inputs[0])
    lk(val.outputs[0], mul.inputs[1])
    lk(mul.outputs[0], mix.inputs["Fac"])
    lk(tr.outputs[0], mix.inputs[1])
    lk(tex.outputs["Color"], em.inputs["Color"])
    lk(em.outputs[0], mix.inputs[2])
    lk(mix.outputs[0], out.inputs["Surface"])
    m.surface_render_method = RENDER_METHOD
    m.use_backface_culling = False
    return m


def load_image(path):
    """The PNG as a packed image whose transparent texels carry the colour of the nearest opaque ones: the GPU
    filters straight-alpha colours, so a leftover colour under alpha 0 (the AI parts hold magenta there) bleeds into
    every anti-aliased edge as a purple fringe."""
    src = bpy.data.images.load(str(path), check_existing=True)
    px = L.image_rgba(src).copy()
    known = px[:, :, 3] > 0
    px[~known, :3] = 0.0
    for _ in range(4):
        pad_k = np.pad(known, 1)
        pad_c = np.pad(px[:, :, :3] * known[:, :, None], ((1, 1), (1, 1), (0, 0)))
        h, w = known.shape
        n = sum(pad_k[1 + dy:1 + dy + h, 1 + dx:1 + dx + w].astype(np.float32) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        c = sum(pad_c[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = ~known & (n > 0)
        px[grow, :3] = c[grow] / n[grow][:, None]
        known = known | grow
    img = bpy.data.images.new(Path(path).parent.name + "_" + Path(path).stem, src.size[0], src.size[1], alpha=True)
    img.colorspace_settings.name = "sRGB"
    img.alpha_mode = "STRAIGHT"
    img.pixels.foreach_set(np.ascontiguousarray(px[::-1]).ravel())
    img.pack()
    bpy.data.images.remove(src)
    return img


# -------------------------------------------------------------------------------------------------------------- meshes
def grid_mesh(name, alpha, cell, dil=1):
    """Grid over the image (cell part-px wide) keeping the cells where the alpha, dilated by dil cells, is non-zero.
    Returns (mesh, part-px coordinates of its vertices (n, 2)); UVs onto the image."""
    h, w = alpha.shape
    nx, ny = max(1, math.ceil(w / cell)), max(1, math.ceil(h / cell))
    ex = np.unique(np.round(np.linspace(0, w, nx + 1)).astype(int))
    ey = np.unique(np.round(np.linspace(0, h, ny + 1)).astype(int))
    occ = np.maximum.reduceat(np.maximum.reduceat((alpha > 0.004).astype(np.uint8), ey[:-1], axis=0), ex[:-1], axis=1)
    pad = np.pad(occ, dil)
    out = np.zeros_like(occ)
    for dy in range(2 * dil + 1):
        for dx in range(2 * dil + 1):
            out |= pad[dy:dy + occ.shape[0], dx:dx + occ.shape[1]]
    cy, cx = np.nonzero(out)
    vid = -np.ones((len(ey), len(ex)), np.int64)
    for dy in (0, 1):
        for dx in (0, 1):
            vid[cy + dy, cx + dx] = 0
    used = np.argwhere(vid == 0)
    vid[used[:, 0], used[:, 1]] = np.arange(len(used))
    faces = np.stack([vid[cy, cx], vid[cy, cx + 1], vid[cy + 1, cx + 1], vid[cy + 1, cx]], axis=1)
    pxy = np.stack([ex[used[:, 1]], ey[used[:, 0]]], axis=1).astype(np.float64)
    me = bpy.data.meshes.new(name)
    me.from_pydata([(0, 0, 0)] * len(pxy), [], faces.tolist())
    uv = me.uv_layers.new(name="UV")
    vi = np.empty(len(me.loops), np.int64)
    me.loops.foreach_get("vertex_index", vi)
    vuv = np.stack([pxy[:, 0] / w, 1.0 - pxy[:, 1] / h], axis=1)
    uv.data.foreach_set("uv", vuv[vi].ravel())
    return me, pxy


def place(me, screen):
    """screen: (n, 2) film px -> mesh coordinates."""
    co = np.zeros((len(screen), 3))
    co[:, 0] = screen[:, 0] / C.PX_PER_M
    co[:, 2] = (C.FLOOR_PX - screen[:, 1]) / C.PX_PER_M
    me.vertices.foreach_set("co", co.ravel())
    me.update()


def apply_m(m, xy):
    return np.stack([m[0] * xy[:, 0] + m[1] * xy[:, 1] + m[2], m[3] * xy[:, 0] + m[4] * xy[:, 1] + m[5]], axis=1)


# ------------------------------------------------------------------------------------------------------------ weights
def half_width(alpha, pivot, axis, scale):
    """Half the limb width (film px) at the pivot: alpha extent perpendicular to the bone axis through the pivot."""
    h, w = alpha.shape
    nx, ny = -axis[1], axis[0]

    def hit(t):
        x, y = int(round(pivot[0] + t * nx)), int(round(pivot[1] + t * ny))
        return 0 <= x < w and 0 <= y < h and alpha[y, x] > 0.5

    ts = []
    for sgn in (1, -1):
        t = 0.0
        while t < 150 and hit(sgn * (t + 0.5)):
            t += 0.5
        ts.append(t)
    return max((ts[0] + ts[1]) / 2.0, 6.0) * scale


class Joints:
    """Band data of every banded joint of one character, in rest screen coordinates."""

    def __init__(self, r, Wr, alphas, k):
        self.b = {}
        s = C_SCALE[r["char"]]
        for n, p in r["parts"].items():
            if p.get("joint") not in BAND_JOINTS or not p.get("parent"):
                continue
            piv = np.array(P.apply(Wr[n], p["pivot"]))
            tl = np.array(P.apply(Wr[n], r["tail"][n]))
            u = (tl - piv) / np.linalg.norm(tl - piv)
            hw = half_width(alphas[n], p["pivot"], r["axis"][n], s)
            self.b[n] = dict(p=piv, u=u, hw=hw, b=k * KJ[p["joint"]] * hw, pa=p["parent"])

    def weights(self, r, part, V):
        """{bone: weights (n,)} for the vertices V (n, 2) of a part."""
        w = {part: np.ones(len(V))}
        own = self.b.get(part)
        if own:
            s = (V - own["p"]) @ own["u"]
            wc = smooth(s, -own["b"], own["b"])
            w[own["pa"]] = 1.0 - wc
            w[part] = wc
        seen = set()
        for c, p in r["parts"].items():
            if p.get("parent") != part or c not in self.b:
                continue
            base = p.get("variant_of") or c
            if base in seen or base not in self.b:
                continue
            seen.add(base)
            band = self.b[base]
            d = V - band["p"]
            s = d @ band["u"]
            lat = np.abs(d[:, 0] * band["u"][1] - d[:, 1] * band["u"][0])
            m = (1 - smooth(np.hypot(d[:, 0], d[:, 1]), R0 * band["b"], R1 * band["b"])) * \
                (1 - smooth(lat, LAT0 * band["hw"], LAT1 * band["hw"]))
            f = smooth(s, -band["b"], band["b"]) * m
            moved = w[part] * f
            w[base] = w.get(base, 0) + moved
            w[part] = w[part] - moved
        tot = sum(w.values())
        return {k: v / tot for k, v in w.items() if (v / tot).max() > 0.003}


C_SCALE = {c: P.CHARS[c]["scale"] for c in P.CHARS}


# -------------------------------------------------------------------------------------------------------------- build
def build_char(sc, char, poses, K, cell, dq):
    r = P.rig(char)
    coll = bpy.data.collections.new(char)
    sc.collection.children.link(coll)
    imgs = {n: load_image(L.part_path(char, p["file"])) for n, p in r["parts"].items()}
    alphas = {n: L.image_rgba(i)[:, :, 3] for n, i in imgs.items()}
    root = L.rest_root(char, alphas)
    rest = P.neutral(char, root)
    Wr = P.world(r, rest)
    joints = Joints(r, Wr, alphas, K)

    arm_data = bpy.data.armatures.new(f"{char}_rig")
    arm = bpy.data.objects.new(f"{char}_rig", arm_data)
    coll.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for n in r["order"]:
        b = arm_data.edit_bones.new(n)
        b.head = L.bl_pt(*P.apply(Wr[n], r["parts"][n]["pivot"]))
        b.tail = L.bl_pt(*P.apply(Wr[n], r["tail"][n]))
    bpy.ops.object.mode_set(mode="OBJECT")
    # Bones are not parented: pose.py lets a parent's len{} move the child's joint without squashing the child, which
    # Blender's inherit_scale NONE does not reproduce (it still scales the child's offset). Every bone is keyed with its
    # exact world matrix instead; the rig.json parent is kept as a custom property.
    for n in r["order"]:
        arm_data.bones[n]["parent_part"] = r["parts"][n].get("parent") or ""
    Lm = {n: arm_data.bones[n].matrix_local.copy() for n in r["order"]}

    objs = {}
    for n, p in r["parts"].items():
        me, pxy = grid_mesh(f"{char}:{n}", alphas[n], 3.0 / C_SCALE[char] * cell / 3.0)
        V = apply_m(Wr[n], pxy)
        place(me, V)
        ob = bpy.data.objects.new(f"{char}:{n}", me)
        coll.objects.link(ob)
        ob.parent = arm
        ob.location.y = -r["parts"][n]["z"] * L.Z_STEP
        ob["rest_y"] = ob.location.y
        ob["part"] = n
        for bone, wv in joints.weights(r, n, V).items():
            vg = ob.vertex_groups.new(name=bone)
            for i in np.nonzero(wv > 0)[0]:
                vg.add([int(i)], float(wv[i]), "REPLACE")
        mod = ob.modifiers.new("Armature", "ARMATURE")
        mod.object = arm
        mod.use_vertex_groups = True
        mod.use_deform_preserve_volume = dq
        mat = make_material(f"{char}:{n}", imgs[n])
        me.materials.append(mat)
        objs[n] = ob

    props = {}
    for name, pr in P.PROPS.items():
        if pr["char"] != char:
            continue
        img = load_image(P.PARTS_DIR / pr["file"])
        me, pxy = grid_mesh(f"{char}:{name}", L.image_rgba(img)[:, :, 3], 1e9)  # one quad over the whole image
        loc = pxy - np.array(pr["pivot"])
        co = np.zeros((len(loc), 3))
        co[:, 0], co[:, 2] = loc[:, 0] / C.PX_PER_M, -loc[:, 1] / C.PX_PER_M
        me.vertices.foreach_set("co", co.ravel())
        ob = bpy.data.objects.new(f"{char}:{name}", me)
        coll.objects.link(ob)
        me.materials.append(make_material(f"{char}:{name}", img))
        ob["part"] = name
        props[name] = ob
    return dict(r=r, arm=arm, Wr=Wr, Lm=Lm, objs=objs, props=props, root=root)


def key_char(sc, ch, poses, frame0=1):
    r, arm, Wr, Lm = ch["r"], ch["arm"], ch["Wr"], ch["Lm"]
    Wr_inv = {n: P.inv(m) for n, m in Wr.items()}
    prev_q = {}
    worst = 0.0
    series = {n: ([], []) for n in r["parts"]}  # opacity, y
    pseries = {n: ([], [], []) for n in ch["props"]}
    pbs = arm.pose.bones
    expect = {}
    for pb in pbs:
        pb.rotation_mode = "QUATERNION"
    for t, pz in enumerate(poses):
        fr = frame0 + t
        W = L.pose_world(r, pz)
        for n in r["order"]:
            M = L.bl(P.mul(W[n], Wr_inv[n])) @ Lm[n]
            basis = Lm[n].inverted() @ M
            loc, q, sca = basis.decompose()
            worst = max(worst, max(abs(x) for row in (Matrix.LocRotScale(loc, q, sca) - basis) for x in row))
            if n in prev_q:
                q.make_compatible(prev_q[n])
            prev_q[n] = q
            pb = pbs[n]
            pb.location, pb.rotation_quaternion, pb.scale = loc, q, sca
            if t % 53 == 0:
                expect.setdefault(fr, {})[n] = M
            pb.keyframe_insert("location", frame=fr)
            pb.keyframe_insert("rotation_quaternion", frame=fr)
            pb.keyframe_insert("scale", frame=fr)
            series[n][0].append(P.visible_alpha(r, pz, n))
            series[n][1].append(-P.z_of(r, pz, n) * L.Z_STEP)
        for name, ob in ch["props"].items():
            st = pz.get("props", {}).get(name)
            if st is None:
                pseries[name][0].append(0.0)
                st = {"pos": (0, 0), "rot": 0, "sx": 1.0, "sy": 1.0}
            else:
                pseries[name][0].append(st.get("alpha", 1.0))
            pseries[name][1].append(-st.get("z", 30) * L.Z_STEP)
            x, _, z = L.bl_pt(*st["pos"])
            ob.location = (x, -st.get("z", 30) * L.Z_STEP, z)
            ob.rotation_mode = "XYZ"
            ob.rotation_euler = (0.0, math.radians(st.get("rot", 0.0)), 0.0)
            ob.scale = (st.get("sx", 1.0), 1.0, st.get("sy", 1.0))
            ob.keyframe_insert("location", frame=fr)
            ob.keyframe_insert("rotation_euler", frame=fr)
            ob.keyframe_insert("scale", frame=fr)
    # opacity and depth: key every frame where the value is not constant
    for n, (alpha, ys) in series.items():
        key_series(ch["objs"][n], alpha, ys, frame0)
    for n, (alpha, ys, _) in pseries.items():
        key_series(ch["props"][n], alpha, None, frame0)
    # the evaluated pose must reproduce the wanted bone matrices (inherit_scale NONE must not change them)
    ev = 0.0
    for fr, ms in expect.items():
        sc.frame_set(fr)
        for n, M in ms.items():
            ev = max(ev, max(abs(x) for row in (pbs[n].matrix - M) for x in row))
    return worst, ev


def key_series(ob, alpha, ys, frame0):
    sock = ob.data.materials[0].node_tree.nodes["Opacity"].outputs[0]
    nt = ob.data.materials[0].node_tree
    if len(set(alpha)) == 1:
        sock.default_value = alpha[0]
    else:
        for t, a in enumerate(alpha):
            sock.default_value = a
            nt.keyframe_insert('nodes["Opacity"].outputs[0].default_value', frame=frame0 + t)
    if ys is not None:
        if len(set(ys)) == 1:
            ob.location.y = ys[0]
        else:
            for t, y in enumerate(ys):
                ob.location.y = y
                ob.keyframe_insert("location", index=1, frame=frame0 + t)


RENDER_METHOD = "BLENDED"


def main():
    global RENDER_METHOD
    take_name = L.args("--take", "take")
    out = L.abspath(L.args("--out", str(L.BLEND if take_name == "take" else L.CHECKS_DIR / f"{take_name}.blend")))
    K = float(L.args("--k", "1.2"))
    cell = float(L.args("--cell", "3"))
    dq = L.args("--dq", "1") == "1"
    RENDER_METHOD = L.args("--method", "BLENDED")
    take = importlib.import_module(take_name)
    sc = reset_scene()
    sc.frame_start, sc.frame_end = 1, take.FRAMES
    sc["take"] = take_name
    for char in ("human", "ai"):
        ch = build_char(sc, char, None, K, cell, dq)
        err, ev = key_char(sc, ch, take.poses(char))
        print(f"BUILD {char}: {sum(len(o.data.vertices) for o in ch['objs'].values())} vertices, "
              f"{len(ch['objs'])} part meshes, {len(ch['props'])} props, root {ch['root']}, "
              f"max basis decomposition error {err:.2e}, evaluated pose vs wanted matrix {ev:.2e}")
    sc.frame_set(1)
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out))
    print("BUILD saved", out, "frames", take.FRAMES)


if __name__ == "__main__":
    main()
