# Brief: production part 4 — song 2:35.88–4:00.76 (scene map v2 scenes 12–17) in the living-illustration language

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. You are the designer and integrator; run independent tracks in parallel through `sonnet`
helpers (they may spawn their own `sonnet` helpers), each with a narrow brief and its own files (drawings A/B, the run +
crack painter, the navy flood, the re-forming/pixel/pen effects, the cracked-glass split + tally callback, the shatter
and shards, the reset room + the loop frame, typography, checks). You keep shot design, integration and the final
full-rate look. RESUME RULE: if re-sent, read `git status`/`git diff` first and continue; do not start over.

## Foundations, rules, measuring — shared
The sections "Approved foundations", "Burak's rules", "Typography and icons" and "Measure and look" of
`.claude/briefs/prod-part2.md` apply unchanged (read them first). Parts 1–3 (`video/src/living/part1..3/`) are the
references for quality and idiom; none of them may render differently after your work.
PARALLEL LANES: other parts may still be in progress. Do not edit `video/src/living/part1|part2|part3/*`,
`video/scripts/living-checks.mjs` (use it as it is; extra checks go in `video/src/living/part4/checks.ts`) or the shared
engine `video/src/living/*.ts(x)` — add helpers inside `part4/`. In `video/src/LivingRoot.tsx` add only your
`<Composition>` lines. You may reuse any finished drawing in `video/public/living/**` (do not change them).

LESSON FROM PART 3: at `--concurrency=4` Chrome occasionally captures one corrupted frame (the top-left third tiled 3x3),
at a different place each render; the same frame renders clean alone. After EVERY render run the jump scan and repair the
listed bad frames with `video/src/living/part3/repair.mjs` (use it, do not edit it; copy the logic into `part4/` if it
needs other arguments). Stamps may overlap bodies but never faces or captions.

## Range and compositions
Two compositions so the long part can be rendered and fixed in halves; one timeline in SONG frames
(`video/src/living/part4/events.json`):
- `Part4a` SONG frames 4676–6396: solo, stripped final chorus, full final chorus, outro lyrics. 4676 = downbeats[83]
  = 155.881 s, a deliberate HARD CUT (part 3 ends on him looking up in the bus; you start with the doors).
- `Part4b` SONG frames 6396–7223 (end of song, 240.76 s): 6396 = downbeats[114] = 213.208 s, the shatter, a deliberate
  HARD CUT; coda, the white reset, the loop frame.
- LOOP: the very last frame must equal Part 1's frame 468 (the hand-over: his cream screen with the cursor, before the
  pull-back). Render that frame from Part1 and measure mean-abs-diff against your last frame (target grain-level).

## What happens (verify against `data/timing.json`; lyrics `sarki/sozler.md`; the map's rows 12–17 and "Bir daha" section)
### Scene 12 · Guitar solo, 4676–5178
- 4676: the bus doors slide apart on the +9 dB jump (the doors are the wipe); he jumps out.
- 4676–4900 (bars 84–87): the run. RUNNING IS NOT ANIMATED (no run cycle): a time-slice — on each beat a new drawn run
  pose at a new place along the night street, the camera tracking smoothly; close inserts on the beats (a foot in a
  puddle, his fist with the note, his panting face) like a motion-design edit. On each downbeat the whole frame flips
  navy ↔ cream for a few frames (PlateShift, 1st of 2: out of register) and leaves ONE crack line across the WHOLE frame
  (cracks accumulate, code-drawn, print texture). She appears for one frame in each flip, running beside him. The vocal
  tail "Seni buraya o getirdi" ends ~157.9 s.
- 4900 (downbeats[87] = 163.32 s): InkBleed (2nd of 2) from the left edge — a navy ink tsunami (`stil/tur4/03-lacivert-sel.png`,
  `03b`); notes ride the crest; she is lifted by the wave, the part of her inside the navy inverts. Biggest image before
  the coda.
- 5122 (downbeats[91] = 170.748 s): the navy drains out through the cracks: he is home at the cracked glass, panting,
  palm on it, sweat drops (icon).
- 5178 (downbeats[92] = 172.603 s): camera move through the cracked glass into her cream side.
### Scene 13 · Final chorus, stripped, 5178–5401 (female, quiet; `stil/tur4/02b-model-yukseltme-zirve.png`)
- Only his palm at the frame edge on the cracked glass (navy sliver); full cream, she stands.
- On the four strongest hits she comes apart and re-forms: hits at song frames 5275, 5303, 5317 (177.24 s, the strongest
  hit of the whole song), 5331 → v4, v5, v6, v7 (PlateShift 2nd of 2; the version tag as in part 2's v2/v3).
- "Ay dolar, ay küçülür, ben hep aynı kalırım" (177.36–180.2 s): the last version settles into EXACTLY v1's pose and spot
  (silhouette match); the half moon at the seam steps through phases.
- 5401 (downbeats[96] = 180.017 s): her last re-forming scatters into yellow pixels that fall in a vertical line — the PEN
  draws the glass seam with them (PEN transition).
### Scene 14 · Final chorus, full, 5401–6176 (the cracked split)
- 180.96–188.3 s: both press the same spot on the cracked glass; moon phases on the beats.
- 188.3–195.6 s (the heard repeat): DAYS MONTAGE IN PLACE (same camera) — the part-2 "bir daha" vocabulary returns on the
  split: one SqueegeePrint pull per day (1st of 2), his notes and mugs pile up, his posture slumps, the TALLY WALL returns
  on his side and fills; her side flashes white every day and is empty again.
- 195.64 s "Yarın yine merhaba de" (MERHABA): the montage stops dead on one morning; he lifts his head.
- 197.36 s "Sen yine anlatırsın" (ANLATIRSIN): he picks up the notebook (reuse Part 1's notebook drawing) and opens it to
  page one; she waits, rocking on her heels (small life).
- 199.4–204.0 s "Her sabah baştan, bir daha, bir daha" (BİR DAHA): both palms on the glass; the glass trembles; the moon
  halves align. On each sung "daha" (202.16, 203.06, 203.98 s) a tally mark appears on his wall — and on the last one a
  mark appears on HER side too: the first day she keeps. The loop breaks. Hold it (do not explain it).
### Scene 15 · Outro lyrics, 6176–6396
- The glass trembles harder; the moon halves align; the "Merhaba" bubble appears ON the glass at 211.06 s (song frame 6332).
- 6396: SHATTER — the deliberate hard cut (starts Part4b).
### Scenes 16–17 · Coda and fade, 6396–7223 (`stil/tur3/05-final.png`)
- 6396–6837 (bars 115–122, the loudest, wordless): the glass shatters — shards as real Three.js geometry with our print
  textures inside the ONE canvas (code's strength: depth, parallax, light on the edges); the moon is whole for the first
  time; they cross into each other's worlds (drawn poses, cuts on downbeats, the camera through the shards). The recap
  walk through the film's places is NOT in scope (Decision 5).
- 6837 (downbeats[122] = 227.895 s): SqueegeePrint in white (2nd of 2): the last new day, the reset.
- The white reset room, the cursor; "Merhaba." at 235.56 s (song frame 7067); he opens the notebook; the camera pushes
  into the screen and the last frame equals Part 1's frame 468 (see LOOP). Fade the music naturally (it is the song's own).

## Drawings
Reuse > new (`video/public/living/**`). Expect roughly: run poses ×3–4 + close inserts (foot, fist, face), bus doors
plate, night street plate, panting at the glass, her lifted by the wave, her running (one-frame flips), palm at the edge,
both palms on the glass (both sides), lifting his head, crossing poses for the coda (one each), the white reset room. Same
Codex method and verification as part 2 (`stil/canli/README-p2.md`); files `stil/canli/` + `video/public/living/p4/`,
list `video/src/living/sprites-p4.json`, `stil/canli/README-p4.md`.

## Deliverable and report
`video/out/part4a-v1.mp4`, `video/out/part4b-v1.mp4` (`npx remotion render src/living-index.ts Part4a out/part4a-v1.mp4
--concurrency=4 --crf 23`, same for Part4b), checks and full-rate sheets in `video/out/part4-checks/`, the loop-frame
measurement. Report in Turkish, plain language, short: what each scene shows line by line, drawings reused vs new,
measurements with numbers, honest weak spots, deviations and why.
