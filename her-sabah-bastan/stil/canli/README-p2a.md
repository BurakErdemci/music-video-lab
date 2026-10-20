# Part 2 AI poses (8 images, all first attempt, 0 retries)

Prompts: `python stil/canli/prompts/make_p2a.py` -> `prompts/p2-a-*.txt` (AI block of make_p1v2.py + camera/rules). Refs: ref-ai.png + ai-stand.png (left-facing poses) or p1/a-turn.png (right-facing poses).
Raw: `ham/p2-a-*.png` (1672x941, magenta). `ham/md5-p2a.txt`: 8 lines (copy, original, path), all pairs equal. Logs `logs/p2-a-*.log` (rc.txt all rc=0). `_grab.py` copies by exec-uuid.
Note: another lane generated in parallel into the same codex folder, so each image was matched to its prompt by looking (poses are distinct), not by timestamp.
Prep: `python stil/canli/prep_p2a.py` (hand numbers in `p2a-measured.json`) -> `video/public/living/p2/a-*.png` (+ `-eye`, `-noeye`), `video/src/living/sprites-p2a.json`.

## Chosen (all first attempts; none rejected)
- a-sit: faces LEFT, thighs horizontal, shins vertical, one hand on the seat line. Delivered as the RIG (not a-sit-b/c): `a-sit-body(.png with cursor, -noeye, -eye)` + `a-sit-shins`. knee [85,518] (pivot), seat [300,541], cut row 518, sprite 370x875.
- a-step1 (contact, near leg forward), a-step2 (passing), a-step3 (contact, other leg forward; near leg is behind): face RIGHT. Heights 895/899/897 px, floorY 901/904/903.
- a-trip: right, pitched forward, rear toe lifted behind, both arms forward, one foot down. 1039x898.
- a-tap: right, bent at hips, near arm down-forward, index finger pointing down: tap [332,562] (fingertip).
- a-thumb: left, fist with four curled fingers and one thumb up: thumb [50,77] (tip).
- a-squint: left, flat hand on forehead, cursor line shorter (eye rect h 41 vs ~50 elsewhere).

## Measured (sprites-p2a.json)
eye rects: sit [230,56,7,52], step1 [296,52,7,50], step2 [209,49,7,50], step3 [314,51,8,51], trip [689,61,10,61], tap [240,51,9,52], thumb [169,52,8,52], squint [124,54,7,41]. All from the stock detector. `outline` (closed polyline) present for every pose.
floorY (lowest opaque y): step1 901, step2 904, step3 903, trip 891, tap 913, thumb 897, squint 916. a-sit has `seat` instead.
headPx / figure height (neck rule): ref-ai 0.157, ai-stand 0.153; step1 0.156, step2 0.152, step3 0.151, thumb 0.156 (140/135/139 px) - all match. a-sit 146 px (0.169, seated, not comparable), a-trip 151 px (0.170, head ~10% bigger, pitched forward).
Hand overrides (neck rule fails with the hand on the head / the body bent): a-squint 136 px, a-tap 131 px.
a-sit-shins cut: shin region = rows >= 518 and x < 118 (x < 143 below row 544); body keeps 14 rows below the cut (tuck) so a rotated shin never opens a gap.

## Boards (looked at)
- `p2-sit-rig.png` (-15/0/+15) and `p2-sit-rig-knee.png` (3x knee): no gap, no doubled outline; the leg bends plausibly. Residual: a tiny dark notch at the inner knee corner at +-15, and a barely visible light hairline along the cut at 3x. Shins rotate about [85,518].
- `p2-ai-same-head.png`: same character in all poses (same head, line, stipple, outline).
- `p2-ai-strides.png`: step1/2/3 on one floor line at raw scale; heights within 4 px; reads as a walk beat by beat.
- `p2a-measure-sit/tap/thumb.png`: 50 px grid crops used for knee, tap, thumb.

## Deviations
- Gait: in step3 the near arm swings back with the near leg back (ipsilateral); in step1 near leg forward. A careful eye may read the arm pairing as unnatural in one of them.
- step2 is a toe-off/passing hybrid: rear foot lifted behind with the toe down, legs close, upright.
- a-tap: lean is mild (~20 deg) and the finger points down at the (undrawn) box top; a-trip: head ratio larger than standing figures.
- a-sit: the two legs are slightly offset (double thigh line, as drawn); one hand visible on the seat line, the far hand hidden.
- Palette: stipple colours slightly warmer cream in the boards than ai-stand (same pipeline as Part 1).
