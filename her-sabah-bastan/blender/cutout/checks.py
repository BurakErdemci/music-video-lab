# Measurements of the cut-out take (run with Blender's Python, which ships numpy). Output lines start with BONES / SIL /
# JOINTS; CSVs go to video/out/cutout-checks/.
#
#   --bones   "$BLENDER" -b --factory-startup blender/cutout/cutout-v1.blend -P blender/cutout/checks.py -- --bones
#             every frame, evaluated pose bones: length against rest (bones with an intended len{} factor: actual ratio
#             against the intended one; all others against 1), and the largest one-frame screen jump of the tips of the
#             hands, feet and head -> bones.csv, jumps.csv
#   --sil DIR "$BLENDER" -b --factory-startup -P blender/cutout/checks.py -- --sil video/out/cutout-checks/mattes
#             DIR/{human,ai}/NNNN.png body mattes (render.py --bodies): 8-connected pieces and frame-to-frame area change
#             (reuses blender/checks.py) -> DIR/silhouette.csv
#   --joints  "$BLENDER" -b --factory-startup -P blender/cutout/checks.py -- --joints
#             the most bent take frame of each joint (|rot| of the child part) and its screen position
#             -> joints.csv (tile.py joints makes the crop board from the renders)
import csv
import importlib.util
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lib as L  # noqa: E402
from lib import C, P  # noqa: E402

TIPS = ("hand_near_open", "hand_far_open", "foot_near", "foot_far", "head")
JOINT_PARTS = [("elbow_near", "forearm_near"), ("elbow_far", "forearm_far"), ("knee_near", "shin_near"),
               ("knee_far", "shin_far"), ("shoulder_near", "upper_arm_near"), ("shoulder_far", "upper_arm_far"),
               ("hip_near", "thigh_near"), ("hip_far", "thigh_far"), ("waist", "chest")]


def take_module():
    import importlib
    return importlib.import_module(bpy.context.scene.get("take", "take"))


def bones():
    sc = bpy.context.scene
    take = take_module()
    for ob in bpy.data.objects:
        if ob.type == "MESH":
            ob.hide_viewport = True  # the pose is all we measure
    L.CHECKS_DIR.mkdir(parents=True, exist_ok=True)
    rows, jrows = [], []
    for char in ("human", "ai"):
        arm = bpy.data.objects[f"{char}_rig"]
        r = P.rig(char)
        poses = take.poses(char)
        rest = {n: (arm.data.bones[n].tail_local - arm.data.bones[n].head_local).length for n in r["parts"]}
        dev_free, dev_len = (0.0, None, -1), (0.0, None, -1)
        prev, jump = {}, {n: (0.0, -1) for n in TIPS}
        actual_vs_intended = {}
        for t in range(sc.frame_end):
            sc.frame_set(t + 1)
            for n in r["parts"]:
                pb = arm.pose.bones[n]
                ratio = (pb.tail - pb.head).length / rest[n]
                want = poses[t].get("len", {}).get(n)
                if want is None and r["parts"][n].get("variant_of"):
                    want = poses[t].get("len", {}).get(r["parts"][n]["variant_of"])
                rows.append((char, t, n, round(ratio, 5), 1.0 if want is None else want))
                if want is None:
                    if abs(ratio - 1) > dev_free[0]:
                        dev_free = (abs(ratio - 1), n, t)
                else:
                    e = abs(ratio - want) / want
                    if e > dev_len[0]:
                        dev_len = (e, n, t)
                    a = actual_vs_intended.get(n, (0, 0, 0))
                    if abs(ratio - want) >= a[0]:
                        actual_vs_intended[n] = (abs(ratio - want), ratio, want)
            for n in TIPS:
                p = arm.matrix_world @ arm.pose.bones[n].tail
                if n in prev:
                    d = ((p.x - prev[n].x) ** 2 + (p.z - prev[n].z) ** 2) ** 0.5 * C.PX_PER_M
                    if d > jump[n][0]:
                        jump[n] = (d, t)
                    jrows.append((char, t, n, round(d, 2)))
                prev[n] = p.copy()
        print(f"BONES {char}: bones without a len factor: max length change {dev_free[0] * 100:.4f}% "
              f"({dev_free[1]}, film frame {dev_free[2]})")
        if dev_len[1]:
            print(f"BONES {char}: bones with an intended len factor: max |actual - intended| {dev_len[0] * 100:.4f}% of the "
                  f"intended ({dev_len[1]}, film frame {dev_len[2]})")
        for n, (d, ratio, want) in sorted(actual_vs_intended.items()):
            print(f"BONES {char} {n}: len factor actual {ratio:.4f} vs intended {want:.4f} (worst frame)")
        for n, (d, t) in jump.items():
            print(f"BONES {char} {n} tip: max {d:.1f} px in one frame (film frame {t - 1} -> {t})")
    with open(L.CHECKS_DIR / "bones.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["char", "film_frame", "bone", "length_ratio", "intended"])
        w.writerows(rows)
    with open(L.CHECKS_DIR / "jumps.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["char", "film_frame", "tip", "jump_px"])
        w.writerows(jrows)


def sil(d):
    spec = importlib.util.spec_from_file_location("old_checks", C.REPO / "blender" / "checks.py")
    old = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(old)
    old.sil(d)


def joints():
    take = take_module()
    rows = []
    for char in ("human", "ai"):
        r = P.rig(char)
        poses = take.poses(char)
        for label, part in JOINT_PARTS:
            best = max(range(len(poses)), key=lambda t: abs(poses[t].get("rot", {}).get(part, 0.0)))
            W = L.pose_world(r, poses[best])
            x, y = P.joint(r, W, part)
            rows.append((char, label, best, round(x, 1), round(y, 1), poses[best].get("rot", {}).get(part, 0.0)))
            print(f"JOINTS {char} {label}: most bent at film frame {best} ({poses[best].get('rot', {}).get(part, 0.0):.1f} deg)")
    L.CHECKS_DIR.mkdir(parents=True, exist_ok=True)
    with open(L.CHECKS_DIR / "joints.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["char", "joint", "frame", "cx", "cy", "rot_deg"])
        w.writerows(rows)


if __name__ == "__main__":
    if L.args("--bones", flag=True):
        bones()
    if L.args("--sil"):
        sil(L.abspath(L.args("--sil")))
    if L.args("--joints", flag=True):
        joints()
