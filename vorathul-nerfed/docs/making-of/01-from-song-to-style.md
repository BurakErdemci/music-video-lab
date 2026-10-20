# Making-of, part 1: from a Suno song to a visual style

*20 October 2026 · one long session, Burak directing, Claude Code (Opus) as the main loop, Codex
`image_gen` for pictures, Sonnet sub-agents for measurement and scaffolding.*

This is the honest version: what we tried, what was wrong, and what the numbers said. Nothing was
drawn by hand. Every image below came out of a text prompt; every timing came out of a script.

## 0. Picking the song

Two songs made in Suno (Pro), both comedic metal:

- **Merge conflict** — kawaii-metal duet, two girls fighting over line 42 (blue vs pink button).
- **Vorathul, nerfed** — symphonic villain anthem about a final boss nerfed in a patch.

We picked Vorathul first. The lyrics already describe pictures you can point a camera at
("health reduced by forty percent", "can now be skipped", "volume reduced"), it has **one** main
character instead of two singers trading lines at 185 BPM (character motion was the hardest part
of the previous clip), and it has an emotional turn ("I was built to be loved / by being hated").
Merge conflict is next.

**Getting the audio out of Suno** did not work from the agent side: the share page's `audio_url`
is literally `api/forbidden` without a login, and all four direct CDN guesses returned 403. Burak
was away from his PC, could not reach Google Drive, and the chat upload limit was below the 50 MB
WAV. What worked: a private GitHub repo with a **draft release** — browser uploads to a release
take up to 2 GB, while uploading into the repo tree from the browser stops at 25 MB.

## 1. Measure the song before drawing anything

The style prompt we gave Suno said *170 bpm, sudden stops, a key change up in the final chorus*.
We treated every one of those as a claim to measure (`tools/timing/`, librosa + faster-whisper +
demucs stems). Results (`data/timing-summary.md`):

| Claim in the prompt | Measured |
|---|---|
| 170 BPM | **~186 BPM** in 7 of 11 segments; the interlude slows to 176.6 |
| Key change up in the final chorus | **None** — chroma correlation 0.955 at shift 0, 0.366 at +2 semitones |
| Music stops for the announcer | The band drops 10–14 dB; the only true silence is **78.3–78.8 s** |
| (not in the lyrics) | A 28-second wordless riff at 0:21–0:49 |
| Soft piano interlude | Only 2.3 dB quieter than the chorus — the whole song is heavily compressed (top 10 bars within 0.7 dB) |

Why this matters for the picture:

- No key change means the climax has to be **visual**; the music will not lift it for us.
- A flat-loud song means the dynamics (dark/bright, near/far, still/busy) have to come from the
  image.
- The wordless riff became the place for the boss fight.
- Every joke is bound to a **measured word time**. In earlier clips we bound lyrics to guessed times
  three times and all three were wrong.

We also asked Gemini to listen and describe each section. It was useful for instrumentation and
mood, and wrong on numbers: it claimed a +2 semitone key change, 155–170 BPM, and "total silence"
under the announcer. Model listening is an opinion; the scripts are the measurement.

## 2. Story before style

The first idea: two worlds colliding — a grand gothic painted world for Vorathul, and a sterile flat
software UI from which the patches arrive. Burak added the ending: once his power is back, Vorathul
**crosses into the other world and destroys the people who nerfed him**.

Then, seeing a frame where a gauntlet breaks out of a gilded frame, Burak turned the style into the
story: in the studio office there is a **painting of the game on the wall**. Developers make every
change through that painting, the change lands in Vorathul's world, he slowly notices the sky is a
canvas, and at the end he breaks the painting and steps into the real world. Contract:
[`docs/scene-map.md`](../scene-map.md).

## 3. Finding Vorathul — six rounds

Every round: one prompt per image (in an earlier project, August 2026, Codex returned zero files
when asked for two or three images in one call), all images in parallel, then a contact sheet,
then Burak picks.

### Round 1 — "Baroque oil painting, demon-king, organ-pipe wings"

<img src="img/r1-a-demon-king.jpg" width="49%"> <img src="img/r1-b-cathedral-body.jpg" width="49%">
<img src="img/r1-c-bone-king.jpg" width="49%"> <img src="img/r1-d-dragon-demon.jpg" width="49%">

Epic, but gold-and-ember and generic. The office side, same round:

<img src="img/r1-office-a-sterile.jpg" width="49%"> <img src="img/r1-office-b-ui.jpg" width="49%">
<img src="img/r1-office-c-isometric.jpg" width="49%"> <img src="img/r1-collision.jpg" width="49%">

The collision frame (right) proved the two-world idea in one image.

### Round 2 — Burak: "pitch black and dark purple, really frightening"

<img src="img/r2-a-mask-king.jpg" width="49%"> <img src="img/r2-e-hooded.jpg" width="49%">
<img src="img/r2-b-cathedral-body.jpg" width="49%"> <img src="img/r2-office-painting.jpg" width="49%">

Purple took over everything. Burak: the body should be **matte black, a black knight**; purple only
on the crown, the weapon, small trims. And the key idea: paint his world in the **opposite colours**
so that he reads as a **black hole** in it.

### Round 3 — matte black knight in a golden world

<img src="img/r3-a-helm.jpg" width="49%"> <img src="img/r3-d-black-hole.jpg" width="49%">
<img src="img/r3-c-portrait.jpg" width="49%"> <img src="img/r3-b-arms-open.jpg" width="49%">

The black-hole effect worked (right: light bends toward him). The character design was approved.
But Burak: *"too polished, too realistic — this is just ChatGPT's default image look."* He was
right; it was the house style of the image model, not ours. (Also: round 3 b asked for a mask and
got a helm again.)

### Round 4 — the same scene in five techniques

Same character (round 3 d as reference), same pose, five named techniques, plus an explicit
"NOT glossy digital painting, NOT cinematic lighting":

<img src="img/r4-1-manuscript.jpg" width="49%"> <img src="img/r4-2-engraving.jpg" width="49%">
<img src="img/r4-3-comic.jpg" width="49%"> <img src="img/r4-4-stained-glass.jpg" width="49%">
<img src="img/r4-5-tarot.jpg" width="49%">

Illuminated manuscript, engraving, **graphic noir comic**, stained glass, Art Nouveau tarot.
Burak picked the comic (r4-3). It keeps the black hole strongest — a solid flat black mass — and
it is the easiest to animate: flat fills and hard edges cut cleanly into rig parts, and comic
impact panels suit a fight. Engraving was beautiful but fine hatching shimmers in compressed video.

### Round 5 — the comic style, character states

<img src="img/r5-1-turnaround.jpg" width="49%"> <img src="img/r5-4-fight-phase3.jpg" width="49%">
<img src="img/r5-2-nerfed.jpg" width="49%"> <img src="img/r5-5-office-painting.jpg" width="49%">

The second form was too weak the first time (left), then right on the second try:

<img src="img/r5-3-second-form-weak.jpg" width="49%"> <img src="img/r5-3b-second-form.jpg" width="49%">

Burak: *"really frightening."* He also found the wings weak (they read as towers), so two wing
designs, and a new nerfed state where the missing-texture checkerboard takes the **exact shape of
the wings**:

<img src="img/r5-6a-wing-fan.jpg" width="49%"> <img src="img/r5-6b-wing-bone.jpg" width="49%"> <img src="img/r5-7-nerfed-v2.jpg" width="49%">

Fan wings won: each pipe is a separate part that can be deleted, corked or relit.

### Round 6 — one canonical sheet

<img src="img/r6-canonical-sheet.jpg" width="49%">

Burak flagged that the character drifted between images. The fix: one canonical turnaround sheet,
a fixed feature list repeated in every prompt ([`stil/onayli/KARAKTER.md`](../../stil/onayli/KARAKTER.md)),
and two reference images (style + sheet) on every call. A reference alone was not enough in earlier
work. Two drifts remain on this sheet (two eyes instead of one slit in the front view, a thinner
sword in the side view) and will be fixed in the final drawings.

## 4. Things that went wrong (and how they were caught)

- **A parallel image job copied its neighbour's picture.** `6a-kanat-yelpaze.png` and
  `3b-ikinci-form.png` had the same size and the same minute; `md5sum` showed they were identical.
  Each Codex run writes to its own folder under `~/.codex/generated_images/<session>/`; the session
  folder with a single image that no file matched was the real wing picture. Rule since then: md5
  every round.
- **Model ids:** `gpt-6.1-luna`, `gpt-6.2-luna` and `gpt-6.1-luna-mini` are rejected for a ChatGPT
  account (400); `gpt-6-luna` works. We switched to Luna for images when the main Codex quota ran
  low; Burak expects the stronger model to keep characters more consistent.
- **Over-trusting a model's listening** (see §1).

## 5. Approved frames

All in [`stil/onayli/`](../../stil/onayli/) with the exact prompts that produced them.

Next: the Remotion + Three.js skeleton (a 2.5D stage of flat unlit cards, one WebGL canvas), the
cut-out rig, and the first 30–45 seconds.
