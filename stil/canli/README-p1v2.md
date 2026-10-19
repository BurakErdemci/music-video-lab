# Part 1 fix round: drawings (7 images + 4 retries = 11 generations)

Raw: `ham/p1v2-*.png` (all attempts kept). `ham/md5-p1v2.txt`: 11 lines (copy, original, path), all pairs equal. Logs `logs/p1v2-*.log`, `logs/rc.txt` (all rc=0).
Prep: `python stil/canli/prep_p1v2.py` (reads `stil/canli/p1v2-measured.json` for the hand-measured numbers). Output `video/public/living/p1/` + `video/src/living/sprites-p1v2.json`.

## Chosen / rejected
- desk2 = `p1v2-desk-b`. REJECTED `p1v2-desk-a`: the four legs end at four different heights (about y 775..818 in the raw), so no single floor line. desk-b: two legs seen from the front, both end on one line (floorY 781), only a thin sliver of top, screen clear, no text.
- h-mug2 = `p1v2-h-mug-r2` (3rd attempt): fingers hooked through a loop handle on the body side, far hand cupped under it, upright, below the chin. REJECTED: `p1v2-h-mug` (no handle visible at all), `p1v2-h-mug-r1` (no handle visible).
- h-sip2 = `p1v2-h-sip-r1` (2nd attempt) **FAILS the grip criterion, kept only as least bad (see deviations)**. REJECTED: `p1v2-h-sip` (handle on the far side, fingers on the body of the mug), `p1v2-h-sip-r2` (no handle; rim fine). r1: rim touches the lower lip (no gap), seated posture and chair match h-otur-a, but the handle loop is on the far side (away from his body) and the near hand wraps the mug body, not the handle. Retries exhausted (2).
- a-turn, a-watch, a-back34: first attempt kept, no retries. a-turn: whole body and head face right (no head-only turn), single cursor line. a-watch: body in profile, head tipped back/up (less than 30 degrees off the body direction), one arm held forward. a-back34: body three-quarter from behind, head turned with the body, single figure, nothing cropped.

## Head height / figure height (neck-row rule as in README-p1.md)
ref human 0.169, ref AI 0.157, ai-stand 0.153.
a-turn 0.149, a-watch 0.151, a-back34 0.140.
Seated human (chin set by hand, auto rule fails on seated figures; not standing ratios): h-sip2 head 151 px (0.174 of sprite height), h-mug2 head 159 px (0.199), old h-sit-sip/mug set at 150 px. On the same-head board h-sip2's body/chair come out ~10% bigger than h-mug2's (it leans back, taller sprite); the heads match the others.

## Measured numbers (sprite px, sprites-p1v2.json)
- desk2 (1038x789): screen TL [309,57] TR [694,25] BR [676,257] BL [287,266] (cream region by flood fill, extreme-corner rule; quad drawn on `boards/p1v2-desk-screen.png`, looked at, sits on the cream area). floorY 781 (max opaque y of the legs). legs x ranges [35,79] and [961,1005] (both bottoms at 781).
- h-sip2 (569x882): mugTop [258,112] (rim meets lower lip), hair {x0:90,y0:8,x1:268,y1:148}.
- h-mug2 (506x813): mugTop [336,281] (centre of the open top, by eye on a 2x grid), hair {x0:135,y0:8,x1:310,y1:150}.
- a-turn eye [109,49,8,50]; a-watch eye [98,39,14,45] (tilted slash bbox); a-back34 no `eye`.
Hair boxes and mugTop are read by eye off a 50 px grid (about +-5 px).

## Boards (`boards/`)
p1v2-human-same-head.png, p1v2-ai-same-head.png, p1v2-desk-with-man.png (desk and man both at 0.62, bottoms of desk legs and chair legs on one cyan line; desk top reaches ~1.6x seat height, plausible; the desk is drawn frontal and the man in profile, so the perspective differs), p1v2-mug-grip.png (3x crops), p1v2-desk-screen.png.

## Deviations
- h-sip2 grip is wrong (handle far side). It needs a fix by compositing/another round, or the lane can use h-mug2 only.
- a-back34: the cursor line is a thin sliver fused with the head outline on the right edge, so no eye rect was extracted: `eye` omitted, `-noeye` is a copy of the sprite, `-eye` is a 1x1 transparent png.
- a-watch eye rect comes from the stock detector (bar is tilted, bbox is a bit wide).
- Seated head heights are by hand, not the neck rule.
- desk2 is a front view with only two legs visible (the far legs are hidden), as intended by the prompt.
