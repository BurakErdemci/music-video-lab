# Lessons from three music clips

Detail file for [SKILL.md](../SKILL.md). Each lesson is a rule plus the evidence behind it. Tags:
`[measured]` a number or a check backs it, `[decision]` a choice we made and kept, `[taste]` the
director liked or disliked it. A clip-specific number is evidence, not a constant.

Clips: V = [vorathul-nerfed](../../../vorathul-nerfed/), HSB = [her-sabah-bastan](../../../her-sabah-bastan/),
MC = [merge-conflict](../../../merge-conflict/). Useful files: the
[MC scene map](../../../merge-conflict/docs/scene-map.md), the
[MC round 8 handoff](../../../merge-conflict/docs/handoff-r8.md), the
[MC round 7c handoff](../../../merge-conflict/docs/handoff-r7c.md), the
[V flash audit](../../../vorathul-nerfed/docs/flash-audit.md), the
[HSB process log](../../../her-sabah-bastan/docs/process-log.md), the
[V making-of, part 1](../../../vorathul-nerfed/docs/making-of/01-from-song-to-style.md).

## A. Process and review loop

1. **Gates passed does not mean the clip is good.** In MC round 10 all 19 checks passed. The
   director and an outside model still found 8 real defects: a horseshoe-shaped text form, dull
   LED words, an unreadable squashed line, a chain that ended in empty space, a card edge visible
   in the entry frames. A check answers only the question it was written for. After every gate
   round: a full-size blind look plus the director's watch. Turn each defect found into a rule and
   into a new check that still fails on the old render. `[measured]`
2. **Every check has a `--selftest` that exits non-zero on a planted defect.** Without it a
   broken check passes silently. The proof for a new check is that it fails on the render from
   before the fix ([MC round 7c](../../../merge-conflict/docs/handoff-r7c.md),
   [round 8](../../../merge-conflict/docs/handoff-r8.md)). `[decision]`
3. **The component and the check read the same pure function** (`xxxStateAt(t)`). The check then
   measures what is rendered, not a prediction of it. `[decision]`
4. **Rules couple sections.** Adding events to a verse broke the 1.5x chorus rule. After any local
   change, rerun the whole rule set. Apply a new rule to approved sections too; only the failing
   frames change. `[measured]`
5. **When two rules collide, the architect decides in writing.** Example: scream at 1.07x of the
   chorus vs a ceiling of 1.0 became a ceiling of 1.1x, reason recorded in the
   [scene map](../../../merge-conflict/docs/scene-map.md). The handoff note lists the "decisions
   taken without the director". `[decision]`
6. **Try a new method on a 15 second test, then build.** In HSB the "living illustration" test was
   the first thing the director accepted ("pretty good, we can go on from here"; see the
   [process log](../../../her-sabah-bastan/docs/process-log.md)). `[decision]`
7. **Timing and motion defects are found by someone watching at real speed.** The director
   reported 5 timing defects that frame scans and the outside model both missed. A contact sheet
   is not enough. `[measured]`
8. **Agent management.** Stop an agent once its report is verified. When an agent's context grows
   very large (around 800k tokens), replace it with a handoff note and a fresh agent. Replace an
   agent that got stuck twice. An agent that knows a finished round can continue to the next
   narrow round by message. `[measured]`
9. **Parallel agents share one git index.** A bare `git commit` swept up another agent's staged
   deletion. Rule: `git add <paths> && git commit -- <paths>` in one step; never `git add -A`.
   `[measured]`
10. **The image model only makes pictures.** Code is written and reviewed by the coding agents.
    The director: "we are making a video, not a system." `[decision]`
11. **Keep every proof render under its own name.** Never overwrite. The director wanted to hand an
    older version to the outside model and it had been overwritten. `[decision]`

## B. Measuring the song

12. **Treat the prompt you gave the music model as a claim and measure it.** Asked Suno for 170
    BPM, a key change and "the music stops". Got 186 BPM, no key change (chroma 0.955 at +0 vs
    0.366 at +2) and a drop of only 10-14 dB. A flat, loud mix means the peaks must come from the
    picture (see the [V README](../../../vorathul-nerfed/README.md)). `[measured]`
13. **Use the `beats[]` array, not one BPM.** Suno tempo drifts (127.9 to 130.9 BPM is 1.6 s over
    4 minutes). The first interval or the mean is not the tempo: a 180 BPM song's intro sat at
    156, and bars of 3 and 5 beats exist. Bar numbers are good to plus or minus one beat. Anchor to
    `beats` and `hits`. `[measured]`
14. **Anchor to time `t`, not to a frame.** 20 `hits[].frame` values differed by 1 from
    `round(t*30)`. After recomputing 523 anchors the difference was 0 (see the
    [V flash audit](../../../vorathul-nerfed/docs/flash-audit.md)). `[measured]`
15. **Every lyric chunk binds to a measured word index.** An empty chunk takes its neighbour's
    time. No fuzzy matching at render time (`gridcheck`). Whisper wrote "three hundred" as "300",
    so keep an explicit token map. A word missing from one query does not mean it is absent.
    `[decision]`
16. **The dead-air check carries a 1-frame rounding allowance.** A 2-beat gap measured 2.03-2.07
    beats, so the tolerance is 0.102 beats, with the reason written inside the check. Never invent
    filler events. An invisible event (a blinking cursor) does not count: events carry a `visible`
    flag. `[decision]`
17. **Measure a reference before copying its cut rule.** One reference changed scene on sentence
    boundaries (18.6 % of cuts on a beat, chance 24.6 %); another locked 64.5 % of cuts to beats.
    `[measured]`
18. **Suno recipe.** Contrast comes from stops, not from sound (`[Stop - one bar of total
    silence]`). An inline "Girl A:" gets sung, so put it in its own bracketed line. "kawaii metal"
    drifts to pop; "kawaii heavy metal" works. "flat robotic voice" makes the whole line robotic.
    A persona locks one voice, and stems cannot separate two voices. Extend regenerates everything
    after the cut, so extend the take you like and do not re-create the chorus. A hard pop-to-metal
    switch was called "absurd". Paste the full lyrics: partial lyrics gave a short song (58 s).
    Do not write an artist name. Bracketed section tags work. Length overruns. The free tier is not
    for commercial use. `[measured]`
19. **Ear beats guide.** The scream and blast beat the guide called risky were what the director
    liked most. `[taste]`
20. **Getting Suno audio out.** The share page `audio_url` is off limits and guessing the CDN gives
    403. For a large file use a private draft GitHub release (up to 2 GB). `[measured]`
21. **An outside model's listening is conversation, not measurement.** It reported a +2 key change,
    155-170 BPM and "total silence", and its timestamps were off by 1-3 s. It says where to look;
    a tool gives the number. `[measured]`

## C. Pictures: character, card, cut-out, drawing loops, depth

22. **Pick the style for how it animates.** Flat fills with hard edges cut out cleanly; fine
    hatching (engraving) shimmers in compressed video. The polished rounds were rejected: "too
    polished, too realistic, the default ChatGPT look" (see the
    [V making-of, part 1](../../../vorathul-nerfed/docs/making-of/01-from-song-to-style.md)).
    `[taste]`
23. **Character consistency.** One canonical model sheet, a fixed feature list repeated in every
    prompt, and two references per call (style frame plus model sheet). One reference was not
    enough. `[decision]`
24. **One colour, one meaning** (magenta means "deleted" and is never used as a key colour). Key
    colour `#00FF00`; grey `#808080` in the picture palette. Never write "transparent" in a prompt:
    it draws a checkerboard. `[decision]`
25. **Image-model traps.** In parallel runs a neighbour's image can come back (same md5, 2 of 8
    runs): hash every round. One image per call. The returned size can differ from the one asked
    for. A refusal can be a false positive: soften the prompt. On retry, pass the approved image as
    a reference. A batch runner does not order `depends_on`: run dependents in a second pass.
    `[measured]`
26. **Search the whole card set for cut-out defects.** The grey key erased pale lavender parts of a
    face (background showed through the eyes): `holecheck` over 175 cards. The repair left a 1-2 px
    half-transparent ring: measure the ring too. A neck shadow was taken for key colour and left a
    cyan triangle. Key green after scaling up, not before (a blue wire reads cyan on green). The
    finished render showed four legs (the artist's own legs inside the cape drawing): open the
    final render, not only the part. `[measured]`
27. **A puppet rig is for poses and small life, not for acting.** A fight is a comic panel
    (anticipation 2 frames, impact silhouette 2 frames, one big hit per bar); getting up from a
    chair is a cut. The director accepted a 2D or Blender rig only for motion within 30-45
    degrees. Morphing, a 3D rig and a 2D bone rig all passed every bone and slip gate (bone drift
    0.0001 %, foot slip 0.13 px) and were still rejected. `[measured]` `[decision]`
28. **Wobble is not life.** "This wobble is truly absurd." The girls hold a pose (breathing at most
    0.5 %); about 85 % of the motion is in the camera: shake driven by measured kick energy, 2-6 %
    Ken Burns, and a hair wave of at most 0.6 % that is zero on face and body. Accents are rare
    ("very cute and rare"). `[taste]` `[decision]`
29. **Drawing loops got the strongest approval.** Image-model in-between drawings (base, b, c, b),
    phased to the beat, tried on one card first. The director: "this method is good, let's use it
    everywhere". The in-betweens reuse the base crop box (`loopcards.py`). A walk is one drawing per
    beat (step cycle about 1.3 s); three drawings per beat looked like jogging. `[taste]`
    `[decision]`
30. **A still picture reads as a slide.** "It looks like a slide", "black bars at the sides". The
    fix (round 10, the director: "the bar has gone up a lot"): extend the picture to 16:9 with the
    image model (the original is pasted back pixel-exact in the middle, mask 48 px inside, blur 28);
    depth parallax from Depth Anything V2 (CPU, throwaway uv environment); seeded particles in
    front, a light sweep per bar, a flash on the hit. For long holds put the girls on their own
    layer (background without them, the girls on green, two in-betweens, looped). `slidecheck`:
    picture shot length at least 0.5x of the section's median live-shot length (round 9 had
    0.16-0.49x). Cropping 3:2 to 16:9 cut heads and feet. `[measured]` `[taste]`
31. **Plate cap.** At 2K a plate is at most 1.25x its native pixels, upscaled 2x first with Upscayl
    digital-art-4x. The director saw blur on a 2x enlargement. `[decision]`
32. **Ground contact is a measured gate.** Contact shadow under the feet, a floor glow, a 40 %
    reflection (fades on a high camera); the band under the feet is at least 25 % darker than the
    floor beside it. The director: "if we solve shadow and depth we get a really good result".
    `[measured]` `[taste]`
33. **Fake light on an unlit card comes from the card's own alpha.** Rim light, overflow and colour
    tone for key and fill; no real lights (`meshBasicMaterial`, `toneMapped: false`). `[decision]`
34. **A cause-and-effect moment needs one geography.** 11 shots in 5.3 s never showed the wave and
    its victim in one frame: "still not impressive, it doesn't read". Fixed with 4 shots, one set,
    both sides in their own colour, plus `pushcheck`. `[measured]`
35. **A held object's other end must arrive somewhere.** A girl pulling a chain that ended in empty
    space read as a bug. The prompt said "the chain leaves the right edge" and the layout broke it.
    When placing a card, check the prompt's composition intent (what is pulled, where she looks).
    `[measured]`
36. **Particle size is capped (28 px at 1080p).** A flat 100x50 px confetti piece in the near layer
    passed over the girls like a card. Confetti only in choruses and big hits; dust and embers in
    verses. `[measured]` `[decision]`

## D. Camera, motion, density

37. **The chorus is the peak and there is no cliff after it.** "It was more fun when I listened
    blind." Rules (`intensity`): chorus at least 1.5x a verse; verse 3-4 at least 0.5x the chorus;
    metal sections 0.7-1.0x (solo 1.15x, scream 1.1x by architect decision); the 4 s after a chorus
    at least 0.5x. `[measured]` `[taste]`
38. **Face box.** Down to the chin (+10 %, measured on 16 cards), 4 % inside the frame on every hit
    and shake, at most 70 % of frame height. "Bigger than the screen, like a 2x zoom" (the
    director). `[measured]`
39. **The cut edge of a cropped card is never visible in any frame, entry included.** In the
    "YES!" split screen the busts slid in from above and their flat bottom edges showed for the
    first 4-5 frames. The director did not see it while watching; the outside model did; verified
    frame by frame. Checks must not skip the first frames of a shot. `[measured]`
40. **Shock rings spread from the floor,** not from the middle of the frame ("like a target above
    the head"). `[decision]`
41. **Repeat check in the second half.** The same (scene, camera, motion) triple does not come back
    except as a deliberate motif (a rocket twice and a tunnel three times were caught by
    `repeatcheck`). A character may repeat an action. A special illustration repeated verbatim kills
    the surprise. `[decision]`
42. **Never turn the audio down;** show "the sound is muffled" visually (hand at the throat, smoke
    from pipes). `[decision]`

## E. On-screen text and lyrics

43. **To show a face, do not cut a hole in the word or shrink the text;** move the text to another
    band. Draw text after transitions and covers. Cap height at least 3.5 % of frame height,
    contrast at least 3:1 (red on red measured 2.9:1), edge margin 4 %. `[decision]` `[measured]`
44. **The check measures every state of the text.** Unsung LED words stayed pitch black (the line
    looked like empty boxes); a squashed line became unreadable; a line lying on the floor ran off
    both edges; a tilted box left the frame as it turned; `framecheck --type` had passed all of it.
    Unsung words show at 35-40 % brightness. Height and margin are measured in the squash, tilt and
    perspective states too, and the corners of a rotated back box are tested. `[measured]`
45. **Remove "decor" forms that do not read.** A curved horseshoe text band looked like a gauge and
    became a blot in the middle of the picture. `[taste]`
46. **At least 6 different forms in 30 s, and no same form twice in a row** (`typecheck`). Importing
    a rule from a reference ("one grotesque plus mono") flattened the designed forms the director
    liked: "zero impressiveness". `[taste]`
47. **Text density is chosen per clip.** V: only key words and the location title, no karaoke; one
    element at a time; a slam ends before the next cut; with no free space the slam is skipped ("the
    peak belongs to the picture"). MC gave every line a designed form. HSB had no sound effects.
    `[decision]`

## F. Transitions, covers, flashes

48. **Play where code is strong.** Water, wave and shatter transitions stayed at 4/10 after several
    rewrites; the clip's own print language (ink, paper fold, plate slide) scored 7.5-8/10. The
    director: "let's play where we are strong with code". Redo only the weak ones and lock the rest
    by md5 ("don't redo everything"). `[measured]` `[taste]`
49. **An opaque cover is an event, not punctuation.** At most one per 4 s, 6 frames (`covercheck`).
    One every 2 s in the solo read as a loop. `[decision]`
50. **Plan the flash budget on the plan and audit it before building.** Limit 3 per second, every
    swing counted (stricter than the WCAG pairs). Traps: a dark cover plus a bright plate; a 3/s
    hit pulse over a large area; a hard cut between very different plates (cut and colour cue in one
    frame); a white burst that holds until the next cue. See the
    [V flash audit](../../../vorathul-nerfed/docs/flash-audit.md). `[measured]`

## G. Checks that earned their place

Each was added after a defect got through. Examples live in each clip's `tools/` folder.

`beatcheck` (drift and dead air), `gridcheck` (lyric to word binding), `typecheck` (form variety),
`framecheck` (face box, plate cap, picture coverage, `--type` text, `--ground` contact),
`intensity` and `intensity_finale`, `slidecheck`, `covercheck`, `flashcheck`, `rigcheck` (quad
area ratio 0.85-1.15, fold count 0), `ripplecheck`, `holecheck`, `pushcheck`, `particlecheck`,
`repeatcheck`, `glitchcheck` (a frame that differs from the other render AND from both neighbours
is corrupt; a real cut is not flagged).

Outside-model settings: at 10 fps it missed a doubled body and at 24 fps it found it. Write "there
is no trail or smear in this clip, every double line is an error". Its timestamps are often wrong,
but its verdict on "how does this feel" is right more often than not. Part of what it claimed was
invented (a girl cut off at the waist did not exist). Verify every claim at full frame, and rerun
on an empty answer.

## H. Rendering and infrastructure

51. **Parallel render corrupts frames in Chrome.** The top-left third of the frame appeared as a
    3x3 tiling, a different frame each run; a single still was always clean. For the final: render
    twice with concurrency 1, diff, re-render the disputed frames as stills and splice them in
    (`render_film.py`). `[measured]`
52. **One GPU job at a time** (render, still, Upscayl) under a repo-wide lock. The pid in the lock
    must be a Windows pid: a Git Bash `$$` or `kill -0` cannot see node, so a live lock was judged
    stale. Two heavy jobs at once got a process killed for memory. Keep shell, node and python tool
    files on LF line endings. `[measured]`
53. **Render hygiene.** Do not change the source during a two-pass render (re-bundling produces
    disputed frames). Stopping a background job does not kill its npx/node children. A huge SVG glyph
    makes Chrome hang silently. Each agent deletes its own `%TEMP%\remotion-*` bundles. `[measured]`
54. **Splice verified part renders;** do not redo the whole film (about 6 min vs 44 min). The
    architect writes the handover frame into both briefs. `[measured]`
55. **60 fps traps.** Indexing a table with a fractional frame gave NaN and 423 empty frames.
    `<Audio trimBefore>` plays at a wrong offset at 60 fps: render with `--muted` and mux the song
    afterwards. 2K here means 1440p60 with `--scale=1.3333333333333333` (a shortened value errors).
    `[measured]`
56. **Remotion bundle traps.** No JSX constants at module level (compiles without React, then
    crashes). Shader uniforms are written at commit time (animation froze in sequential render).
    `[measured]`
57. **Archive pattern.** Large file to a draft GitHub release, checked by CRC and byte size, then
    delete the local copies and keep only git. `[decision]`

## I. Why one clip ran fast and another slow

- **Vorathul (fastest; the director liked the jokes, "sweet"):** one character, one clear joke
  ("a majestic demon king gets nerfed"), a song chosen for filmability (the lyrics already tell
  pictures), every joke tied to a measured word, some jokes are the absence of an event ("the joke
  is his stillness"), rig for poses only, fights as panels.
- **Her Sabah Baştan (middle):** the expensive part was hunting for a method until the first test
  was accepted (morph, 3D rig, 2D rig, living illustration).
- **Merge Conflict (longest):** concept and song changed three times; two characters in two
  states, about 4 minutes, 15+ sections; each new rule applied back to approved sections; rule sets
  collided; every round fixed what the last round's gates missed (r7c to r11); proof render about
  28 minutes.
- **Lesson:** one clear sentence of idea first. Complexity only as large as the idea needs.

## J. The director's taste

- **Liked:** drawing loops; depth plus shadow plus particles; pictures that come alive; rare and
  cute accents; designed text forms; the heavy Suno elements (scream, blast beat); transitions
  made from the clip's own print language; Vorathul's jokes; the closing, where the characters
  turn to the camera and walk toward us arm in arm, laughing.
- **Disliked:** wobble ("absurd"); banded, frozen pictures ("slide"); the polished default AI look;
  plain text ("zero impressiveness"); effects that do not read; a hard pop-to-metal switch; a long
  single-angle shot (5 s of walking seen from behind was "too long"); remaking everything at once.
- **Correction:** the director was not bothered by characters animating on twos (every second
  frame). The complaint came from someone who disliked the whole clip running at a low frame rate.

## K. For product and launch videos

From a launch video for a game-dev tool (a product with real features, shown to real users).
Not needed for a music clip.

- **Product truth page first.** One page with the features, how they work, the exact names
  (models, modes, tabs), what does not exist, and what is postponed. The test is "is it shipped
  when the video is published", not "does it exist today". Ask the director one question: when
  will the video be published?
- **Decor rule.** Every piece of interface drawn on screen (timeline, player label, XP counter,
  "merge", "ship", mode name, panel title) is a product claim. If the truth page has no match, do
  not draw it. In that video, a dopesheet, player pedestals, XP numbers and a "No merge conflicts"
  banner were added for looks and removed later.
- **Claims audit at the end.** A read-only agent checks the truth page against every text on
  screen (clippings, HUD labels, model lists, success banners, chat lines, tab names, the poster
  subtitle). Verdicts: OK / WRONG / OVERSTATED / UNVERIFIABLE, with corrected text. Ask the
  director about the unverifiable ones. The audit was left to the end and found 18 wrong claims.
- **Update guide.** A video ages with the product. Record which claim lives in which file, so a
  text change is one line and a short re-render.
- **Sound map beside the hit map.** Plan explosions and risers from the start; in that video the
  biggest hit played with the opening sound until the last day. Details in SKILL.md, phase 4.
- **Open the first 2 beats with an event.** An 8-beat opening drew "too eventless at the start".
