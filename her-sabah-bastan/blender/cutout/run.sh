#!/usr/bin/env bash
# The 2D cut-out puppet test end to end (brief: .claude/briefs/cutout-rig-test.md). Run from anywhere: bash blender/cutout/run.sh [step ...]
# Steps: prep build render mattes checks board video sheets compare (default: all, in that order).
# BLENDER: the Blender 5.2 executable; the default is the standard Windows install path.
set -euo pipefail
cd "$(dirname "$0")/../.."
BLENDER="${BLENDER:-C:/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
CHECKS="${CHECKS:-video/out/cutout-checks}"
MATTES="$CHECKS/mattes"
NEW="${NEW:-video/out/cutout-test-v1.mp4}"
OLD=video/out/test90-v6.mp4
steps=("$@")
[ ${#steps[@]} -eq 0 ] && steps=(prep build render mattes checks board video sheets compare)

# One sheet: every frame A..B of the composited video, cropped to x,y,w,h, cols x rows tiles. (cols*rows must be >= B-A+1)
sheet() { # name A B x y w h cols rows tile_w
  local n=$(( $3 - $2 + 1 ))
  ffmpeg -v error -y -i "$NEW" \
    -vf "select='between(n\,$2\,$3)',crop=$6:$7:$4:$5,scale=${10}:-2,tile=$8x$9:padding=4:color=white" \
    -frames:v 1 -fps_mode passthrough "$CHECKS/$1.png"
  echo "sheet $1: frames $2-$3 ($n)"
}

# compare: one still of the new video, cropped x,y,w,h, scaled to height 540
pick() { # frame x y w h label
  ffmpeg -v error -y -i "$NEW" -vf "select='eq(n\,$1)',crop=$4:$5:$2:$3,scale=-2:540" -frames:v 1 -fps_mode passthrough "$CHECKS/_cmp-$6.png"
}

for s in "${steps[@]}"; do
  case "$s" in
    prep) python blender/cutout/prep_parts.py ;;
    build) "$BLENDER" -b --factory-startup -P blender/cutout/build.py ;;
    render) "$BLENDER" -b --factory-startup blender/cutout/cutout-v1.blend -P blender/cutout/render.py ;;
    mattes) "$BLENDER" -b --factory-startup blender/cutout/cutout-v1.blend -P blender/cutout/render.py -- --bodies --out "$MATTES" ;;
    checks)
      # bone lengths, tip jumps and the most-bent frame of every joint (joints.csv), then silhouettes per frame
      "$BLENDER" -b --factory-startup blender/cutout/cutout-v1.blend -P blender/cutout/checks.py -- --bones --joints | grep -E '^(BONES|JOINT)'
      "$BLENDER" -b --factory-startup -P blender/cutout/checks.py -- --sil "$MATTES" | grep -E '^SIL'
      cp "$MATTES/silhouette.csv" "$CHECKS/silhouette.csv"
      for c in human ai; do
        python blender/cutout/tile.py joints "$CHECKS/joints.csv" video/public/blender/cutout-v1 "$CHECKS/joints-$c.png" --char $c
      done ;;
    board)
      # joints bent through their range with mesh deformation (bendtest take), and the neutral frame next to the
      # reference drawings (same-person board)
      "$BLENDER" -b --factory-startup -P blender/cutout/build.py -- --take bendtest
      "$BLENDER" -b --factory-startup "$CHECKS/bendtest.blend" -P blender/cutout/board.py -- --bend --neutral
      for c in human ai; do
        python blender/cutout/tile.py bend $c "$CHECKS/bend-render" "$CHECKS/bend-mesh-$c.png" --scale 2
      done
      python blender/cutout/tile.py same-person "$CHECKS/neutral-render" "$CHECKS/same-person-board.png" ;;
    video) (cd video && npx remotion render src/index.ts CutoutTest out/cutout-test-v1.mp4 --concurrency=4) ;;
    sheets)
      mkdir -p "$CHECKS"
      # Crop/tile table (tune after the first render): name A B x y w h cols rows tile_w
      # human room is x 0-960 (desk x 60-440, y 380-1000, walks right to ~700); AI sits around x 1100-1300, y 600-1010
      sheet h1-typing-to-stretch    35  64   20 330 460 680 10  3 200
      sheet h2-stretch-top          64 104   20 330 460 680 10  5 200
      sheet h3-stretch-to-mug      115 154   20 330 460 680 10  4 200
      sheet h4-sip                 150 209   20 330 460 680 10  6 200
      sheet h5-put-down-to-typing  205 244   20 330 460 680 10  4 200
      sheet h6-stand-up            285 340   20 330 500 680 10  6 200
      sheet h7-walk                335 425  140 330 580 680 10 10 200
      sheet h8-sit-floor           420 509  360 330 420 680 10  9 180
      sheet a1-page-turn           155 219 1000 560 400 460 13  5 190
      sheet a2-look-up             285 344 1000 560 400 460 10  6 200
      ;;
    compare)
      [ -f "$OLD" ] || { echo "missing $OLD" >&2; exit 1; }
      mkdir -p "$CHECKS"
      # Burak's four frames (arm reach, getting up from the chair, walk, the AI's arm) next to the same kind of moment
      # in the new video. Crop boxes: frame x y w h
      pick  88   20 330 460 660 1
      pick 316   40 380 460 620 2
      pick 375  240 380 480 620 3
      pick 190 1000 560 400 460 4
      ins=(); graph=""
      for i in 1 2 3 4; do
        ins+=(-i "$(ls .claude/briefs/rig/burak-0$i-*.png)" -i "$CHECKS/_cmp-$i.png")
        a=$(( (i - 1) * 2 )); b=$(( a + 1 ))
        graph+="[$a]scale=-2:540[o$i];[o$i][$b]hstack,pad=1240:544:0:0:white[r$i];"
      done
      graph+="[r1][r2][r3][r4]vstack=4"
      ffmpeg -v error -y "${ins[@]}" -filter_complex "$graph" -frames:v 1 "$CHECKS/old-vs-new.png"
      rm -f "$CHECKS"/_cmp-*.png
      echo "compare $CHECKS/old-vs-new.png"
      # side-by-side video, old left / new right: chair rise, walk, floor sit, the AI's arm
      seg() { echo "[0]trim=start_frame=$1:end_frame=$2,setpts=PTS-STARTPTS,scale=960:540[o$5];[1]trim=start_frame=$3:end_frame=$4,setpts=PTS-STARTPTS,scale=960:540[n$5];[o$5][n$5]hstack[s$5]"; }
      graph="$(seg 880 940 290 350 1);$(seg 1062 1152 335 425 2);$(seg 1280 1370 420 510 3);$(seg 1455 1545 160 250 4);[s1][s2][s3][s4]concat=n=4:v=1:a=0"
      ffmpeg -v error -y -i "$OLD" -i "$NEW" -filter_complex "$graph" -an -c:v libx264 -crf 18 -pix_fmt yuv420p video/out/cutout-test-v1-vs-old.mp4
      echo "compare video/out/cutout-test-v1-vs-old.mp4" ;;
    *) echo "unknown step $s" >&2; exit 2 ;;
  esac
done
