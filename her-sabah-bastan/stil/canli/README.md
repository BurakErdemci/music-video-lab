# stil/canli - living-test drawings (Codex image_gen)

## Contents
- `prompts/*.txt` - five prompts (h-otur, h-cam-not, a-poz, masa-monitor, bg-oda-sabah); each was run twice (`-a`, `-b`).
- `logs/*.log`, `logs/rc.txt` - Codex run logs (line `session id: ...`).
- `ham/*.png` - the 10 raw Codex images (magenta background). `ham/md5.txt` pairs each copy with its original in
  `~/.codex/generated_images/<session id>/`; all 10 md5 pairs are identical.
- `prep.py` - keys magenta to alpha, splits strips, trims, and writes `video/public/living/*.png` plus
  `video/src/living/sprites.json` (run from the repo root: `python stil/canli/prep.py`). PIL only.
- `boards/` - same-person comparison boards (see below).

## Chosen raw images (the other of each pair is a rejected alternative)
- `h-otur-a` -> `h-sit-mug`, `h-sit-sip` (seated pair, mug at chest / mug at mouth).
- `h-cam-not-b` -> `h-glass-note` (standing at the glass with the note).
- `a-poz-a` -> `ai-stand`, `ai-wave-a`, `ai-wave-b` (neutral + two wave poses).
- `masa-monitor-a` -> `desk`.
- `bg-oda-sabah-a` -> `room-morning`.
(Why a was picked over b was decided in the main loop; not re-judged here.)

## Boards (`boards/`)
- `human-same-head.png`, `ai-same-head.png` - reference + 3 sprites, scaled to the same head height, top of alpha on one
  red line, chin on one cyan line (a short yellow tick marks any figure whose chin differs by >1 px).
- `human-film-scale.png`, `ai-film-scale.png` - standing figures scaled to the reference's height; seated figures scaled by
  head size to the reference head.
- Reference human = keyed canonical (magenta -> alpha, LO/HI 50/190 as in prep.py), shown on mid grey.
- Head height = top of alpha to the narrowest row of the neck (alpha width, 5-row smoothing, searched in 8-30 % of figure
  height, inside the x-range of the head's top rows so arms/hands outside it do not count). For `h-sit-mug` that rule
  picked a torso row, so the chin was set by hand to row 164 (where the width drops under the jaw).

## Known deviations
- Chin of the seated figures is approximate (+-15 px): the mug/hand hides the jaw in `h-sit-sip`.
- Measured head-height / standing-height: human ref 0.170, h-glass-note 0.172, h-sit-sip 0.176 (seated, so not comparable),
  h-sit-mug 0.215 (seated, hand-set chin). AI ref 0.157, ai-stand 0.153, ai-wave-a 0.154, ai-wave-b 0.156.
- Seated humans have a bigger, wilder hair mass than the reference (see boards).
