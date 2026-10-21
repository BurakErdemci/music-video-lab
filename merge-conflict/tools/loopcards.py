"""Fit the drawn-loop in-betweens to their base card (scene-map.md "Drawn motion loops everywhere").

    uv run --with pillow python -I tools/loopcards.py            # every <base>b / <base>c in the manifest

cutout.py crops each drawing to its own figure, but an in-between must share its base card's framing pixel for pixel
(Card swaps only the texture: video/src/rig/loop.ts). The drawings come on the same 1024x1536 canvas as the base, so
each cut-out is put back on that canvas at its own crop box and re-cropped at the base's box; the manifest entry takes
the base's w, h and bbox. frames.json gets the base's face and action boxes. Cards whose base uses a 2x HD copy are
listed at the end: run tools/hdcards.py on them (under tools/locked.sh).
"""
import json
from pathlib import Path

from PIL import Image

CARDS = Path(__file__).resolve().parent.parent / "video" / "public" / "cards"
mpath, fpath = CARDS / "manifest.json", CARDS / "frames.json"
manifest = json.loads(mpath.read_text(encoding="utf8"))
frames = json.loads(fpath.read_text(encoding="utf8"))
hd = []
for lid in sorted(manifest):
    base = lid[:-1]
    if lid[-1] not in "bc" or base not in manifest or manifest[lid]["file"].startswith("cards/hd/"):
        continue
    e, b = manifest[lid], manifest[base]
    if e["bbox"] != b["bbox"]:
        canvas = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
        canvas.paste(Image.open(CARDS.parent / e["file"]).convert("RGBA"), tuple(e["bbox"][:2]))
        canvas.crop(tuple(b["bbox"])).save(CARDS.parent / e["file"])
    e.update(w=b["w"], h=b["h"], bbox=list(b["bbox"]))
    if base in frames:
        frames[lid] = frames[base]
    if "px" in b:
        hd.append(lid)
    print(f"{lid}: framed as {base} {b['w']}x{b['h']}")
# the formats the files already have: the manifest as cutout.py writes it, frames.json with one-space indents
# (both CRLF through text mode on Windows)
mpath.write_text(json.dumps(dict(sorted(manifest.items())), indent=2), "utf-8")
fpath.write_text(json.dumps(dict(sorted(frames.items())), indent=1), "utf-8")
print("needs a 2x copy:", " ".join(hd))
