# Brief: production part 2 — song 0:56.86–1:51.6 (scene map v2 scenes 5–8) in the living-illustration language

Repo ~\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. You are the designer and integrator. Burak wants speed AND quality ("bu kalitede devam et"):
run independent tracks in parallel through `sonnet` helpers (they may spawn their own `sonnet` helpers), each with a
narrow brief and its own files: e.g. drawings A (human), drawings B (AI + props), the "bir daha" accumulation painter
(tally marks, mug tower, notes, sun/moon), the verse-2 path/knot/come-apart/redraw painter, the torch beam + icons,
typography, checks. You keep shot design, integration and the final full-rate look. RESUME RULE: if re-sent, read
`git status`/`git diff` first and continue; do not start over.

## Approved foundations (do not re-decide)
- Part 1 (song 0:00–0:58) is APPROVED by Burak ("perfecto, en sevdiğim yer kitap kısmı") and committed (cf609aa, 2411970).
  Its code `video/src/living/part1/*` is your reference for quality, structure and idiom. Do NOT change how Part 1 renders
  (if you touch the shared engine `video/src/living/*.ts(x)`, prove Part 1 is unchanged: render 6 stills of Part1 across
  its range before/after and compare md5 or mean-abs-diff = 0).
- Scene map v2 is the source of truth: `.claude/briefs/sahne-haritasi-v2.md` — read its scene table, rows 5–8 of "Line by
  line", "Emotion icons", "Decisions", "Transition plan" (#6–#11) and the "'Bir daha' sequence" section (it SUPERSEDES the
  first half of scene 6). Old `sahne-haritasi.md` (repo root): its typography rules and its chorus-1 line moments still
  apply (waves per bar, the moon advances a phase, BİLİYORUM left / BİLMİYORUM right / BURADAYIZ straddling the seam).
- Lyrics text: `sarki/sozler.md` (Whisper mishears: at 66.2 s the female line is "Bilmiyorum", not "biliyorum").
  Times: `data/timing.json` — index beats[]/downbeats[] (beat = 0.4693 s); lyric events snap to the nearest beat.
- Living illustration (approved method): big body actions are NOT animated. Each beat is a complete drawn pose; poses
  change by print transitions, beat cuts, cuts on action, shape match cuts or camera reframes. Inside a pose only small
  life (breath, slight head tilt, hair/notes stir, steam, blink). The multiplane Three.js camera and the world carry the
  motion. The PEN draws/erases/redraws the AI. Engine `video/src/living/*`, `stil/canli/README*.md`.
- Locked print transitions (`video/src/transitions/`): HalftoneBloom, InkBleed, PaperFold (WebGL), SqueegeePrint,
  PlateShift. Do not change their look; timing/origin/direction are yours (see Part 1's `bloomP` lesson: stretch the fast
  middle of a transition so it never jumps frame to frame).
- Three.js: ONE WebGL canvas per frame; during a WebGL transition both sides reach it as 2D painters (as Part 1 does);
  no postprocessing; no `useFrame`; textures loaded before render.
- Frame purity (no Math.random/Date.now/new Date/performance.now/requestAnimationFrame/setTimeout/setInterval/useFrame in
  `video/src`), seeded noise; no new npm dependencies.
- Palette #18203A navy / #F0D35A moon yellow / #F3EFE4 cream; #C9D94A ONLY for the lamps; red ONLY for emotion icons
  (small, sparing — the anger vein is one).

## Burak's rules (each one came from a defect he caught; a careful viewer's defect is a defect)
1. One perspective per set. A side-view room has a side-view desk; never a 3/4 desk in a side-view room ("masa havada").
   Every pose drawn for a set must match that set's camera.
2. Turns are whole-body. The head never turns more than ~30° away from the torso; a look-back is a new full-body pose.
3. Physical grips: a mug is held by its handle (or wrapped in both hands), the rim at the lips; a torch is held by its
   body with the beam leaving its lens; a note is held at its edge. Hands touch what they hold.
4. No limbs stretching, doubling or bending wrongly — no morphing between drawings, no big rig moves (a small rig rotation
   ≤ 30–45° of a forearm/lower leg from `stil/kukla/` is allowed, with overshoot and settle as in Part 1's wave).
5. Redo only what is weak; keep what works.
6. Calm pacing except where the music asks (the "bir daha" acceleration is the one place to be fast).
Part-1 lessons also kept: icons at 2× the first size; lyric captions at the Part-1 size (1.4×), one line at a time, clear
of faces; pinned notes in a grid, not a ring; a falling object lands with a small bounce; no line shimmer on scaled
drawings (use the Part-1 texture settings); the first 1.5 s of a shot must not be dead (start camera moves with the cut).

## Range, seam and composition
- Composition `Part2` in `video/src/LivingRoot.tsx` / `src/living-index.ts`; code in `video/src/living/part2/`.
  It covers SONG frames 1706–3375 (30 fps; 1706 = downbeats[30] = 56.855 s, the InkBleed landing on the chorus split).
  Composition frame 0 = song frame 1706; audio offset accordingly. Keep events in song frames (like Part 1's
  `events.json`) so the checks and the later master assembly read one timeline.
- SEAM: Part 1's last frames (1706–1739) show `chorusShot` (h-mug2 + ai-stand, `chorusCam`). Part 2's first 34 frames
  must match them: measure mean-abs-diff of `video/out/part1-v2.mp4` frames 1706–1739 vs Part 2's same song frames
  (target ≈ grain-level, no visible jump). Import/reuse Part 1's set builders rather than copying them, if practical.
- End: the torch clicks off on downbeats[59] = song frame 3333 (111.116 s); its light circle shrinks to a small dot and
  the frame is black from ~3340; "İkimize yeter mi bu?" stays as the caption over black until the line ends (~112.2 s).
  Part 3 will re-open that dot as the morning sun (shape match), so the dot's screen position/size at 3340 must be
  written into `video/src/living/part2/events.json` as the hand-over.

## What happens (frames = song frames; snap to beats; verify each against `data/timing.json`)
### Scene 5 · Chorus 1, 1706–2155 (KEEP the approved idea; make it in this language)
- One white wave per bar wipes her side and she is blank again; the split moon advances a phase per bar; his side keeps
  accumulating. "Ay dolar, ay küçülür, ben hep aynı kalırım" is literal: the moon.
- Poses: he moves from the mug pose (Part 1's hand-over) to the glass (cut on action, not walked); she sits on the cream
  floor swinging her legs (a drawn sitting pose + a small lower-leg rig swing, or 3 drawn phases — no 2-pose flicker).
- Stamps: BİLİYORUM left (1953 ≈ 65.18 s), BİLMİYORUM right (≈ 66.2 s, reversed colours), BURADAYIZ straddling the seam
  (≈ 67.86 s) — both figures face the glass on "buradayız".
- Transition #7 at 2155 (downbeats[38] = 71.84 s): the last white wave does not retreat — it fills the frame white and that
  white IS his monitor's reset flash in the side-view desk set of the days sequence (shape match on the white). No effect.

### Scene 6 · "Bir daha", 2155–2660 — the strongest moment; read the map section twice
- Set: the side-view desk room (Part 1's v2 side-view desk `video/public/living/p1/desk2.png` and its perspective; style
  frame `stil/tur4/04-*`). His monitor faces him; her identical "Merhaba" bubble/wave is ON his monitor (her world
  inside his screen) — or, if the composition reads better, a strip of her cream side at the frame edge; your call, but
  her part must be pixel-identical on every cut.
- One continuous slow camera push-in toward him from 2155 to 2604. The CONTENT cuts; the camera never jumps.
- Cuts on every sung "daha": song s 71.80, 72.72, 73.70, 74.64, 75.54, 79.28, 80.26, 81.16 (frames 2154, 2182, 2211,
  2239, 2266, 2378, 2408, 2435 — snap to beats). Between 75.54 and 79.28 and after 81.16 keep the rhythm going: cuts on
  every beat, then every half beat through the last bar before the stop.
- Burak's routine (his own idea: "kod yazsın, gitsin kahve alsın, gerilsin"): each day-cut shows ONE pose of the routine,
  cycling — typing / at the coffee machine with the mug (handle grip!) / stretching with his back arched / typing — so the
  routine reads THROUGH the cuts. Day 1 (2155–2211) shows the full routine as 3–4 poses on beats at real speed.
- Accumulation per cut: more yellow notes on his body; mugs stacking into a tower on the desk; the window flips sun ↔
  moon; his posture sinks a little (3 sinking levels of the typing pose are enough); TALLY MARKS on his wall — one
  hand-drawn, print-textured stroke per day (four upright, the fifth across), in the acceleration the wall fills to an
  uncountable grey mass. Tally marks, mugs, notes, sun/moon are code-painted (deterministic, seeded jitter) — that is
  where code is strong.
- DEAD STOP on downbeats[46] = song frame 2604 (86.807 s; the energy drops here — the map labels this "bar 46", the
  seconds are right). The montage freezes on one frame for one beat. Then, one drawn pose per beat in the split (his side,
  cut on the beats): asleep sitting against the glass, "zzz" (2618–2632), wakes with a start "!" (2632–2646), presses his
  own yellow "Merhaba" note on the glass before she speaks (2646–2660); she tilts her head (existing AI pose).
- Transition #9 at 2660 (downbeats[47] = 88.677 s): push into the note until yellow fills the frame for one beat; PaperFold
  (1st of 2 in the clip) — the note peels/folds open and its ruled lines become her path.

### Scenes 7–8 · Verse 2, 2660–3333 (female; then pre-chorus 2, male)
- 2660–3053 full cream (style frame `stil/tur4/02-model-yukseltme.png`). "Yazılı duruyor hepsi, satır satır önümde" (SATIR):
  the path ahead of her is made of handwriting lines laid down one by one. WALKING IS NOT ANIMATED: she is small in a wide
  frame and moves along the path by beat cuts (a different stride drawing per beat at a new place, the camera tracks
  smoothly) — a time-slice, not a walk cycle.
- "Yine aynı hatayı yapıyorum gece yarısında" (AYNI HATA, 93.62–96.6 s): the crescent appears; she trips on the same
  scribbled knot (a drawn trip pose); her body comes apart into horizontal slices + yellow pixels (code), the PEN redraws
  her as the next version (v2) — nearly identical, slightly cleaner lines, a small printed version tag changes (Decision 4)
  — she is on the path again; on "gece yarısında" the same knot, the same trip → v3. "Model değişiyor ama akış değişmiyor."
- "Tamam diyorum, bitti diyorum, ışıklar yeşil yanıyor" (BİTTİ, 97.0–100.9 s): a row of boxes; she taps each lid, one
  #C9D94A lamp lights per beat; thumbs-up pose.
- Transition #10 at 3053 (downbeats[54] = 101.769 s): pull back through the glass — the back of his head enters the
  foreground (over-the-shoulder, `stil/tur4/06-*`): the cream world was behind the glass all along. No effect.
- "Sen bakınca görüyorsun, hiçbir şey ölçülmemiş" (ÖLÇÜLMEMİŞ): he looks into the boxes — empty; she is still proud.
  Red anger vein pops on his head on "ölçülmemiş" (≈ 103.86 s).
- "Kızmıyorum, öğrendim artık" (105.16 s): long exhale; the vein deflates and disappears (code, over ~1 s); he sits calmly
  (a cut to a sitting pose). She lowers her thumb, tilts.
- "Güveniyorum ama bakıyorum" (BAKIYORUM, 107.1 s): he clicks a torch on; the beam (code: a halftone cone of moon yellow)
  goes through the glass onto her boxes; she squints in it.
- "Sen unutursun, ben hatırlarım" (HATIRLARIM, 108.58 s): the beam swings back onto his own wall of notes.
- "İkimize yeter mi bu?" (YETER Mİ, 110.7 s): he holds the torch; click off on 3333 (see End above).

## Drawings
- Reuse every existing pose that fits (`video/public/living/`, `video/public/living/p1/`, sprite lists
  `video/src/living/sprites*.json`); new ones only where the scene needs them. Expect roughly: side-view desk poses
  (typing ×3 sinking levels, at the coffee machine with mug, stretching arched), at the glass (asleep sitting, waking
  "!", pressing a note), over-the-shoulder back-of-head plate, sitting calm, holding a torch (on, swinging), the AI
  sitting with legs to swing, stride poses ×3–4, trip, tapping a box lid, thumbs-up, squinting, the cream path set, boxes,
  the coffee machine prop. Decide the final list yourself; reuse > new.
- Codex image_gen, model gpt-6.1-sol, `-i` canonical refs (`stil/hareket/ref-insan-kanonik.png`, `stil/hareket/ref-ai.png`
  and the Part-1 drawings of the same set for perspective), flat magenta #FF00FF background, ONE image per `codex exec`,
  several in parallel (Codex quota is free; only its 5-hour window can fill — if it does, report and continue with what
  exists). Take files from `~/.codex/generated_images/<session>`; verify md5 and by looking; transparent cut-outs;
  same-person boards against the refs AND against Part 1's drawings; prompts in `stil/canli/prompts/`, files in
  `stil/canli/`, prep script like `stil/canli/prep_p1v2.py`, sprites in `video/public/living/p2/`, list
  `video/src/living/sprites-p2.json`, a `stil/canli/README-p2.md`.
- In every pose prompt write the set's camera (side view / over-the-shoulder / wide cream) and rules 1–3 above.

## Typography and icons
- Reuse Part 1's type (`video/src/living/part1/Part1Type.tsx`, `typeLayout.ts`, `video/src/type/*`): captions by singer
  side (male left cream-on-navy, female right navy-on-cream, both on the seam), the stamped KEY word per line, one caption
  line at a time, never over a face. "Bir daha" lines: caption small; the tally marks are the real counter.
- Icons per the map (zzz, "!", anger vein → deflate) via `video/src/living/icons.ts`, 2× size.

## Measure and look (before you report)
- Render `video/out/part2-v1.mp4` (`npx remotion render src/living-index.ts Part2 out/part2-v1.mp4 --concurrency=4 --crf 23`).
- `node video/scripts/living-checks.mjs` extended to Part 2 (`--events --span --checks-module`): beat landings 0 drift,
  single-frame scan, 0 black frames except the deliberate end beat, caption overlap 0, stamps clear of characters, tsc,
  purity grep. Known tool limit: a LISTED deliberate cut made during a camera move can fall under the jump threshold and
  the tool then reports FAIL (Part 1 had 9 such). Fix the tool so a listed cut below the threshold is reported as
  "listed cut, soft (below threshold)" — without loosening the detection of UNLISTED spikes — so the overall result is an
  honest PASS/FAIL. Show Part 1 still gives its old per-item numbers.
- Seam measurement (see Range).
- Full-rate frame-exact sheets (`ffmpeg select='between(n\,A\,B)'`, never `-ss`, no drawtext — it crashes here) of every
  pose change, transition, the whole "bir daha" acceleration and stop, the come-apart/redraw, the torch, in
  `video/out/part2-checks/`. Look at them yourself at full size: limbs, grips, perspective, faces, text.
- Gemini is run by the architect; you don't need to.

## Report (Turkish, plain language, short)
What each scene shows line by line, the drawings made (reused vs new), the measurements with numbers, the seam number,
honest weak spots, and anything you decided differently from this brief and why.
