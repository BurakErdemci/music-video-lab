# Part 2 human poses: drawings (13 sprites; 18 generations incl. 5 rejected/retries + the v0 coffee)

Raw: `ham/p2-h-*.png`, `ham/p2-chair2*.png` (all attempts kept). `ham/md5-p2h.txt`: copy, original, path, run name (all pairs equal). Logs `logs/p2-h-*.log`, `logs/p2-chair2*.log` (`p2-h-coffeecab` logged rc=1 in rc.txt but the image was produced and harvested; all others rc=0).
Prompts: `python stil/canli/prompts/make_p2h.py` -> `prompts/p2-h-*.txt` (+ `p2-h-refs.txt`, refs per prompt). Prep: `python stil/canli/prep_p2h.py` (hand numbers from `p2h-measured.json`). Output `video/public/living/p2/<name>.png` + `video/src/living/sprites-p2h.json`.

## Chosen / rejected
- h-type1/2/3, h-calm, h-torch, h-torch-back, h-sleep, h-wake, h-ots, coffee-cab: first attempt kept (looked at full size; flat side view, one figure, same man, correct grips). h-torch: fist wraps the barrel, lens right/slightly down (dir 0.93,0.37), no beam. h-torch-back: whole body+chair mirrored, lens 30 deg above horizontal. h-ots: back of head and shoulders with notes, chin edge faintly visible, cropped at the bottom only.
- h-coffee = `p2-h-coffee` (second design, per the lane change): man alone, facing LEFT, mug held by its handle (fingers through the loop, grip board). REJECTED `p2-h-coffee-v0` (first design with cabinet and machine in the same image; replaced by the separate coffee-cab prop).
- coffee-cab = `p2-h-coffeecab` (generated from the v0 image as style ref): cabinet+machine alone, spout faces RIGHT.
- h-stretch = `p2-h-stretch` (first). REJECTED `-r1`, `-r2`: asked for a bigger head, both came back with an even smaller head (arms hide/shrink it). Known weakness: the first attempt's head is ~25 percent smaller than in the other poses (headPx 101 raw vs 151..181), partly hidden by the arms and tilted back.
- chair2 = `p2-chair2` (first). REJECTED-as-not-better `-r1`, `-r2` (prompt with proportions): all three draw the chair about 1.6x bigger than h-mug2's and with more splayed legs (leg span / leg height 1.3 vs 1.07 in h-mug2). Fixed in prep with a non-uniform scale (sx 0.498, sy 0.618) so leg span (250) and floor-to-seat-underside (231) equal h-mug2's chair; seat depth then 236 vs 230.

- h-stretch EDIT round (3 more attempts, `-r3..-r5`, prompt "redraw image 1 exactly, change only arms and back", refs = raw `ham/p2-h-type1.png` (magenta, same drawing as sprite h-type1) + canonical ref): all REJECTED, current h-stretch kept. Measured on raw: r3 head 114 px vs 145 in type1 (-21 percent; chair leg span 245 vs 262, -6 percent, so head/chair -16 percent), r4 head about 115 (same), r5 about 90 (worse). The arched, arms-up pose makes the model shrink the head every time (6 attempts total).

## Scale normalisation (deviation from "just trim")
The model draws each pose at a different size. prep rescales every sprite (LANCZOS) and writes the factor in the json (`scale`): seated with chair = geometric mean of chair-leg-span scale (to h-mug2's 249 px at 12 px above the floor) and head scale (head target 150 px); standing/floor poses = head scale; h-sleep and h-wake share one scale (0.698, mean of both heads); h-stretch = chair scale only (its head is unreliable); h-ots = 1.0 (large plate); coffee-cab scaled (1.161) so the spout is 15 px above the mug's open top when floors align. All numbers in the json are FINAL sprite px.

## Measured numbers (sprites-p2h.json; final px)
type1 (516x810) hands [430,400] floorY 803 head 147; type2 (484x731) hands [452,330] floorY 724 head 151; type3 (474x703) hands [428,316] floorY 697 head 155; stretch (580x918) floorY 911 hair {152,150,267,254} head 104; calm (485x788) floorY 782 head 152; torch (513x813) lens [497,316] dir [0.93,0.37] floorY 805; torch-back (577x817) lens [16,69] dir [-0.86,-0.51] floorY 810; coffee (340x1020) mugTop [33,292] floorY 1012; coffee-cab (459x840) spout [339,96] cabTopY 259 floorY 832 (spout is 306 px right of mugTop x); sleep (507x507) floorY 488 (seat bottom) feetY 501 backX 501; wake (549x588) floorY 574 feetY 582 backX 544; ots (796x902) headTop [505,14]; chair2 (315x500) floorY 495.
Hair box = hair top to chin, headPx = hair top to chin (by hand, +-5 px; for tilted heads it is the vertical extent). floorY/feetY/backX are read from the pixels (lowest opaque row; backX = rightmost opaque x in the middle 30..80 percent rows, i.e. the notes' outer edge). Hand points read off 50 px grids (`boards/p2h-measure-*.png` = raw, `p2h-check-*.png` = final with the points drawn; looked at).

## Boards (`boards/`)
`p2-human-same-head.png` (ref, h-mug2 and all poses at one head height: same man; stretch visibly has the small head), `p2-human-grips.png` (3x mug and torch hands: fingers through the handle; fingers around both barrels), `p2-type-desk.png` (type poses at h-mug2 scale next to desk2 at 0.86 with fingertips on desk2's keyboard point [450,330]: fingertip y minus keyboard y = -15, -6, +7 px, so the desk height fits; the chair legs overlap desk2's left leg in the picture, the lane must offset).

## Deviations / open
- stretch head small (above). sleep/wake: head forward in sleep is not quite "on the chest" (chin near chest, drawn slightly raised); wake hands are open and lifted. The two are not pixel-registered: align by backX and floorY.
- h-ots shows a faint chin line at the right edge of the neck; no face.
- h-torch keeps the far hand resting on the thigh (fine); h-calm shows one hand (the near one) on the thigh.
