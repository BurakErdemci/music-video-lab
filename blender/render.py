# Renders the characters of blender/test-v1.blend as transparent PNGs, one pass per character, so Remotion can layer
# them and checks.py can measure each silhouette alone.
#
#   "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/render.py -- [--who human|ai|both] [--frames A-B]
#       [--step N] [--percent P] [--list f1,f2,...] [--out DIR]   (--step / --percent / --list: previews; --list takes
#       film frames; --bodies: hide the mug and the book, for the silhouette check mattes of checks.py)
#
# Output: <out>/<who>/NNNN.png with NNNN = film frame + 1 (default out: video/public/blender/test-v1).
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402


def arg(name, default):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return argv[argv.index(name) + 1] if name in argv else default


def main():
    sc = bpy.context.scene
    who = arg("--who", "both")
    a, b = (int(x) for x in arg("--frames", f"1-{C.FRAMES}").split("-"))
    out = Path(arg("--out", str(C.FRAMES_DIR)))
    if not out.is_absolute():  # Blender resolves a bare relative path against the drive root, not the cwd
        out = C.REPO / out
    sc.frame_step = int(arg("--step", "1"))
    sc.render.resolution_percentage = int(arg("--percent", "100"))
    if "--bodies" in sys.argv:
        for ob in bpy.data.objects:
            if ob.name.startswith(("mug", "book", "cover_", "pages_", "turn_page")):
                ob.hide_render = True
    for kind in (["human", "ai"] if who == "both" else [who]):
        for name, coll in bpy.data.collections.items():
            if name in ("human", "ai"):
                coll.hide_render = name != kind
        if arg("--list", ""):
            for t in (int(x) for x in arg("--list", "").split(",")):
                sc.frame_set(t + 1)
                sc.render.filepath = str(out / kind / f"{t + 1:04d}.png")
                bpy.ops.render.render(write_still=True)
            continue
        sc.frame_start, sc.frame_end = a, b
        sc.render.filepath = str(out / kind / "####")
        bpy.ops.render.render(animation=True)
        print("RENDERED", kind, a, b, out / kind)


if __name__ == "__main__":
    main()
