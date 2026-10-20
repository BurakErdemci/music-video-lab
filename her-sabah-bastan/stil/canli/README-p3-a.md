# Part 3, lane a: AI poses

Method as p1v2: gen.sh (gpt-6.1-sol), refs `ref-ai.png` + `a-hand.png` (walk, palm, tower) or `a-kneel.png` (reach, finger).
Prompts: `prompts/make_p3_a.py` (note: `p3-a-finger.txt` holds the last rewrite of the finger prompt; the other finger prompts are `p3-a-finger-r1.txt`, `-r1b.txt`).
Prep: `prep_p3_a.py` (+ `p3-a-measured.json`: raw-image coordinates, converted to sprite px; `p3-a-origin.json` = trim origins).

## Chosen
All first attempt except a-finger: `p3-a-walk`, `p3-a-palm`, `p3-a-reach`, `p3-a-tower`, `p3-a-finger-r1b`.
## Rejected
- `p3-a-finger` (try1, copy `p3-a-finger-try1.png`): index finger pointed diagonally up-left, not a horizontal touch at face height.
- `p3-a-finger-r1`: no image (generator refused the wording as a content-policy false positive); r1b used softer wording and worked.

## Head height (top of head to chin, sprite px) and sprite size
a-walk 265 (660x933), a-palm 263 (771x929), a-reach 152 (889x891), a-finger 163 (683x871), a-tower 135 (336x891). ref-ai 131, ai-stand 136.
Waist-up sprites are drawn about 1.9x larger per head than the full-body ones; scale by head size.

## Measured (sprite px; see sprites-p3-a.json)
- a-walk: mugTop [600,463], cutY 933 (= sprite bottom edge).
- a-palm: palm [46,329], glassX 14, palmBox [14,231,65,218], cutY 929.
- a-reach: note [6,263,74,68], shoulder [451,228], floorY 880.
- a-finger: fingertip [15,168], floorY 856.
- a-tower: tower [22,204,90,267] (incl. roof), towerBase [68,469], floorY 888.
Every sprite also has headTop, headH, eye, outline. Eyes were found for all five (-eye / -noeye real).
Boards: `boards/p3-a-same-head.png`, `boards/p3-a-points-<name>.png`.

## Weak spots
- a-walk: fingers curl on the handle; whether they pass "through" the loop is only suggested by the drawing.
- a-palm: arm reaches a bit below shoulder height at the elbow, hand at about eye level; palm is flat and vertical.
- a-reach: other hand hangs along the thigh rather than resting on it.
- a-finger: other hand likewise at the thigh; the fingertip at x=15 is the leftmost point of the sprite.
- a-tower: tower box shows a faint 3D side face; far hand grips its far edge.
