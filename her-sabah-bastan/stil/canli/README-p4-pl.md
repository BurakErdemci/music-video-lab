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
