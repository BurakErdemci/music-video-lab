#!/usr/bin/env bash
# Joins the verified part renders into the whole clip without re-rendering (re-rendering 7223 frames at concurrency 4
# brings back Chrome's random corrupted frames, which the part renders already had repaired).
# Cuts are in SONG frames (30 fps); each part render starts at its own song frame:
#   part1 0..1705 | part2 1706..3339 | part3 3340..4675 | part4a 4676..6395 | part4b 6396..7222
# The song is laid under the whole film in one piece, so the cuts cannot drift the audio.
# FPS=60 joins 60 fps part renders (made from the 30 fps scenes via fps60/): every segment is doubled, i.e. frames
# 0..2*(b+1)-1, expected 14446 frames. Default FPS=30 is the original command.
# CRF (default 20) sets the x264 quality; the picture size follows the part renders (1920x1080 or 2560x1440).
# Usage: [CRF=16] [FPS=60] bash video/scripts/assemble-parts.sh <part1.mp4> <part2.mp4> <part3.mp4> <part4a.mp4> <part4b.mp4> <out.mp4>
set -euo pipefail
[ $# -eq 6 ] || { echo "usage: $0 part1 part2 part3 part4a part4b out" >&2; exit 2; }
here="$(cd "$(dirname "$0")/.." && pwd)"
song="$here/public/her-sabah-bastan.wav"
# input index, first and last frame of that input to keep
segs=("0 0 1705" "1 0 1633" "2 0 1335" "3 0 1719" "4 0 826")
fps="${FPS:-30}"
[ "$fps" = 30 ] || [ "$fps" = 60 ] || { echo "FPS must be 30 or 60" >&2; exit 2; }
expected=7223
[ "$fps" = 60 ] && expected=14446
filter=""; labels=""
for i in "${!segs[@]}"; do
  read -r idx a b <<<"${segs[$i]}"
  if [ "$fps" = 60 ]; then a=$((2 * a)); b=$((2 * (b + 1) - 1)); fi
  filter+="[$idx:v]select='between(n\\,$a\\,$b)',setpts=N/$fps/TB[v$i];"
  labels+="[v$i]"
done
filter+="${labels}concat=n=${#segs[@]}:v=1:a=0[v]"
ffmpeg -v error -y -i "$1" -i "$2" -i "$3" -i "$4" -i "$5" -i "$song" \
  -filter_complex "$filter" -map "[v]" -map 5:a -r $fps -c:v libx264 -crf "${CRF:-20}" -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 256k "$6"
frames=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$6" | tr -d ",")
echo "wrote $6: $frames frames (expected $expected)"
[ "$frames" -eq "$expected" ] || { echo "frame count mismatch" >&2; exit 1; }
