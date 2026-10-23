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

## Round 10 (2026-10-22): the paintings fill the frame and live
Burak on proof232-r9: the paintings sat in blurred side bands and read as slides. Full proof:
`video/out/proof232-r10.mp4`. Rules: scene-map.md "Paintings that live (round 10)".

- **One painting path for both families.** `worlds/paintview.ts` (node-safe) computes a painting shot's view at t:
  `paintShotView(shotId, paintingId, t, t0, t1)` from the `LIFE` table (one entry per painting shot: move, direction,
  particle kind and colours, sweep colour and angle, optional pivot) and the per-section `ENERGY` (travel speed, sweep,
  bloom, punch, drift density). `worlds/Painting.tsx` draws it (frame-locked bg quad with depth parallax, sweep and
  bloom; for RK1/RK2/RK11/RK12 a second girls quad at `GIRLS_ORDER`, between the back field and the front one).
  `RestShot` (`restPaintAt`) and `FinaleShot` (`paintViewAt`) report `plate.view.paint` in their state; framecheck
  reads it. The old `PanelLayer`, `paintingView`/`paintingParallax`, `restView` and `film/finale/Painting.tsx` are gone.
- **Assets:** `public/plates/wide/<ID>.webp` (17, commit 4ff5410), `public/plates/depth/wide/<ID>.png` and
  `depth/layers/<ID>-bg.png` (`tools/depthmap.py`, Depth Anything V2 small on the CPU in a throwaway uv env),
  `public/plates/layers/<ID>-{bg,fg,fgb,fgc}.webp` + `<ID>.json` (alpha box and cut edges per drawing;
  `tools/imagegen/greenkey.py`, Upscayl under `tools/locked.sh`, `--selftest` exits 1). The 3:2 plates and
  `plates/depth/<ID>.png` of the paintings are no longer read by the film (kept; delete if nobody wants them).
- **Particles:** `particles/drift.tsx` (`Drift`, layers 'mid' and 'near'), seeded closed-form, kinds dust, embers,
  sparks, confetti, glitter; `driftAdvance(t)` is the downbeat surge, `driftDensity(t)` the section's share. The
  shared `Field` takes the painting's kind on painting shots (`fieldKind`).
- **Checks:** `node tools/slidecheck.mjs --video <mp4> [--start s] [--range a-b]` (`--selftest` exits 1);
  `framecheck` now fails a painting that leaves the frame uncovered, shows < 97 % of its 3:2 centre, has a card over
  it, or whose girls are cut on a side their drawing was not (beyond the 1.5 % the push hides) or leave a gap on a
  side it was. `FINALE_FADES` (FinaleShot) are left out of the slide measure.
- **Open conflict for the architect:** `tools/intensity.mjs` fails one rule on proof232-r10: the scream measures
  1.07x the chorus (cap 1.0; proof232-r9 0.99x). The scream was already at its cap, and its painting (QK2, 0.67 s)
  went from 5.51 to 13.61 to clear the slide floor (0.5x the scream's live median 26.14 = 13.07). Even at the floor
  the scream stays ~1.05x, so the two rules cannot both hold without calming the scream's live shots: lowering its
  punch/kick (0.05/0.12 -> 0.04/0.08) gave 1.05x, its shake (10 -> 6 px) did nothing to the section; both reverted.
  Options: raise the scream's ceiling to 1.1x (the solo has 1.15x), or exempt the scream's painting from the floor
  (QK2 at its r9 level keeps the scream at 0.99x).
- **Weak spots / next:** the parallax is one-sample on the depth map, so a large slide stretches the far pixels that
  border a near object (most visible on RK11's rubble edge and RK5's faces at their shot ends); the RK11 walk loop
  plays at the outro's 3 drawings a beat, quick for a walk; the girls' plane uses one depth for both girls.

## Round 11 (2026-10-23): the dawn split, the particle cap and the type and repeat fixes
Burak on proof232-r10: "çıta çok yukarı çıkmış"; his note on the dawn walk plus the Gemini findings he confirmed.
Full proof: `video/out/proof232-r11c.mp4`. The two earlier renders are kept, not overwritten: `proof232-r11.mp4`
failed slidecheck on RK5 (0.47x) after the particle cap took the confetti's size; `proof232-r11b.mp4` lifted the
chorus paintings (more drift particles, peak travel 18 %) and then put the scream at 1.104x its 1.1x ceiling, so the
scream's painting (QK2) travels at most 7.5 % (`LIFE.travel`): scream 1.09x, QK2 0.51x its floor's base. Both rules
are tight there; any change to the scream's shots needs a re-measure of both. Rules: scene-map.md "Round 11".

- **Dawn:** `dawn` (RK11) is two bars; `dawn-us` (RK13, layered, `inserted: true`) takes the rest up to the title.
  RK13: `tools/imagegen/upwide.py` (Upscayl to 3640x2048, no outpaint), `greenkey.py RK13` (reads stil/prompts/
  x-layers too), `depthmap.py wide/RK13 layers/RK13-bg`. Girls depth 0.6 (the depth map puts them at 0.19 against a
  near sky), no bob (cut at the bottom), push about their heads (`LIFE.focus`). `shotSlot()` keeps the approved
  shots' move directions and cover kinds when a shot is inserted. Walk loops: `LAYERED.walk` -> `loopIndex(t, 1)`.
- **Particle cap:** `particles/cap.ts` (`PARTICLE_MAX_PX` 28 at 1080 lines, `useParticleCap()` from the canvas);
  all five point shaders (field, drift, dissolve, groove sparks, kit embers) use `min(size, uMaxPx)`;
  `tools/particlecheck.mjs` (`--selftest` exits 1). Drift counts went up (700/420) to keep the paintings' motion.
- **Type:** the Ring form is deleted and `typecheck` fails a retired form; v-midnight is a Stack beside the clock,
  f-tree a `git log --graph` terminal line; Marquee: whole line shown, unsung words at 45 % of their colour, a key
  word inside the line stays on its row; r-squash in plainer faces (`Stack faces`) in a box its landing and its avoid
  move keep in frame; the two-girls line stands in the bottom band (choruses and finale; RunwayLine is unused);
  "I can't take control" upright in screen space at y 790 in both choruses (a roll-following lean drew differently
  in the type layer than in the frame); chorus 1 ends on a laser cover.
- **framecheck --type** renders every active plan entry alone at every sample (`entries` in samples.json) and
  `typeframe.py` checks each: `edge` (GlitchText and RunwayLine boxes inside the margin), `small` (every line's cap;
  a line under a third of its form's biggest and under 5 % is "pressed flat"), `dim` (an unsung marquee bulb at
  >= 30 % of the same bulb lit, from a `lit_<id>` render 0.12 s before the entry ends). On proof232-r10's tree the
  sweep found: dim at soul (59.0, 101.5), r-red (76.0, 76.5), f-figured (168.5, 169.0); edge at control (62.5-63.5),
  one-line (47.5, 90.0), f-line (167.0, 167.5); the squash row pressed to 3.8 % under 14.4 %.
- **Busts:** the live camera keeps a bust card's cut edge below the frame (`livecam.ts` limit); `framecheck` fails
  any frame showing it (r10: yes1/yes2/yes3 at 161.88, 163.48, 172.48, plus six runs of 3-57 px in 51-117 s). The YES!
  busts sit at x ±3.9 and the split's push is 0.2.
- **Repeats:** `tools/repeatcheck.mjs` (`--selftest` exits 1): no (scene, cam, move) twice in the finale, a
  painting once, the logo move exempt. 26 shots changed camera or move; the second RK8 is QK1 (`impact`).
- **OV1:** `historyString(t)` in RestShot: the commit-bulb string from the chain's cut end (per loop drawing) off
  the right edge, jerking on each new drawing; verified by projecting its far end through `filmStateAt` on every OV1
  frame (139 frames, far end x >= 2026 px).
- **Open:** typecheck 0-232.12 fails its 6-forms-per-30 s rule at 127-157 (5 forms; it was 5 on r10 too: the solo
  has no lyrics). The per-form margin sweep also found plane-carried and flying forms crossing the margin while they
  move (v-head, the Stamps, the Logo halves, r-rebased, r-gone, r-data2, v-orange, f-equals): not gated.

## Round 11d (2026-10-23): the re-cammed shots that exposed the set
The architect found that the repeat fix (5dee335) framed some finale shots off their set (black void, a tilted LED
wall) and lost the blue girl in two face duels. Full proof: `video/out/proof232-r11d.mp4`.
- **Re-cammed again** (still unique for `repeatcheck`): yes2 reverse push, yes3 hero dollyzoom, sky-faces hero still,
  outro-faces reverse push, tunnel-3 hero still, outro-dive hero orbit. The other 20 re-cammed shots pass both new
  rules.
- **A girl the shot sets stays a subject:** the finale state reports `authored` (the shot entry's non-null B and O,
  not scattered); `framecheck` fails a frame where one of them is not a subject (r11c: sky-faces 198.17-198.83,
  outro-faces 221.58-222.92; selftest case "blue lost").
- **The set covers the frame:** `framecheck --set --range 140.04-232.12 [--fps 4] [--all]` renders the frame without
  the type twice, plain ('world') and with the worlds' dark backdrops keyed magenta ('worldkey'; `layer.ts` also has
  'set' and 'setkey' without the girls). Where the two differ by nearly the whole key, the backdrop is bare;
  `tools/setframe.py` erodes that mask by 15 px (the LED walls' and floors' translucent gaps) and fails a frame with
  more than 1 % of its 24 px border band bare. The girls count as set: measured without them the approved YES!
  frames read 64 % bare behind the busts. Designed voids (not measured): quiet, flight, line, walls, logo, terminal,
  title, faceO, faceB. Measured limits: split/duel 42 % (approved up to 39 %), tunnel 82 % (approved up to 77 %).
  On r11c's plan it fails yes2 54.7 %, yes3 57.3 %, sky-faces 53.3 %, outro-faces 54.0 %, tunnel-3 88.8 %,
  outro-dive 98.2 %. It is not gated before 140.04 s (the earlier families have no scene table; their dark worlds
  are unmeasured).

## Round 11e (2026-10-23): the set rule on every frame
The 4 fps `--set` run stepped over yes3's last 10 frames (172.58-172.73: the wall turned into a tilted panel before
the burst). Full proof: `video/out/proof232-r11e.mp4`.
- **yes3** is `hero still` (its worst frame 27.5 % bare); the other 25 re-cammed shots are unchanged.
- **`framecheck --set` covers every frame by default:** the frame without the type is rendered twice as half-size
  4:4:4 videos (plain 'world' and keyed 'worldkey', `renderMedia`, concurrency 1 under the render lock) and
  `setframe.py --video` compares them frame by frame (erosion 7 px, band 12 px at half size). 140.04-232.12: 5526
  frames in about 13.5 min (9.2 min rendering, 4 min comparing). `--fps N` keeps the still sampling.
- **Why not a prefilter on the rendered film:** a darkness score of the film's border is not selective in this dark
  film (the lowest score among frames the keyed run measured over 1 % was 0.127; 5022 of 5525 frames score >= 0.06)
  and it cannot see under a cover (172.73 s scores 0.0 in the film while its set is 57.7 % bare). Rendering every
  frame as video was faster than rendering a prefiltered set as stills.
- **Limits from the approved framings' worst frame** (every frame, r11d's tree): split/duel 53 % (chant-faces-2
  51.4 %, yes1 43.2 %), tunnel 86 % (dive-b 83.7 %). On r11c's plan the every-frame run fails yes2 (163.48-163.72,
  up to 60.0 %), yes3 (172.48-172.55, 71.2 %), sky-faces (198.18-198.60, 57.2 %), tunnel-3 (206.87-207.40, 97.1 %),
  outro-faces (221.58-222.10, 57.0 %) and outro-dive (225.58-226.92, 98.6 %). setframe's selftest has an 8-frame void
  at a shot's end that the 4 fps samples pass and every frame fails.
