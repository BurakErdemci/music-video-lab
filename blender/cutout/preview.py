# Fast rigid preview of poses (no mesh deformation): pastes each part with its pose.world affine, for blocking the
# take without Blender. System Python with Pillow.
#
#   python blender/cutout/preview.py --frames 0,60,120 --out DIR [--bg PNG]     (take.py poses)
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pose as P  # noqa: E402

_IMG = {}


def img(path):
    if path not in _IMG:
        _IMG[path] = Image.open(path).convert("RGBA")
    return _IMG[path]


def layers(char, pz):
    """(z, image path, affine part px -> screen px, alpha) of every visible part and prop of one character pose."""
    r = P.rig(char)
    W = P.world(r, pz)
    out = []
    for name, p in r["parts"].items():
        a = P.visible_alpha(r, pz, name)
        if a > 0.001:
            out.append((P.z_of(r, pz, name), P.PARTS_DIR / char / p["file"], W[name], a))
    for name, st in pz.get("props", {}).items():
        a = st.get("alpha", 1.0)
        if a > 0.001:
            out.append((st.get("z", 30), P.PARTS_DIR / P.PROPS[name]["file"], P.prop_matrix(name, st), a))
    return out


def render(poses, bg=None, size=(1920, 1080)):
    """poses: [(char, pose)]; returns an RGBA image."""
    out = Image.open(bg).convert("RGBA").resize(size) if bg else Image.new("RGBA", size, (0, 0, 0, 0))
    for char, pz in poses:
        for z, path, m, a in sorted(layers(char, pz), key=lambda t: t[0]):
            im = img(path)
            ia = P.inv(m)
            layer = im.transform(size, Image.AFFINE, ia, resample=Image.BICUBIC)
            if a < 1.0:
                layer.putalpha(layer.getchannel("A").point(lambda v, a=a: int(v * a)))
            out = Image.alpha_composite(out, layer)
    return out


def main():
    argv = sys.argv[1:]

    def arg(n, d=None):
        return argv[argv.index(n) + 1] if n in argv else d

    import take
    frames = [int(x) for x in arg("--frames", "0").split(",")]
    out = Path(arg("--out", "."))
    out.mkdir(parents=True, exist_ok=True)
    bg = arg("--bg")
    seq = {c: take.poses(c) for c in ("human", "ai")}
    for f in frames:
        render([(c, seq[c][f]) for c in ("human", "ai")], bg=bg).save(out / f"{f:04d}.png")
    print("PREVIEW", out, frames)


if __name__ == "__main__":
    main()
