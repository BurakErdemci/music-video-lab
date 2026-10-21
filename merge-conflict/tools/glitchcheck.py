# Usage: python -I tools/glitchcheck.py render_a.mp4 render_b.mp4  (two renders of the same composition)
# Measured 20 Oct 2026: one 620-frame VFX gallery render had >=14 mosaic-tiled capture frames, a rerender 2, a third 0;
# single-frame renders of the same frames were always clean. Hung remotion processes were running at the time.
# A frame is a capture glitch in render X when it differs strongly from render Y at the same
# index AND from both of its own neighbours in X (real cuts differ from neighbours in both).
import sys, subprocess
from PIL import Image, ImageChops, ImageStat
W, H = 192, 108
def frames(p):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    k = W * H * 3
    return [Image.frombytes('RGB', (W, H), raw[i*k:(i+1)*k]) for i in range(len(raw) // k)]
d = lambda a, b: sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3
X, Y = frames(sys.argv[1]), frames(sys.argv[2])
for name, A, B in (('A', X, Y), ('B', Y, X)):
    bad = [i for i in range(1, len(A) - 1) if d(A[i], B[i]) > 20 and d(A[i], A[i-1]) > 20 and d(A[i], A[i+1]) > 20 and d(B[i], B[i-1]) < 20]
    print(name, sys.argv[1 if name == 'A' else 2], 'glitched', len(bad), bad)
