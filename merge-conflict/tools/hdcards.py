"""Make 2x HD copies of cards (round 7c, "Resolution"): Upscayl digital-art-4x, Lanczos down to 2w x 2h, WebP with
alpha at video/public/cards/hd/<ID>.webp, and the manifest entry pointed at it ("px" = the new size; w, h stay the
card's layout size). Prints the mean absolute alpha difference against the original alpha upscaled 2x.
  uv run --with pillow --with numpy python -I tools/hdcards.py B06 BX3 ...
"""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "video" / "public" / "cards"
UPSCAYL = r"C:\Program Files\Upscayl\resources\bin\upscayl-bin.exe"
MODELS = r"C:\Program Files\Upscayl\resources\models"
manifest_path = CARDS / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf8"))
(CARDS / "hd").mkdir(exist_ok=True)

with tempfile.TemporaryDirectory(prefix="hdcards-") as tmp:
    for cid in sys.argv[1:]:
        e = manifest[cid]
        src = CARDS / f"{cid}.png"  # the original card (the manifest file may already point at an hd copy)
        out4 = Path(tmp) / f"{cid}_4x.png"
        r = subprocess.run([UPSCAYL, "-i", str(src), "-o", str(out4), "-m", MODELS, "-n", "digital-art-4x", "-s", "4"], capture_output=True, text=True)
        if r.returncode or not out4.exists():
            sys.exit(f"{cid}: upscayl failed rc={r.returncode}: {r.stderr[-300:]}")
        w, h = e["w"], e["h"]
        orig = Image.open(src).convert("RGBA")
        assert orig.size == (w, h), (cid, orig.size, (w, h))
        big = Image.open(out4).convert("RGBA").resize((2 * w, 2 * h), Image.LANCZOS)
        ref = np.asarray(orig.getchannel("A").resize((2 * w, 2 * h), Image.LANCZOS), dtype=np.float32)
        diff = float(np.abs(np.asarray(big.getchannel("A"), dtype=np.float32) - ref).mean())
        print(f"{cid}: {w}x{h} -> {2*w}x{2*h}, alpha mean abs diff {diff:.2f}/255, min alpha {big.getchannel('A').getextrema()}", flush=True)
        if diff > 8:
            sys.exit(f"{cid}: alpha not preserved (diff {diff:.2f}); stopping")
        big.save(CARDS / "hd" / f"{cid}.webp", "WEBP", quality=92, method=6, lossless=False)
        e["file"] = f"cards/hd/{cid}.webp"
        e["px"] = [2 * w, 2 * h]
        # key order: file, w, h, px, bbox, source
        manifest[cid] = {k: e[k] for k in ("file", "w", "h", "px", "bbox", "source") if k in e}
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf8")
