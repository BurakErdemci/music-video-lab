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
- **"Nothing Went Foom!":** the ceiling of a coded clip, and Burak's bar.
  - Particle transitions: things dissolve and rebuild instead of cutting.
  - Designed lyric typography.
  - A new art language per verse.
  - A new visual idea about every 3 s.
- **LGTM and "WHY AM I SLOP?":** the music bar.
  - A short hook that keeps repeating.
  - Contrast comes from drops: the bass or band stops, then slams back on beat 1.

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
