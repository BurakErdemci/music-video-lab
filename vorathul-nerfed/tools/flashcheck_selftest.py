#!/usr/bin/env python3
"""Synthetic tests for flashcheck.py. Run from vorathul-nerfed/:
  uv run --with numpy python tools/flashcheck_selftest.py
Generates 30 fps 320x180 2 s clips with ffmpeg in a temp dir and checks verdicts."""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def sq(n):
    return "mod(floor(N/%d),2)" % n


BW5, BW15, BW4 = "255*" + sq(5), "255*" + sq(15), "255*" + sq(4)
SMALL = "255*lt(X,100)*lt(Y,58)*" + sq(3)  # 100x57 px of 320x180 = 9.9 % of the frame

# (name, r, g, b, expected exit code, section that must read FAIL or None)
CASES = [
    ("bw_every5_fail", BW5, BW5, BW5, 1, "general"),
    ("bw_every15_pass", BW15, BW15, BW15, 0, None),
    ("small_square_10pct_pass", SMALL, SMALL, SMALL, 0, None),
    ("red_black_every4_fail", BW4, "0", "0", 1, "red"),
]


def main():
    d = tempfile.mkdtemp(prefix="flashcheck_")
    bad = 0
    for name, r, g, b, rc_want, sect in CASES:
        mp4 = os.path.join(d, name + ".mp4")
        vf = "format=gbrp,geq=r='%s':g='%s':b='%s',format=yuv420p" % (r, g, b)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                        "nullsrc=s=320x180:r=30:d=2", "-vf", vf,
                        "-c:v", "libx264", "-crf", "12", mp4], check=True)
        p = subprocess.run([sys.executable, os.path.join(HERE, "flashcheck.py"), mp4],
                           capture_output=True, text=True)
        ok = p.returncode == rc_want and (sect is None or "[%s] FAIL" % sect in p.stdout)
        print("=== %s: exit %d (want %d) -> %s" % (name, p.returncode, rc_want, "OK" if ok else "WRONG"))
        print(p.stdout.rstrip())
        bad += not ok
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
