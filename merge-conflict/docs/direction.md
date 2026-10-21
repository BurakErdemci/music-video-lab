# Merge Conflict: direction

Status: pre-production. Starts after the Vorathul NERFED delivery.

## Fixed inputs

- **Song:** `audio/merge-conflict.wav` (git-ignored; copy of Burak's "banger" take).
  - Measured: 153 BPM, E minor, 232.96 s.
  - Lyrics are the old v3 ("One conflict / Forty conflicts"); Burak keeps the take as is.
  - Its only true stop is at 177.14-177.70 s.
  - Timing data: `data/take-2026-10-20/`. `mc-timing.json` holds beats, bars and 374 words.
- **Concept:** a duet of two girls who are never named. Each is coded only by colour:
  - the orange girl (Claude's colour);
  - the blue girl (Codex's colour).
- **Story:** the lyrics' blue-vs-pink button fight becomes the clash of the two colour worlds. The finale "gradient now" is the two colours flowing into each other.

## Look (Burak, 2026-10-21)

- **No dotted texture.** No halftone dots, print grain, or broken-TV texture. The last two clips used it (Her Sabah halftone, Vorathul print grain).
- **Sharpness.**
  - Clean hard contours.
  - Flat, clean colour fields.
  - Crisp type.
- **Colour riot.** A saturated, many-colour palette, built on the orange-vs-blue clash. It is not limited to the two colours.
- **Pace for 153 BPM heavy metal.**
  - Cuts and visual hits lock to the beat.
  - The rule is dead air, not slow animation:
    - chorus, build, final: at most 2 beats without a visible event;
    - verse: at most 4 beats.

## References (vault: Kisi/Klip_Zevk_Kutuphanesi)

- **Arcane "Enemy" from 2:18:**
  - the 2D graphic layer does the show (collage, scribbles, huge type over the characters);
  - two-colour neon clash;
  - RGB trails.
- **Arcane "Ma Meilleure Ennemie":**
  - coloured light falling on the character;
  - transitions;
  - low fps only where it means something.
- **"Nothing Went Foom!":** the ceiling of a coded clip and the target bar. See the measured section below.
- **LGTM and "WHY AM I SLOP?":** the music bar.
  - A short hook that keeps repeating.
  - Contrast comes from drops: the bass or band stops, then slams back on beat 1.

## "Nothing Went Foom!": what we measured, and what we take from it

Burak calls it the nirvana of coded music videos ("bu klip işinin nirvanası"). It is a 300 s clip made with Claude Opus 5.5.
The measurements are in the vault (`Kisi/Klip_Zevk_Kutuphanesi/Nothing_Went_Foom.md`), from a full-frame sonnet analysis on 2026-10-20.

| Measured there | Rule here |
|---|---|
| 0 duplicate frames in 9005 pairs; 93.6 % of frames clearly moving; everything on ones. | No held frames anywhere. At least one layer moves on every 60 fps frame. |
| The camera rests in 67 % of frames, but the layers (particles, type, pen, character sway) never stop. | Life comes from layers, not camera. A resting camera is fine; a resting frame is not. |
| Camera moves: median 17 frames (0.57 s) with an outQuad/inOutQuad ease. Each move ends at exactly zero speed and truly stops. No overshoot or bounce. | Camera moves: 14-24 frames at 30 fps (×2 at 60), `Easing.out(quad)`, then a full stop. No springy overshoot. |
| 70 scene changes; median scene 3.3 s. No unrelated hard cut. About 40 of 70 are dissolve-to-particles-and-rebuild; about 12 are tunnel, zoom, star burst or flash; 9 are whip pans (3-5 blurred frames, then an 18-frame ease to 0). | A new visual idea about every 3 s. Every change is motivated: dissolve and rebuild, a whip, or a burst. Never a plain cut between unrelated scenes. |
| Continuity rides a persistent layer that lives through the change (lyric cursor, pen, floor, particle field). A flash or bloom covers the seam. | A layer that outlives the scenes carries continuity. In this clip, candidates are the two colours themselves, a diff/merge gutter, or the lyric line. |
| Scene changes follow lyric phrases, not beats (18.6 % on beat vs 24.6 % by chance). Small hits are loosely beat-locked (35 % vs 25 %). | Scene changes go on phrase boundaries. Accents and hits lock to beats and words. |
| The character is barely animated: still AI-drawn poses, a light float, and dissolve into a new pose. The face changes every 1-2 frames; the body is almost fixed. | Spend the effort on poses and transitions between them, not limb animation. Puppet rigs are optional. Expression and the environment carry life. |
| The lyrics are literally visualised: receipts become a receipt list, departures a board, padlock a cracking lock. | Lyric images: buttons, conflict markers, `<<<<<<< HEAD`, accept/reject, gradient. Every key word gets its object. |
| Lyrics are designed objects: typography per line, the key word big in red or gold, letters assembling one by one. | Lyric typography is a lead role, designed per line. This is more than Vorathul's slam dose, because the duet is a dialogue. |
| Each verse has its own art language (whiteboard marker, blue technical drawing, fine-line waiting room, sunset silhouettes). The chorus always returns to the same set. | One art language per verse. The chorus has a home set that it returns to and escalates. |

The transition recipe (our stack), measured there and written down 2026-10-20:

- **Card to particles.** Sample the card on a ~120×68 grid into `THREE.Points`, then `pos = mix(home, scattered, p)` with `p = easeOutQuad`. Scatter takes 10-14 frames and gathering 6-10 frames (×2 at 60 fps).
- **Shape to shape.** Sample both images to N points, with a per-point delay.
- **The persistent lyric layer** sits outside the scene sequences.

**Conflict with "sharpness".** Their particles are soft dots and letters. Here the particle units must be crisp: hard-edged colour shards, glyphs or diff characters, in the saturated palette. Never a dot texture.

## Carried lessons (approved or rejected by Burak on earlier clips)

Approved:

- **Real drawn art** for characters and locations, made with Codex image_gen, one image per call.
- **Characters on ones, film at 60 fps.**
  - On-twos characters bothered viewers in PRESS START.
  - Low frame rate only as a meaningful, themed moment.
- **One location per phase.** A static set for a whole clip read as monotonous (Vorathul p1).
- **Frontal camera.** Back or side angles expose card flatness. No black voids, no visible card edges.
- **Typography in a measured dose.** Key-word slams plus location/chapter titles: "tam dozunda" (Vorathul).
- **One big performance moment in a chorus.** Vorathul's mic rock-star show was the loved part ("yalama oldu").
- **The world converts instead of cutting away.** Vorathul's office became his world step by step.
- **Lyric karaoke fill and the chorus montage** (PRESS START).

Rejected:

- Code-drawn stick figures or flat vector people.
- Flat light strips.
- An event-less opening ("başı fazla olaysız").
- Generic "classic" low-poly.

## Process lessons

- **Measure the song first.** Bind every event to a measured beat or word; never guess a lyric time.
- **Style frames before code.** Show the same scene in several styles side by side.
- **Ship 60 fps from the start.** Use the scene clock in seconds; no on-twos layers.
- **Check motion at full frame rate before showing Burak.**
  - Sparse contact sheets miss pops and repeats.
  - Use Gemini motion counts, but verify every "snap" in full frames.
- **Renders run with `--concurrency=1`.**

## Open (decide with Burak at kickoff)

- One-sentence identity.
- The location per section.
- How the two girls look: style frames.
- Where the big performance moment goes.
