# Process log — how "Her Sabah Baştan" was made

A running record of what was tried, what was measured, and what the director (Burak) said, kept while the clip is
being made. It is the raw material for two things at the end: the public write-up of the process, and the skills
(`video-yapim` for general lessons, a new character-animation skill if the Blender pipeline proves itself).

Each entry is: what we did → what we measured → what a human saw → the lesson. Dates are when it happened.

## 2026-10-18 · Song first, then pictures

- The song (Suno Pro, human/AI duet, 4:00.76) was measured before any picture: beats, downbeats, sections, word times
  (`data/timing.json`). The tempo drifts 127.9 → 130.9 BPM, so every event indexes `beats[]`, never a fixed BPM.
- Lesson: bind lyrics only to measured word times; guessed times were wrong every time they were tried.

## 2026-10-18 · Style before code

- Round 1 (eight styles, empty rooms): all read as the same "lo-fi room" template. A character and the song's own
  alphabet (notes, glass, moon) were needed for a style to mean anything.
- Round 2 picked the silk-screen print look (`stil/tur2/03-ipek-baski.png`); round 3 made the key frames.
- Code-drawn SVG characters looked like pills ("olmamış"). Switched to AI-generated pose drawings cut out on magenta.

## 2026-10-18/19 · Pose drawings + morphing — measured green, looked wrong

- Characters were key-pose drawings; in-betweens were silhouette morphs between drawings (`video/scripts/make-tweens.py`).
- Gates were built and passed: tempo (≤ 3 state changes per 10 s, transitions ≥ 12 frames, actions ≤ 5 s), no
  single-frame jumps, no popping props, morph end-pop ≤ 0.06, detail continuity, one connected body, head overlap.
- Director's first complaints were about tempo ("4x fast, things teleport", "50–56 s is frantic") → fixed with the tempo gate.
- Then, watching the passed v6 and test2-v2: "animasyonlar akıcı değil, karakterler garip şekillere giriyor, uzuvları
  uzuyor". His example frames are in `.claude/briefs/rig/`: an arm smeared into a blob, a doubled body standing up from
  a chair, legs smearing into a tail while walking, the AI's arm becoming a lump.
- Why the gates missed it: they measured timing, jumps and detail, not whether the body in the MIDDLE of a transition is
  anatomically plausible. The architect saw ghost legs and blobs and filed them as "2–10 frame small defects".
- Lesson: morphing between two drawings does not know where a limb is; it is the wrong tool for character motion.
  A few frames of distorted anatomy are what a viewer actually sees — never "small".

## 2026-10-19 · Automated watchers: what they are good for

- A blind Sonnet watcher (contact sheets + full-rate crops) and Gemini (video watch at 10 fps) were used as second eyes.
- Gemini's counts of pose changes were useful; its "snap" claims were often false at 10 fps (a 16-frame transition looks
  like one jump when sampled every 3 frames), and "floating feet" was a character rocking on tiptoe.
- The blind watcher caught real readability problems the gates passed (an unreadable stamp, a climax too faint to
  notice, captions printing over each other), but it did not flag limb distortion.
- Gemini DID give the right overall verdict on v6 ("the tempo is calm but the animation mechanics are frantic and
  jerky", "visible in-between limb distortion" at 26.5 s). The architect discarded it together with its false
  frame-level "snap" claims. That verdict matched what the director said the next morning better than any gate did.
- Lesson: count with machines and verify every frame-level claim at full frame rate (`ffmpeg select='between(n,A,B)'`;
  `-ss` seeking returned the wrong frames), but take a watcher's overall "how does it feel" verdict seriously even
  when its timestamps are wrong. Judge motion with a human before calling a section done.

## 2026-10-19 · New direction

- Characters move to Blender: simple 3D bodies rendered flat (screenprint look) with a real skeleton, so limb lengths
  cannot change. Test brief: `.claude/briefs/blender-test.md`.
- The single split screen felt monotonous over four minutes. Scene map v2 (`.claude/briefs/scene-map-v2.md`): the human
  outside daydreaming the AI, the AI's model-upgrade sequence, single-colour floods, days passing, emotion icons, long
  meaningful actions, transitions that flow like water, every scene tied to its lyric line.
- The morph-based bridge section is parked on branch `wip/bridge-morph`.

## 2026-10-19 · Gemini at 24 fps; scene map v2

- Gemini at 24 fps, high resolution, on v6 28–34 s found the doubled body standing up from the chair at 29.7–29.9 s
  (missed at 10 fps) — but called it "an intentional smear effect" and the motion "fluid". The prompt must say there
  are no smear effects in this clip and every doubled outline is a defect.
- Scene map v2 (`.claude/briefs/sahne-haritasi-v2.md`, 24 style frames in `stil/tur4/`): the split screen becomes a
  home base (about 82% → 43% of the runtime), with trips into the screen (the AI's model-upgrade path), the city (a
  day street of shop-window reflections, a night bus) and time (a days-passing desk routine). Only two hard cuts, both
  on musical hits; every other transition flows through an object (screen ripple, ink spreading, a note peeling into a
  road, the torch circle becoming the sun, the street folding into the paper city, line-rain becoming bus-window rain).
  Every lyric line carries a one-sentence "why this image serves these words".

## 2026-10-19 · Transition test v1 (water-like scene changes)

- Three transitions built in Remotion without new packages: G1 screen dive and G2 ink bleed as small hand-written WebGL
  shaders with seeded simplex noise, G5 street fold as nested CSS 3D hinged panels. Beat landings 0 frames off.
- Gemini at 24 fps (told there are no intentional glitches): G1 4/10 ("rigid concentric rings, a cheap 2D preset",
  stretching while zooming), G2 7/10 (organic), G5 8/10 (creative, a small perspective pop). The architect's own
  full-rate sheets agreed. Lesson: drawn ripple rings read as a preset; water must show up as refraction of the image.

## 2026-10-19 · 3D Blender bodies: anatomy fixed, look lost → 2D cut-out

- The 3D Blender test (hand-built primitive bodies, keyframed IK rig, flat shading + inverted-hull outline) measured
  clean: 540/540 frames with one connected silhouette per character, bone length deviation 0.002 %, max frame-to-frame
  silhouette area change 4.1 %. Burak's four distortion types cannot occur.
- But the look regressed: the human read as a cartoon mannequin, not the illustrated person; the AI as a shop dummy.
  Burak: "3d'ye aslında ihtiyacımız yok, bizim video 2d … bize lazım olan akıcı 2d animasyon".
- Tool decision (left to the architect): 2D skeletal cut-out with mesh deformation in Blender (our own drawings as
  image planes, bones inside, joints bend). Rejected: After Effects (not installed, paid, its strength is hand polish in
  the GUI; Higgsfield itself says AE-via-AI is weak at character rigs), Spine (paid, runtime licence conflicts with an
  open-source release), Unity 2D Animation (good and free, but needs the editor open and is hard to drive headless).
  Blender is free, headless, deterministic, and the render/composite/check pipeline from the 3D test is reused.
- Next: cut-out part sheets for both characters (`.claude/briefs/cutout-parts.md`).

## 2026-10-19 · Water transitions in code → print-language transitions

- Transition v2: G1 rebuilt as pure refraction (no drawn rings) still read as an expanding ink blob (Gemini 4/10);
  G5 rewritten from CSS 3D to 2D canvas slices to fix dropped frames regressed from 8 to 5/10 ("horizontal stretching").
  G2 ink bleed held at 7.5/10.
- Veo 3.1 first/last-frame interpolation was tried through the Gemini API: the free tier returns 429 for all three
  Veo models (no free tier; Standard $0.40/s, Fast $0.12/s, Lite $0.08/s at 1080p). Browser Veo adds a visible Gemini
  watermark; removing it was declined (provenance mark, published clip).
- Lesson: water is the hardest material to fake in code; the clip's own print language (plates, halftone, squeegee,
  ink, paper) is what code does well. New family: plate registration shift, halftone bloom, squeegee print, paper fold
  (back to true 3D), ink bleed, plus shape match cuts.
- Burak watched the two kept transitions (ink bleed v2, paper fold v1): "ikisi de gayet iyi, bu tarz geçişler olabilir,
  kodla nerede güçlüysek oraya oynayalım". Direction confirmed: play to code's strengths.
