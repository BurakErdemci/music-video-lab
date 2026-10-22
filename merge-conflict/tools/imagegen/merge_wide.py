"""Widen each painting plate to 16:9: Upscayl the Codex outpaint, scale it to the plate height, and paste the
served plate (video/public/plates/<ID>.webp, untouched pixels) in the centre with a feathered edge.
Prints the mean centre difference between the outpaint and the plate (a large value = the model moved the picture)."""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = Path(sys.argv[1]); ids = sys.argv[2:]
UPSCAYL = r"C:\Program Files\Upscayl\resources\bin\upscayl-bin.exe"; MODELS = r"C:\Program Files\Upscayl\resources\models"
OUT = ROOT / 'video/public/plates/wide'; OUT.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='widen-') as tmp:
    for pid in ids:
        plate = Image.open(ROOT / f'video/public/plates/{pid}.webp').convert('RGB'); pw, H = plate.size
        W = round(H * 16 / 9) // 2 * 2; pad = (W - pw) // 2
        src = ROOT / f'stil/prompts/w-wide/out/{pid}-wide.png'; up = Path(tmp) / f'{pid}_4x.png'
        r = subprocess.run([UPSCAYL, '-i', str(src), '-o', str(up), '-m', MODELS, '-n', 'digital-art-4x', '-s', '4'], capture_output=True, text=True)
        if r.returncode or not up.exists(): sys.exit(f'{pid}: upscayl failed rc={r.returncode}')
        wide = Image.open(up).convert('RGB').resize((W, H), Image.LANCZOS)
        d = float(np.abs(np.asarray(wide.crop((pad, 0, pad + pw, H)), np.float32) - np.asarray(plate, np.float32)).mean())
        m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rectangle((pad + 48, 0, pad + pw - 48, H), fill=255); m = m.filter(ImageFilter.GaussianBlur(28))
        big = Image.new('RGB', (W, H)); big.paste(plate, (pad, 0))
        res = Image.composite(big, wide, m)
        res.save(OUT / f'{pid}.webp', 'WEBP', quality=92, method=6)
        print(f'{pid}: {pw}x{H} -> {W}x{H} pad {pad}, centre diff {d:.1f}/255', flush=True)
