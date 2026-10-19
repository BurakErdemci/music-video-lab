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
