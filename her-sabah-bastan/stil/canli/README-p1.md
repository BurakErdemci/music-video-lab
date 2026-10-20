# Part 1 drawings (Codex image_gen, 17 images)

All 17 ran once (no retries; first attempt kept). Raw images: `ham/p1-*.png` (1672x941, magenta background; the three pages are full plates).
`ham/md5-p1.txt`: 17 lines `md5(copy) md5(original) path`, all 17 pairs equal. Prompts were not edited. Logs: `logs/p1-*.log`, `logs/rc.txt` (all rc=0).

## Images -> sprites (`python stil/canli/prep_p1.py` from repo root; output `video/public/living/p1/`, meta `video/src/living/sprites-p1.json`)
Human: h-rise (getting up from chair, note in hand), h-peel (peeling a note off, far arm up-left), h-slide (arm out, note on palm pushed forward), h-hand (arm out, open hand).
AI (faces LEFT unless noted; each has `-eye`/`-noeye` split, `eye` rect and `outline`): a-raise (waving), a-lookback (head turned right), a-pin (seen from the back, pressing a yellow note on a wall, faces right),
a-catch (yellow cube on open palm), a-hand (arm out), a-lookdown, a-kneel (hand on floor), a-read (cross-legged, navy book), a-lookup (cross-legged, book).
Props: notebook. Plates: page-tag, page-road, page-cross (1920x1080, cover-crop, no keying).
Wave rig (from approved `ai-wave-a-noeye.png`): a-wave-body(.png, -noeye, -eye), a-wave-forearm, elbow pivot [75,267] (sprite px), canvas 269x901.
`-eye` for the rig is a copy of `ai-wave-a-eye.png` (rect [149,51,8,50]); body == body-noeye.

## Boards
`boards/p1-human-same-head.png`, `p1-ai-same-head.png` (red = head top, cyan = chin), `p1-film-scale.png` (standing figures at the reference height), `p1-wave-rig.png` (-20..+20 deg).

## Measured head height / figure height (same neck-row rule as README.md)
ref human 0.169, ref AI 0.157.
h-peel 0.165, h-slide 0.173, h-hand 0.173, h-rise 0.168 (chin set by hand at head 143 px; height includes chair, so not a standing ratio).
a-raise 0.155, a-lookback 0.148, a-pin 0.142, a-catch 0.175, a-hand 0.154, a-lookdown 0.159 (head bent forward, ratio approximate).
Seated/kneeling (a-kneel 0.255, a-read 0.285, a-lookup 0.220) are not comparable (figure height is not standing height); compare on the same-head board only.

## Known deviations accepted
- a-pin is a back / three-quarter view facing right (as its prompt allowed); a-lookback head looks right with the body facing left.
- a-catch head ratio 0.175 (head tilted down, slightly bigger than the 0.157 reference); a-pin 0.142 (smaller, back view).
- h-slide has two notes on the chest/ribs area plus extra ones on arm/shoulder, h-peel/h-slide/h-hand notes differ slightly from the reference pattern (a few more squares on the chest/back).
- Eye detector: stock `eye_rect` failed for a-lookdown and a-kneel (tilted bar); `eye_rect_loose` used. Their `-noeye` fills only the eye's own pixels, leaving a very faint ghost of the slash and a tiny light dot near the chin on a-lookdown. The `eye` rect for tilted figures is the bbox of the tilted slash.
- Magenta background has grain/gradient (as in the earlier batch); keying with LO/HI 50/190 left clean edges on the boards, no halo judged by eye at board scale.
- Wave rig: cut by a line through the elbow (outer tip ~(62,288), inner crook ~(88,247)), forearm = x<118 side. The cap ring is drawn only where it lies outside the silhouette. At +-20 deg a tiny notch is visible at the outer/inner elbow edge on the rig board; no gap.
- Head ratio of the page/notebook plates not applicable.
