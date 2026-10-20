#!/usr/bin/env bash
# usage: getraw_p4_a.sh <run> ; copies generated image to ham/<run>.png and logs md5
cd "$(dirname "$0")"
r=$1; sid=$(grep -m1 "session id" logs/$r.log | awk '{print $3}')
f=$(ls -t ~/.codex/generated_images/$sid/*.png | head -1)
cp "$f" ham/$r.png
echo "$r $(md5sum < ham/$r.png | cut -d' ' -f1) $(md5sum < "$f" | cut -d' ' -f1) $f" >> ham/md5-p4-a.txt
