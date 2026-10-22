"""The living paintings' layers (round 10): each w-layers or x-layers drawing (stil/prompts/*/out/<ID>-{bg,fg,fgb,fgc}.png,
1672x941) upscaled with Upscayl digital-art-4x and resized to the wide plates' 3640x2048, the girls keyed off their flat
#00FF00, written to video/public/plates/layers/<ID>-<kind>.webp, plus <ID>.json with each girls drawing's alpha box.
Run under the render lock (Upscayl is a GPU job):
  tools/locked.sh uv run --with pillow --with numpy --with scipy python -I tools/imagegen/greenkey.py [RK1 RK2 ...]
  uv run --with pillow --with numpy --with scipy python -I tools/imagegen/greenkey.py --selftest   (no GPU; exits 1)

The key (not cutout.py's grey key): spill = g - max(r, b); alpha falls from 1 to 0 as the spill rises from 0.06 to
0.32. Where alpha is partial the colour is un-mixed from the known green (F = (C - (1 - a) * green) / a), and the
colour of the transparent pixels is filled outward from the opaque edge so the GPU's filtering never pulls green in.
Specks under 400 px (upscaler noise on the green) are dropped; holes inside the girls are kept as drawn.
"""
import json, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
# the drawings: the w-layers round (RK1, RK2, RK11, RK12) and the x-layers round (RK13)
SRCS = [ROOT / "stil" / "prompts" / d / "out" for d in ("w-layers", "x-layers")]
OUT = ROOT / "video" / "public" / "plates" / "layers"
UPSCAYL = r"C:\Program Files\Upscayl\resources\bin\upscayl-bin.exe"
MODELS = r"C:\Program Files\Upscayl\resources\models"
SIZE = (3640, 2048)
T0, T1 = 0.06, 0.32
MIN_SPECK = 400


def key(rgb: np.ndarray) -> np.ndarray:
    """RGB float 0..1 on flat green -> RGBA float 0..1 (straight alpha, colour filled past the edge)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = g - np.maximum(r, b)
    a = 1 - np.clip((spill - T0) / (T1 - T0), 0, 1)
    a = a * a * (3 - 2 * a)
    # drop small islands of opacity on the green (upscaler noise)
    lab, n = ndimage.label(a > 0.5)
    if n:
        area = ndimage.sum(np.ones_like(a), lab, index=np.arange(1, n + 1))
        small = np.isin(lab, np.nonzero(area < MIN_SPECK)[0] + 1)
        a[small] = 0
        near = ndimage.binary_dilation(a > 0.5, iterations=6)
        a[~near] = 0
    # near the matte edge a thin blue strand mixed with the green reads cyan (g as high as b), which the plain spill
    # keeps opaque: within 10 px of the screen, green above 0.55 of the blue counts as screen too
    zone = ndimage.binary_dilation(a < 0.5, iterations=10)
    ae = 1 - np.clip((g - np.maximum(r, 0.55 * b) - T0) / (T1 - T0), 0, 1)
    ae = ae * ae * (3 - 2 * ae)
    a = np.where(zone, np.minimum(a, ae), a)
    # un-mix the colour from the green behind it
    safe = np.maximum(a, 1e-3)
    f = np.stack([r / safe, (g - (1 - a)) / safe, b / safe], -1)
    # the green channel never exceeds the larger of red and blue on the girls (no green in them): despill what is left
    f[..., 1] = np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2]))
    f = np.clip(f, 0, 1)
    # fill the colour outward from the opaque edge (alpha-weighted blur), so filtering at the edge stays on her colours
    w = (a > 0.6).astype(np.float32)
    acc = np.stack([ndimage.gaussian_filter(f[..., i] * w, 6) for i in range(3)], -1)
    ws = ndimage.gaussian_filter(w, 6)[..., None]
    fill = np.where(ws > 1e-4, acc / np.maximum(ws, 1e-4), 0)
    f = np.where((a < 0.6)[..., None], fill, f)
    return np.concatenate([f, a[..., None]], -1)


def upscale(src: Path, tmp: Path) -> Image.Image:
    out4 = tmp / f"{src.stem}_4x.png"
    r = subprocess.run([UPSCAYL, "-i", str(src), "-o", str(out4), "-m", MODELS, "-n", "digital-art-4x", "-s", "4"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode or not out4.exists():
        sys.exit(f"{src.name}: upscayl failed rc={r.returncode}: {r.stderr[-300:]}")
    return Image.open(out4).convert("RGB").resize(SIZE, Image.LANCZOS)


def box(a: np.ndarray) -> dict:
    """The alpha's bounding box in uv (y down) and which frame edges the girls touch (they were cut there)."""
    ys, xs = np.nonzero(a > 0.5)
    h, w = a.shape
    edge = lambda m: bool(m.any())
    return {
        "box": [round(xs.min() / w, 4), round(ys.min() / h, 4), round((xs.max() + 1) / w, 4), round((ys.max() + 1) / h, 4)],
        "touch": {"left": edge(a[:, :6] > 0.5), "right": edge(a[:, -6:] > 0.5), "top": edge(a[:6] > 0.5), "bottom": edge(a[-6:] > 0.5)},
        "cover": round(float((a > 0.5).mean()), 4),
    }


def selftest() -> int:
    """A disc of orange hair colour and a yellow tip on green keys opaque, the green transparent, a 50 % mix un-mixes."""
    img = np.zeros((200, 200, 3), np.float32)
    img[...] = (0, 1, 0)
    yy, xx = np.mgrid[:200, :200]
    disc = (yy - 100) ** 2 + (xx - 100) ** 2 < 60 ** 2
    img[disc] = (1.0, 0.45, 0.1)
    img[95:105, 95:105] = (1.0, 1.0, 0.0)  # a yellow hair tip: green as high as red, must stay opaque
    img[10, 10] = (1, 0.4, 0.1)  # a one-pixel speck on the green
    k = key(img)
    fails = []
    if k[100, 100, 3] < 0.99: fails.append(f"yellow tip alpha {k[100, 100, 3]:.2f}")
    if k[100, 60, 3] < 0.99: fails.append(f"orange alpha {k[100, 60, 3]:.2f}")
    if k[20, 180, 3] > 0.01: fails.append(f"green alpha {k[20, 180, 3]:.2f}")
    if k[10, 10, 3] > 0.01: fails.append("speck kept")
    green_left = float((k[..., 1] - np.maximum(k[..., 0], k[..., 2]))[k[..., 3] > 0.05].max())
    if green_left > 1e-3: fails.append(f"green spill left {green_left:.3f}")
    print("greenkey selftest:", "; ".join(fails) or "clean case passes")
    # the planted defect: a plain green-dominant costume colour is keyed away (what the key cannot tell from the screen)
    bad = np.zeros((50, 50, 3), np.float32); bad[...] = (0.2, 0.8, 0.2)
    lost = key(bad)[25, 25, 3] < 0.5
    print(f"greenkey selftest: a green costume patch is {'keyed away (expected: the key assumes no green on the girls)' if lost else 'kept (unexpected)'}")
    return 1 if (not fails and lost) else 0


def main(ids):
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="greenkey-") as td:
        tmp = Path(td)
        for pid in ids:
            meta = {"size": list(SIZE), "drawings": {}}
            for kind in ("bg", "fg", "fgb", "fgc"):
                src = next(d / f"{pid}-{kind}.png" for d in SRCS if (d / f"{pid}-{kind}.png").exists())
                im = upscale(src, tmp)
                if kind == "bg":
                    im.save(OUT / f"{pid}-bg.webp", "WEBP", quality=92, method=6)
                    print(f"{pid}-bg: {Image.open(src).size} -> {SIZE}", flush=True)
                    continue
                k = key(np.asarray(im, np.float32) / 255)
                rgba = Image.fromarray((k * 255 + 0.5).astype(np.uint8), "RGBA")
                rgba.save(OUT / f"{pid}-{kind}.webp", "WEBP", quality=92, method=6)
                meta["drawings"][kind] = box(k[..., 3])
                print(f"{pid}-{kind}: {Image.open(src).size} -> {SIZE}, {meta['drawings'][kind]}", flush=True)
            (OUT / f"{pid}.json").write_text(json.dumps(meta, indent=2), encoding="utf8")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    main([a for a in sys.argv[1:]] or ["RK1", "RK2", "RK11", "RK12"])
