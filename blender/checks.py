# Measurements of the Blender test (run with Blender's Python, which ships numpy):
#
#   bones:  "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/checks.py -- --bones
#           every frame: each deform bone's evaluated length against its rest length (IK must never stretch a limb).
#   sil:    "$BLENDER" -b --factory-startup -P blender/checks.py -- --sil DIR
#           DIR/{human,ai}/NNNN.png (body-only mattes, render.py --bodies): per frame silhouette area (alpha > 0.5),
#           its change from the previous frame, and the number of 8-connected pieces (1 = one body, never doubled or
#           torn). Writes DIR/silhouette.csv and prints the maxima.
import csv
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402


TRACK = ("hand.L", "hand.R", "foot.L", "foot.R", "head")


def bones():
    """Bone lengths against rest, and the largest frame-to-frame screen move of the hands, feet and head (a pose pop
    shows up as one large move)."""
    sc = bpy.context.scene
    worst = {}
    prev, moves = {}, {}
    for rig in (o for o in bpy.data.objects if o.type == "ARMATURE"):
        rest = {b.name: b.length for b in rig.data.bones if b.use_deform}
        for f in range(1, C.FRAMES + 1):
            sc.frame_set(f)
            for name in TRACK:
                p = rig.matrix_world @ rig.pose.bones[name].tail
                key = (rig.name, name)
                if key in prev:
                    d = ((p.x - prev[key].x) ** 2 + (p.z - prev[key].z) ** 2) ** 0.5 * C.PX_PER_M  # screen plane
                    if d > moves.get(key, (0, 0))[0]:
                        moves[key] = (d, f - 1)
                prev[key] = p.copy()
            for pb in rig.pose.bones:
                if pb.name in rest:
                    dev = abs((pb.tail - pb.head).length - rest[pb.name]) / rest[pb.name]
                    key = (rig.name, pb.name)
                    if dev > worst.get(key, (0, 0))[0]:
                        worst[key] = (dev, f - 1)
    top = sorted(worst.items(), key=lambda kv: -kv[1][0])
    for (rig, b), (dev, f) in top[:5]:
        print(f"BONES {rig} {b}: max length change {dev * 100:.4f}% at film frame {f}")
    print(f"BONES max over all deform bones and frames: {top[0][1][0] * 100:.4f}%")
    for (rig, name), (d, f) in sorted(moves.items(), key=lambda kv: -kv[1][0]):
        print(f"BONES move {rig} {name} tip: max {d:.1f} px in one frame (film frame {f - 1} -> {f})")


def load_alpha(path):
    img = bpy.data.images.load(str(path), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[:, :, 3] > 0.5


def components(mask):
    """8-connected pieces of a boolean mask, by run-length union-find. Returns piece sizes, largest first."""
    parent = []

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    size = []
    prev = []
    rows = np.nonzero(mask.any(axis=1))[0]
    last_y = None
    for y in rows:
        d = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        starts, ends = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]  # run = [s, e)
        if last_y is None or y != last_y + 1:
            prev = []
        cur = []
        for s, e in zip(starts, ends):
            lab = len(parent)
            parent.append(lab)
            size.append(int(e - s))
            for ps, pe, pl in prev:
                if ps <= e and s <= pe:  # overlap incl. diagonal touch
                    ra, rb = find(lab), find(pl)
                    if ra != rb:
                        parent[ra] = rb
                        size[rb] += size[ra]
            cur.append((s, e, lab))
        prev = cur
        last_y = y
    roots = {find(i) for i in range(len(parent))}
    return sorted((size[r] for r in roots), reverse=True)


def sil(d):
    d = Path(d) if Path(d).is_absolute() else C.REPO / d
    rows = []
    summary = {}
    for who in ("human", "ai"):
        files = sorted((d / who).glob("*.png"))
        prev_area = None
        mx = {"pieces": (0, -1), "jump": (0.0, -1), "jump_px": (0, -1)}
        areas = []
        for p in files:
            f = int(p.stem) - 1
            m = load_alpha(p)
            area = int(m.sum())
            pieces = components(m)
            n = len(pieces)
            jump = 0.0 if prev_area is None else abs(area - prev_area) / max(prev_area, 1)
            jpx = 0 if prev_area is None else abs(area - prev_area)
            rows.append((who, f, area, jpx, round(jump * 100, 3), n, pieces[1] if n > 1 else 0))
            if n > mx["pieces"][0]:
                mx["pieces"] = (n, f)
            if jump > mx["jump"][0]:
                mx["jump"] = (jump, f)
            if jpx > mx["jump_px"][0]:
                mx["jump_px"] = (jpx, f)
            areas.append(area)
            prev_area = area
        summary[who] = (len(files), min(areas), max(areas), mx)
    with open(d / "silhouette.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["who", "film_frame", "area_px", "change_px", "change_pct", "pieces", "second_piece_px"])
        w.writerows(rows)
    for who, (n, amin, amax, mx) in summary.items():
        print(f"SIL {who}: {n} frames, area {amin}-{amax} px, max pieces {mx['pieces'][0]} (frame {mx['pieces'][1]}), "
              f"max frame-to-frame area change {mx['jump'][0] * 100:.2f}% (frame {mx['jump'][1]}) = "
              f"{mx['jump_px'][0]} px max (frame {mx['jump_px'][1]})")
    multi = [r for r in rows if r[5] > 1]
    print(f"SIL frames with more than one piece: {len(multi)}", multi[:10])


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--bones" in argv:
        bones()
    if "--sil" in argv:
        sil(argv[argv.index("--sil") + 1])
