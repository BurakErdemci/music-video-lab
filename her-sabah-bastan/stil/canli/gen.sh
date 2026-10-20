#!/usr/bin/env bash
# usage: gen.sh <run-name> <prompt-file> <ref images...>; log in stil/canli/logs/<run-name>.log
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
name=$1; prompt=$2; shift 2
args=()
for r in "$@"; do args+=(-i "$r"); done
cd "$root/stil/canli"
codex exec -m gpt-6.1-sol -c model_reasoning_effort=low -C "$root/stil/canli" "${args[@]}" - < "$prompt" > "logs/$name.log" 2>&1
echo "$name rc=$?" >> logs/rc.txt
