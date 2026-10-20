# NERFED — typography layer (key words + location titles)

Director's note (Burak, 20 Oct 2026): "there is almost no text on screen". Decision: **key words and
location changes only**, no karaoke. The punch lyrics slam onto the screen; each location change gets one
short chapter card. The screen must not be crowded: one typographic element at a time, never on top of
an existing caption, the boss HUD bar or Vorathul's helm.

Code: `video/src/film/typography/` (schedule `schedule.ts`, components `Slam.tsx`, `Headline.tsx`,
`ChapterCard.tsx`, mounted once by `TypeLayer.tsx` in `src/film/Film.tsx`, above the shot). Every in-frame is
a measured anchor (`anchors.ts` helpers); the events join `src/events.ts`, so `tools/beatcheck.mjs` checks
them. Every duration is written in **seconds** and converted with the composition fps at render time.

## What is not added (already on screen)

| Text | Where it already is | Decision |
|---|---|---|
| NERFED #0, #1, #2, #3, #4 (f3027, f3179, f4541, f4696, f6701) | blue `RubberStamp` NERFED in S46, S48, S68, S70 (HUD), S91 (frame bar) | no slam |
| PHASE II, PHASE III, METEOR RAIN | p1 `Caption` boxes (S22, S25), p2 S38 caption, p5 choir | no slam |
| VORATHUL · THE FINAL BOSS | `BossNameplate` at S101 | no slam |
| VO-RA-THUL #1 (f364) | S04 helm close-up fills the centre | skipped: any placement covers the helm |
| "with a shoe" (f3576) | S53 sole + burst fill the frame | skipped |
| VO-RA-THUL #5 (f7949, the loudest bar) | S112 close shot: he fills the frame | skipped: no free area; the climax belongs to the picture |

The patch headings exist only as small window titles (S32 "Patch 2.3", S62 "PATCH 2.4", S105 "Patch 2.5",
about 30 px). The big release-note headline below is the readable version of the same words; it never sits
on top of those windows.

## Slams

Times are measured word starts (`data/timing.json`), frames at 30 fps. "Peak" = in-frame + 0.17 s (end of the
overshoot; + 0.3 s for the three-syllable VO-RA-THUL!), the frame the contact sheet
(`video/out/typography-contact.jpg`) shows. Sizes are Anton font size in px (cap height = 0.859 x size).

| id | Lyric (anchor) | Time / frame | Shot | World / style | Text, size | Position rule |
|---|---|---|---|---|---|---|
| ty-intro | "Vo-ra-thul!" (`VORASOL#0`) | 3.46 s / f104 | S02 nave | painting, comic | VO-RA-THUL!, 210, violet burst | top centre, cap centre y 200: above his horns (y >= 385), between the gallery pillars; out before the S03 cut (f227) |
| ty-patch-23 | "two point three" (`two point three#0`) | 80.12 s / f2404 | S32 office wide | office, release-note headline | PATCH 2.3 (Plex Mono 120) + RELEASE NOTES · BALANCE TEAM | lower third, left of the standing dev (x <= 1120), below the painting frame; clear of the Updater window and the Patch 2.3 window (top right) |
| ty-unfair | "UNFAIR" scream (`UNFAIR#1`) | 98.76 s / f2963 | S45 | painting, comic | UNFAIR?!, 128, violet burst | the camera pushes into the helm (measured on f2968: helm and horns x 540-1380, HUD and HP bar y < 380), so it sits lower right (x 1387-1867, y 662-816); out before the chorus cut f3000 |
| ty-patch-24 | "two" (`two#1`) | 138.10 s / f4143 | S62 office | office headline | PATCH 2.4 | lower third, right (x >= 1000): the dev with the bottle stands at x 610-830; lands on "two" because it must be gone before the S63 cut (f4183), whose timeline fills the lower right |
| ty-theme-my / -theme / -song | "My" "theme" "song" (`My#5`, `theme#1`, `song#1`) | 147.58 / 148.10 / 148.82 s, f4427 / f4443 / f4465 | S67 | painting, comic, one word per measured word | MY 180, THEME 190, SONG?! 200 (violet burst on SONG) | left column x 60-600: his wings end at x 600; THEME stays above the volume slider cut-in (slider top y 420) |
| ty-nerfed-burst | "Nerf(ed)" (`Nerf#5`) | 228.50 s / f6855 | S93 | painting (still inside the frame), comic | NERFED!, 220, ivory burst | top right inside the painting (x >= 1170), clear of the dev (left) and his helm; **crumbles on `burst#0` (f6902)**, the frame breaking |
| ty-patch-25 | "five" (`five#0`) | 246.03 s / f7381 | S106 monitor | office headline | PATCH 2.5 | lower third left, under the monitor bezel, clear of the Revert dialog (centre) |
| ty-choir-1 | "VO-RA-THUL!" (`Vorathul#2`) | 248.48 s / f7454 | S108 office ruins | his world spreading: comic | VO-RA-THUL!, 150, violet burst | upper right (x >= 1110, y <= 300): the violet blast and the sword are upper left/centre |
| ty-choir-4 | "VO-RA-THUL!" (`Vorathul#4`) | 257.50 s / f7725 | S110 | comic | VO-RA-THUL!, 165, violet burst | lower left floor (x 102-946, y 774-996): the ink pool is centre, his figure top centre-right; out before the S111 cut (f7753) |

## Location titles (chapter cards)

One per location change, all at the same place (bottom right, 60 px from the right and bottom edge) so the
viewer learns where to look: the HUD bar is at the top, the PHASE / METEOR captions are top left and top right,
the VORATHUL plate is bottom left.

| id | Change | Anchor / frame | Kicker / title | Style |
|---|---|---|---|---|
| ty-loc-loft | nave → organ loft | beat 123 / f1197 (S17) | HIS HOME / THE ORGAN LOFT | comic narration box (ivory, ink border, Anton) |
| ty-loc-roof | → rooftop | hit 37 / f1777 (S25) | OPEN SKY / THE ROOFTOP | comic box; PHASE III lands top left the same frame |
| ty-loc-throne | → throne room | beat 308 / f3000 (S46) | AFTER THE PATCH / THE THRONE ROOM | comic box; **knocked out by the NERFED stamp** (`Nerf#0`, f3027) |
| ty-loc-hall | → drained cathedral | beat 526 / f5140 (S74) | LATER / THE EMPTY CATHEDRAL | comic box, **soft** grammar (interlude: fade and drift, no slam) |
| ty-loc-office | → office (breakout) | `Restore#0` / f6991 (S96, first full shot of him standing in the office) | LOCATION / THE REAL WORLD | office card (white, grey line, Plex Mono kicker, Inter 800 title, blue bar); 1.0 s, gone before S98's monitor (f7039) |

## Motion grammar (seconds; frames = seconds x fps)

**Comic slam** (painting): in 0.10 s, scale 2.2 → 0.9, rotation (rot + 9°) → rot, each syllable group
(split on "-") 0.067 s after the previous; overshoot 0.9 → 1.0 over the next 0.07 s. On the landing frame an
ink splash (`vfx/InkSplash`, seeded) and a jagged burst grow behind the word. Hold: a 2 px seeded jitter on
twos (every 1/15 s). Out: **crumble** 0.27 s, each letter drops up to 180 px, turns up to ±28° and fades,
the burst shrinks. Lettering: Anton, ivory fill, ink outline (stroke drawn under the fill), halftone ink
shadow offset (+0.05, +0.06) x size.

**Office headline**: in 0.13 s, slide up 24 px and scale 0.94 → 1.015 → 1; a 6 px UI-blue bar sweeps under the
heading in 0.2 s. Out: **wipe** 0.2 s left to right (clip). No ink in the office.

**Chapter card**: comic box slams like a small slam (0.10 s, scale 1.5 → 1, no burst), holds, crumbles out;
the soft variant fades in 0.5 s while drifting 16 px, fades out 0.6 s. The office card uses the headline
grammar.

Hold lengths (seconds) are in `schedule.ts`; every slam is gone before the next shot cut that would put it
over a different picture, except the office headlines and cards, which behave like broadcast lower thirds.

## Flash budget

No slam is a flash: `schedule.ts` throws if any element's rotated bounding box (burst and splash included)
covers more than **22 %** of the frame, below the 25 % area rule of `tools/flashcheck.py`, so no swing is added
to any part budget. Verified with flashcheck on a render of the busiest 20 s window (see the lane report).
