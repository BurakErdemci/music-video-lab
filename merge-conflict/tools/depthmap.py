"""Depth maps for the paintings (round 10): Depth Anything V2 (small) on the CPU, near = white, 8-bit grey PNG at half
the image's size, written next to the plates the shaders sample (video/public/plates/depth/...). Burak approved the
model on 22 Oct 2026; it runs in a throwaway uv environment, not as a project dependency:
  uv run --with torch --with transformers --with pillow --with numpy python -I tools/depthmap.py
  ... tools/depthmap.py wide/RK1 layers/RK1-bg      (only these; paths under video/public/plates, no extension)
Defaults: every wide plate (plates/wide/<ID>.webp -> plates/depth/wide/<ID>.png) and every layer background
(plates/layers/<ID>-bg.webp -> plates/depth/layers/<ID>-bg.png).
The model's output is relative inverse depth; it is normalised per image between its 1st and 99.5th percentiles so
the parallax gains mean the same on every painting.
"""
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

ROOT = Path(__file__).resolve().parent.parent
PLATES = ROOT / "video" / "public" / "plates"
MODEL = "depth-anything/Depth-Anything-V2-Small-hf"


def jobs(args):
    if args:
        return [(PLATES / f"{a}.webp", PLATES / "depth" / f"{a}.png") for a in args]
    out = [(p, PLATES / "depth" / "wide" / f"{p.stem}.png") for p in sorted((PLATES / "wide").glob("*.webp"))]
    out += [(p, PLATES / "depth" / "layers" / f"{p.stem}.png") for p in sorted((PLATES / "layers").glob("*-bg.webp"))]
    return out


def main():
    torch.set_num_threads(8)
    proc = AutoImageProcessor.from_pretrained(MODEL)
    model = AutoModelForDepthEstimation.from_pretrained(MODEL).eval()
    for src, dst in jobs(sys.argv[1:]):
        img = Image.open(src).convert("RGB")
        w, h = img.size
        inputs = proc(images=img, return_tensors="pt")
        with torch.no_grad():
            pred = model(**inputs).predicted_depth  # (1, h', w') relative inverse depth, larger = nearer
        out_w, out_h = w // 2, h // 2
        d = torch.nn.functional.interpolate(pred[:, None], size=(out_h, out_w), mode="bicubic", align_corners=False)[0, 0].numpy()
        lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
        g = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray((g * 255 + 0.5).astype(np.uint8), "L").save(dst, optimize=True)
        print(f"{src.relative_to(PLATES)} {w}x{h} -> {dst.relative_to(PLATES)} {out_w}x{out_h}, mean {g.mean():.2f}", flush=True)


if __name__ == "__main__":
    main()
