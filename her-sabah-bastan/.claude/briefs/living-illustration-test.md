# Brief: "living illustration" test — full drawn poses, small life, camera and print transitions

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. Sub-agents you spawn must be `sonnet`; work in parallel where tracks are independent
(e.g. one sonnet generates and verifies pose drawings with Codex while another builds the Remotion scene), you keep the
design and the final look. RESUME RULE: if re-sent, read `git status`/`git diff` first and continue.

## Why (the decision)
Three attempts to make the characters perform big body actions failed in Burak's eyes:
- morphing between drawings stretched and doubled limbs (`.claude/briefs/rig/burak-0[1-4]-*.png`);
- 3D Blender bodies lost the illustrated look;
- the 2D bone rig (`video/out/cutout-test-v1.mp4`) kept the look, but legs passed through the chair/desk, the
  cross-legged sit became balls, the walk bent oddly, the drink was stiff. Burak's bug frames are in
  `.claude/briefs/rig/cutout-bug-*.png`.
Diagnosis: human acting (sit, stand, walk, drink) is the hardest animation discipline and every error shows. The
Gamachine "PRESS START" video looked great because it was motion design: camera, shapes, typography, transitions and a
simple non-human mascot.
New approach (Burak approved): **living illustration**.
- Big body actions are NOT animated. Each beat is a complete, beautiful drawn pose (style-frame quality). Poses change
  through our approved print transitions (`video/src/transitions/`: HalftoneBloom, InkBleed, PaperFold, SqueegeePrint,
  PlateShift) or through hard cuts on the beat, shape match cuts, or a camera move that reframes.
- Inside a held pose there is small life only: breathing, a slight head tilt, hair and the notes stirring, steam from
  the mug, the moon, light, dust, and the AI's slit eye blinking.
- Motion comes mostly from the camera and the world: slow push-ins, drift and parallax between layers (background /
  room / character / foreground props / notes), and typography.
- Burak's own idea becomes a motif: an invisible PEN draws the AI line by line, erases, and redraws it ("her sabah
  baştan" — she is redrawn every morning).

## Goal
`video/out/living-test-v1.mp4` (1920x1080, 30 fps, about 15 s, song audio at the real times), using the song section
0:15.60–0:31 (verse 1 opening; scene map v2 scenes 2–3: `.claude/briefs/sahne-haritasi-v2.md` rows for "Sabah yine aynı
ekran" and "Merhaba yazıyorsun bana, sesin hiç yorulmuyor"). Its content:
1. A camera pulls back from his screen (the cursor) to the morning desk; he sits with coffee. A held pose with life: he
   breathes, steam rises, the sun disc rises in the window.
2. "Merhaba" types itself on his screen. Cut on the beat to a tired half-smile pose with the mug raised (a second
   drawn pose), then a slow sip, shown only by small life on the held pose.
3. Into the split world via the approved HalftoneBloom (G1, landing bar 14 downbeat 0:24.99).
4. On the cream side: the PEN draws the AI on (line drawing reveal → fill), she waves (2 drawn poses alternating on the
   beat or a small rig wave of the forearm only) and rocks on her heels (tiny, safe).
5. The human stands at the glass holding yesterday's note: one drawn pose, reached by a cut or a squeegee print, not walked.
Each beat lands on `data/timing.json` beats/downbeats (0 frames drift). Keep the pacing calm: one pose change roughly
every 2–4 s per character.

## Assets
- Pose drawings: Codex image_gen, model gpt-6.1-sol, `-i` the canonical reference (`stil/hareket/ref-insan-kanonik.png`,
  `stil/hareket/ref-ai.png`), flat magenta #FF00FF background, ONE image per `codex exec`, run several in parallel; take
  files from `~/.codex/generated_images/<session id from the log>` (never let Codex copy them); verify md5 and by looking.
  Make the character drawings TRANSPARENT cut-outs so they sit on our existing room plates (`video/public/plates/`,
  `stil/tur4/` frames for composition) and can drift on their own parallax layer. Make same-person boards against the
  references. Prompts go in `stil/canli/prompts/`, drawings in `stil/canli/`. Codex quota is not a concern.
- Existing pieces to reuse: room plates and the Remotion world (`video/src/world/Rooms.tsx`, `Story.tsx`),
  `video/src/transitions/*`, typography/stamps (`video/src/type/*`), the AI outline tracer `video/scripts/trace-ai-outline.py`
  (useful for the pen line), the cut-out parts in `stil/kukla/` (only for tiny moves such as a forearm wave or a head tilt).

## Small-life techniques (code)
- Breathing: a gentle vertical scale of the torso band via a mesh or displacement warp (≤ 1.5 %), 3–4 s period.
- Hair/notes: a low-amplitude displacement in masked regions, seeded noise, never on the face silhouette.
- Steam, dust, light flicker, the moon: their own layers.
- Camera: one continuous eased move per shot (no shake), with parallax per layer.
- Frame purity: no Math.random, Date.now, new Date, performance.now, requestAnimationFrame, setTimeout, setInterval or
  useFrame in `video/src`; seeded noise only. No npm dependencies without asking.

## Files
A new composition `LivingTest` with its own entry (`video/src/living-index.ts` + `video/src/LivingRoot.tsx`); do not edit
`video/src/Root.tsx` or `index.ts`. Scene code goes in `video/src/living/`. Do not change the locked transition components.

## Measure and look
- Full-rate frame-exact sheets (`ffmpeg select='between(n\,A\,B)'`; never `-ss`; drawtext crashes here) of every pose
  change and the pen reveal, in `video/out/living-checks/`.
- A single-frame jump scan (whole-half mean-abs-diff spikes) — 0 unintended spikes; deliberate beat cuts are listed.
- Beat landings vs `data/timing.json`; tsc; purity grep.
- Gemini at 24 fps is run by the architect; you don't need to.

## Report (Turkish, plain language, short)
What each beat shows, the drawings made, the measurements, honest weak spots, and how fast this approach would cover a
minute of the clip.
