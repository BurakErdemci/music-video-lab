#!/usr/bin/env bash
# Measures a finished Part4 render.   bash video/src/living/part4/run-checks.sh <a|b>
# Needs video/out/part4<a|b>-v1.mp4 (override with VIDEO=path). Output: video/out/part4-checks/<a|b>/.
# Part b also measures the loop: last frame of part4b vs frame 468 of video/out/part1-v2.mp4 (mean abs diff, 0..255).
set -u
P="${1:-}"
case "$P" in a|b) ;; *) echo "usage: run-checks.sh <a|b>"; exit 2;; esac
HERE="$(cd "$(dirname "$0")" && pwd)"
VID_DIR="$(cd "$HERE/../../.." && pwd)"
VIDEO="${VIDEO:-$VID_DIR/out/part4${P}-v1.mp4}"
OUT="$VID_DIR/out/part4-checks/$P"
mkdir -p "$OUT"
node "$HERE/split-events.mjs" >/dev/null || exit 1

if [ "$P" = a ]; then
  RANGE=4676-6395
  SPANS=(
    4676:4710:1:doors 4728:4750:1:flip-1 4896:4932:1:inkbleed 5118:5156:1:drain 5160:5210:1:glass-pass
    5270:5345:1:reformings 5398:5460:1:pen 5645:5700:1:montage-1 5798:5876:1:montage-2
    6060:6125:1:bir-daha 6322:6340:1:bubble
  )
else
  RANGE=6396-7222
  SPANS=(
    6392:6460:1:shatter 6500:6512:1:crossing-1 6556:6568:1:crossing-2 6612:6624:1:crossing-3
    6832:6868:1:white-pull 7064:7095:1:typing 7135:7222:1:push-loop
  )
fi
SPAN_ARGS=()
for s in "${SPANS[@]}"; do SPAN_ARGS+=(--span "$s"); done

cd "$VID_DIR" || exit 1
PART4_RANGE="$RANGE" node scripts/living-checks.mjs "$VIDEO" \
  --events "src/living/part4/events-4${P}.json" --out "out/part4-checks/$P" \
  --checks-module src/living/part4/checks.ts "${SPAN_ARGS[@]}" \
  --concurrency-note "part4${P}" | tee "$OUT/report.txt"

if [ "$P" = b ]; then
  P1="$VID_DIR/out/part1-v2.mp4"
  N=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$VIDEO" | tr -d "[:space:],")
  LAST=$((N - 1))
  # select by frame number only, never -ss
  ffmpeg -v error -y -i "$VIDEO" -vf "select='eq(n\,$LAST)'" -vsync 0 -frames:v 1 "$OUT/loop-last.png"
  ffmpeg -v error -y -i "$P1" -vf "select='eq(n\,468)'" -vsync 0 -frames:v 1 "$OUT/loop-part1-468.png"
  ffmpeg -v error -y -i "$OUT/loop-last.png" -i "$OUT/loop-part1-468.png" \
    -filter_complex "[0:v][1:v]blend=all_mode=difference,lutrgb=r=val*8:g=val*8:b=val*8" -frames:v 1 "$OUT/loop-diff-x8.png"
  node - "$OUT/loop-last.png" "$OUT/loop-part1-468.png" <<'JS'
const { spawnSync } = require('node:child_process');
const raw = (p) => spawnSync('ffmpeg', ['-v', 'error', '-i', p, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 }).stdout;
const a = raw(process.argv[2]), b = raw(process.argv[3]);
if (!a.length || a.length !== b.length) { console.log(`LOOP: FAIL sizes ${a.length} vs ${b.length}`); process.exit(1); }
let s = 0;
for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
console.log(`LOOP: last frame of part4b vs part1-v2 frame 468: mean abs difference ${(s / a.length).toFixed(3)} (0..255, rgb, all pixels)`);
JS
fi
