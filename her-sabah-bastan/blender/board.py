# Same-person board: each character standing in profile, the pose of its reference drawing
# (stil/hareket/ref-insan-kanonik.png, stil/hareket/ref-ai.png), rendered with the film camera for run.sh `board`.
#
#   "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/board.py
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

POSE = {  # FK bends (radians) of the drawings: he stands with his head bowed, she stands straight
    "human": {"spine": 0.04, "chest": 0.1, "neck": 0.32, "head": 0.28},
    "ai": {"spine": 0.0, "chest": 0.04, "neck": 0.05, "head": 0.02},
}


def main():
    sc = bpy.context.scene
    for ob in bpy.data.objects:
        if ob.name.startswith(("mug", "book", "cover_", "pages_", "turn_page")):
            ob.hide_render = True
    out = C.CHECKS_DIR
    out.mkdir(parents=True, exist_ok=True)
    for kind, x in (("human", 800), ("ai", 1120)):
        rig = bpy.data.objects[f"{kind}_rig"]
        rig.animation_data_clear()
        for pb in rig.pose.bones:
            pb.location = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.rotation_euler = POSE[kind].get(pb.name, 0.0), 0, 0
        rig.location = (C.px_to_x(x), 0, 0)
        rig.rotation_euler = (0, 0, math.pi if kind == "ai" else 0)
        for name, coll in bpy.data.collections.items():
            if name in ("human", "ai"):
                coll.hide_render = name != kind
        sc.render.filepath = str(out / f"board-{kind}-render.png")
        bpy.ops.render.render(write_still=True)
        print("BOARD", sc.render.filepath)


if __name__ == "__main__":
    main()
