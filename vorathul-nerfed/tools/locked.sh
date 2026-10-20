#!/usr/bin/env bash
# Runs one command under a repo-wide render lock: every lane renders through here, one Chrome at a time.
# Capture defects (tiled or torn frames) rise when several Remotion renders share the GPU (making-of part 2, §5).
#   tools/locked.sh npx remotion render src/index.ts Nerfed out/p1.mp4 --frames=0-1849 --gl=angle --concurrency=4
# Run it from video/. A lock left by a killed process is taken over once its pid is gone.
#
# The pid in the lock is a WINDOWS pid, the same kind tools/rigcheck/lib.mjs writes (node's process.pid).
# Git Bash's $$ and kill -0 only see processes of the same MSYS runtime, so with them every waiter judged a
# live lock held by another shell or by node as stale and took it over: renders ran in parallel (measured
# 20 Oct 2026, kill -0 on the holder's pid failed from a second shell while the holder was rendering).
LOCK="$(cd "$(dirname "$0")/.." && pwd)/.render.lock"
mypid=$(cat /proc/$$/winpid 2>/dev/null || echo $$)
alive() {
  if command -v tasklist >/dev/null 2>&1; then tasklist //FI "PID eq $1" //NH 2>/dev/null | grep -qw "$1"
  else kill -0 "$1" 2>/dev/null; fi
}
while ! mkdir "$LOCK" 2>/dev/null; do
  pid=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$pid" ] && ! alive "$pid"; then rm -rf "$LOCK"; continue; fi
  sleep 5
done
echo "$mypid" > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT
"$@"
