#!/usr/bin/env bash
# Runs one command under a repo-wide render lock: every lane renders through here, one Chrome at a time.
# Capture defects (tiled or torn frames) rise when several Remotion renders share the GPU (making-of part 2, §5).
#   tools/locked.sh npx remotion render src/index.ts Nerfed out/p1.mp4 --frames=0-1849 --gl=angle --concurrency=4
# Run it from video/. A lock left by a killed process is taken over once its pid is gone.
LOCK="$(cd "$(dirname "$0")/.." && pwd)/.render.lock"
while ! mkdir "$LOCK" 2>/dev/null; do
  pid=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -rf "$LOCK"; continue; fi
  sleep 5
done
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT
"$@"
