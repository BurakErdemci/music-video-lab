# Part 4 lane a: AI poses + pair from behind (4 generations, all first attempts, rc=0, Codex window not full)
Prompts `prompts/p4-a-*.txt` (from `prompts/make_p4_a.py`); raw `ham/p4-a-*.png`, md5 pairs `ham/md5-p4-a.txt` (name, copy, original; equal).
Run `getraw_p4_a.sh <run>` after `gen.sh`; prep `python stil/canli/prep_p4_a.py` (reads `p4-a-measured.json`). Out `video/public/living/p4/`, list `video/src/living/sprites-p4-a.json`.
Chosen: a-run, a-swept, a-cross, pair-back (no rejects). a-run/a-swept/a-cross have -eye/-noeye; pair-back is plain.
Keys (sprite px, +-10): a-run floorY 817; a-swept hips [445,480]; a-cross floorY 895, hand [69,264]; pair-back floorY 824, hands [266,445], hisHeadTop [115,13], herHeadTop [397,60], headH 125 (his), seam 270. All have bbox, headTop, headH, outline.
Head heights: a-run 152, a-swept 132, a-cross 128, ref-ai 131, ai-stand 136.
Weak spots: pair-back her body is slightly feminine in the hips and the heads barely tilt up; she is ~47 px (of 830) shorter than his hair top; clasp fingers are small. a-run has no foot on the ground (flight, as asked); floorY = lowest toe. a-swept head is tilted ~20 deg (not more than the torso line). a-cross hand is open, palm slightly up.
Boards: `boards/p4-a-same-head.png`, `boards/p4-a-points-<name>.png`.
