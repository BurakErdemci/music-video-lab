# Part 3 lane h (human poses): 8 generations (6 first attempts + 2 retries), all rc=0

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
