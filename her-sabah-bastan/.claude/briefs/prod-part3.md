# Brief: production part 3 — song 1:51.3–2:35.88 (scene map v2 scenes 9–11) in the living-illustration language

Repo ~\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. You are the designer and integrator; run independent tracks in parallel through `sonnet`
helpers (they may spawn their own `sonnet` helpers), each with a narrow brief and its own files (drawings A/B, the street
and window painters, the paper city + line-rain + counter, the bus window: rain, fog, heart, light streaks, typography,
checks). You keep shot design, integration and the final full-rate look. RESUME RULE: if re-sent, read
`git status`/`git diff` first and continue; do not start over.

## Foundations, rules, measuring — shared with part 2
The sections "Approved foundations", "Burak's rules", "Typography and icons" and "Measure and look" of
`.claude/briefs/prod-part2.md` apply unchanged (read them first). Parts 1 and 2 are approved/committed references for
quality and idiom (`video/src/living/part1/`, `video/src/living/part2/`); neither may render differently after your
work (if you touch the shared engine, prove it with before/after stills).
PARALLEL LANE: part 2 is being built at the same time by another lane. Do not edit `video/src/living/part2/*`,
`video/scripts/living-checks.mjs` (part 2 owns it; use it as it is when it is ready, or put your extra checks in
`video/src/living/part3/checks.ts`) or the shared engine `video/src/living/*.ts(x)` — add helpers inside `part3/`.
In `video/src/LivingRoot.tsx` add only your `<Composition id="Part3">` line and keep the other lines intact. If part 2's
drawings (`video/public/living/p2/`) appear while you work you may reuse them; do not change them.

## Range, seam and composition
- Composition `Part3` in `video/src/LivingRoot.tsx`; code `video/src/living/part3/`; events in SONG frames.
  It covers SONG frames 3340–4676 (3340 = the black after the torch clicks off; 4676 = downbeats[83] = 155.881 s, the
  deliberate hard cut where the bus doors part — part 4 owns the doors).
- SEAM IN: part 2 ends in black with a small torch dot; its screen position and size are the hand-over in
  `video/src/living/part2/events.json`, fixed by the architect: at song frame 3340 one moon-yellow (#F0D35A) dot,
  centre (960, 470) px, radius 10 px, on navy-black; from 3341 on the same dot on black. Your frame 3340 must be exactly
  that (draw it yourself; do not import part 2 code). "İkimize yeter mi bu?" is still captioned over
  black until ~112.2 s; your first frames must continue that caption exactly as part 2 draws it.
- Transition #11 (scene map "Transition plan"): one black beat, then the dot re-opens as an iris: the torch circle becomes
  the morning SUN over the street (shape match). The iris is fully open by downbeats[60] = song frame 3390 (112.984 s)
  where "Her sabah baştan" starts (112.16 s is the pickup; snap so the sun is there when "baştan" lands).

## What happens (verify every time against `data/timing.json`; lyrics text `sarki/sozler.md`)
### Scene 9 · Chorus 2 — the day street, 3348–3894 (cream sky, navy city; Decision 2: three shots only)
Style frames `stil/tur4/09-sokak-vitrin.png`, `10-kafe-avuc.png`, `G4-fener-gunes.png`, `G5-sokak-katlanma.png`.
- Shot 1, walking past shop windows ("Her sabah baştan, her sabah ilk gün", BAŞTAN, 112.16–115.9 s): WALKING IS NOT
  ANIMATED. Frame him chest-up in profile (legs out of frame), mug in hand (handle grip), a gentle upper-body bob as small
  life; the camera tracks with him and the street's layers slide by in parallax (that sells the walk). In each shop window
  she walks beside him as a cream reflection (same framing, same bob).
- Shot 2, the TV-shop window ("Ay dolar, ay küçülür, ben hep aynı kalırım", AY, 115.9–119.4 s): a wall of screens, each
  shows her, identical; the moon phase steps across the screens one per beat. "I always stay the same" = identical copies.
- Shot 3, the café window (BİLİYORUM 119.46 left; BİLMİYORUM ~120.4 right, her reflection tilts its head; BURADAYIZ
  122.08 on the seam = the glass): he stops, palm flat on the café glass; her palm meets his from inside; for one beat the
  hands invert colours (the approved crossing hint).
- "Her sabah baştan, bir daha, bir daha" (123.44–127.9 s): he stays at the café window; the chorus waves (our motif) roll
  down the street one per bar wiping her reflections clean; on each sung "daha" (126.04, 127.0, 127.9 s) the window
  content cuts in the same rhythm as the part-2 "bir daha" montage (a call-back: her reflection resets to the identical
  "Merhaba" pose, his side gains a note). Keep it short; it is an echo, not a second montage.
- Transition #12 at downbeats[69] = song frame 3894 (129.792 s): PaperFold (2nd and last in the clip) — the street's
  buildings fold flat like paper and land as the paper city on his desk.

### Scene 10 · Bridge, male, loud, 3894–4341 (his side of the split; `stil/tur3/03b`, `03c`, `stil/tur4/15-kagit-sehir-masa.png`)
- "Aylarca birlikte kurduk" (KURDUK, 129.68–131.9 s): he leans over the finished paper city on his desk — it IS the street
  he just walked through, folded; she adds a last tower from her side of the glass.
- "Bir sabah sildik hepsini" (SİLDİK, 133.16–135.3 s): he freezes; the wall of notes starts to pour down as line-rain —
  lines of handwriting/text falling (code typography: our strength).
- "On yedi bin satır, tek bir tık" (TEK BİR TIK, 136.08–139.58 s): a counter runs up to 17.703 in our stamp type; on the
  click (snap to the beat nearest 139.58 s) a big "!" over him, hands to his head (a drawn pose).
- "Yedek bir dalda, bir yerde" (YEDEK, 140.2–142.9 s): the paper city collapses; he kneels by one small box labelled
  "yedek" (03c). Quiet hope.
- Transition #13 at downbeats[77] = song frame 4341 (144.709 s; energy drops −6.9 dB): shape match — the line-rain becomes
  real rain; tilt up to his window, rain streaks on glass, and through it: the glass is a bus window at night.
  Paper city: a code-built city is welcome if it keeps the printed look (Three.js boxes with our paper/halftone textures
  inside the ONE canvas), otherwise drawn plates on depth layers; it must be able to fold in (#12) and collapse.

### Scene 11 · Bridge, female, the quietest part, 4341–4676 — night bus (`stil/tur4/01-otobus-yansima.png`, `G6-yagmur-otobus.png`, `stil/tur3/04-teselli.png`)
Medium shot, characters big. He sits by the window the whole time (one held pose with breathing and small head moves; at
most one or two pose cuts); she is a cream reflection in the window glass, back to back with his reflection. City light
streaks pass outside (code). Fewer events, long eased holds: calm must feel calm.
- "Ben hatırlamam zaten" (143.66–146.9 s): temple against the window; she fades into the reflection.
- "Sen de unutmaya çalış" (UNUTMAYA, 147.7–150.3 s): his breath fogs the glass (code); she turns a notebook page in the
  reflection.
- "Boşuna değildi, inan" (BOŞUNA DEĞİLDİ, 151.4–154.0 s): the PEN motif — her fingertip draws a small heart in the fog
  (the stroke draws itself like the pen in parts 1–2); the small heart is the emotion icon here.
- "Seni buraya o getirdi" (154.88– s): she reaches through the window and leaves a yellow note on his side; her arm turns
  navy past the glass (approved crossing); he reads it and looks up: the bus is at his stop. The line runs past 155.88 s
  into part 4; end on his look up — part 4 opens with the doors on the hard cut.

## Drawings
Reuse > new (`video/public/living/`, `p1/`, `p2/`). Expect roughly: chest-up profile walking with mug (2–3 bob phases
drawn or one pose + code bob), the same as a cream reflection of her, palm on glass (both), the TV-shop screen copies
(reuse her existing pose), leaning over the desk, frozen, hands to head, kneeling by the box, sitting in a bus seat with
temple on the window, her back-to-back reflection pose, her reading in reflection, reaching through. Street, TV shop,
café, desk, bus interior plates. Same Codex method and verification as part 2 (`stil/canli/README-p2.md`), files
`stil/canli/` + `video/public/living/p3/`, list `video/src/living/sprites-p3.json`, `stil/canli/README-p3.md`.

## Deliverable and report
`video/out/part3-v1.mp4` (`npx remotion render src/living-index.ts Part3 out/part3-v1.mp4 --concurrency=4 --crf 23`),
checks and full-rate sheets in `video/out/part3-checks/`, seam measurement vs part 2. Report in Turkish, plain language,
short: what each scene shows line by line, drawings reused vs new, measurements with numbers, honest weak spots,
deviations from this brief and why.
