---
name: music-video
description: Use when asked to make a music-driven motion video - a music video, lyric video, launch trailer, product or feature video, "make a clip", "motion design", "video with Remotion". Runs the process measured on three open-source music videos (Vorathul NERFED, Her Sabah Baştan, Merge Conflict) and one product launch video - a measured song before any picture, style frames before code, every visual event locked to a beat or word, checks that fail on planted defects, an intermediate check at real speed, then a scored quality pass and, for product videos, a claims audit. Remotion API detail lives in Remotion's official agent skills.
---

# Music video: locked to the song, checked by tools

Stack: Remotion (React) with three.js, a song from Suno, pictures from an image model, code
written by Claude Code agents. Detail and evidence for every rule is in
[references/lessons.md](references/lessons.md) (sections A-K). Read the section that matches the
phase you are in.

## Core principles

Five came from the product launch video. Five came from the three music clips.

1. **Song first, picture second.** Measure the song. Bind every event to a beat or a word. Check it
   with a tool (drift 0 frames, no dead air).
2. **One identity in one sentence.** Every scene serves it. The fastest clip (Vorathul) had one
   character and one joke. The slowest (Merge Conflict) changed concept three times.
3. **Style frames before code.** The first round of pictures was rejected as "too classic". The
   right direction came from the same scene drawn in several styles side by side.
4. **Every word and decoration on screen is a claim.** For a product video, check each one against a
   product truth page before building, not after. Doing it last found 18 wrong claims.
5. **The architect verifies each round with their own eyes.** An agent's report is not evidence.
   Render the frame from the real entry point and open it.
6. **Gates passed does not mean the clip is good.** All 19 checks passed and the director plus an
   outside model still found 8 real defects. Turn every defect into a rule and into a check that
   still fails on the old render. Every check has a `--selftest` that exits non-zero on a planted
   defect. The last word is a full-size look and the director's watch (A1, A2).
7. **Motion lives in the camera; the character holds a pose; life comes from drawings.** Morphing and
   puppet rigs passed every measurement and were rejected. What won: a full drawing per pose,
   beat-phased in-between drawings from the image model ("this method is good, let's use it
   everywhere"), and camera, shake, depth and shadow (C27-C29).
8. **Nothing sits frozen.** A still picture reads as a slide. Extend it to 16:9, add depth parallax,
   particles and light in front, and put characters on their own looped layer on long holds (C30).
9. **One clear sentence of idea first.** Complexity only as large as the idea needs (I).
10. **An outside model points, a tool counts.** The outside model (Gemini) found some defects first
    and invented others (a girl cut off at the waist that did not exist). Verify each claim at full
    frame (G, B21).

**Clip or product video.** The product truth page, the claims audit and the decor rule are required
only for product and launch videos (K). Sound effects, karaoke fill and text density are chosen per
clip. Her Sabah Baştan has no effects, Vorathul uses key words only, Merge Conflict gives every line
a designed form.

## Phase 0: Input gate (everything written down before any picture)

1. **Music.** The director brings it or you make it with them (Suno).
   - Paste the full lyrics. Partial lyrics gave a short song (58 s).
   - Do not write an artist name. Bracketed section tags work. Length overruns.
   - Contrast comes from stops: `[Stop - one bar of total silence]`. Put speaker labels in their own
     bracketed line or they get sung. More recipe in B18.
   - Take the final file as WAV. Write down which take and where the file is.
   - The free tier is not for commercial use.
2. **Product truth page** (product video only, see K). Features, how they work, exact names, what does
   not exist, what is postponed. One question for the director: "When will the video be published?"
   The test is "is it shipped then", not "does it exist today". Fix the order of featured features
   with them.
3. **Identity and one number.** Identity: one sentence. Number: "drift 0 frames on all hit events,
   0 render errors." Write both in the README before the first commit.
4. **Decor rule** (product video): every UI piece drawn on screen is a product claim. No match on the
   truth page means it is not drawn.

## Phase 1: Measure the song (no guessing)

Examples: each clip's `tools/timing/` folder (librosa, faster-whisper; run with `uv run --with ...`
in a throwaway environment).

- **Tempo.** Comb scan over the onset envelope gives period and phase. Then check it against the
  structure: bars x 4 x beat = duration. First guess 117.5 BPM, real 119.57 (67 bars x 4 x 0.5018 =
  134.5 s).
- **Use `beats[]`, not one BPM.** Suno tempo drifts (1.6 s over 4 minutes). Bars of 3 and 5 beats
  exist. A 180 BPM song's intro sat at 156. Bar numbers are good to plus or minus one beat (B13).
- **Downbeats.** Score the phase by onsets in the kick band (below 120 Hz).
- **Sections and energy per bar.** Energy jumps give the hit map. In the launch video the outro was
  the loudest part; the "calm ending" plan was wrong.
- **Word times.** faster-whisper at word level. Whisper mishears ("Press start" became "past
  time"; "three hundred" became "300"), so compare against the lyrics and keep a token map (B15).
- **Anchor to time `t`, not to a frame** (B14).
- **Output** `data/timing.json`: `beats, downbeats, sections, lines, words, hits, energy_per_bar`,
  plus a `timing-summary.md` for a human reader.
- **Bind lyrics only to measured words.** Binding by guess failed three times: a "ship it" that was
  "come inside", a wrong chorus bar map, "seam/scene".
- **Treat your prompt to the music model as a claim.** Asked for 170 BPM and a key change; got 186
  and none (B12).
- **Measure a reference before copying its cut rule** (B17).

## Phase 2: Story and scene map

- A section to scene table, a hit map (what explodes on which beat), lyric anchors. Keep it in
  `docs/scene-map.md`; every lane follows it (see the
  [Merge Conflict scene map](../../merge-conflict/docs/scene-map.md) for a worked one).
- **Dead air is the real failure, not slow animation.** Chorus, build, finale, outro: an event at
  least every 2 beats. Verse and bridge: 4 (a deliberate `hold` of 8 in the bridge). The opening is
  2 beats too: 8 drew "too eventless at the start". Allow a 1-frame rounding margin and never invent
  filler events. An invisible event does not count (B16).
- Events from the first second. If the opening is a long explainer, cut it into beats.
- The strongest hit gets the biggest visual event; the loudest section gets the victory lap.
- **Density rules** (D37): chorus at least 1.5x a verse; verse 3-4 at least 0.5x the chorus; metal
  0.7-1.0x; the 4 s after a chorus at least 0.5x. The chorus is the peak and there is no cliff after
  it.
- **One geography for cause and effect** (C34). Do not repeat a (scene, camera, motion) triple outside
  a deliberate motif (D41).
- **Rules couple sections.** After any local change, rerun the whole rule set. A new rule applies to
  approved sections too (A4).
- **Plan one place per section.** A single set made the clip monotonous; a camera change inside the
  same set was not enough.
- Lyrics may run as chat lines or as designed text forms. Text is a decision (E47). Measure every state
  of every form: unsung words visible at 35-40 % brightness, squashed, tilted and lying states keep
  height and margin (E44).
- Verify what a lyric says before building an image around it. Words guessed as "ship it" were
  something else.

## Phase 3: Style frames (before code)

Use the image model, one image per call, the character reference passed as an input.

- Round 1, a generic style: rejected as "too classic". Round 2: the same scene in N styles side by
  side; the styles separated. Round 3: the mascot adapts to each world; only the identity anchors stay
  fixed (horn tips, screen face, two oval eyes, one signal colour).
- Add "no Minecraft" to the prompt when asking for PS1 or isometric looks.
- **Style by animatability.** Flat fills with hard edges cut out well. Fine hatching shimmers in
  compressed video. Avoid "polished, realistic, default AI look" (C22).
- **Consistency.** One canonical model sheet, a fixed feature list in every prompt, two references per
  call (C23).
- **Colour discipline.** One colour, one meaning. Key colour `#00FF00`. Never write "transparent" in a
  prompt (it draws a checkerboard) (C24).
- **Image-model traps.** Hash every round, one image per call, the size can differ, refusals can be
  false positives (C25).
- **Cut-out defects** are searched over the whole card set, not a sample (`holecheck`) (C26).
- Each world carries its own text style and its own dialog skin.
- Approved frames go into the repo with their prompts. Tool logs do not.

## Phase 4: Sound map (optional for music clips)

Required for a product video, optional for a clip (Her Sabah Baştan has none by the director's
decision). Never turn the song down in a clip; show "the sound is muffled" visually (D42).

- A free CC0 library (Kenney) beat AI-generated SFX. Suno Sounds were called cheap.
- **Listening page.** Each candidate gets two players: alone, and inside the song at its exact place.
  The director picks by code ("A5 B4 ..."). Pattern in `vorathul-nerfed/tools/sfx/sfx_candidates.py`:
  generate candidates, mix a song excerpt with `ctx()`, write HTML, open it.
- Pitch tonal sounds to the song's key (F minor: an E-block went -10.5 semitones). Synthesise the sub
  bass hit at the key's root (F1, 43.65 Hz).
- **Plan explosions and risers from the start.** The biggest hit in the launch video played with the
  opening sound until the last day.
- Level: SFX 8-14 dB under the song; one big explosion at -2 dB. Verify with `volumedetect`, comparing
  the film and the song alone at that moment (explosion +2.4 dB, peak -0.4 dB, no clipping).

## Phase 5: Technical skeleton (Remotion and three.js)

Details: Remotion's official agent skills. Measured traps:

- `Config.setChromeMode('chrome-for-testing')`; the default Chrome would not open.
- `@react-three/postprocessing` returned blank frames; use `postprocessing` directly.
- **One WebGL canvas per frame.** A second canvas rendered black in parallel render. For a multi-world
  screen (2x2) use one canvas with viewport and scissor.
- An SVG layer that does not change across a frame can vanish (11 of 48 frames).
- **Frame purity.** No `Math.random`, `Date.now`, `useFrame`, `requestAnimationFrame` or timers.
  Randomness is seeded (`seeded(key)`). Grep for these every round.
- **60 fps** for clips. Camera, text and effects run every frame. Character drawings may step (a
  beat-phased drawing loop, about 10 drawings per second; one drawing per beat in a walk). An old
  note blamed animating on twos; the complaint was about the whole clip running at a low frame
  rate (J).
- **60 fps traps.** A fractional frame in a table lookup gave NaN and 423 empty frames. `<Audio
  trimBefore>` plays at a wrong offset at 60 fps: render with `--muted` and mux the song later. 2K is
  1440p60 with `--scale=1.3333333333333333` (H55).
- **Rendering.** `--concurrency=4` is fastest for tests (about 110 ms per frame), but parallel render
  corrupts frames in Chrome (a 3x3 tiling in the top-left third). Proof and final: `--concurrency=1`,
  render twice, diff, re-render disputed frames as stills (`render_film.py`). One GPU job at a time,
  under a repo-wide lock; the pid in the lock file must be a Windows pid (H51-H53).
- **A 2.5D card scene is seen from the front** (camera yaw within plus or minus 15 degrees). From
  behind or the side the flatness shows and so does the edge of the set. Vary height, lens, distance,
  slide and composition. "The view from behind is really bad" (the director).
- **Code-drawn stick figures and flat strips look cheap.** Hero panels and light beams need real
  drawings or a texture that fits the style frame. Flat geometry is a stopgap only.
- **Approved leap (Vorathul phase 1: "a whole era ahead"):** a set per phase (layered plates seen from
  the front), image-model hero panels, a front camera.
- **One set makes a clip monotonous.** Plan a set per section or phase from the style frames.
- The "ghost ink" second layer in DOM text must be full width, or a narrow box breaks the line in a
  different place and shows doubled text.
- **Ground contact is a gate:** contact shadow, floor glow, a 40 % reflection; the band under the feet
  is at least 25 % darker than the floor beside it (C32).
- **Plate cap:** at most 1.25x native pixels at 2K (C31). Particle size capped at 28 px at 1080p (C36).
- **Flash budget:** at most 3 per second, every swing counted, audited on the plan before building
  (F50). **Opaque covers** at most one per 4 s (F49).
- Tools in each clip's `tools/` folder (examples, not a package): `beatcheck.mjs` (drift and gap rule),
  `stills.mjs` (one bundle, many frames, a labelled contact sheet).

## Phase 6: Lanes and agents

- A lane is one world (a style kit) or one section (a scene assembly). The architect wires scenes into
  the main composition; the agent writes the wiring line in its report.
- Every added decision goes into the contract with a number (product truth, publish time, model names).
  A later lane reads a stale contract and brings back the old claim.
- Put the file list of parallel lanes in each brief. Add: "if someone else's half-finished file breaks
  the bundle, wait; do not fix it."
- **In clip projects the image model only makes pictures.** The code is written by coding agents.
- **Use a stronger model for creative design** (a new world, a new sequence, re-cutting an outro), one
  such lane at a time. **Use a cheaper model for assembly, fixes and reading.** Text changes that can
  be written out completely go to a coding agent with recorded line numbers and an instruction to stop
  if an unexpected caller appears (on the first try it stopped correctly: two callers were missing
  from the list).
- **A stopped agent cannot be reopened by message.** Write briefs so a fresh agent can resume: "read
  your own `git diff` first; do not start over." Replace an agent whose context grows very large with
  a handoff note and a fresh agent (A8).
- **Parallel agents share one git index.** `git add <paths> && git commit -- <paths>` in one step;
  never `git add -A` (A9).
- Type checks happen after integration in the main tree if a lane's worktree has no `node_modules`.

## Phase 7: Intermediate check

Render the first 30-45 seconds. The architect watches (2 fps contact sheet plus loudness) before the
director sees it.

**A sparse contact sheet does not show motion.** A frame every 3 s said "looks good" while the
director caught pose changes that jumped in one frame, the same loop running for 10-15 s and a walk
that was too fast. Before showing a video with characters:

1. **Transitions at full frame rate.** Plus or minus 6 frames around each pose or lane change as
   consecutive sheets. A silhouette jump in one frame is a defect.
2. **Repeat timeline.** Per character: which lane or loop, when, how many times in a row, as a table.
   The same loop more than twice is a defect.
3. **Speed and rhythm.** Walk step time and pixels travelled (natural is about 1-1.2 s per cycle).
   Measure drawing order and hold regularity too (backward steps 0, hold difference at most 1
   frame). Foot slip fell to 0 and the walk still stuttered, because choosing the drawing that holds
   the foot on every frame broke the rhythm.
4. **Blind viewer.** A cheaper-model agent watches at 12 fps contact and answers only "what catches
   the eye", without seeing the other reports.
5. **Outside-model motion count.** Send the slice to a video model (we used Gemini at 10-24 fps,
   high resolution). Ask for pose changes per character and whether each transition is a cut or a
   teleport; ask "is this a defect" or it excuses it as style. It points to places; it does not
   measure. It was wrong about tempo, key, silence and a girl cut off at the waist, and it was first
   to see a 4-frame card edge. At 10 fps a 16-frame transition can look like a 1-frame snap: take
   the count, then verify each "snap" at full frame (G).
6. **Inside a transition.** A morph frame can fix a silhouette jump and lose detail: a held prop,
   notes on a body and hair vanished during the transition and popped back on the last frame, and
   tempo and jump measurements did not see it. For every in-between set, measure missing detail
   against the end drawings, detail pixel continuity and one-piece body.
7. **Morphing is the wrong tool for character motion.** Between two pose images it does not know the
   limb: limbs stretch, clump or leave ghosts. Every gate passed and the director still said "not
   smooth, the limbs stretch". A small 2-10 frame distortion is what the viewer sees. A puppet rig
   (3D and 2D bones) passed every measurement and was rejected too; the director accepts a rig only for
   motion within 30-45 degrees. Character motion is: a real in-between drawing (image-model loops),
   a cut, and the camera. A fight is a comic panel (C27-C29).
8. **Bending one picture with a skeleton (Live2D style) animates a still card and breaks at the
   legs.** Two thighs bent from one hip point crushed the pelvis to a thin tube and wide trousers
   fused. Bone length passed at 3 % and the director said "the legs go the wrong way, very strange".
   Bone length cannot see cloth crush: measure each mesh quad's area ratio (deformed/rest) and the
   fold count (fold count 0, ratio about 0.85-1.15). Keep a wide-clothed lower body still; dance from
   the waist up with frequent pose changes.

For exact frame ranges use `select='between(n\,A\,B)'`, not `ffmpeg -ss` (it gave the wrong frame).
Show the director only what passed these steps; say honestly what did not.

**The repeat rule must not wreck the tempo.** A "at most 2 loops, a new drawing every 6 s" rule pushed
an agent to add motion until the director said "it looks 4x speed, things teleport". Tempo follows the
song: about 3 state changes per character per 10 s, an action at least 2 s, a transition at least 12
frames (a big body change 18-30), at least 1 s of calm between two transitions. An action lasts about
2-5 s (never above 5). The director: "they can repeat the same moves, just make the transitions
natural, no need to run flat out". But a special illustration repeated with the same camera is not
free (`repeatcheck`, D41), and a long shot from one angle (5 s of walking seen from behind) read as
"too long". Measure it in the audit: changes per 10 s, shortest transition, shortest hold. In the
launch video the chorus was liked, and the opening and the first mascot were rejected; without this
check the whole film would have ended with that mascot.

## Phase 8: Quality

1. **Measure the full render:** frame count, duration, errors in the render log, `volumedetect` (mean
   and peak), film against song at the explosion moments.
2. **Watch it yourself:** 34 s slices, 2 fps, 10x7 contact sheets. Write down the three weakest places.
3. **Quality agent (cheaper model, read-only).** Score section x 7 criteria (beat energy, readability,
   originality, mascot, transitions, product message, polish). Each cell under 8 gets a concrete
   item with an evidence image and the owning file. Group items by file owner. Pass known items as a
   "do not re-report" list. **Have it check text at full size** (a doubled line was missed on a small
   contact).
4. **Claims audit** (product video, K). The truth page against every text on screen: clippings, HUD
   labels, model lists, success banners, chat lines, tab names, the poster subtitle. Verdict per
   item: OK / WRONG / OVERSTATED / UNVERIFIABLE, with corrected text. Ask the director about the
   unverifiable ones.
5. **Fix waves.** Lanes with disjoint file sets run in parallel. A section the director liked (the
   chorus) changes only as much as the item needs. After each lane the architect runs the type check,
   the purity grep, `beatcheck` and a frame from the real entry point, then commits split by meaning.
6. **Lock what is approved by md5.** Redo only the weak parts; "don't redo everything" (F48).

## Phase 9: Delivery

- The version the architect calls done: the measurements, and the small defects left on purpose,
  stated plainly.
- **Update guide** (a product video ages with the product): which claim lives in which file. A text
  change is one line and a short re-render.
- **Proofs** are kept under their own names and never overwritten (A11). The 2K final only with the
  director's approval.
- **Archive** a large file as a draft GitHub release, check CRC and byte size, then delete local copies
  and keep git (H57).
- Files over 100 MB do not go into git. In a private repo use a release attachment (`gh release
  create`). Keep folder names ASCII; tools can break on non-ASCII paths.
- Keep `node_modules`, `out/` and image-model logs out of the repo.

## The director's taste (clips)

Liked: drawing loops, depth plus shadow plus particles, pictures that come alive, rare cute accents,
designed text forms, heavy Suno elements, transitions from the clip's own print language, the jokes.
Disliked: wobble, frozen banded pictures, the polished default AI look, plain text, effects that do
not read, a hard pop-to-metal switch, remaking everything at once. Detail and quotes: J.

For the launch video the director liked: the chorus montage ("it shows off"), karaoke fill, a BUILD %
gauge, a dialog box per world, the PC-98 pixel world, a clippings collage, a mascot that changes per
world. Disliked: a shiny generic 3D toy mascot (replaced by a cel/ink line that fits the official
SVG), an eventless opening, "classic" low-poly, a provider name as an agent name. Marketing rules: do
not highlight the approval card (suggest auto mode); a "coming soon" feature only if the video ships
with that version.

## Reference projects

The three clips in this repo: `vorathul-nerfed/`, `her-sabah-bastan/`, `merge-conflict/`. In each:
`docs/scene-map.md` (Merge Conflict and Vorathul), handoff notes, and `tools/` with the checks. The
launch video was made in a private repository and is not included.
