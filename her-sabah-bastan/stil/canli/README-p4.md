# Part 4 drawings (song 2:35.88-4:00.76): 23 generations in 3 parallel lanes, Codex window never full

Method as parts 1-3 (gen.sh, gpt-6.1-sol, one image per codex exec, -i canonical refs + approved drawings, flat magenta; md5 of every copy = its original in ham/md5-p4-*.txt). New: 17 sprites/plates in video/public/living/p4/, listed per lane in video/src/living/sprites-p4-{h,a,pl}.json and merged in video/src/living/sprites-p4.json. Reused (not redrawn): ai-stand, a-watch, a-turn, a-lookdown, a-lookback, a-hand, a-trip (stand-in only), h-hand, h-glass-note, h-head, h-slide, h-sleep, h-palm, h-mug2, desk2, room-morning, notebook, bus/street plates st-shops-a/b, st-lamp, st-tree. Lane notes follow unchanged.

# Part 4 lane h (human drawings): 10 generations (9 first attempts + 1 retry), all rc=0, Codex window never full

Raw `ham/p4-h-*.png` (all kept), md5 pairs in `ham/md5-p4-h.txt` (10 lines, equal; `getraw_p4_h.sh` is a copy of getraw.sh writing there). Prompts `prompts/p4-h-*.txt` from `prompts/make_p4_h.py` (run2-r1 written by a one-off edit of the run2 prompt). Prep: `python stil/canli/prep_p4_h.py` (reads `p4-h-measured.json`, RAW px). Out `video/public/living/p4/h-*.png`, `video/src/living/sprites-p4-h.json`. Edges are defringed with the p3 rule inside prep. Boards: `boards/p4-h-same-head.png`, `boards/p4-h-points.png`, grids `p4-h-measure-*.png`, checks `p4-h-check-*.png`.

## Chosen / rejected
- h-leap: first. Back three-quarter view from behind, push-off bare foot at the bottom, other knee up, both arms forward-up, near fist around a note edge.
- h-run1: first (contact). h-run3: first (flight, legs scissored).
- h-run2 = `p4-h-run2-r1` (architect asked for a clearer drive). REJECTED-as-weaker `p4-h-run2` (first try): front foot nearly landing, read like run1. r1: thigh horizontal, front foot off the ground, back toes just leaving.
- h-pant: first. Bend is ~45 deg (spec 30), palm flat, fingers up at head height, far hand on far knee, head low.
- h-floor-up, h-floor-book: first. They face LEFT with the back on the right, exactly like h-sleep (backX keys are h-sleep's; the brief's "facing right" contradicts "same seat as h-sleep"; the architect confirmed this is accepted).
- h-cross: first. Stride is moderate, not very long; a faint stray line under the back foot (alpha tiny).
- h-desk-book: first. Same chair as h-type1; one hand lifts the cover, the other flat on the book. Book seen edge-on, cream pages barely visible.

## Scale (as part 2)
Run/leap/pant/cross: scale 1 (raw trim; scale by headH in code). floor-up/book: 0.782 (geometric mean of head scale to 150 and body-length scale to h-sleep's 497 px width; one scale for both). desk-book: 0.871 (chair span and head, as h-type1).

## Keys (final sprite px, +-10 by eye on grids; floorY/feetY/backX/frontX from alpha)
See the json. All have bbox, hair, headPx (= headH), floorY. leap fist [697,38]; run1 fist [612,268] hipX 410; run2 fist [682,235] hipX 400; run3 fist [662,268] hipX 430; pant palm [520,90] glassX 534; cross hand [625,298]; floor-book book [121,200,188,133]; desk-book hands [410,366] handLift [431,281]. frontX = leftmost toe (they face left).

## Weak spots
Note on run fists is gripped at an edge but reads like a small mug from the side (square beside the fist); hair box of the floor poses is large because the head is drawn with big hair; floor-book head height is the bowed vertical extent; the leap's push-off foot shows its sole (rear view).

# Part 4 lane a: AI poses + pair from behind (4 generations, all first attempts, rc=0, Codex window not full)
Prompts `prompts/p4-a-*.txt` (from `prompts/make_p4_a.py`); raw `ham/p4-a-*.png`, md5 pairs `ham/md5-p4-a.txt` (name, copy, original; equal).
Run `getraw_p4_a.sh <run>` after `gen.sh`; prep `python stil/canli/prep_p4_a.py` (reads `p4-a-measured.json`). Out `video/public/living/p4/`, list `video/src/living/sprites-p4-a.json`.
Chosen: a-run, a-swept, a-cross, pair-back (no rejects). a-run/a-swept/a-cross have -eye/-noeye; pair-back is plain.
Keys (sprite px, +-10): a-run floorY 817; a-swept hips [445,480]; a-cross floorY 895, hand [69,264]; pair-back floorY 824, hands [266,445], hisHeadTop [115,13], herHeadTop [397,60], headH 125 (his), seam 270. All have bbox, headTop, headH, outline.
Head heights: a-run 152, a-swept 132, a-cross 128, ref-ai 131, ai-stand 136.
Weak spots: pair-back her body is slightly feminine in the hips and the heads barely tilt up; she is ~47 px (of 830) shorter than his hair top; clasp fingers are small. a-run has no foot on the ground (flight, as asked); floorY = lowest toe. a-swept head is tilted ~20 deg (not more than the torso line). a-cross hand is open, palm slightly up.
Boards: `boards/p4-a-same-head.png`, `boards/p4-a-points-<name>.png`.

# Part 4 lane pl (plates + inserts): 5 generations (4 + 1 retry), all rc=0, Codex window not full

Raw `ham/p4-pl-*.png`, md5 pairs `ham/md5-p4-pl.txt` (5 lines, equal). Prompts `prompts/p4-pl-*.txt` (from `prompts/make_p4_pl.py`; `-r1` written by a one-off edit of the face prompt).
Prep `python stil/canli/prep_p4_pl.py` (reads `p4-pl-measured.json`). Out `video/public/living/p4/*.png` (1672x941, opaque, no keying), list `video/src/living/sprites-p4-pl.json`.

## Chosen / rejected
- bus-door, ins-foot, ins-fist: first attempt kept.
- ins-face = `p4-pl-ins-face-r1`. REJECTED `p4-pl-ins-face`: lips almost closed, head level, no readable open mouth.

## Keys (plate px, +-6 by eye / bright-pixel scan)
- bus-door: doorway [528,58,1143,822], stepY 822 (yellow step edge top), floorY 862.
- ins-foot: splash [830,585], puddle [0,590,1672,941].
- ins-fist: note [1235,128,1600,500], fist [1020,470].
- ins-face: mouth [1062,435] (gap about 1055-1090 x 424-445), headTop [790,0], headH 555 (hair tips touch the top edge, headH is to the chin).

## Weak spots
- bus-door: the frame has a thin double cream line (outer and inner); doorway is the inner rectangle. Step is a flat yellow band, not a 3D step.
- ins-foot: foot is bare, trouser cuff has a yellow note on it; the sleeve-like cuff is wide.
- ins-fist: thumb wraps the note edge; the note is 365x370, large for the fist.
- ins-face: a faint yellow streak sits inside the mouth gap; hair is cream-rimmed strands (not solid cream). The shoulder note is lower left.

