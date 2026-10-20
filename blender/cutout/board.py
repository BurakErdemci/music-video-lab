# Renders the frames the boards of tile.py are made of (Blender; run on the bendtest build).
#
#   "$BLENDER" -b --factory-startup video/out/cutout-checks/bendtest.blend -P blender/cutout/board.py -- --bend --neutral
#       [--out DIR] [--only part,part]
#   --bend:    every bendtest.board() frame (each joint at the bend angles), far limbs with the near limb hidden
#              -> DIR/<char>/NNNN.png (default DIR: video/out/cutout-checks/bend-render)
#   --neutral: film frame 0 of the bendtest (standing, all joints 0) -> DIR/<char>/0001.png
#              (default DIR: video/out/cutout-checks/neutral-render)
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bendtest as B  # noqa: E402
import lib as L  # noqa: E402
from render import render_all  # noqa: E402


def main():
    only = [x for x in L.args("--only", "").split(",") if x]
    if L.args("--neutral", flag=True):
        render_all("both", 1, 1, L.abspath(L.args("--out", str(L.CHECKS_DIR / "neutral-render"))), [0])
    if L.args("--bend", flag=True):
        out = L.abspath(L.args("--out", str(L.CHECKS_DIR / "bend-render")))
        for char in ("human", "ai"):
            for label, part, hide, frames in B.board(char):
                if not only or part in only:
                    render_all(char, 1, 1, out, sorted(frames.values()), hide=hide)


if __name__ == "__main__":
    main()
