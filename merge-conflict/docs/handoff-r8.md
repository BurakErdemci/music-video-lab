# Handoff: round 8 (140.04-232.12 s), notes for the quality pass (2026-10-22)

Round 8 built the last section of the song as one new shot family, `video/src/film/finale/`. The full-film proof is
`video/out/proof232-r8.mp4`. The measured results are in the round-8 report; this file holds what the quality pass needs.

## Where things are
- `film/finale/plan.ts`: the shot table `FSHOTS` (world, camera variant, move, painting, girls), the girls' poses
  `FBLUE`/`FORANGE` (derived from the shots), the hit times `FHITS` and the type plan `FINALE_TYPE`. Sections come
  from take-v4 by name (`piano_interlude`, `build`, `final_chorus`, `post_chorus_chant`, `robot_build_failed`,
  `scream_end`, `outro`).
- `film/finale/FinaleShot.tsx`: the component and `finaleStateAt` (wrapped by `liveCamera`, so framecheck measures
  what renders). The cameras reuse the worlds' hero moves through `shotkit.variant` plus a local copy of the rest
  family's `moved`/`kick`. The build is one shot (`flight`) whose camera is `flightPose(t)`.
- `film/finale/type.tsx`: every finale type entry drawn in screen space; no knockout (placed off the faces by band).
- `film/finale/logo.ts`: the resolved logo move (fly in from 1300 px, lock on "conflict").
- `film/finale/frames.json` + `frames.ts`: face/action boxes of the 32 round-8 cards and their in-betweens, merged
  into `CARD_FRAMES` when the finale loads (the shared `public/cards/frames.json` belonged to the 7d lane).
- `video/src/events.ts`: tokens of lines 49-66, piano breaths every second beat, build/final pulses every beat,
  final sparks every second offbeat, metal hits every beat (sparks every second offbeat in the chant and scream end).
- `film/typeplan.ts`: `FINALE_TYPE` appended to `TYPE_PLAN`. `Film.tsx`: the `finale` shot replaces the placeholder.
- `tools/intensity_finale.mjs`: the 140-232 intensity rules (`--selftest` exits 1).
- `public/cards/<id>.points.json` for the round-8 cards that dissolve (tools/card_points.py).

## Shot list
See the round-8 report (and `FSHOTS`). In short:
- piano: RK1 → BP1 (gathers from particles, `- color: blue;` diff) → OP1 (gathers, wave) → RK2;
- build: one continuous flight; BP2/OP2 rise in front of RK3 ghosted at 0.3, scatter into the branches on "Two
  branches" (155.18), the painting lights up and the camera flies on (fov 50 → 30, the plate grows 1.02 → ~1.3 frame
  widths, inside 1.25x), the tunnel cover at 160.04 carries it into the arena;
- final chorus: arena PB1/PO1 → YES! split busts (PBX/POX) → PB3/PO3 reach → RK4 → gradient spin PB6/PO6 → runway
  "two girls, one line" (reaching, not back to back) → RK5 → high five PB5/PO5 → accept → push PB2/PO2 → RK6 → walls
  (they push them apart) → line (PB4/PO4) → the logo move resolved, PB5/PO5 riding the halves → RK7 → spin → burst;
- chant: forge headbang BH1/OH1 → duel faces → RK8 → tunnel stage dive BH2/OH2 → cathedral → ... (metal);
- build failed: BH3 deadpan on the intro's terminal → OH3 jaw drop → RK9 freeze (hard cuts, no camera move);
- scream end: RK10 → sky scream BH4/OH4 → OS4 guitar smash (anticipation, smash on the downbeat) → BS4 keytar → ...;
- outro: RK11 dawn walk → the resolved title → a last metal round → RK12 final freeze, fade to black on the last note.

## Decisions taken without Burak (write them into the scene map if he agrees)
- **Piano costume:** the brief said disco; the costume table says "plain (soft)". The piano cards BP1/OP1 and the
  paintings RK1/RK2 are drawn in the disco outfits, so the piano shows disco; the grade is soft (amount 0.28-0.3).
- **Girl moment from the git lines:** BP1 and OP1 gather out of particles (card point clouds) as their lines appear
  (blue's as a diff striking `color: blue;`), the nearest the existing machinery gets to the "rebuilt from their own
  git lines" glyph moment; a true letters-to-girl glyph cloud is not built.
- **The build is one continuous shot** (8 bars, against "a scene every 2-4 bars"), as Burak approved the flight. After
  Burak's morning notes (paintings whole, no card over a painting) the flight is no longer a push into a cropped RK3:
  the girls (BP2/OP2) float up in the light-box rig (LogoWorld: LED wall, laser fans) while the camera accelerates in
  on them (fov 50 -> 30, forward and climbing, a sway that widens bar by bar); on the build's last downbeat (158.72)
  they scatter into particles and RK3 takes the frame whole, coming up from mid light, with no card over it; the
  tunnel cover at 160.04 dives into the final. The scatter sits on the last downbeat, not on "Two branches" (155.18),
  because the bar after an earlier scatter measured less motion and broke the monotonic rise.
- **Pushing into RK3** needs the shared painting code to allow a push (it locks the painting to the frame at 97-100 %
  of its height). Not built here ("use the shared code"); see the requests.
- **Final chorus forms:** "Accept both" lines as Stack / Stamp / LightBox, YES! as a chrome Shout, "gradient now" as a
  Wave, "two girls, one line" on the runway (they reach for each other, chorus 1 had them back to back), "Commit and
  push it" as a terminal Code panel, equals as Extrude (the walls; the girls push them apart), the logo move resolved
  (halves fly in from 1300 px and lock on "conflict", `aligned` letters), "resolved inside my soul" as a Stack.
- **Chant type as git deploy objects:** stamps, a deploy counter 0-100 %, SHIP IT! steel shouts in gold on the red
  cathedral (red on red read 2.9:1).
- **Scream end and outro are instrumental:** to keep >= 6 forms per 30 s the epilogue carries non-lyric type on line
  67: AAAAAAAH!, `fix: line 42` HUD, a 0-300 commits counter, BUILD PASSING, SHIPPED!, `merged.`, the resolved title,
  `* Merge branch 'orange' into main`, `resolved.`.
- **Paintings (Burak's morning notes):** every RK shot passes `kb` (its progress) to the shared whole-painting code;
  the extra cuts inside a painting (rk4-b, rk5-b, rk7-b) are gone; the non-lyric epilogue words left the paintings
  (`merged.` is cut, `resolved.` moved to the last metal shot before RK12); type windows open on their first word.
- **Covers:** one 6-frame cover per 4 s for the whole section (the rule says from the scream to the end); the metal
  covers are 'tear' (the 'fire' cover flashed 4 times in 5 frames). Other cuts are hard cuts or a shock inside a world.
- **Metal worlds flash on every second kick** (on every beat the forge flashed 3 times a second, a cut made 4).
- **The final chorus's events** got a confetti burst on every second offbeat (events/beat 1.69 was at the 1.68 limit).
- **Floor:** the piano's quiet stage gets a split blue/orange tile floor so the contact shadows read.

## Requests for files this lane did not own
- `public/cards/frames.json`: absorb `film/finale/frames.json` (68 entries with soles) and then drop `film/finale/frames.ts`'s merge.
- `rig/ripple.ts` TIER `piano_interlude: 0` turns the drawn loops off in the piano (loopRate 0); the brief wanted
  slow loops there. A per-section loop rate (1 drawing per two beats in the piano) would need `rig/loop.ts` to read
  its own table instead of the ripple tier.
- `worlds/plate.tsx` `PlateLayer panel`: an optional `push` (0..1) that scales the whole painting from its fitted
  height toward 1.25x pixels (heads may leave the frame only while pushing), for the build's flight into RK3.
- Painting Ken Burns restarts per shot: a second framing inside one painting pops 3 %. The finale holds one shot per
  painting; a `kb` that runs across several shots of one painting would allow cuts inside it.

## Round 9 changes (2026-10-22)
Part A, finale polish (140.04-232.12), and part B, GIT! PUSH! FORCE! rebuilt (120.03-125.36). Full proof:
`video/out/proof232-r9.mp4`.

- **Moving paintings** (`film/finale/paint.ts`, `film/finale/Painting.tsx`): a frame-locked quad whose shader places the
  painting (height, offset, depth parallax with a near swell about a focus) and fills the rest of the frame with its
  blurred, darkened copy. `restView` keeps a painting whole (height 97 -> 100 %, a sideways drift inside the side
  bands, the near pixels leading the drift): RK1, RK2 and RK11 (`RESTING` in FinaleShot). `flightView` is the build's
  flight into RK3: whole on the first downbeat, then an accelerating push toward the meeting hands, climbing into the
  fork, a pulse on every beat, capped by the pixel rule (peak 1.196x at 2K). On the sixth downbeat (`BRANCHES_AT`,
  156.06) the camera goes through into the light-box rig, where BP2/OP2 gather and rise for the last three bars.
  `paintViewAt(t)` (FinaleShot) is what both the component and any check should read.
- **Piano:** a soft light band drifts across the girls every two bars (`lightOf`, scene 'quiet').
- **Flap** ("same file, different times"): three rows of 16 cells, ~79 px letters in near-white ink, at y 680.
- **Scream end** (196.15-213.54): no set more than twice. New scenes `stadium` (W07, StadiumWorld), `fire` (W05,
  FireWorld, its own close `FIRE_CAMERA`), `graffiti` (W03, GraffitiWorld), `faceB` (blue's face insert in her own
  blue), and RK8 again (`rk8-scream`).
- **GIT! PUSH! FORCE!** is its own family, `film/push/PushShot.tsx`, spliced in `Film.tsx` (verse4 | push | whisper-solo);
  `film/rest` still holds the old push shots but never draws 120.03-125.36. Four shots on one stage (fire left, cold
  blue right): GIT! two-shot, the charge (one push, one BMX1 cut-in, OF2 leap), PUSH! (one wide shot: the ring crosses
  the floor, hits blue's soles at +0.22 s, BB1 -> BF2 thrown out of frame right), FORCE! (OF4 low). Blue in the PUSH!
  shot is an `extra` (drawn, not held by the framing guard). The GIT!/PUSH!/FORCE! type is drawn here (positions for
  this geography); the HUD is the rest family's `GitHud`. BB1/BF2 boxes: `film/push/frames.json`.
- **Checks:** `node tools/pushcheck.mjs` (both girls in frame at the PUSH! cut, the ring's leading edge between them,
  blue's action box moves >= 40 % of the frame width, one shot in 124.32-125.02).
- **Shared fixes after 7d (round 9):**
  - `rig/loop.ts` `RATE`: the piano plays its drawn loops at one drawing every two beats (the ripple tier stays 0).
  - `film/framing.ts` `plate.view`: a painting the finale places itself reports its height, offset, magnification
    and whether it is the flight's push; `framecheck` measures that, so the flight may crop RK3 but never pass
    1.25x, and a resting painting must stay whole (selftest extended).
  - `framecheck` no longer skips the glyph-size floor in 120.03-125.36 (`CAP_EXEMPT` is empty).
  - `covercheck` drops rest covers lying wholly inside the push family's span (none today) and adds
    `pushCovers()`; a cover both families draw a part of (the whisper's) counts once.
  - `worlds/plategeo.ts` `plateView`: the plate's cover is computed from its real on-screen lean (0.75 x roll; it
    turns with a quarter of the camera roll), and past `MAX_LEAN` the plate turns further with the camera. Chorus 2's
    barrel rolls (104.8, 105.9 s) showed black corners before.
  - **Ground check definition (accepted by the architect):** `framecheck --ground` skips a sole when the camera
    roll is past 40 degrees ("camera rolled past 40 degrees"): there the floor is not below her soles on screen, so
    the band and the floor beside sample the plate (105.85 s, BC1, chorus 2's spin-out).
  - **Type over type:** the composition takes `only` (a type-plan entry id, or `'__none__'`), honoured by the four
    type loops (`typeShown` in `layer.ts`). `framecheck --type` renders every active entry alone where two or more
    are on screen and one has settled, and `typeframe.py` fails a settled form more than 2 % covered by another
    form (`overlap`, in the selftest). Type outside the plan (HUDs, the push family's words) is not isolated.
