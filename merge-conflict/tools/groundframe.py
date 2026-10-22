#!/usr/bin/env python3
"""groundframe.py - the floor-contact rule on rendered world-layer frames (round 7d, "the girls look pasted on").

For every standing card's sole line (from tools/framecheck.mjs --ground: its centre cx, cy and half length in
screen px, the card's screen down direction and height hpx, the other cards' screen boxes), measured in the card's
own frame so a rolled camera is handled:
  band   = the strip just below the soles: the middle 70 % of the sole line, 2 .. 2 + 1.5 % of hpx below it;
  beside = the same rows, 0.38 hpx past each end of the sole line, 0.12 hpx wide (past the shadow's soft falloff);
the band's mean luminance (Rec. 709 luma of the sRGB values) must be <= 0.75 x the beside floor's. The brighter
beside side is used (the cast shadow may darken the other). A side is skipped when less than half of it is in frame
or it touches another card; a sole is skipped when no side is left, when over 30 % of its band lies in another
card's action box (a boot behind the other girl) or when the floor beside is near black (< 0.06, no visible floor
to shade).

  uv run --with pillow --with numpy python -I tools/groundframe.py <samples.json>
  uv run --with pillow --with numpy python -I tools/groundframe.py --selftest   (exits 1: it catches a planted
                                                                                    shadowless sole)
Exit 1 on any failure.
"""
import json
import sys

import numpy as np
from PIL import Image

RATIO = 0.75
DARK = 0.06


def luma(img):
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    return a[:, :, 0] * 0.2126 + a[:, :, 1] * 0.7152 + a[:, :, 2] * 0.0722


def regions(s):
    """The band and the two beside regions as (lateral range, down range) in px from the sole line's centre, in the
    card's own screen frame (down = the card's down direction, lateral across it)."""
    half, hpx = s['half'], s['hpx']
    inner = half * 0.7 if half > 6 else 4.0
    d = (2.0, 2.0 + max(4.0, 0.015 * hpx))
    gap, wid = 0.38 * hpx, max(8.0, 0.12 * hpx)
    return (-inner, inner, *d), [(-half - gap - wid, -half - gap, *d), (half + gap, half + gap + wid, *d)]


def sample(L, s, r):
    """The pixels of region r (nearest), the share of them inside the frame, and the share on another card."""
    H, W = L.shape
    l0, l1, d0, d1 = r
    ls = np.arange(l0, l1 + 0.5, 1.0)
    ds = np.arange(d0, d1 + 0.5, 1.0)
    gl, gd = np.meshgrid(ls, ds)
    dx, dy = s['down']
    x = s['cx'] + gl * dy + gd * dx
    y = s['cy'] - gl * dx + gd * dy
    inside = (x >= 0) & (x <= W - 1) & (y >= 0) & (y <= H - 1)
    on = np.zeros_like(inside)
    for b in s['others']:
        on |= (x >= b[0]) & (x <= b[2]) & (y >= b[1]) & (y <= b[3])
    vals = L[np.round(y[inside]).astype(int), np.round(x[inside]).astype(int)]
    return vals, inside.mean(), on.mean()


def measure(L, s):
    """(verdict, band, beside) for one sole; verdict is 'ok', 'fail' or a skip reason."""
    band_r, side_rs = regions(s)
    bv, bin_, bon = sample(L, s, band_r)
    if bin_ < 0.9:
        return 'soles at the frame edge', None, None
    if bon > 0.3:
        return 'soles behind another card', None, None
    sides = []
    for r in side_rs:
        v, fin, on = sample(L, s, r)
        if fin >= 0.5 and on < 0.1:
            sides.append(float(v.mean()))
    if not sides:
        return 'no floor beside in frame', None, None
    band = float(bv.mean())
    beside = max(sides)
    if beside < DARK:
        return 'floor near black', band, beside
    return ('ok' if band <= RATIO * beside else 'fail'), band, beside


def run(samples):
    fails, checked, skips = [], 0, {}
    worst = None
    for smp in samples:
        L = luma(Image.open(smp['world']))
        for s in smp['soles']:
            v, band, beside = measure(L, s)
            if v in ('ok', 'fail'):
                checked += 1
                r = band / beside
                if worst is None or r > worst[0]:
                    worst = (r, smp['t'], s['card'])
                if v == 'fail':
                    fails.append((smp['t'], smp['shot'], s['card'], band, beside))
            else:
                skips[v] = skips.get(v, 0) + 1
    print(f'groundframe: {len(samples)} frames, {checked} soles checked, skipped {skips or 0}')
    if worst:
        print(f'  worst band/beside {worst[0]:.2f} at {worst[1]:.2f} s ({worst[2]})')
    for t, shot, card, band, beside in fails:
        print(f'  {t:7.2f} s  {shot:24} {card:6} band {band:.3f} beside {beside:.3f} (ratio {band / beside:.2f} > {RATIO})')
    print(f'groundframe: FAIL ({len(fails)})' if fails else 'groundframe: PASS')
    return 1 if fails else 0


def selftest():
    import os
    import tempfile
    d = tempfile.mkdtemp(prefix='groundself-')
    sole = {'card': 'T', 'cx': 960.0, 'cy': 700.0, 'half': 100.0, 'down': [0.0, 1.0], 'hpx': 600.0, 'others': []}

    def frame(shadow):
        a = np.full((1080, 1920, 3), 115, np.uint8)
        a[100:700, 860:1060] = 20  # the card
        if shadow:
            a[700:740, 830:1090] = 40  # a contact shadow under the soles
        p = os.path.join(d, f'world-{int(shadow)}.png')
        Image.fromarray(a).save(p)
        return {'frame': 0, 't': 0.0, 'shot': f'selftest-{"shadow" if shadow else "none"}', 'world': p, 'soles': [sole]}

    bad = run([frame(False)])
    good = run([frame(True)])
    import shutil
    shutil.rmtree(d, ignore_errors=True)
    caught = bad == 1 and good == 0
    print('selftest: planted shadowless sole ' + ('caught' if caught else 'MISSED') + ', shadowed sole ' + ('passed' if good == 0 else 'FAILED'))
    return 1 if caught else 0


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(selftest())
    sys.exit(run(json.load(open(sys.argv[1]))))
