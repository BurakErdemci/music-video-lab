# Shared constants and helpers for the Blender character test. Imported by build.py, anim.py, render.py and checks.py,
# which Blender runs with `-P` (see README.md); every path here is relative to the repository.
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

BLEND = HERE / "test-v1.blend"
FRAMES_DIR = REPO / "video" / "public" / "blender" / "test-v1"
CHECKS_DIR = REPO / "video" / "out" / "blender-test-checks"

FPS = 30
FRAMES = 540  # keep in sync with video/src/scenes/BlenderTestScene.tsx BLENDER_TEST_FRAMES

# Screen mapping of the film (video/src/layout.ts): an orthographic side camera, 1 m = PX_PER_M px, the human's floor
# (HUMAN_FLOOR = 1000 px) at z = 0. The AI's floor line is AI_FLOOR = 1010 px.
W, H = 1920, 1080
PX_PER_M = 380.0
FLOOR_PX = 1000.0
AI_FLOOR_Z = -(1010.0 - FLOOR_PX) / PX_PER_M


def px_to_x(px: float) -> float:
    return px / PX_PER_M


def py_to_z(py: float) -> float:
    return (FLOOR_PX - py) / PX_PER_M


# Palette (video/src/style/palette.ts).
NAVY = "#18203A"
CREAM = "#F3EFE4"
YELLOW = "#F0D35A"
AI_FILL = "#F3EFE4"


def srgb_to_linear(hex_color: str):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)
