#!/usr/bin/env python3
"""Synthetic tests for flashcheck.py. Run from merge-conflict/:
  uv run --with numpy python tools/flashcheck_selftest.py
Generates 30 and 60 fps 320x180 2 s clips with ffmpeg in a temp dir and checks verdicts."""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def sq(n):
    return "mod(floor(N/%d),2)" % n


BW5, BW15, BW4, BW10, BW30 = ("255*" + sq(n) for n in (5, 15, 4, 10, 30))
# bw_every5 as a 30 fps scene clock shown at 60 fps would render it: each 30 fps edge gets a mid-grey in-between frame, so no frame jumps the whole way
M10 = "mod(N,10)"
BW5_60 = "255*(gte(%s,5)*lte(%s,8)+0.5*eq(%s,4)+0.5*eq(%s,9))" % (M10, M10, M10, M10)
SMALL = "255*lt(X,100)*lt(Y,58)*" + sq(3)  # 100x57 px of 320x180 = 9.9 % of the frame

# (name, r, g, b, expected exit code, section that must read FAIL or None, fps)
# The 60 fps cases are the 30 fps ones at the same wall-clock rate: the window must follow the video fps.
CASES = [
    ("bw_every5_fail", BW5, BW5, BW5, 1, "general", 30),
    ("bw_every15_pass", BW15, BW15, BW15, 0, None, 30),
    ("small_square_10pct_pass", SMALL, SMALL, SMALL, 0, None, 30),
    ("red_black_every4_fail", BW4, "0", "0", 1, "red", 30),
    ("bw_every10_at60_fail", BW10, BW10, BW10, 1, "general", 60),
    ("bw_every5_inbetween_at60_fail", BW5_60, BW5_60, BW5_60, 1, "general", 60),
    ("bw_every30_at60_pass", BW30, BW30, BW30, 0, None, 60),
]


def main():
    d = tempfile.mkdtemp(prefix="flashcheck_")
    bad = 0
    for name, r, g, b, rc_want, sect, fps in CASES:
        mp4 = os.path.join(d, name + ".mp4")
        vf = "format=gbrp,geq=r='%s':g='%s':b='%s',format=yuv420p" % (r, g, b)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                        "nullsrc=s=320x180:r=%d:d=2" % fps, "-vf", vf,
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
