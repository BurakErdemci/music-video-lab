#!/usr/bin/env python3
"""flashcheck.py - photosensitive-flash check for rendered video.

Contract rule (docs/storyboard-02-chorus-to-end.md, Architect decisions 2):
no more than 3 flashes in any 1-second window.

Run:   uv run --with numpy python tools/flashcheck.py <video.mp4 | frames-dir> [--json out.json]
Exit:  0 PASS, 1 FAIL (general or red), 2 usage/decode error.

Criteria follow the spirit of WCAG 2.x "Three Flashes or Below Threshold",
general flash and red flash thresholds:
  https://www.w3.org/TR/WCAG21/#dfn-general-flash-and-red-flash-thresholds
  https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html
and ITU-R BT.1702 / Harding-style analysis, simplified:
  * Frames are decoded at the video's own fps, downscaled to 320 px wide.
  * Per cell (8x8 px of the downscaled frame) mean relative luminance
    (sRGB -> linear, Rec. 709 weights).
  * A cell "transitions" when its luminance moves >= 0.10 (10 % of max 1.0)
    from the running extremum, and the darker state is < 0.80 (hysteresis
    tracker, so slow drift and sub-threshold noise do not count).
  * A frame is a flash frame when transitioning cells of the same sign cover
    >= 25 % of the frame area (area threshold; the largest area is reported).
  * Red flash: a cell flips into/out of saturated red (R/(R+G+B) >= 0.8 on
    gamma-encoded values, and R >= 0.2 so near-black noise is not "red").
    Same 25 % area rule, counted separately, no luminance condition.
  * Counting: each opposing change (flash frame, consecutive same-sign frames
    merged) counts as one flash, matching the contract wording (black/white
    every 5 frames at 30 fps = 6 flashes/s). A window FAILS above 3.
    The strict WCAG reading (a flash = a PAIR of changes) is also reported as
    "pairs"; use --count pairs to gate on it.
Limits: the 25 % rule is of the whole frame, not WCAG's 341x256-pixel
rectangle at viewing distance; transitions spread over several frames (fades)
are split across frames and may be missed or under-counted; the 320 px
downscale and 8 px cells blur sub-cell detail; frame-based, ignores display
gamma/brightness and chroma-only flicker other than red; not a certified
Harding/PEAT tool, treat PASS as strong evidence, not a guarantee.
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np

W_OUT = 320
CELL = 8
LUM_STEP = 0.10
DARK_LIMIT = 0.80
AREA_LIMIT = 0.25
RED_RATIO = 0.8
RED_MIN_R = 0.2
MAX_FLASHES = 3


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate", "-of", "json", path],
                       capture_output=True)
    if r.returncode:
        sys.exit("ffprobe failed: " + r.stderr.decode(errors="replace"))
    s = json.loads(r.stdout)["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(n) / float(d)


def frames(src, fps_arg):
    """Return (generator of float RGB frames in [0,1], fps)."""
    tmp = None
    if os.path.isdir(src):
        files = sorted(f for f in os.listdir(src)
                       if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp")))
        if not files:
            sys.exit("no image files in " + src)
        fps = fps_arg or 30.0
        tmp = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False)
        for f in files:
            p = os.path.abspath(os.path.join(src, f)).replace("\\", "/").replace("'", "'\\''")
            tmp.write("file '%s'\nduration %f\n" % (p, 1.0 / fps))
        tmp.close()
        inp = ["-f", "concat", "-safe", "0", "-i", tmp.name]
        w, h, _ = probe(os.path.join(src, files[0]))
    else:
        inp = ["-i", src]
        w, h, vfps = probe(src)
        fps = fps_arg or vfps
    ow = W_OUT - W_OUT % CELL
    oh = max(CELL, int(round(h * W_OUT / w)))
    oh -= oh % CELL
    cmd = ["ffmpeg", "-v", "error", *inp, "-fps_mode", "passthrough",
           "-vf", "scale=%d:%d:flags=area" % (ow, oh), "-f", "rawvideo",
           "-pix_fmt", "rgb24", "-"]
    errf = tempfile.TemporaryFile()
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=errf)

    def gen():
        sz = ow * oh * 3
        while True:
            b = p.stdout.read(sz)
            if len(b) < sz:
                break
            yield np.frombuffer(b, np.uint8).reshape(oh, ow, 3).astype(np.float32) / 255.0
        p.wait()
        if tmp:
            os.unlink(tmp.name)
        if p.returncode:
            errf.seek(0)
            sys.exit("ffmpeg failed: " + errf.read().decode(errors="replace"))
    return gen(), fps


def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def cellmean(a):
    h, w = a.shape[:2]
    return a.reshape(h // CELL, CELL, w // CELL, CELL, *a.shape[2:]).mean(axis=(1, 3))


class LumTracker:
    """Per-cell hysteresis tracker; step() returns (up_mask, down_mask)."""
    def __init__(self, first):
        self.d = np.zeros(first.shape, np.int8)
        self.lo = first.copy()
        self.hi = first.copy()

    def step(self, v):
        d, lo, hi = self.d, self.lo, self.hi
        und, rise, fall = d == 0, d == 1, d == -1
        m = und | fall
        lo[m] = np.minimum(lo, v)[m]
        m = und | rise
        hi[m] = np.maximum(hi, v)[m]
        up = (und | fall) & (v - lo >= LUM_STEP) & (lo < DARK_LIMIT)
        down = (und | rise) & (hi - v >= LUM_STEP) & (v < DARK_LIMIT)
        up &= ~down
        d[up], hi[up] = 1, v[up]
        d[down], lo[down] = -1, v[down]
        return up, down


def flash_frames(up_frac, down_frac):
    """Per-frame (sign, area) or None; only frames over the area limit."""
    ev = []
    for u, dn in zip(up_frac, down_frac):
        a = max(u, dn)
        ev.append((1 if u >= dn else -1, a) if a >= AREA_LIMIT else None)
    return ev


def merge(ev):
    """Collapse consecutive same-sign flash frames (a fade is one change).
    Returns list of (first_frame, sign, area)."""
    out, last_t = [], -2
    for t, e in enumerate(ev):
        if e is None:
            continue
        if out and last_t == t - 1 and out[-1][1] == e[0]:
            out[-1] = (out[-1][0], e[0], max(out[-1][2], e[1]))
        else:
            out.append((t, e[0], e[1]))
        last_t = t
    return out


def windows(events, n, wlen, mode):
    """Per start frame: (count, max area, raw change count)."""
    res = []
    for s in range(max(1, n - wlen + 1)):
        sel = [x for x in events if s <= x[0] < s + wlen]
        c = len(sel) // 2 if mode == "pairs" else len(sel)
        res.append((c, max((x[2] for x in sel), default=0.0), len(sel)))
    return res


def tc(idx, fps):
    f = int(round(fps))
    sec, ff = divmod(idx, f)
    return "%02d:%02d.%02d" % (sec // 60, sec % 60, ff)


def win(s, wlen, n, fps):
    e = min(n - 1, s + wlen - 1)
    return dict(start_frame=s, end_frame=e, start=tc(s, fps), end=tc(e, fps))


def fail_ranges(res, wlen, fps, n):
    rng = []
    for s, (c, a, raw) in enumerate(res):
        if c <= MAX_FLASHES:
            continue
        cur = rng[-1] if rng else None
        if cur and cur["last"] == s - 1:
            cur["last"] = s
            if (c, a) > (cur["flashes"], cur["area"]):
                cur.update(flashes=c, area=a, raw=raw, worst=s)
        else:
            rng.append(dict(first=s, last=s, flashes=c, area=a, raw=raw, worst=s))
    out = []
    for r in rng:
        span = win(r["first"], wlen, n, fps)
        span["end_frame"] = min(n - 1, r["last"] + wlen - 1)
        span["end"] = tc(span["end_frame"], fps)
        out.append(dict(span, worst_window=win(r["worst"], wlen, n, fps),
                        flashes=r["flashes"], changes=r["raw"],
                        area_pct=round(100 * r["area"], 1)))
    return out


def analyse(src, fps_arg, mode):
    gen, fps = frames(src, fps_arg)
    trk = prev_red = None
    ups, downs, rups, rdowns = [], [], [], []
    n = 0
    w = np.array([0.2126, 0.7152, 0.0722], np.float32)
    for fr in gen:
        n += 1
        L = cellmean((lin(fr) * w).sum(axis=2))
        m = cellmean(fr)
        red = (m[..., 0] >= RED_MIN_R) & (m[..., 0] >= RED_RATIO * m.sum(axis=2))
        if trk is None:
            trk, prev_red = LumTracker(L), red
            for l in (ups, downs, rups, rdowns):
                l.append(0.0)
            continue
        u, d = trk.step(L)
        ups.append(u.mean()); downs.append(d.mean())
        rups.append((red & ~prev_red).mean()); rdowns.append((~red & prev_red).mean())
        prev_red = red
    if n == 0:
        sys.exit("no frames decoded")
    wlen = int(round(fps))
    out = dict(source=src, frames=n, fps=fps, window_frames=wlen, count_mode=mode)
    ok = True
    for name, uf, df in (("general", ups, downs), ("red", rups, rdowns)):
        ev = merge(flash_frames(uf, df))
        res = windows(ev, n, wlen, mode)
        pairs = windows(ev, n, wlen, "pairs")
        fr = fail_ranges(res, wlen, fps, n)
        wi = max(range(len(res)), key=lambda i: (res[i][0], res[i][1]))
        out[name] = dict(
            passed=not fr,
            max_area_pct=round(100 * max(max(uf), max(df)), 1),
            flash_events=len(ev),
            worst=dict(win(wi, wlen, n, fps), flashes=res[wi][0], changes=res[wi][2],
                       pairs=pairs[wi][0], area_pct=round(100 * res[wi][1], 1)),
            failing_windows=fr)
        ok &= not fr
    out["passed"] = ok
    return out


def report(o):
    print("flashcheck: %s  %d frames @ %.3f fps, window %d frames, count=%s, limit %d/s"
          % (o["source"], o["frames"], o["fps"], o["window_frames"], o["count_mode"], MAX_FLASHES))
    for name in ("general", "red"):
        r, w = o[name], o[name]["worst"]
        print("[%s] %s  flash frames %d, largest affected area %s%%"
              % (name, "PASS" if r["passed"] else "FAIL", r["flash_events"], r["max_area_pct"]))
        print("  worst window %s-%s (frames %d-%d): %d flashes (%d changes, %d pairs), area %s%%"
              % (w["start"], w["end"], w["start_frame"], w["end_frame"], w["flashes"],
                 w["changes"], w["pairs"], w["area_pct"]))
        for f in r["failing_windows"]:
            print("  FAIL %s-%s (frames %d-%d): max %d flashes, area %s%%, worst window %s-%s"
                  % (f["start"], f["end"], f["start_frame"], f["end_frame"], f["flashes"],
                     f["area_pct"], f["worst_window"]["start"], f["worst_window"]["end"]))
    print("RESULT: " + ("PASS" if o["passed"] else "FAIL"))


def main():
    ap = argparse.ArgumentParser(description="Photosensitive flash check (<=3 flashes/s).")
    ap.add_argument("input", help="mp4 or folder of numbered images")
    ap.add_argument("--json", help="write full result as JSON")
    ap.add_argument("--fps", type=float, help="override fps (image folders default 30)")
    ap.add_argument("--count", choices=["transitions", "pairs"], default="transitions",
                    help="gate on every opposing change (default, contract wording) "
                         "or on change pairs (strict WCAG wording)")
    a = ap.parse_args()
    if not os.path.exists(a.input):
        sys.exit("not found: " + a.input)
    o = analyse(a.input, a.fps, a.count)
    report(o)
    if a.json:
        with open(a.json, "w") as f:
            json.dump(o, f, indent=2)
    sys.exit(0 if o["passed"] else 1)


if __name__ == "__main__":
    main()
