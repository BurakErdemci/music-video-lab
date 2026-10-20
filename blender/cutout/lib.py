# Blender-side helpers shared by build.py, render.py, checks.py and board.py (import inside Blender only).
import sys
from pathlib import Path

import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # blender/common.py
sys.path.insert(0, str(HERE))
import common as C  # noqa: E402
import pose as P  # noqa: E402
from mathutils import Matrix  # noqa: E402

BLEND = HERE / "cutout-v1.blend"
FRAMES_DIR = C.REPO / "video" / "public" / "blender" / "cutout-v1"
CHECKS_DIR = C.REPO / "video" / "out" / "cutout-checks"
Z_STEP = 0.002  # metres of depth per rig.json z unit (camera at -Y: higher z = closer = more negative y)
FLOOR = {"human": C.FLOOR_PX, "ai": C.FLOOR_PX + 10.0}
REST_X = {"human": 560.0, "ai": 1360.0}


def args(name, default=None, flag=False):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if flag:
        return name in argv
    return argv[argv.index(name) + 1] if name in argv else default


def abspath(p):
    p = Path(p)
    return p if p.is_absolute() else C.REPO / p  # Blender resolves a bare relative path against the drive root


def bl_pt(x, y):
    """Screen px -> Blender point (camera looks along +Y, so the picture plane is XZ)."""
    return (x / C.PX_PER_M, 0.0, (C.FLOOR_PX - y) / C.PX_PER_M)


def bl(m):
    """2D screen affine (pose.py) -> 4x4 acting on Blender coordinates of screen points; Y is left alone."""
    a, b, c, d, e, f = m
    k = C.PX_PER_M
    return Matrix(((a, 0, -b, (b * C.FLOOR_PX + c) / k), (0, 1, 0, 0),
                   (-d, 0, e, (C.FLOOR_PX - C.FLOOR_PX * e - f) / k), (0, 0, 0, 1)))


def part_path(char, part_file):
    return P.PARTS_DIR / char / part_file


def image_rgba(img):
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[::-1]  # top row first


def pose_world(r, pose):
    """P.world, with every hand variant following its hand_*_open rotation and foreshortening."""
    rot, ln = dict(pose.get("rot", {})), dict(pose.get("len", {}))
    for n, p in r["parts"].items():
        v = p.get("variant_of")
        if v:
            for d in (rot, ln):
                if v in d:
                    d[n] = d[v]
    return P.world(r, dict(pose, rot=rot, **{"len": ln}))


def rest_root(char, alphas):
    """Root that stands the character's feet on its floor line (alphas: {part: top-down alpha array})."""
    r = P.rig(char)
    W = P.world(r, P.neutral(char, (0.0, 0.0)))
    low = -1e9
    for n in ("foot_near", "foot_far"):
        ys, xs = np.nonzero(alphas[n] > 0.5)
        m = W[n]
        low = max(low, float((m[3] * xs + m[4] * ys + m[5]).max()))
    return (REST_X[char], FLOOR[char] - low)
