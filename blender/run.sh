#!/usr/bin/env bash
# The Blender character test end to end (see README.md). Run from anywhere: bash blender/run.sh [step ...]
# Steps: build render mattes checks video sheets board compare (default: all, in that order).
# BLENDER: the Blender 5.2 executable; the default is the standard Windows install path.
set -euo pipefail
cd "$(dirname "$0")/.."
BLENDER="${BLENDER:-C:/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
CHECKS=video/out/blender-test-checks
MATTES="$CHECKS/mattes"
steps=("$@")
[ ${#steps[@]} -eq 0 ] && steps=(build render mattes checks video sheets board compare)

# One sheet: every frame A..B of the composited video, cropped to x,y,w,h, cols x rows tiles.
sheet() { # name A B x y w h cols rows tile_w
  local n=$(( $3 - $2 + 1 ))
  ffmpeg -v error -y -i video/out/blender-test-v1.mp4 \
    -vf "select='between(n\,$2\,$3)',crop=$6:$7:$4:$5,scale=${10}:-2,tile=$8x$9:padding=4:color=white" \
    -frames:v 1 -fps_mode passthrough "$CHECKS/$1.png"
  echo "sheet $1: frames $2-$3 ($n)"
}

for s in "${steps[@]}"; do
  case "$s" in
    build) "$BLENDER" -b --factory-startup -P blender/build.py ;;
    render) "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/render.py ;;
    mattes) "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/render.py -- --bodies --out "$MATTES" ;;
    checks)
      "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/checks.py -- --bones | grep -E '^BONES'
      "$BLENDER" -b --factory-startup -P blender/checks.py -- --sil "$MATTES" | grep -E '^SIL' ;;
    video) (cd video && npx remotion render src/index.ts BlenderTest out/blender-test-v1.mp4 --concurrency=4) ;;
    sheets)
      mkdir -p "$CHECKS"
      # human (left room) and AI (right room) crops; every frame of each action change, the walk and the sit
      sheet h1-typing-to-stretch 40 69 0 300 700 760 10 3 240
      sheet h2-stretch-top 70 109 0 160 700 900 10 4 200
      sheet h3-stretch-to-mug 110 149 0 300 700 760 10 4 240
      sheet h4-sip 150 209 0 300 700 760 10 6 240
      sheet h5-put-down-to-typing 210 249 0 300 700 760 10 4 240
      sheet h6-stand-up 285 339 0 260 760 800 11 5 230
      sheet h7-walk 335 424 120 300 840 760 10 9 220
      sheet h8-sit-floor 420 514 380 300 580 760 10 10 200
      sheet a1-page-turn 165 229 960 480 520 560 13 5 190
      sheet a2-look-up 295 354 960 420 520 620 10 6 200
      ;;
    board)
      # same-person board: reference drawing | render in the same pose, on each character's room colour
      "$BLENDER" -b --factory-startup blender/test-v1.blend -P blender/board.py | grep -E '^BOARD'
      graph="color=c=0x18203A:s=400x760[n1];color=c=0x18203A:s=400x760[n2]"
      graph+=";color=c=0xF3EFE4:s=300x760[c1];color=c=0xF3EFE4:s=300x760[c2]"
      graph+=";[0]crop=400:920:600:20,colorkey=0xFF00FF:0.35:0.1,scale=-2:740[hr];[n1][hr]overlay=(W-w)/2:10:shortest=1[p1]"
      graph+=";[1]crop=360:720:620:290,scale=-2:740[hn];[n2][hn]overlay=(W-w)/2:10:shortest=1[p2]"
      graph+=";[2]scale=-2:720[ar];[c1][ar]overlay=(W-w)/2:20:shortest=1[p3]"
      graph+=";[3]crop=300:720:970:295,scale=-2:740[an];[c2][an]overlay=(W-w)/2:10:shortest=1[p4]"
      graph+=";[p1][p2][p3][p4]hstack=4"
      ffmpeg -v error -y -i stil/hareket/ref-insan-kanonik.png -i "$CHECKS/board-human-render.png" \
        -i stil/hareket/ref-ai.png -i "$CHECKS/board-ai-render.png" -filter_complex "$graph" \
        -frames:v 1 "$CHECKS/same-person-board.png"
      echo "board $CHECKS/same-person-board.png" ;;
    compare)
      # old | new for the four moments Burak flagged: his own frames of the morph version
      # (.claude/briefs/rig/burak-0[1-4]-*.png: arm reach, getting up from the chair, walk, the AI's arm) next to the
      # same kind of moment in the Blender test.
      old=video/out/test90-v6.mp4; new=video/out/blender-test-v1.mp4
      pick() { # frame x y w h label
        ffmpeg -v error -y -i $new -vf "select='eq(n\,$1)',crop=$4:$5:$2:$3,scale=-2:540" -frames:v 1 -fps_mode passthrough "$CHECKS/_cmp-$6.png"
      }
      pick 96 0 180 700 830 1; pick 318 0 250 700 830 2; pick 370 100 250 700 830 3; pick 196 960 420 520 620 4
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
      graph="$(seg 880 940 290 350 1);$(seg 1062 1152 335 425 2);$(seg 1280 1370 425 515 3);$(seg 1455 1545 165 255 4);[s1][s2][s3][s4]concat=n=4:v=1:a=0"
      ffmpeg -v error -y -i $old -i $new -filter_complex "$graph" -an -c:v libx264 -crf 18 -pix_fmt yuv420p video/out/blender-test-v1-vs-old.mp4
      echo "compare video/out/blender-test-v1-vs-old.mp4" ;;
    *) echo "unknown step $s" >&2; exit 2 ;;
  esac
done
