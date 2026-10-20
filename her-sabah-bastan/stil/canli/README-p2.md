# Part 2 drawings (song 0:56.86-1:51.6, scene map v2 scenes 5-8)

Two lanes made the drawings in parallel; each keeps its own prep, metadata and README:

| | Human (him) | AI (her) |
|---|---|---|
| README (chosen / rejected, numbers, deviations) | `README-p2h.md` | `README-p2a.md` |
| Prompts | `prompts/make_p2h.py` -> `prompts/p2-h-*.txt` | `prompts/make_p2a.py` -> `prompts/p2-a-*.txt` |
| Raw + md5 | `ham/p2-h-*`, `ham/md5-p2h.txt` | `ham/p2-a-*`, `ham/md5-p2a.txt` |
| Prep | `prep_p2h.py` (+ `p2h-measured.json`) | `prep_p2a.py` (+ `p2a-measured.json`) |
| Sprites | `video/public/living/p2/h-*.png`, `chair2.png`, `coffee-cab.png` | `video/public/living/p2/a-*.png` (+ `-eye` / `-noeye`, `a-sit-body`, `a-sit-shins`) |
| Sprite list | `video/src/living/sprites-p2h.json` | `video/src/living/sprites-p2a.json` |

`video/src/living/part2/shots.ts` reads both lists (and Part 1's for everything reused). The brief named one list
`sprites-p2.json`; it stays two files so each lane's prep script can be re-run on its own.

## New drawings (21)
Human, side view of the desk room / the split, same man as Part 1 (boards `boards/p2-human-same-head.png`,
`p2-human-grips.png`, `p2-type-desk.png`): h-type1, h-type2, h-type3 (typing, three sinking levels), h-stretch,
h-coffee (standing, mug by its handle) + coffee-cab (the cabinet and machine as a prop, so it is in every cut) + chair2
(the empty chair for the standing cut), h-sleep, h-wake (on the floor, back on the glass), h-ots (over-the-shoulder back
of the head), h-calm, h-torch, h-torch-back.
AI (boards `boards/p2-ai-same-head.png`, `p2-ai-strides.png`, `p2-sit-rig.png`): a-sit (+ a lower-leg rig, +-14 degrees
about the knee), a-step1/2/3 (strides), a-trip, a-tap, a-thumb, a-squint.

## Reused from Part 1 / the living test
h-mug2, h-glass-note (at the glass; also the "Merhaba" note he presses), ai-stand, a-hand, ai-wave-a (tiny, on his
monitor), desk2, room-morning, the split room plates (`plates/room-key.png`, `room-moon.png`).

## Code-painted (no drawing): `video/src/living/part2/`
paintDays.ts (tally marks, mug towers, window sky day/night, extra body notes, her world on his monitor),
paintVerse.ts (the handwriting path and its knot, come apart, version tag, the yellow note surface, crescent),
paintProps.ts (boxes with lids and #C9D94A lamps, torch light, his glass wall, the split moon), icons2.ts (zzz, !,
anger vein with deflate), her sitting box (in shots.ts).

## Known weak spots
- h-stretch: his head is drawn ~25-30 % small for the body (6 generations; the model always shrinks the head in the
  arms-up pose). Placed by its chair so the chair matches the other cuts; the small head shows on a careful look.
- a-step3 swings the near arm with the near leg (same side); at her small size in the wide cream frame it barely reads.
- chair2 came out bigger than h-mug2's chair; prep scaled it non-uniformly to the same leg span and seat height.
