#!/usr/bin/env python3
"""token_map.py - write the token-to-word map of a take (docs/architecture.md "Lyric token map").

  python -I tools/token_map.py data/take-v1        (writes data/take-v1/token_map.json)

For every lyric line of <take>/mc-timing.json (lyric_alignment) the map lists the line's tokens (the lyric
text split on spaces) and, for each, the index of the measured word it is sung on (`words[i]`), a span
[first, last] of measured words, or null when it was not measured. Never a guessed time: a token only ever
points at measured words.

How a line is mapped, in order:
  1. OVERRIDES below: lines read by eye against the measured words (numbers sung as digits, misheard words,
     shouted answers in parentheses). Each override is a list of word indices / spans / None per token.
  2. Equal counts: the line's tokens pair one-to-one with the measured words in its window (from its start
     to the next sung line's start), as the engine did before the map existed.
  3. Otherwise exact matches of the normalised text, in order (longest common subsequence); the rest null.
Lines that are not sung (start null) get every token null. The output is deterministic.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# take-v1, read by eye from the measured words (see the report of 2026-10-21):
OVERRIDES = {
    'take-v1': {
        3: [19, [20, 21], 22, 23, 24, 25, 26, 27, 28, 29],            # "forty-two" sung as "forty two"
        9: [74, 74, 75, 76, 77, 78, 79, 80],                          # "Three hundred" measured as "300"
        21: [[120, 121], [122, 123], 124, 125, 126, 127, 128, 129, 130],  # "Equals" heard as "pickles"
        22: [131, 132, 133, [134, 135], 136, 137, 138, 139],
        25: [146, 147, 148, 149, [150, 151]],                         # "data2" measured as "data too"
        42: [232, 233, 234, 235],                                     # "(YES!)" measured as "yeah"
        43: [None, 238, 239, 240, 241, 242],                          # "Commit" not measured
        46: [None, 255],                                              # "Build" not measured
        47: [258, 259, 260, 261, 261],                                # "line forty-two" measured as "942"
    },
}

norm = lambda s: re.sub(r'[^\w]', '', s.lower())


def lcs_map(toks, words, idx):
    n, m = len(toks), len(words)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            dp[i][j] = dp[i + 1][j + 1] + 1 if norm(toks[i]) == norm(words[j]) else max(dp[i + 1][j], dp[i][j + 1])
    out, i, j = [], 0, 0
    while i < n:
        if j < m and norm(toks[i]) == norm(words[j]):
            out.append(idx[j]); i += 1; j += 1
        elif j < m and dp[i][j + 1] >= dp[i + 1][j]:
            j += 1
        else:
            out.append(None); i += 1
    return out


def main():
    take = Path(sys.argv[1])
    T = json.loads((ROOT / take / 'mc-timing.json').read_text(encoding='utf8'))
    lines, words = T['lyric_alignment'], T['words']
    over = OVERRIDES.get(take.name, {})
    out, report = [], []
    for i, line in enumerate(lines):
        toks = line['text'].split()
        if line.get('start') is None:
            mp = [None] * len(toks); how = 'unsung'
        elif i in over:
            mp = over[i]; how = 'override'
        else:
            nxt = next((l['start'] for l in lines[i + 1:] if l.get('start') is not None), line['end'] + 1.5)
            idx = [k for k, w in enumerate(words) if line['start'] - 0.005 <= w['s'] < nxt - 0.005]
            if len(idx) == len(toks):
                mp = idx; how = 'pairs'
            else:
                mp = lcs_map(toks, [words[k]['w'] for k in idx], idx); how = 'match'
        if len(mp) != len(toks):
            sys.exit(f'line {i}: {len(toks)} tokens but {len(mp)} map entries')
        out.append({'line': i, 'tokens': [{'text': t, 'word': w} for t, w in zip(toks, mp)]})
        nulls = sum(w is None for w in mp)
        report.append(f'{i:3d} {how:8s} {len(toks):2d} tok {nulls} null  {line["text"][:60]}')
    (ROOT / take / 'token_map.json').write_text(json.dumps(out, indent=1), encoding='utf8')
    print('\n'.join(report))
    print(f'wrote {take / "token_map.json"}: {len(out)} lines')


if __name__ == '__main__':
    main()
