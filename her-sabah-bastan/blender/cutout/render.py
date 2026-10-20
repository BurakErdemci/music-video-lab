# Renders the characters of cutout-v1.blend as transparent PNGs, one pass per character (Remotion layers them,
# checks.py measures each silhouette alone).
#
#   "$BLENDER" -b --factory-startup FILE.blend -P blender/cutout/render.py -- [--who human|ai|both] [--frames A-B]
#       [--step N] [--percent P] [--list f1,f2,...] [--out DIR] [--bodies] [--hide part,part]
#
# --frames are scene frames (1-based), --list takes film frames (0-based); output <out>/<who>/NNNN.png with
# NNNN = film frame + 1 (default out: video/public/blender/cutout-v1). --bodies hides the props (silhouette mattes);
# --hide hides the named parts (bend boards of the far limbs).
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lib as L  # noqa: E402


def render_all(who, a, b, out, lst, step=1, percent=100, bodies=False, hide=()):
    sc = bpy.context.scene
    sc.frame_step = step
    sc.render.resolution_percentage = percent
    for ob in bpy.data.objects:
        part = ob.get("part")
        if part:
            ob.hide_render = (bodies and part in L.P.PROPS) or part in hide
    for kind in (["human", "ai"] if who == "both" else [who]):
        for name, coll in bpy.data.collections.items():
            if name in ("human", "ai"):
                coll.hide_render = name != kind
        if lst:
            for t in lst:
                sc.frame_set(t + 1)
                sc.render.filepath = str(out / kind / f"{t + 1:04d}.png")
                bpy.ops.render.render(write_still=True)
            continue
        sc.frame_start, sc.frame_end = a, b
        sc.render.filepath = str(out / kind / "####")
        bpy.ops.render.render(animation=True)
        print("RENDERED", kind, a, b, out / kind)


def main():
    sc = bpy.context.scene
    a, b = (int(x) for x in L.args("--frames", f"1-{sc.frame_end}").split("-"))
    lst = [int(x) for x in L.args("--list", "").split(",") if x != ""]
    render_all(L.args("--who", "both"), a, b, L.abspath(L.args("--out", str(L.FRAMES_DIR))), lst,
               int(L.args("--step", "1")), int(L.args("--percent", "100")), L.args("--bodies", flag=True),
               [x for x in L.args("--hide", "").split(",") if x])


if __name__ == "__main__":
    main()
