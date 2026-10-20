# Part 3 drawings (song 1:51.3-2:35.88): 30 generations in 4 parallel lanes, Codex window never full

Method as parts 1-2 (`gen.sh`, gpt-6.1-sol, one image per `codex exec`, -i canonical refs + approved drawings, flat
magenta, md5 of every copy = its original in `ham/md5-p3-*.txt`). Lane notes follow unchanged; the architect's
integration steps are at the end.

Reused (not redrawn): ai-stand (living test), a-raise, a-lookdown, a-read, a-lookup, h-slide (part 1), room-morning.
New: 21 sprites/plates in `video/public/living/p3/`, listed in `video/src/living/sprites-p3.json`.

## Part 3 lane h (human poses): 8 generations (6 first attempts + 2 retries), all rc=0

Raw `ham/p3-h-*.png` (all attempts kept), md5 pairs in `ham/md5-p3-h.txt` (all equal). Prompts `prompts/p3-h-*.txt` from `prompts/make_p3_h.py` (freeze-r1/r2 written by a one-off edit of the freeze prompt). Prep: `python stil/canli/prep_p3_h.py` (reads `p3-h-measured.json`). Output `video/public/living/p3/h-*.png`, `video/src/living/sprites-p3-h.json`.

## Chosen / rejected
- h-walk = p3-h-walk: profile right, loop handle on the body side with index+middle fingers through it, mug upright at chest height, far arm back, cut at hip by the image bottom.
- h-palm = p3-h-palm: arm raised at shoulder height, palm flat, fingers together pointing up, palm faces right. Arm is nearly straight (spec said slightly bent); head looks down-forward at the hand.
- h-lean = p3-h-lean: bend ~35 deg, both palms flat on one line (near hand ~12 px lower than far hand), feet flat.
- h-head = p3-h-head: both hands in the hair, elbows forward, hunched. One hand shows fully, the other mostly hidden behind the head.
- h-kneel = p3-h-kneel: one knee down, near hand on the lid, blank cream label, no letters.
- h-freeze = p3-h-freeze-r2 (3rd attempt). REJECTED p3-h-freeze (arms relaxed, shoulders not raised), p3-h-freeze-r1 (arms hang down, hands below hip, not hovering). r2: forearms horizontal at hip height, palms down, fingers apart, body rigid. Far hand ~15 px higher than near hand; fingers only mildly spread.

## Measured (sprite px, by eye on 50 px grids, +-10 px; floorY/cutY from alpha rows with >= 8 opaque px)
- h-walk 736x925: mugTop [684,458], hair {322,8,608,238}, cutY 917.
- h-palm 747x930: palm [708,385], glassX 734, palmBox [650,266,92,172], hair {112,8,368,195}, cutY 929.
- h-lean 394x881: handY 440, handX [215,388], floorY 873, hair {195,7,318,105}.
- h-head 302x911: floorY 903, headTop [215,10].
- h-kneel 797x738: floorY 730, label [678,637,72,43], box [585,565,206,157].
- h-freeze 288x889: floorY 881, handY 385, hair {33,6,155,100}.

## Head height (top of hair to chin, px, by eye; also `headHeight` in p3-h-measured.json)
h-walk 262, h-palm 240, h-lean 131, h-head 150, h-kneel 147, h-freeze 117, ref-h (neck rule) in the board. Same-head board matches chins on the cyan line.

## Boards
`boards/p3-h-same-head.png`, `boards/p3-h-points.png` (points/rects drawn on every sprite).

## Deviations
Waist-up sprites are drawn much larger than full-body ones (scale by head height). Hand points are +-10 px.

## Part 3, lane a: AI poses

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

## Part 3, lane bus (night-bus plate + the man in the window seat)
Generations: 1 plate + 4 poses + 3 retries = 8 (Codex window did not fill).
- Plate: ham/p3-bus-int.png (raw) came with the window on the LEFT and the seat facing left; it was MIRRORED
  (ham/p3-bus-int-flip.png) to match style frame 01 (window right, man faces right). bus-int.png = mirrored, keyed, untrimmed 1672x941.
  Magenta glass: main window plus the small back windows (all keyed to alpha).
- Plate points (flipped px): window TL(635,158) TR(1604,0) BR(1596,708) BL(700,578) (top edge runs out of frame, TR clipped
  to y=0); sill (745,592)-(1604,712); seat (565,805); seatBack (540,425).
- Men: first attempts (hb-lean/read/lookup) were pure side profiles = rejected (set is three-quarter back). Retries r1 chosen.
  hb-refl first try accepted (flat side view, barefoot).
- Fit (hips=seat, scale 1.1 for all three): see sprites-p3-bus.json `fit` {scale,dx,dy} = sprite top-left in plate px.
- Weak spots: hb-lean's hand-on-chin is drawn with no sill under the elbow (sill/glass not drawn); temple point is at the
  forehead edge, the head overlaps the window region but the exact glass contact is by eye. The men have bare feet/shoes
  that reach the plate bottom edge (cropped by frame, fine). Cream rim on hair has a faint pink fringe from keying.
- hb-refl backX/floorY in sprite px: 20 / 692.

## Part 3 lane pl (plates and props): 7 generations (6 + 1 retry), all rc=0, Codex window not full

Raw: `ham/p3-pl-*.png`, md5 pairs in `ham/md5-p3-pl.txt` (7 lines, equal). Prompts `prompts/p3-pl-*.txt` (from `make_p3_pl.py`).
Prep: `python stil/canli/prep_p3_pl.py` (reads `p3-pl-measured.json`). Out `video/public/living/p3/st-*.png`, `video/src/living/sprites-p3-pl.json`.

## Chosen / rejected
- st-shops-a (clothing + bakery), st-shops-b (bookshop + flower shop), st-tv (10 CRT screens), st-cafe, st-props: first attempt kept.
- st-table = `p3-pl-table` (2.7:1 incl. legs, target 3.2). REJECTED `p3-pl-table-r1`: asked for shorter legs, came out 2243x701 with ~5.3:1, a flat bench.
- Plates are untrimmed at 1672x941, magenta keyed to alpha (sky; TV screens become transparent holes). Table and props trimmed with 12 px padding.

## Measured numbers (px)
- shops plates: `windows` = ground-floor shop window glass rects (doors excluded), `upperWindows` extra; `sidewalkY`, `roofY` (top edge of the roofline wall, chimneys rise above). Eyeballed on `boards/p3-pl-shops-{a,b}-points.png` (about +-5 px).
- st-tv: `window` [133,355,1402,400]; `screens` = 10 magenta holes found by connected components (exact), order left-to-right, top-to-bottom per row (row 1: 5 sets, row 2: 5). sidewalkY 848, roofY 72.
- st-cafe: `frame` [665,905] (street edge to the right edge of the navy frame/mullion band), `glassX` 905, `floorY` null (no floor line visible). A second thin navy post sits at x about 1340-1385 inside the café.
- st-table (1505x572 sprite): topY 12, floorY 559, legs [56,122] and [1382,1448] (computed from alpha).
- st-tree 746x906 baseY 893; st-lamp 173x905 baseY 892 (split by connected component).

## Deviations
- Table ratio 2.7:1, not 3.2:1; top surface barely visible as a sliver, as asked. Legs have an apron under the top.
- Shop interiors have a yellow-lit glass rim (glass is mostly yellow-lit, not dim navy as asked); opaque anyway.
- Tree: a faint pink magenta fringe between leaves remains after a defringe pass.
- Boards: `boards/p3-pl-*-points.png`, `p3-pl-table-props.png`, `p3-pl-tree-check.png`.

## Integration (architect)
- `python stil/canli/merge_p3.py` merges the four lane lists into `video/src/living/sprites-p3.json`.
- `python stil/canli/defringe_p3.py` re-inks the keying's magenta fringe (24 632 edge pixels over all p3 sprites:
  visible pixels with r-g > 38 and b-g > 38 become navy or cream by lightness). Idempotent.
- Head sizes of the man's drawings are in `video/src/living/part3/common.ts` (`HUMAN_HEAD_H`, from lane h's table; the
  three bus poses by eye, 165 px). The upright standing poses in his room (h-freeze, h-head) are scaled by height (800 px
  floor to hair, part 1's standing man) because h-freeze's head is drawn small for its body.
