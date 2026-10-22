"""A 16:9 painting straight to its wide plate (round 11): Upscayl digital-art-4x, Lanczos to 3640x2048, WebP at
video/public/plates/wide/<ID>.webp. For a painting drawn 16:9 from the start (no outpaint, unlike make_wide.py).
Run under the render lock (Upscayl is a GPU job):
  tools/locked.sh uv run --with pillow python -I tools/imagegen/upwide.py stil/prompts/x-dawn/out/XK2-toward-us.png RK13
"""
import subprocess, sys, tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
UPSCAYL = r"C:\Program Files\Upscayl\resources\bin\upscayl-bin.exe"
MODELS = r"C:\Program Files\Upscayl\resources\models"
SIZE = (3640, 2048)

src, pid = Path(sys.argv[1]), sys.argv[2]
w, h = Image.open(src).size
if abs(w / h - SIZE[0] / SIZE[1]) > 0.01:
    sys.exit(f"{src.name} is {w}x{h}, not 16:9: widen it first")
with tempfile.TemporaryDirectory(prefix="upwide-") as td:
    out4 = Path(td) / "4x.png"
    r = subprocess.run([UPSCAYL, "-i", str(src), "-o", str(out4), "-m", MODELS, "-n", "digital-art-4x", "-s", "4"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode or not out4.exists():
        sys.exit(f"upscayl failed rc={r.returncode}: {r.stderr[-300:]}")
    dst = ROOT / "video" / "public" / "plates" / "wide" / f"{pid}.webp"
    Image.open(out4).convert("RGB").resize(SIZE, Image.LANCZOS).save(dst, "WEBP", quality=92, method=6)
print(f"{src.name} {w}x{h} -> {dst.relative_to(ROOT)} {SIZE[0]}x{SIZE[1]}")
