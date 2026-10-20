# Colour exactness of the render: the neutral render (board.py --neutral) against the part PNGs. A film pixel counts
# when the topmost part touching it is flat there ((2 RAD + 1)^2 source neighbourhood opaque and one colour, RAD 1), so resampling and
# anti-aliasing cannot contribute: the expected colour is that PNG colour.
#
#   "$BLENDER" -b --factory-startup -P blender/cutout/colorcheck.py -- [--dir DIR] [--rad 1]   (default DIR from board.py --neutral)
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bendtest as B  # noqa: E402
import lib as L  # noqa: E402
from lib import P  # noqa: E402


def srgb8(img):
    """RGBA of a Blender image as 8-bit values (the .pixels of an sRGB PNG are the file's own encoded values)."""
    return np.round(L.image_rgba(img) * 255).astype(np.int32)


def main():
    d = L.abspath(L.args("--dir", str(L.CHECKS_DIR / "neutral-render")))
    for char in ("human", "ai"):
        r = P.rig(char)
        W = P.world(r, B.poses(char)[0])
        owner_z = np.full((C_H, C_W), -1e9)
        expect = np.full((C_H, C_W, 3), -1, np.int32)
        src = np.full((C_H, C_W, 3), -1, np.int32)
        for n in sorted(r["parts"], key=lambda n: r["parts"][n]["z"]):
            p = r["parts"][n]
            if p.get("hidden"):
                continue
            img = bpy.data.images.load(str(L.part_path(char, p["file"])), check_existing=True)
            a = srgb8(img)
            h, w = a.shape[:2]
            op = a[:, :, 3] >= 255
            rgb = a[:, :, :3]
            pad = np.pad(rgb, ((2, 2), (2, 2), (0, 0)), mode="edge")
            padop = np.pad(op, 2, constant_values=False)
            uni = np.ones((h, w), bool)
            deep = np.ones((h, w), bool)
            touched = np.zeros((h, w), bool)
            padt = np.pad(a[:, :, 3] > 0, 2, constant_values=False)
            for dy in range(2 - RAD, 3 + RAD):
                for dx in range(2 - RAD, 3 + RAD):
                    uni &= padop[dy:dy + h, dx:dx + w] & (pad[dy:dy + h, dx:dx + w] == rgb).all(axis=2)
                    deep &= padop[dy:dy + h, dx:dx + w]
                    touched |= padt[dy:dy + h, dx:dx + w]
            inv = P.inv(W[n])
            ys, xs = np.mgrid[0:C_H, 0:C_W]
            u = inv[0] * (xs + 0.5) + inv[1] * (ys + 0.5) + inv[2]
            v = inv[3] * (xs + 0.5) + inv[4] * (ys + 0.5) + inv[5]
            iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
            inside = (iu >= 0) & (iu < w) & (iv >= 0) & (iv < h)
            iu, iv = np.clip(iu, 0, w - 1), np.clip(iv, 0, h - 1)
            hit = inside & touched[iv, iu]
            owner_z[hit] = r["parts"][n]["z"]
            ok = hit & uni[iv, iu]
            expect[hit] = -1
            src[hit] = -1
            src[hit & deep[iv, iu]] = rgb[iv, iu][hit & deep[iv, iu]]
            expect[ok] = rgb[iv, iu][ok]
        out = bpy.data.images.load(str(d / char / "0001.png"), check_existing=False)
        got = srgb8(out)
        m = (src[:, :, 0] >= 0) & (got[:, :, 3] == 255)
        bias = got[:, :, :3][m].mean(axis=0) - src[m].mean(axis=0)
        print(f"COLOR {char}: opaque interior px {int(m.sum())}, mean colour render - PNG per channel (0-255) "
              f"{bias[0]:+.3f} {bias[1]:+.3f} {bias[2]:+.3f}  (grain of the art makes single pixels differ after resampling)")
        valid = (expect[:, :, 0] >= 0) & (got[:, :, 3] == 255)
        err = np.abs(got[:, :, :3] - expect)[valid]
        print(f"COLOR {char}: {int(valid.sum())} flat interior px, max RGB error {int(err.max())} /255, "
              f"mean {err.mean():.4f}, px off by more than 1: {int((err.max(axis=1) > 1).sum())}")


C_W, C_H = 1920, 1080
RAD = int(L.args("--rad", "1"))

if __name__ == "__main__":
    main()
