"""The set covers the frame (round 11d, the architect on proof232-r11c: re-cammed finale shots showed the set's edge
and the black void around it). Each sampled frame is rendered twice without the girls and the type (framecheck
--set): 'set' as it is, 'setkey' with the worlds' dark backdrops (the "no set" fill behind every set) in a key
magenta. Where the two differ by nearly the whole key, the frame shows the bare backdrop: no set drawn there. The
LED walls and tile floors are drawn translucent, so their thin gaps show the backdrop too; the void mask is eroded by
ERODE px, so only areas larger than that count. At most LIMIT of the border band (BAND px deep) may be void.
  uv run --with pillow --with numpy python -I tools/setframe.py samples.json [failures.json]
  uv run --with pillow --with numpy python -I tools/setframe.py --selftest   (exit 1: a covered frame passes, a void one fails)
samples.json: [{"frame", "t", "shot", "png", "keyed", "void_ok"}]; void_ok marks a shot whose world is a designed void
(listed with the reason in framecheck.mjs VOID_SHOTS).
"""
import json
import sys

import numpy as np
from PIL import Image

BAND = 24
LIMIT = 0.01
ERODE = 15
KEY_DIFF = 160  # the key raises red and blue by at least this over the plain render where the backdrop is bare


def void_share(png, keyed):
    from PIL import ImageFilter
    a = np.asarray(Image.open(png).convert("RGB"), dtype=np.int16)
    k = np.asarray(Image.open(keyed).convert("RGB"), dtype=np.int16)
    d = k - a
    bare = (d[..., 0] >= KEY_DIFF) & (d[..., 2] >= KEY_DIFF) & (np.abs(d[..., 1]) < 60)
    bare = np.asarray(Image.fromarray((bare * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(ERODE))) > 127
    h, w = bare.shape
    band = np.zeros((h, w), bool)
    band[:BAND], band[-BAND:], band[:, :BAND], band[:, -BAND:] = True, True, True, True
    return float((bare & band).sum() / band.sum())


def analyse(samples):
    out = []
    for s in samples:
        v = void_share(s["png"], s["keyed"])
        if v > s.get("limit", LIMIT):
            out.append({"t": s["t"], "frame": s["frame"], "shot": s["shot"], "value": round(v, 3), "why": f"{100 * v:.1f} % of the border shows no set (max {100 * s.get('limit', LIMIT):.0f} %, scene {s.get('scene')})"})
    return out


def selftest():
    import os
    import tempfile
    d = tempfile.mkdtemp(prefix="setframe-selftest-")
    # the plain and the keyed renders of: a set covering the frame (a wall with thin gaps), a lit island in the void
    # (the r11c tunnel), and a set drawn dark (drawn, just dark)
    def pair(name, draw):
        plain, keyed = Image.new("RGB", (1920, 1080), (4, 2, 10)), Image.new("RGB", (1920, 1080), (255, 0, 255))
        for im in (plain, keyed):
            draw(im)
        pp, kp = os.path.join(d, name + "-p.png"), os.path.join(d, name + "-k.png")
        plain.save(pp), keyed.save(kp)
        return {"frame": 0, "t": 0.0, "shot": name, "png": pp, "keyed": kp}

    def wall(im):
        for x in range(0, 1920, 40):
            for y in range(0, 1080, 40):
                im.paste((200, 90, 40), (x, y, x + 36, y + 36))

    def island(im):
        im.paste((40, 20, 60), (300, 200, 1700, 900))

    def dark(im):
        im.paste((0, 0, 0), (0, 0, 1920, 1080))
    paths = [pair("full", wall), pair("island", island), pair("dark", dark)]
    got = {f["shot"] for f in analyse(paths)}
    print("setframe selftest flagged:", sorted(got))
    ok = got == {"island"}
    print("setframe selftest: " + ("the void frame fails, the covered and the dark-set frames pass" if ok else "WRONG"))
    sys.exit(1 if ok else 0)


def main():
    if sys.argv[1] == "--selftest":
        selftest()
    samples = json.load(open(sys.argv[1], encoding="utf-8"))
    out = analyse(samples)
    if len(sys.argv) > 2 and not sys.argv[2].startswith("--"):
        json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
    print(f"setframe: {len(samples)} frames, {sum(1 for s in samples if s.get('limit', LIMIT) > LIMIT)} in a dark world with its own limit")
    if "--all" in sys.argv:
        for s in samples:
            print(f"  all {s['t']:7.2f} {str(s['shot']):22s} {str(s.get('scene')):10s} {100 * void_share(s['png'], s['keyed']):5.1f}")
    for f in out:
        print(f"  {f['t']:7.2f}  {str(f['shot']):22s} {f['why']}")
    print("setframe: FAIL" if out else "setframe: PASS")
    sys.exit(1 if out else 0)


if __name__ == "__main__":
    main()
