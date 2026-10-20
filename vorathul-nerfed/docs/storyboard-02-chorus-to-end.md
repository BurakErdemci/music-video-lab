# NERFED — storyboard 2: chorus 1 to the end (1:40.00–4:33.84)

Scenes 7–17 of [`scene-map.md`](scene-map.md). Same conventions as
[`storyboard-01-intro-to-unfair.md`](storyboard-01-intro-to-unfair.md): every time comes from
`data/timing.json`, frames are `round(t × 30)`, times are `mm:ss.cc`, "beats" are fractional
positions on `beats[]` (the beatcheck `beatPos`), anchors use the `events.ts` notation
(`beat[i]`, `hit[i]`, `word('x', n)` = nth match, with the exact `timing.json` text quoted).
The shot table, Appendix A and the dead-air table (§1.3) are generated from one plan file that was
run through the beatcheck dead-air logic before this was written. The one event already in
`events.ts` in this stretch (`hated` f5882, `word('by being hated', 0)`) keeps its frame.

The brief for this half: Vorathul never stands still and fires an effect. Every cut gives him a new
pose, a new place in the frame and a new depth; the fight uses eight distinct attack styles and no
two consecutive attacks share a type or a camera (§2). The colour language is the Arcane "Enemy"
2:18+ grammar — hard palette switches, two-colour grades, chromatic echo trails, sticker-cutout
collage, scribble overlays, beat-locked hard cuts, white-outs — but only in this film's three
palettes plus the deletion magenta, and the strongest collisions are where painting and office
touch (§3).

---

## 0. Stage conventions added in part 2

Part 1 §0 (depth layers P0–P6 / O0–O3, named cameras, impact recipe, no morphing) applies
unchanged. Additions:

### 0.1 New cameras

| Name | Stage | Pose | Notes |
|---|---|---|---|
| `HIGH` | P | (0, 30, 18) → (0, 0, −15), fov 40 | P3–P5 cards get a billboard pitch (rotation.x = camera pitch) so they face the lens like a paper theatre seen from the balcony; the floor plate stays flat. A true top-down view of the front-only rig is impossible; this is the stand-in |
| `OTS-HERO` | P | (x, 1.6, −4) behind a hero card at z −5, scale 1.6 | the hero's back fills the left third, out of focus by a pre-blurred variant of its card |
| `OFF-LOW` | O | (0, −5.6, −2) → (0, 0, −14), fov 60 | office floor height; Vorathul's hero angle once he is in the office |
| `OFF-HIGH` | O | (0, 9, −12) → (0, −6, −13), fov 50 | from the ceiling; billboard pitch as `HIGH` |
| `OTS-DEV` | O | behind a developer cut-out at O2 (z −8) | the developer occupies one third, running or staring at a monitor |
| `UNDER-DESK` | O | (2, −5.4, −6) under a desk card, desk edge across the top fifth | the hiding developer's back in the lower left |
| `OTS-CURSOR` | O | 1.2 units behind the lead cursor of the swarm | the cursor arrow is 1.5 units tall at this distance |
| `LENS` | either | dead on the lens axis, locked | used only for drawn key stills that come straight at the camera |

### 0.2 The office stage after the breakout

The office floor is at y −6.2. Developers are about 3.4 units tall. Out of the painting Vorathul
is **8.5 units** tall (helm just under the ceiling strip at y 2.6): colossal in the office, the
way he was colossal in the cathedral. His root is on the office floor between z −16 and −6; the
painting card (16 × 9 at z −20) becomes the broken frame behind him. Every Vorathul card in the
office keeps its painting texture (ink, dry brush): he is a painted thing walking through a flat
vector room, and the paint he sheds (§3, X17) is how the room changes style.

### 0.3 How the rig stays in motion

- **Pose on the cut.** A cut may change any pose without a transition (rig §5.2 cut-only edges
  apply to anything at a cut). Most chorus and fight shots are 1–4 beats long, so he arrives in a
  new pose, a new screen third and a new depth on every cut. The pose and root placement per attack
  are in §2.
- **Attack chains.** An attack is `*_antic` → `*_strike` (arriving on the anchor frame, rig §5.2
  strike easing) → `*_follow`, one move. Between moves the root keeps drifting (x/z, 0.02 units a
  frame) and the cape and pipes keep their secondary motion, so no frame is a dead hold. The rig's
  30-frame hold rule conflicts with this in the final fight (open question 1).
- **Drawn key stills** (K1–K4, §5) replace the rig only on the 2–6 frames where a pose cannot be
  reached front-on (a thrust into the lens, claws at the lens, a deep crouch, the enthroned blast
  frame). They are cut in on an impact frame, under the posterise flash, so the swap never reads.
- **Nerfed state (S46–S73)** is a set of rig state tracks, not a pose: root scale 0.55 (0.35 after
  S48), crown `small`, slit `sad`, runes 0, pipes `dark`; from S54 the fan is gone (10 pipes `gone`,
  6 folded, the magenta checker outline of the fan behind him); from S65 the 6 are `corked`. The
  final chorus reverses each track on screen, in the lyric's order (health, wings, rage).

---

## 1. Shot list

### 1.1 Table

Dead air = the longest gap in beats between consecutive events inside the shot, cut and next cut
included; the limit is the one beatcheck applies to the section of the cut (Chorus, Build, Final
Chorus, Outro 2; everything else 4).

| Shot | Time | Frames | Beats | Anchor (cut) | Camera | On screen (cards, rig poses, placement) | Event on the anchor | Dead air / limit |
|---|---|---|---|---|---|---|---|---|
| **Scene 7 — Chorus 1** | | | | | | | | |
| S46 | 01:40.00–01:42.23 | 3000–3067 | 6.9 | `beat[308]` 100.008 | `WIDE`, static | Nerfed status in one picture: Vorathul at root scale 0.55 in the centre of a cathedral now far too big for him; `slump` pose; slit `sad` 0.4, crown `small`, runes 0, pipes `dark` (fan folded, s 0.2); the S41 sticky note still on his helm; painted HP bar at 60 %. Paint flakes from S45 settle | nerfed wide | 2.07 / 4 |
| S47 | 01:42.23–01:45.97 | 3067–3179 | 11.6 | `word('in', 0)` "in" 102.22 | `LOW`, tilt up to the sky and back down | Three gold stone tablets fall out of the sky, the patch-note lines engraved on them in Anton: HEALTH −40 %, METEOR RAIN: REMOVED, PHASE III: REMOVED (the office card text in the painting's own language). Pose `slump` → tablet 3 squashes him (root scale y 0.9 for 4 frames) | tablets in the sky | 1.97 / 2 |
| S48 | 01:45.97–01:49.97 | 3179–3299 | 12.4 | `word('Nerf', 1)` "Nerf" 105.98 | `CLOSE`, push 4 % per shrink step | Stamp 2 lands on his chest: UI-blue "NERFED" ink on black armour. He shrinks in steps (root scale 0.55 → 0.45 → 0.35, each a 2-frame pop) on "god" and "dust"; on "dust" he is a puff of ivory dust for 3 frames. On "gloom" office grey seeps through the gold for one beat | STAMP 2 on his chest | 2.07 / 2 |
| S49 | 01:49.97–01:55.07 | 3299–3452 | 15.8 | `word('I', 2)` "I" 109.96 | Screen-space collage, static; shake small per panel | Sticker-cutout collage of his old glory: three torn-paper panels (crops of approved frames 06, 04, 03) in a hard black/violet duotone with an ivory sticker border slam in and form a paper wall. Behind it something bulges; the level-12 kid bursts through the paper toward the camera (first appearance) | torn paper ground | 1.97 / 2 |
| S50 | 01:55.07–01:57.10 | 3452–3513 | 6.3 | `word('Now', 0)` "Now" 115.06 | `LOW` on the kid (Vorathul's old hero angle, given to the kid) | The level-12 kid stands like a hero, twirling a worn boot. An office-UI nameplate pill types above him: "LV 12" | hero angle on the kid | 1.86 / 2 |
| S51 | 01:57.10–01:57.77 | 3513–3533 | 2.1 | `word('kids', 0)` "kids" 117.10 | `HIGH` (billboarded cards), static | **A1 overhead cleave, nerfed.** Tiny Vorathul left third, kid right third. `cleave_antic` → `cleave_strike` arrives on beat[362]; the kid side-steps; a UI-blue "MISS" floats up from the floor | high angle, cleave antic | 1.14 / 2 |
| S52 | 01:57.77–01:59.20 | 3533–3576 | 4.5 | `word('beat', 0)` "beat" 117.76 | `MED`, small shake per smack | The kid smacks the helm with the shoe three times; office-UI damage numbers "−1" pop on each; the helm rattles (head rot ±6°) | smack 1 | 1.97 / 2 |
| S53 | 01:59.20–01:59.67 | 3576–3590 | 1.5 | `word('shoe', 0)` "shoe" 119.20 | `LOW` on the kid, the shoe sole toward the lens | The final smack: the shoe sole fills the frame; posterise flash black/ivory 2 frames; Vorathul flies out of frame on the same ballistic arc and KO stars the heroes had in S10–S19 | SHOE — posterise, he flies | 1.45 / 2 |
| **Scene 8 — Verse 2, one deletion per line** | | | | | | | | |
| S54 | 01:59.67–02:02.47 | 3590–3674 | 8.7 | `word('They', 0)` "They" 119.68 | One-beat flash, then `LOW` (his old angle) | Growl flash: one beat of the second form (rig: helm split, seven eyes) in hard black/violet duotone. Back to normal colour: he scrambles up and spreads the fan to fire (**A2 pipe-fan blast**, `blast_antic` → `blast_strike` on hit[59]). A UI-blue dashed marquee is dragged round the right wing, then the left (shift-select); Delete: the fan folds (s → 0), 10 of 16 pipes flash checker and are gone, the 6 long ones stay folded; the magenta checkerboard outline of the fan remains (rig §9). The violet bolts in flight turn checker and drop | GROWL FLASH second form (black/violet) | 3.00 / 4 |
| S55 | 02:02.47–02:03.40 | 3674–3702 | 2.9 | `word('my', 2)` "my" 122.48 | `CLOSE`, push in | Operatic: the helm splits (on the beat), the seven eyes open; on "form" the void and eyes turn checker; a UI-blue padlock icon clamps the halves shut | close on the helm | 1.14 / 4 |
| S56 | 02:03.40–02:05.03 | 3702–3751 | 5.1 | `word('My', 3)` "My" 123.40 | `ECU` on the eye slit, then whip to the gallery | Growl flash (black/violet, one beat). Twin violet lasers fire from the slit (EchoTrail smear) and cut across a gallery; on "eyes" the beams turn into grey dashed "disabled" lines and droop like wet string | GROWL FLASH, ECU slit | 2.07 / 4 |
| S57 | 02:05.03–02:07.13 | 3751–3814 | 6.5 | `word('my', 4)` "my" 125.04 | `WIDE` sky, tilt up | The cursed storm: black clouds (G02 recoloured to ink) and violet lightning boil (ScribbleBoil). A UI cursor enters the sky and flicks an office toggle "Cursed storm" off: the lightning freezes magenta checker, then the storm is gone and the ivory clouds slide back | sky | 1.97 / 4 |
| S58 | 02:07.13–02:11.00 | 3814–3930 | 12.0 | `word('cutscene', 0)` "cutscene" 127.12 | `MED`, letterboxed 2.39:1, slow push | His cutscene: letterbox bars slam in, gold title "THE LAMENT OF VORATHUL · I". `conduct_wide`. An office video timeline types "0:00 / 7:00" along the lower bar and its end runs off the frame | letterbox slams in | 3.31 / 4 |
| S59 | 02:11.00–02:12.27 | 3930–3968 | 3.9 | `word('Now', 1)` "Now" 131.00 | `OFF-WIDE` | Hard cut to the office: every monitor plays his cutscene; every developer holds a key; a "HOLD TO SKIP" ring fills on each screen | office, all monitors | 2.28 / 4 |
| S60 | 02:12.27–02:14.23 | 3968–4027 | 6.1 | `word('skips', 0)` "skips" 132.26 | `MED`, letterboxed, locked | 16× fast-forward: his cutscene poses hard-cut every 2 frames (a cut each, so no transition rules apply): `conduct_wide`, `raise_sword`, `strike_down`, `slump`, `burst`, `summon_strike`, `sweep_follow`, `clutch_throat` and round again; "▶▶ ×16" and the scrub head racing along the timeline; ScribbleBoil speed scribbles | 16x fast-forward | 2.80 / 4 |
| S61 | 02:14.23–02:17.23 | 4027–4117 | 9.2 | `word('What', 0)` "What" 134.24 | `ECU` helm | The letterbox lifts. "What went wrong?!": the slit dims step by step; head sinks into the collar | ECU helm | 2.28 / 4 |
| **Scene 9 — Patch 2.4** | | | | | | | | |
| S62 | 02:17.23–02:19.43 | 4117–4183 | 6.1 | `word('Patch', 3)` "Patch" 137.22 | `OFF-WIDE`, patch card in screen space | PatchNotesCard "PATCH 2.4" slams in and types on the robot words; LIVE badge | office, card slams in | 1.93 / 4 |
| S63 | 02:19.43–02:22.00 | 4183–4260 | 7.1 | `word('Voratho's', 0)` "Voratho's" 139.44 | `OFF-CLOSE` on the dev's monitor | The cutscene editor: card line "Vorathul's dialogue: can now be skipped" types; the dev drags a SKIP component off a UI panel | editor monitor | 3.78 / 4 |
| S64 | 02:22.00–02:23.90 | 4260–4317 | 5.3 | `hit[73]` 142.00 | `MED` inside, letterboxed | The SKIP pill lands in the painting's lower-right corner, an office sticker on the canvas. He is mid-monologue (`raise_sword`); the cursor hovers, presses: the letterbox bars slam shut like a guillotine; cut pose `slump` | SKIP pill lands on the painting | 2.39 / 4 |
| S65 | 02:23.90–02:26.27 | 4317–4388 | 6.5 | `word('Voratho's', 1)` "Voratho's" 143.90 | `WIDE` inside | A VolumeSlider, stretched across the frame right under his six folded pipes, appears at 100. On "volume" the handle slides left and, as it passes each pipe, a gold cork pops into that pipe's violet mouth (cork pop 3 frames, 30 fps) | wide inside | 2.03 / 4 |
| S66 | 02:26.27–02:27.57 | 4388–4427 | 3.8 | `word('reduced', 2)` "reduced!" 146.28 | `CLOSE` | `clutch_throat`: he clutches his throat; one thin wisp of smoke leaves the corked pipes (no audio change) | clutches his throat | 1.47 / 4 |
| **Scene 10 — MY THEME SONG?!** | | | | | | | | |
| S67 | 02:27.57–02:31.03 | 4427–4531 | 10.7 | `word('My', 5)` "My" 147.58 | Three hard cuts: `ECU` slit → `OFF-CLOSE` slider → `WIDE` inside | One palette per word: "My" black/violet duotone on the screaming slit; "theme" office grey/white on the slider at 20 %; "song" gold/ivory on the whole figure, corked pipes straining, corks bulging, violet leaking round them | black/violet | 2.27 / 4 |
| **Scene 11 — Chorus 2, awareness step 2** | | | | | | | | |
| S68 | 02:31.03–02:32.57 | 4531–4577 | 4.8 | `beat[463]` 151.022 | `FLOOR`, truck along the queue | Heroes queue to fight him, each holding an office ticket pill "#47", "#48"… behind a velvet rope. Stamp 3 lands crooked in the top-right corner, half outside the frame (its straight edges foreshadow the frame edge) | hero queue | 1.96 / 2 |
| S69 | 02:32.57–02:36.53 | 4577–4696 | 12.3 | `word('In', 1)` "In" 152.58 | `OTS-HERO` (over the first hero's shoulder) | **A3 horizontal sweep, nerfed.** `sweep_antic` → `sweep_strike`: the heroes hop over the blade like a skipping rope, one hop per word; the last one does not bother and the blade bonks his shin: "−1" | sweep antic | 2.07 / 2 |
| S70 | 02:36.53–02:40.93 | 4696–4828 | 13.6 | `word('Nerf', 3)` "Nerf" 156.54 | `MED` | Stamp 4 lands on the HP bar label. A hero sweeps him aside with a broom on "dust"; office-grey bleed on "gloom" (rhymes with S48) | STAMP 4 on the HP label | 1.96 / 2 |
| S71 | 02:40.93–02:44.93 | 4828–4948 | 12.4 | `word('I', 4)` "I" 160.94 | `LOW`, long tilt up following his gaze to the top-right corner of the sky, then `ECU` on the corner | **Awareness step 2.** He looks up; a cloud slides away and reveals that the brushed sky stops at a ruler-straight, 1 px office-grey line, with raw canvas weave beyond it | he looks up | 1.96 / 2 |
| S72 | 02:44.93–02:48.17 | 4948–5045 | 10.0 | `word('Now', 3)` "Now" 164.92 | `CLOSE` on his upturned helm, locked | He stares up, motionless (the only deliberate stillness in the chorus). The kid's LV 12 nameplate enters frame bottom; the kid tugs his cape | staring helm | 2.07 / 2 |
| S73 | 02:48.17–02:51.33 | 5045–5140 | 9.8 | `word('beat', 1)` "beat" 168.16 | `WIDE`, then hold | The kid smacks him with the shoe; posterise flash on "shoe"; he does not react, still staring at the corner. The kid looks up too, then shrugs; the heroes walk out; lights dim to the interlude | smack 1 | 1.96 / 2 |
| **Scene 12 — Soft interlude, awareness step 3** | | | | | | | | |
| S74 | 02:51.33–02:56.93 | 5140–5308 | 16.6 | `beat[526]` 171.346 | `WIDE`, very slow push | Empty cathedral: galleries empty (G35), banners down, the sky plate swapped to ivory (the blue has drained). `sit_alone` on the steps (cut-only edge). Dust motes on each key | empty cathedral, sit_alone | 2.94 / 2 |
| S75 | 02:56.93–03:02.13 | 5308–5464 | 15.3 | `word('I', 7)` "I" 176.92 | `FLOOR` at hero height, facing him | Where the heroes always stood: four faint UI-blue game spawn rings "P1 P2 P3 P4" on the floor fade in one per word | hero-height view | 3.04 / 4 |
| S76 | 03:02.13–03:07.57 | 5464–5627 | 16.0 | `word('So', 0)` "So" 182.14 | Memory panel full frame, push in; then pull back to `OFF-MED` on a monitor | The memory (G37 drawn still, soft ivory/sky duotone, torn sticker edge): a hero stands over the fallen Vorathul, sword raised. On the second "finally" the camera pulls back: the panel is on a monitor in the office and a playtester (G38) throws both arms up, cheering. The office is out of focus (pre-blurred G27) | memory panel | 3.34 / 4 |
| S77 | 03:07.57–03:11.77 | 5627–5753 | 12.4 | `word('You', 1)` "You" 187.56 | `ECU` slit, then `MED` | Back inside: he is standing (cut-only from sitting). He turns to face the camera — the canvas surface | slit | 3.24 / 4 |
| S78 | 03:11.77–03:16.07 | 5753–5882 | 12.7 | `word('I', 8)` "I" 191.78 | Office side at `d0` (the painting exactly fills the frame, as at the S31 match) | **Awareness step 3.** `hand_on_canvas`: the gauntlet meets the inside of the canvas; the canvas bulges toward us (CanvasBulge) with a ring of weave showing where the paint stretches thin | office side, painting fills frame | 3.04 / 4 |
| S79 | 03:16.07–03:17.77 | 5882–5933 | 4.9 | `word('by being hated', 0)` "by" 196.08 | His POV from inside, locked | Through the canvas weave: the office, blurred; his black gauntlet silhouette in the foreground. The bored developer sips coffee and does not look | POV through the canvas (existing event `hated`) | 2.65 / 4 |
| S80 | 03:17.77–03:18.20 | 5933–5946 | 1.3 | `word('hated', 0)` "hated" 197.78 | `OFF-WIDE` | The office from the back of the room: on the wall the painting has a gauntlet-shaped bulge pushing out of it; the developers type on, oblivious | THE BULGE ON THE WALL | 1.03 / 4 |
| **Scene 13 — Build, awareness step 4** | | | | | | | | |
| S81 | 03:18.20–03:20.77 | 5946–6023 | 8.0 | `beat[605]` 198.185 | `MED` inside, front | **Awareness step 4.** Crack 1 opens under his palm on the downbeat; one crack step on every downbeat from here (19 steps, beat[605]…beat[677]) | crack 1 | 2.07 / 2 |
| S82 | 03:20.77–03:23.33 | 6023–6100 | 8.0 | `beat[613]` 200.763 | `OFF-MED` on the monitors | Forum cards pop onto the monitors: "bring back phase 3", "boss is a tutorial now 2/10", "#UnnerfVorathul". The painting in the background shows each new crack step | forum card 1, crack 3 | 2.07 / 2 |
| S83 | 03:23.33–03:25.93 | 6100–6178 | 8.1 | `beat[621]` 203.340 | `CLOSE` inside | Cracks branch across the sky; on beat[627] his free fist punches the canvas next to the palm | crack 5 | 2.07 / 2 |
| S84 | 03:25.93–03:28.50 | 6178–6255 | 8.0 | `beat[629]` 205.918 | `OFF-WIDE` | Posters go up on the wall round the painting ("WE WANT VORATHUL"), a petition progress bar (ProgressSun office) climbs a step per beat | posters, crack 7 | 1.97 / 2 |
| S85 | 03:28.50–03:29.80 | 6255–6294 | 4.0 | `beat[637]` 208.496 | `ECU` on the gauntlet | Crack 9 runs out from between his fingers | crack 9 | 2.07 / 2 |
| S86 | 03:29.80–03:31.07 | 6294–6332 | 3.9 | `beat[641]` 209.784 | `OFF-MED` on the frame | Sticky notes multiply round the frame: "REVERT", "UNNERF", "PHASE 3 PLS" | notes, crack 10 | 1.97 / 2 |
| S87 | 03:31.07–03:32.37 | 6332–6371 | 4.0 | `beat[645]` 211.073 | `CLOSE` inside | Crack 11; on hit[77] the eye slit flares violet for the first time since the patch | crack 11 | 2.07 / 2 |
| S88 | 03:32.37–03:33.67 | 6371–6410 | 4.0 | `beat[649]` 212.362 | `OFF-MED` on the bored developer | He turns, sees the cracked painting, coffee spurts out of his mouth (cartoon) | dev turns, crack 12 | 2.07 / 2 |
| S89 | 03:33.67–03:38.80 | 6410–6564 | 15.9 | `beat[653]` 213.651 | Strobe, hard cut every 2 beats: inside `CLOSE` ↔ office `OFF-MED`, same screen position for the crack | Painting gold and office grey alternate every two beats; the crack sits in the same screen position in both worlds (inside: on the sky; outside: on the painting card) | cut inside: crack 13 | 2.07 / 2 |
| S90 | 03:38.80–03:42.67 | 6564–6680 | 12.0 | `beat[669]` 218.806 | Strobe, hard cut every beat | Every beat flips the world. Crack 19 reaches the painting's edge and on beat[678] it continues **out of the frame into the office wall plaster** (the first thing from his side to cross). Beat[680]: white-out (ivory field) | cut inside: crack 17 | 1.03 / 2 |
| **Scene 14 — Final chorus: breakout and the second fight** | | | | | | | | |
| S91 | 03:42.67–03:44.57 | 6680–6737 | 5.9 | `beat[681]` 222.672 | `OFF-MED`, big shake | **Awareness step 5: breakout.** The canvas shatters toward the camera: Shards with a painted face and a raw ivory canvas back fly at the lens; posterise black/ivory 2 frames; his gauntlet grabs the frame edge and rips the STAMP sticker on it in half | CANVAS SHATTERS | 1.86 / 2 |
| S92 | 03:44.57–03:48.50 | 6737–6855 | 12.2 | `word('but', 0)` "but" 224.56 | `OFF-LOW` (office floor, fov 60), tilt up | Helm and horns push through the hole; black ink and gold paint pour over the frame and down the wall (PaintSpread); he rises (root y up); the crown snaps back to `full` on "doom" | helm pushes through | 2.06 / 2 |
| S93 | 03:48.50–03:50.07 | 6855–6902 | 4.8 | `word('Nerf', 5)` "Nerf" 228.50 | `OTS-DEV`: over the shoulder of a fleeing developer | He tears the pinned patch-note cards off the frame and crumples them; the developer in the foreground runs | over the fleeing dev | 1.96 / 2 |
| S94 | 03:50.07–03:51.47 | 6902–6944 | 4.3 | `word('burst', 0)` "burst" 230.08 | `OFF-WIDE`, whip-in toward him | **A4 burst.** `burst` pose, root z toward the lens: his whole body clears the frame; the black frame explodes into bars (Shards, black fill); chromatic EchoTrail behind him (violet, black, ivory copies) | A4 BURST OUT | 1.24 / 2 |
| S95 | 03:51.47–03:53.03 | 6944–6991 | 4.8 | `word('tomb', 0)` "tomb" 231.48 | `OFF-LOW`, fov 60, big shake | **A5 ground slam (landing).** Drawn key still K3 (deep crouch) on the impact frames, then the rig `slam_follow`; the office floor turns to gold cathedral tile in a radial wave from his feet | A5 SLAM LANDING | 2.06 / 2 |
| S96 | 03:53.03–03:54.00 | 6991–7020 | 3.0 | `word('Restore', 0)` "Restore" 233.02 | Frontal, the dialog fills the frame between us and him | **A6 overhead cleave.** A giant system dialog "Unsaved changes — Are you sure?" pops up to stop him; `cleave_antic` → strike on beat[715] splits it down the middle; the halves fall away (Shards in office fills) | dialog pops up, cleave antic | 1.86 / 2 |
| S97 | 03:54.00–03:54.63 | 7020–7039 | 2.0 | `word('health', 1)` "health," 234.00 | `OFF-CLOSE` on the bar | His HealthBar floats in the office; his gauntlet drags the end cap back to 100 % while a grab cursor tries to hold the other end and is yanked off (part 1 S37 reversed) | he drags his own bar | 1.03 / 2 |
| S98 | 03:54.63–03:55.87 | 7039–7076 | 3.8 | `word('wings', 1)` "wings," 234.62 | `OTS-DEV` at a monitor | The desktop Recycle Bin icon bulges and bursts: his deleted pipes fly out of the monitor one per beat toward him (rig `returning`, relight over 6 frames on arrival) | recycle bin bursts, pipe 1 | 1.03 / 2 |
| S99 | 03:55.87–03:56.60 | 7076–7098 | 2.3 | `word('rage', 1)` "rage" 235.88 | `ECU` on the seven eyes, then claws at the lens | **A7 claw lunge (second form).** The helm splits on beat[722]; `lunge_antic` → strike on beat[723]: the claws rip through a stack of five browser windows layered in depth (drawn still K2 on the strike frames) | ECU, eyes | 1.13 / 2 |
| S100 | 03:56.60–03:58.43 | 7098–7153 | 5.7 | `word('let', 0)` "let" 236.60 | `OTS-CURSOR` (behind the lead cursor of a swarm) | A swarm of white arrow cursors pours out of every monitor at him; pipes 8–11 land in his fan | cursor swarm | 1.86 / 2 |
| S101 | 03:58.43–03:58.90 | 7153–7167 | 1.4 | `word('boss', 0)` "boss" 238.44 | Screen-space band over `OFF-MED` | Boss intro nameplate slams across the frame: "VORATHUL · THE FINAL BOSS" (Anton, gold on a black band); hard black/gold duotone 2 frames | BOSS NAMEPLATE | 1.24 / 2 |
| S102 | 03:58.90–03:59.80 | 7167–7194 | 2.8 | `word('again', 0)` "again" 238.90 | `LENS`, dead on the lens axis | **A8 forward thrust** into the lens (drawn still K1): the cursors are skewered on the blade like a kebab; violet EchoTrail; the 16th pipe relights and the fan is whole | A8 THRUST, cursor kebab | 1.75 / 2 |
| S103 | 03:59.80–04:02.03 | 7194–7261 | 6.9 | `beat[734]` 239.786 | `OFF-HIGH` from the ceiling (billboarded cards) | **A9 pipe-fan blast**, full and restored: `blast_antic` → strike on beat[737]; 16 violet blasts shoot up at the camera; the ceiling light strips burst | from the ceiling, blast antic | 2.06 / 2 |
| S104 | 04:02.03–04:03.33 | 7261–7300 | 4.0 | `beat[741]` 242.048 | `UNDER-DESK`: from under a desk, over the hiding developer's back | **A10 horizontal sweep** across the desks: monitors and chairs fly; the developer ducks lower | under the desk, sweep antic | 2.06 / 2 |
| **Scene 15 — Patch 2.5** | | | | | | | | |
| S105 | 04:03.33–04:05.37 | 7300–7361 | 6.5 | `beat[745]` 243.340 | `OFF-MED` | The office in ruins (G40), ink and gold over everything; the bored developer cowers at the only working monitor; PatchNotesCard "PATCH 2.5", ink-splattered, types | ruins | 2.48 / 2 |
| S106 | 04:05.37–04:07.23 | 7361–7417 | 5.6 | `hit[78]` 245.37 | `OFF-CLOSE` on the monitor | His eye fills the monitor: the violet slit (G14) edge to edge on the screen. A RevertDialog pops over it; the cursor approaches with a trembling hand (tremble grows near the button) | HIS EYE FILLS THE MONITOR | 2.42 / 4 |
| S107 | 04:07.23–04:08.47 | 7417–7454 | 3.7 | `word('Vorathul', 1)` "Vorathul" 247.22 | `OFF-CLOSE` on the hand and mouse, then the room | Click. Revert plays as a visual rewind: part 1's edits run backward over the room (TimeRemap): the sticky note peels off his helm and flies away, the four checker cells jump back into the bar, the erased meteors un-erase | CLICK REVERT | 1.92 / 4 |
| **Scene 16 — Choir VO-RA-THUL** | | | | | | | | |
| S108 | 04:08.47–04:11.80 | 7454–7554 | 10.1 | `word('Vorathul', 2)` "Vorathul" 248.48 | `OFF-LOW`, his hero angle, in the office | **A11 meteor summon.** Sword to the sky (`summon_antic` → strike); the office ceiling peels away like paper and his painted sky (gold, ivory, pale blue) hangs over the office; the "METEOR RAIN" caption returns and its strike-through line peels off | A11 SUMMON (choir VO-RA-THUL) | 2.12 / 4 |
| S109 | 04:11.80–04:15.10 | 7554–7653 | 10.0 | `beat[771]` 251.813 | `OFF-WIDE`, medium shake per landing | Meteors land in the office on the beats; office chairs fly up and spin toward him and stack: throne tier 1 | meteor 1 lands | 2.02 / 4 |
| S110 | 04:15.10–04:18.43 | 7653–7753 | 10.1 | `beat[781]` 255.117 | `OFF-HIGH`, top-down from the ceiling hole | **A12 ground slam** (rig `slam_*`): the shockwave bounces the scattered chairs up; they land stacked as throne tier 2 | from above, slam antic | 2.82 / 4 |
| S111 | 04:18.43–04:21.73 | 7753–7852 | 10.0 | `beat[791]` 258.421 | Crane up `OFF-LOW` → `OFF-MED` | Cut-only to `throne_sit` (new pose): he sits on the throne of office chairs on the wreckage, sword planted; meteors keep falling; developers flee past | THE THRONE | 2.02 / 4 |
| S112 | 04:21.73–04:24.97 | 7852–7949 | 9.8 | `hit[83]` 261.72 | Six comic panel cuts, one per hit, alternating angles | The drum fill: one meteor per hit in a ring round the throne; each panel a different angle and a hard two-colour grade (black/violet, gold/ivory, grey/white, repeated) | panel 1 meteor | 2.52 / 4 |
| S113 | 04:24.97–04:27.33 | 7949–8020 | 7.2 | `word('Vorathul', 5)` "Vorathul" 264.98 | `OFF-WIDE`, crane back, then locked | **A13 throne summon.** From the throne he raises the sword (summon arms, seated): a single giant meteor grows in the painted sky, bigger than the office. On the loudest bar it lands behind the throne: **the biggest blast** — ivory white-out 2 frames, then one hard two-colour grade per beat on beats 816-818 (black/violet, gold/ivory, grey/white; at most 3 flashes a second), shards of office and painting outward, big shake | A13 summon from the throne | 2.02 / 4 |
| S114 | 04:27.33–04:31.63 | 8020–8149 | 13.0 | `beat[818]` 267.341 | `OFF-WIDE`, slow push | The smoke clears: the throne silhouette on the wreckage; ink and gold everywhere; a last chair falls and clonks a fleeing dev; he throws his head back (laugh) | smoke clears | 2.02 / 4 |
| **Scene 17 — Outro** | | | | | | | | |
| S115 | 04:31.63–04:33.83 | 8149–8215 | 6.0 | `beat[831]` 271.637 | Screen space, locked | Black ink and gold paint flood in from all four edges (PaintSpread) until the screen is solid black. End card: TypingText (IBM Plex Mono, ivory on black) types "Patch 2.6 notes:" and is cut off mid-word: the last frame reads "Patch 2.6 no" | paint floods in | 1.01 / 4 |

70 shots, 343 named events (Appendix A). Kinds: 43 cuts, 46 colour collisions, 41 impacts, 41 UI
events, 19 crack steps, 14 attacks, 54 lyric words and 84 keys.

### 1.2 Anchor notes

- **No onsets in the choruses.** `hits[]` has nothing between 100.0 and 120.9 s, between 147.2 and
  207.5 s, or between 212.1 and 245.3 s, so Chorus 1, Chorus 2, the interlude and the whole final
  chorus anchor on sung words and on `beats[]`. Every strike there lands on a beat or a word, never
  on a guessed onset.
- **Scene 9 starts on the word, not the section line.** The robot's "Patch" (`word('Patch', 3)`,
  137.22) comes 1.26 s before the measured Announcer 2 boundary (138.48). S62 cuts on the word; the
  last 1.2 s of the measured Verse 2 section is therefore office. Hits 67–73 (137.95–142.00) all
  fall inside scene 9.
- **"Voratho's".** Whisper heard "Vorathul's" as "Voratho's" (#0 139.44, #1 143.90); the anchors
  use that measured text.
- **The first choir chant is one frame early.** `word('Vorathul', 2)` 248.48 = f7454, while the
  Choir section starts at 248.509 (f7455). S108 cuts on the word; beatcheck counts it in Announcer 3.
- **"changes reverted" was not heard.** The Revert click is bound to `word('Vorathul', 1)` 247.22
  (vocal stem, prob 0.545), as the scene map decided. The rewind that "reverts" plays on
  `beat[758]` and `beat[760]` after it.
- **Repeated words and the nth used:** "Nerf" #0–#5 = the six NERFED hits (100.90, 105.98, 151.38,
  156.54, 223.36, 228.50); "shoe" #0 119.20, #1 169.58; "beat" #0 117.76, #1 168.16, #2 184.14
  ("finally beat me"); "wings" #0 121.88 (deleted), #1 234.62 (restored); "health" #1 234.00
  (#0 is Patch 2.3's); "Patch" #3 137.22 (2.4), #5 244.02 (2.5); "Vorathul" #1 247.22 (revert),
  #2–#5 248.48, 253.00, 257.50, 264.98 (the chant, vocal stem); "I" #2 109.96 … #8 191.78 as listed
  in the table.
- **Loudest bar.** Bar 204 starts at 266.35 = `beat[815]` (266.350), f7991: the biggest blast.
  Bars 178 (231.71, `beat[709]`) and 185 (240.76, `beat[737]`) are the next loudest in the final
  chorus and carry the gold floor wave (S95) and the restored pipe-fan blast (S103).
- **Crack steps** are on the build's 19 measured downbeats, `beat[605]` … `beat[677]` every 4
  beats (198.19–221.38); the scene map's "one step per downbeat" is exactly these.
- **Interlude tempo.** 171.3–197.2 s is the firm slowdown (176.6 BPM, beat ≈ 0.34 s); the beat
  indices already carry it.

### 1.3 Dead-air check

Run with the beatcheck dead-air logic (`tools/beatcheck.mjs`: same `beatPos`, same section limits,
same one-frame tolerance of 0.102 beat) over the 343 events. All eleven sections pass.

| Section (measured) | Limit | Events | Worst gap (beats) | Where |
|---|---|---|---|---|
| Chorus 1 100.01–119.64 | 2 | 40 | 2.07 | S48 he looks down at the stamp f3193 -> S48 tries to rub it off f3213 |
| Verse 2 119.64–138.48 | 4 | 42 | 3.31 | S58 timeline stretches off frame f3847 -> S58 pose: raise_sword (act I) f3879 |
| Announcer 2 138.48–147.15 | 4 | 18 | 3.78 | S63 cut: editor monitor f4183 -> S63 line types f4224 |
| Scream 2 147.15–151.02 | 4 | 6 | 2.27 | S67 cut: office grey/white f4443 -> S67 cut: gold/ivory, pipes strain f4465 |
| Chorus 2 151.02–171.35 | 2 | 46 | 2.07 | S69 blade bonks a shin: −1 f4627 -> S69 heroes laugh f4647 |
| Soft Interlude 171.35–198.19 | 4 | 37 | 3.34 | S76 PULL BACK: it is a monitor; player cheers f5564 -> S76 arms up, cheering f5598 |
| Build 198.19–222.67 | 2 | 47 | 2.07 | S83 cut: crack 5 f6100 -> S83 cracks branch f6120 |
| Final Chorus 222.67–243.34 | 2 | 49 | 2.06 | S95 gold floor wave f6951 -> S95 desks jump f6971 |
| Announcer 3 243.34–248.51 | 4 | 11 | 2.46 | (section start) -> S105 card types PATCH f7321 |
| Choir 248.51–271.64 | 4 | 40 | 2.82 | S110 chairs land: tier 2 f7725 -> S111 cut: THE THRONE f7753 |
| Outro 271.64–273.84 | 2 | 6 | 1.01 | S115 half covered f8159 -> S115 screen black f8169 |

Chorus, Build, Final Chorus and Outro hold the 2-beat limit; the worst gaps (2.06–2.07) are a
2-beat spacing after frame rounding, inside the tolerance. The Choir is checked at 4 by beatcheck
but never exceeds 2.82.

---

## 2. Attack choreography

Thirteen attacks, eight distinct styles (overhead cleave, horizontal sweep, forward thrust, ground
slam, pipe-fan blast, meteor summon, claw lunge, burst), plus two minor eye/fist strikes (the
lasers S56 f3713, the canvas punch S83 f6158). The nerfed ones (A1–A3) fail on purpose; from A4 on
each restored power is used the moment it comes back. Root placement is in stage units (painting
stage for A1–A3, office stage after that), `lean` in degrees, scale relative to the drawn rig.

| # | Shot | Strike frame (anchor) | Attack (rig poses / still) | Root placement | Camera | Screen position, depth | Target and how it reads | Sold by |
|---|---|---|---|---|---|---|---|---|
| A1 | S51 | f3522 `beat[362]` | overhead cleave, nerfed: `cleave_antic` → `cleave_strike` (transition starts f3510, behind the S50→S51 cut) | x −5, z −15, scale 0.35, lean +4 → −6 | `HIGH`, billboarded | left third, small; kid right third | the kid side-steps; the blade bonks the floor, "MISS" floats up | small shake, one ink splash, no posterise (nothing landed) |
| A2 | S54 | f3628 `hit[59]` | pipe-fan blast attempt: `blast_antic` (f3599) → `blast_strike`; follow-through replaced by the deletion | x 0, z −15, scale 0.35; camera target lowered to his chest | `LOW`, his old hero angle | centre, full height of frame | violet bolts leave the pipes, then turn checker and drop when the fan is deleted on f3656 | medium shake, EchoTrail on the fan for 8 frames |
| A3 | S69 | f4592 `word('patch', 4)` | horizontal sweep, nerfed: `sweep_antic` → `sweep_strike` → `sweep_follow` | x +3, z −15, scale 0.35, lean −5 → +8 | `OTS-HERO` | right third, mid depth; hero's back left third | heroes hop over the blade one per word; it bonks a shin on f4627, "−1" | parallel speed lines on the blade only, tiny shake |
| A4 | S94 | f6902 `word('burst', 0)` | burst: `burst` pose, root z from the frame plane toward the lens | z −20.5 → −11 over 10 frames, y −6.2, height 8.5, centre | `OFF-WIDE`, whip-in | centre, grows to fill the frame height | the black frame explodes into bars; he clears the canvas | big shake, chromatic EchoTrail (violet, black, ivory copies, delay 2), frame-bar Shards |
| A5 | S95 | f6944 `word('tomb', 0)` | ground slam (landing): drawn key still **K3** f6944–f6945, then rig `slam_follow` | x −3, z −10, lean −4 | `OFF-LOW`, fov 60 | left of centre, desks right | the office floor turns to gold tile in a ring (f6951) | big shake, posterise black/ivory 2 frames, radial speed lines, Shards (grey tiles) |
| A6 | S96 | f7009 `beat[715]` | overhead cleave: `cleave_antic` at the cut → `cleave_strike` (18 frames) | x 0, z −12, lean +4 → −6 | frontal, the dialog between us and him | centre; dialog card 9 units wide at z −6 | "Unsaved changes — Are you sure?" splits down the middle; halves fall | medium shake, violet EchoTrail on the blade, office-fill Shards |
| A7 | S99 | f7087 `beat[723]` | claw lunge, second form: helm split on f7077, `lunge_antic` → `lunge_strike`; drawn key still **K2** f7087–f7090 | z −12 → −7, lean −8, both hands `clutch` | `ECU` on the seven eyes, claws come at the lens | centre, very close | five browser windows layered in depth tear one after another | posterise 2 frames, EchoTrail smear, window Shards |
| A8 | S102 | f7167 `word('again', 0)` | forward thrust: drawn key still **K1** f7167–f7172 (foreshortened blade into the lens), then rig `thrust_follow` | z −8, centre, rig fallback lean +7 | `LENS` | dead centre, the blade tip at the lens | the cursor swarm skewered on the blade like a kebab | big shake, radial speed lines at the tip, violet EchoTrail |
| A9 | S103 | f7223 `beat[737]` | pipe-fan blast, full: `blast_antic` (f7194) → `blast_strike` → `blast_follow`; all 16 pipes lit | x 0, z −13 | `OFF-HIGH`, from the ceiling | centre, seen from above; blasts come up at the lens | the ceiling light strips burst (f7242) | big shake, 16 violet InkSplash bursts at the pipe mouths, Shards of white light strips |
| A10 | S104 | f7281 `beat[743]` | horizontal sweep: `sweep_antic` (f7261) → `sweep_strike` → `sweep_follow` | x +4, z −14, lean −5 → +8 | `UNDER-DESK` | right two thirds above the desk edge; developer lower left | monitors and chairs fly across | medium shake, parallel speed lines, EchoTrail |
| A11 | S108 | f7454 `word('Vorathul', 2)` | meteor summon: `summon_antic` (from f7436, behind the cut) → `summon_strike` → `summon_follow` | x −2, z −13 | `OFF-LOW` | left of centre, sword reaching the top edge | the ceiling peels away to his painted sky; meteors begin | the ceiling card curling, Meteor ×n |
| A12 | S110 | f7713 `hit[82]` | ground slam: `slam_antic` (f7693) → `slam_strike` → `slam_follow` | x +2, z −12 | `OFF-HIGH`, top-down from the ceiling hole | right of centre, seen from above | the shockwave throws the scattered chairs up; they land as throne tier 2 on f7725 | big shake, ring of ink splash on the floor |
| A13 | S113 | f7991 `beat[815]` (summon from f7949) | throne summon: `throne_sit` + summon arms; drawn key still **K4** f7991–f7994 under the white-out | throne at x 0, z −12, root y +2.5 (on the chairs) | `OFF-WIDE`, crane back | centre, small under a meteor bigger than the room | the giant meteor lands behind the throne: the biggest blast | ivory white-out 2 frames, then one two-colour grade per beat (black/violet, gold/ivory, grey/white), Shards of office and painting, big shake |

**No two in a row look alike.** Type sequence: cleave, blast, sweep, burst, slam, cleave, claw,
thrust, blast, sweep, summon, slam, summon. Camera sequence: high, low, over a hero's shoulder,
whip-in wide, office floor, frontal through a dialog, extreme close-up, lens axis, ceiling,
under a desk, office floor (different side and target), top-down, crane. The two summons (A11,
A13) are separated by a slam and by 26 s; the two cleaves by 58 s and opposite cameras.

**Screen thirds and depth.** A1 left, A2 centre, A3 right, A4 centre growing to full height, A5
left, A6 centre behind a foreground card, A7 at the lens, A8 at the lens, A9 from above, A10 right
behind a foreground desk, A11 left low, A12 right from above, A13 centre and tiny.

---

## 3. Colour collisions and transitions

Palettes: **P** painting (ivory #F4ECD8, gold #E2B33C, sky #8EC5E8, ink #0A0A0A) · **V** Vorathul
(#0A0A0A, violet #9B5CE0) · **O** office (#E9ECEF #CED4DA #ADB5BD, white, UI blue #3B82F6) ·
**M** missing-texture #E0129A, only on deleted things. No other colour appears.

| # | Frames | Palettes | What happens | Technique (code) |
|---|---|---|---|---|
| X01 | f3027, f3179, f4541, f4696 (torn f6701) | O on P | "NERFED" rubber stamps in UI blue slam onto the painting, his chest, the corner, the HP label; the last one is ripped by his gauntlet in the breakout | new `RubberStamp` (N1) over `Misregister`; Anton |
| X02 | f3067–f3164 | O text → P | the patch-note lines arrive again as gold stone tablets engraved in Anton: the same text in the painting's language | code tablet cards + `DryBrushStroke` edges |
| X03 | f3272–f3290, f4785–f4802 | O seeps into P | on "gloom" the gold turns office grey for one beat, then drains back | `DuotoneFlash` soft cue ['#ADB5BD', '#FFFFFF'] → null |
| X04 | f3299–f3435 | V duotone + P sticker border | torn sticker-cutout collage of his old glory (approved frames 06, 04, 03) in hard black/violet; the kid tears through it | new `StickerCutout` (N2) + `DuotoneFlash` hard per panel + `Shards` (ivory paper fill) |
| X05 | f3576, f5087 | P → ink/ivory | the shoe smacks: posterise to black/ivory 2 frames | `ImpactBurst` flash 2 |
| X06 | f3590–f3599, f3702–f3715 | V hard duotone | growl lines flash the second form for one beat in black/violet | `DuotoneFlash` hard ['#0A0A0A', '#9B5CE0'] |
| X07 | f3633–f3656 | O tool on P, → M | a UI-blue dashed marquee selects each wing; Delete turns the fan into the magenta checker outline | new marquee (N9) + `MissingTextureFill` on the fan union path |
| X08 | f3690–f3695 | M + O | the second-form void turns checker, a UI-blue padlock clamps the halves | `MissingTextureFill`, padlock icon (N9) |
| X09 | f3713–f3744 | V → O | violet lasers (EchoTrail smear) become grey dashed "disabled" lines | `EchoTrail` smear, then dashed strokes |
| X10 | f3751–f3811 | V storm → M → P | the cursed storm is toggled off: lightning freezes magenta, ivory clouds return | `ScribbleBoil` (violet), toggle (N9), `MissingTextureFill` |
| X11 | f3814–f4018, f4260–f4280 | O UI over P | letterbox, video timeline, "▶▶ ×16", SKIP pill and the guillotine letterbox: office video grammar on his cutscene | timeline / letterbox (N9), `SkipButton` |
| X12 | f3930 | P → O hard cut | every monitor in the office plays his cutscene | hard cut, plates |
| X13 | f4317–f4413 | O slider ↔ P/V | the slider under the fan corks each pipe as its handle passes; gold corks in violet mouths | `VolumeSlider`, rig `corked` |
| X14 | f4427, f4443, f4465 | V → O → P | MY / THEME / SONG: one palette per word, three hard cuts | `DuotoneFlash` hard cues: V, O, then P (null) |
| X15 | f4899–f4937 | O line in P | the sky ends at a ruler-straight 1 px office-grey line with canvas weave beyond | code line + weave tile (C35) |
| X16 | f5140–f5598 | P drained, O blurred | the interlude sky goes ivory (blue gone); the memory is a soft ivory/sky duotone that turns out to be on an office monitor | sky plate swap; `DuotoneFlash` soft ['#F4ECD8', '#8EC5E8']; pre-blurred office plate (N8) |
| X17 | f5823–f5936 | P pushes O | the gauntlet bulges the canvas; seen from the office the painting swells out of the wall | new `CanvasBulge` (N4) |
| X18 | f6410–f6671 | P ↔ O strobe | hard cuts every 2 beats, then every beat; the crack keeps its screen position in both worlds; on f6651 it crosses out of the frame into the wall | cut list + `CrackGrow` (N5); white-out f6671 |
| X19 | f6671, f6680 | ivory white-out → ink/ivory | white-out, then the canvas shatters with a posterise flash | `ImpactBurst` flash 3, `Shards` with the render-target face |
| X20 | f6764–f6951 | P paint over O | black ink and gold paint pour out of the frame, down the wall and over the floor; the floor becomes gold cathedral tile | new `PaintSpread` (N3) |
| X21 | f6902–f7281 | V echoes | every strike in the fight carries chromatic echo copies in violet, black and ivory | `EchoTrail` echo/smear, `colors: [VIOLET, INK, IVORY]` |
| X22 | f7039–f7184 | V back into O | the deleted pipes fly out of the desktop Recycle Bin and relight violet one per beat | rig `returning` + Recycle Bin (N9) |
| X23 | f7153 | V/P band over O | boss nameplate band, hard black/gold 2 frames | `DuotoneFlash` hard ['#0A0A0A', '#E2B33C'] |
| X24 | f7361–f7393 | V in O | his violet eye slit fills a white office monitor; RevertDialog over it | G14 on the monitor card, `RevertDialog` tremble |
| X25 | f7417–f7445 | M → P/V (reverse) | the revert plays part 1's edits backward: the magenta returns to what it deleted | new `TimeRemap` (N6) over part 1's tracks |
| X26 | f7475–f7495 | P sky over O | the office ceiling peels away like paper to his painted sky | ceiling card curl (C49) |
| X27 | f7852–f7924 | V / P / O panels | six hit panels, each a hard two-colour grade in rotation | `DuotoneFlash` hard cues per hit |
| X28 | f7991–f8020 | white-out → V → P → O | the biggest blast: ivory white-out 2 frames, then one grade per beat on beats 816–818 | `ImpactBurst` flash, `DuotoneFlash` |
| X29 | f8149–f8169 | V/P cover all | ink and gold flood in from all edges until the screen is black | `PaintSpread` full frame (N3) |

---

## 4. Rewind moments and how they are built

| Scene | Moment (frame) | Why a viewer rewinds | Built with |
|---|---|---|---|
| 7 Chorus 1 | S53 f3576: the shoe sole fills the lens and Vorathul flies on the exact arc, spin and KO stars the heroes had in S10–S19; S49 f3425: the kid tears through the paper wall of his glory (the breakout, in miniature, two minutes early) | role reversal in one frame; a rhyme that only pays off at S91 | cards + G32/G33, `ImpactBurst`, ballistic root (rig request R3), `StickerCutout` (N2) |
| 8 Verse 2 | S60 f3968–f4018: 16× fast-forward, 25 pose cuts in 50 frames under a racing scrub head | the whole pose library in under two seconds; every frame is a different pose | rig poses on cuts, timeline UI (N9), `ScribbleBoil` |
| 9 Patch 2.4 | S65 f4363–f4382: the volume handle corks exactly the pipe it passes | cause and effect you can see, the slider is the organ's stop | `VolumeSlider`, rig `corked` (handle x drives which pipe) |
| 10 Scream 2 | S67 f4427/f4443/f4465: three words, the film's three palettes | the film's whole colour system in 1.3 s | `DuotoneFlash` |
| 11 Chorus 2 | S71 f4899: the ruler-straight grey line at the corner of the sky; S73 f5087: the shoe lands and he does not notice | the first straight line in a hand-inked world; the joke is his stillness | code line + weave, cards |
| 12 Interlude | S80 f5933: from the back of the office, a gauntlet-shaped bulge pushes out of the painting while the developers type on; S76 f5564: the memory pulls back into a monitor | the tender moment seen from the side that does not care | `CanvasBulge` (N4), pre-blurred plate (N8) |
| 13 Build | S90 f6651: the crack runs past the painting's edge into the wall plaster | the first thing from his world that crosses into ours | `CrackGrow` (N5) |
| 14 Final chorus | S98 f7039: the deleted pipes burst out of the Recycle Bin; S97 f7020: he drags his own health bar back (S37 reversed); S102 f7167: cursors skewered on the greatsword | three jokes about software, each a restored power | rig `returning`, `HealthBar` drag, K1 still + `Cursor` ×N |
| 15 Patch 2.5 | S107 f7417–f7445: the revert plays part 1 backward over the wrecked room | the note flies off his helm, the meteors un-erase: the film literally rewinds | `TimeRemap` (N6) |
| 16 Choir | S108 f7475: the office ceiling peels away and his painted sky hangs over the office; S113 f7991: the biggest blast | the two worlds swap places | ceiling card (C49), Meteor, K4 |
| 17 Outro | S115 f8199–f8209: the end card reads "Patch 2.6 no" when it is cut off | the last word is a refusal | `TypingText` `cutAtFrame` |

Everything above is cards + rig + existing VFX/UI code, except where a new capability (§5.1) or a
drawn key still (K1–K4) is named.

---

## 5. New capabilities

### 5.1 Code

| Id | Name | Spec (short) | Shots |
|---|---|---|---|
| N1 | `RubberStamp` (UI kit) | `{frame, text, at, x, y, rotate, color = UI blue}`: a rounded-rect frame and Anton text; slam scale 1.4 → 1 in 3 frames with a 1-frame 0.92 squash; ink texture by a seeded speckle mask with 15 % dropout; optional `tearAt` splits it along a jagged line into two halves that fall (Shards physics) | S46, S48, S68, S70, S91 |
| N2 | `StickerCutout` (VFX) | render-prop wrapper: dilates the child's alpha by `border` px (SVG `feMorphology`), fills the ring ivory, displaces the outer edge with seeded noise for a torn-paper edge; `peelAt` lifts one corner (a folded triangle) | S49, S76 |
| N3 | `PaintSpread` (VFX) | `{frame, start, sources: [{x, y, delay}], growth: frames → radius, bands: [INK, GOLD]}`: union of growing seeded blobs, each edge drawn with `DryBrush`; alternating ink and gold bands; `mode: 'overlay'` over the office picture or `'cover'` to the full frame. Pure function of the frame | S92, S95, S105, S115 |
| N4 | `CanvasBulge` (stage) | the painting card as a subdivided plane (64 × 36) with z displacement `d = depth · g(r)` around a press point, g a smooth gauntlet-shaped falloff from a low-res mask; unlit, `meshBasicMaterial`; a code ring of canvas weave where the stretch is highest | S78, S80 |
| N5 | `CrackGrow` | one seeded crack graph in painting-card UV space, `step(frame)` reveals branches up to step n (19 steps on the listed downbeats); drawn on the painting render target (inside), on the office painting card (outside, same UV) and, after step 19, continued onto the wall plate in O-space | S81–S90 |
| N6 | `TimeRemap` | renders a subtree at `g(frame)` instead of `frame`; for the revert, g runs part 1's edit frames backward (f2726 → f2532) over 28 frames, ease-in; only works because every track is a pure function of the frame | S107 |
| N7 | Billboard pitch | stage option per camera: P3–P5 / O1–O3 cards rotate about x to face the camera (`HIGH`, `OFF-HIGH`) | S51, S103, S110 |
| N8 | Pre-blurred plates | a deterministic tool step (temporary `uv run --with pillow`, rig §9 rule) writes blurred copies of G27/G40 for the POV and memory shots; no runtime blur | S76, S79 |
| N9 | UI kit additions | `ForumCard`, `Poster`, `Toggle`, `VideoTimeline` (with hold-to-skip ring and ▶▶ badge), `Nameplate` / `DamageNumber` / `TicketPill`, `Marquee` (marching ants), `Padlock`, `RecycleBin`, `WindowStack`, `BossNameplate`; all in `C` theme colours, Inter / IBM Plex Mono | S50–S104 |
| N10 | Triple-cue helper | a cue list builder for `DuotoneFlash` from anchored frames (V, O, P presets) so a grade never has a hand-typed frame | X06, X14, X27, X28 |

### 5.2 Rig requests (for the rig lane)

| Id | Request |
|---|---|
| R1 | Pose `throne_sit`: `legs_seated`, both arms on armrests (a 30, f 60), head up +6°, sword `ground` planted in front; cut-only edge like `sit_alone` |
| R2 | Pose `laugh`: head rot +18°, sink −0.01, torso +8°, arms out (a 60, f 20) |
| R3 | Airborne root rotation beyond ±10° when the root is flagged `airborne` (the shoe flight S53, the burst S94); the body is rigid, so nothing can tear |
| R4 | Attack-chain hold: between two attack moves a hold of 12 frames, not 30, with root drift (open question 1) |
| R5 | `rootScale` steps of 2 frames (S48 shrink) and a `squash` y-scale channel for 4 frames (S47 tablet) |

---

## 6. Asset list

### 6.1 Prompts

Assembled exactly as part 1 §5.1 (one image per call; STYLE-P or STYLE-O; FIXED for Vorathul
assets; Subject and Composition below; the painting or office cut-out line; NEGATIVE). References:
painting assets `01` + `02`, office assets `07`. All on-screen text is code (§6.4).

### 6.2 Generated images (14 assets, 15 images)

| Id | Purpose | Shots | Gen → target | Alpha |
|---|---|---|---|---|
| G32 | Level-12 kid pose sheet ×7 | S49–S53, S72, S73 | 1536×1024 sheet | cut-out |
| G33 | Boot sole close-up + the boot | S50–S53, S73 | 1536×1024 sheet | cut-out |
| G34 | Queueing heroes ×8 + hopping heroes ×4 | S68, S69, S70 | 1536×1024 sheet | cut-out |
| G35a/b | Empty gallery tiers L/R, no crowd | S74–S77 | 1024×1536 ×2 → 2048×3072 | cut-out |
| G36 | Fallen banners and empty steps | S74, S75 | 1536×1024 sheet | cut-out |
| G37 | Memory key still: a hero over the fallen Vorathul | S76 | 1536×1024 → 3840×2160 | opaque |
| G38 | Cheering playtester at a desk ×3 poses | S76 | 1536×1024 sheet | office cut-out |
| G39 | Fleeing developers sheet | S93, S98, S104, S105, S111, S114 | 1536×1024 sheet | office cut-out |
| G40 | Office in ruins plate | S105–S115 | 1536×1024 → 3840×2160 | opaque |
| G41 | Office chairs ×6 orientations | S104, S109–S114 | 1536×1024 sheet | office cut-out |
| G42 | Key still K1: forward thrust into the lens | S102 | 1536×1024 → 3840×2160 | cut-out |
| G43 | Key still K2: second-form claws at the lens | S99 | 1536×1024 → 3840×2160 | cut-out |
| G44 | Key still K3: ground-slam deep crouch | S95 | 1536×1024 → 3840×2160 | cut-out |
| G45 | Key still K4: enthroned, sword up, under the blast | S113 | 1536×1024 → 3840×2160 | cut-out |

Reused without generating: approved frames `06`, `04`, `03` as the S49 collage panels (cropped,
duotone-graded, sticker-bordered); G14 (helm plate) on the S106 monitor; G02 clouds recoloured to
ink for the storm (S57); G15–G18 heroes in S68–S73; G27 office wall until the breakout.

Prompts (Subject and Composition; assemble per §6.1):

- **G32** — (STYLE-P) Subject: a small scruffy young hero, shorter and rounder than the knights, oversized ivory hood, mismatched gold armour pieces, one foot in a sock, in seven separate poses: twirling a worn boot by its laces, smacking downward with the boot in both hands, bursting forward with arms out as if through a wall, side-stepping, looking straight up confused, shrugging, walking away; black silhouette with ivory and gold. Composition: seven full figures in a row with wide gaps, same scale as each other, landscape 1536x1024. Cut-out.
- **G33** — (STYLE-P) Subject: a worn leather boot seen from the side, and the same boot's sole seen straight on, huge, with ink-cracked tread and a gold buckle. Composition: two items with a wide gap, landscape 1536x1024. Cut-out.
- **G34** — (STYLE-P) Subject: eight small golden-armoured knights standing in a line, bored, idle poses (arms crossed, leaning on a spear, yawning), and four of the same knights mid-hop with knees pulled up; black ink shadows, ivory tabards with a sun emblem. Composition: two rows, same scale, landscape 1536x1024. Cut-out.
- **G35a / G35b** — (STYLE-P) Subject: curved tiers of arched galleries in ivory and gold, receding toward the centre of the cathedral, completely empty balconies with balustrades, no figures at all. Composition: portrait 1024x1536, G35a the left side, G35b the right side mirrored. Cut-out.
- **G36** — (STYLE-P) Subject: three long gold banners with an ivory sun emblem lying crumpled on the floor, broken black poles, and a wide flight of three low ivory stone steps with gold edges; no figures. Composition: separated with wide gaps, landscape 1536x1024. Cut-out.
- **G37** — (STYLE-P + FIXED) Subject: a small hero standing on the chest of the fallen colossal Vorathul, sword raised in triumph, Vorathul lying on his back across the frame, helm turned to the side, eye slit dim, sword fallen beside him; ivory sky, gold light rays. Composition: landscape 1536x1024, the hero small and high in the right third, Vorathul's dark mass filling the lower half.
- **G38** — (STYLE-O) Subject: a playtester at a desk seen from behind at three-quarters, short curly hair, white t-shirt, in three separate poses: hunched over the keyboard, both arms thrown up cheering, leaning back laughing with hands on head; office chair; monitor screen blank light grey. Composition: three poses with wide gaps, landscape 1536x1024. Office cut-out.
- **G39** — (STYLE-O) Subject: three office developers (the bored developer from the reference with short black hair and grey hoodie; a developer with glasses and short dark hair; a developer with a hair bun in a black jacket) each in separate poses: running away with arms flailing, crouching under a desk, cowering with hands over head, mid coffee spit-take; cartoon, no injuries. Composition: a grid of poses with wide gaps, same scale, landscape 1536x1024. Office cut-out.
- **G40** — (STYLE-O) Subject: the game studio office from the reference after a disaster: desks overturned, monitors fallen and cracked, cables hanging from the ceiling strips, chairs on their sides, papers scattered; the big empty picture frame on the back wall broken open with torn canvas edges; flat vector style, no paint or ink yet, no people. Composition: wide eye-level shot, landscape 1536x1024, the floor centre left clear.
- **G41** — (STYLE-O) Subject: six identical grey ergonomic office chairs in different orientations: upright front, upright side, tipped on its side, upside down, tilted back, spinning seat seen from above. Composition: two rows of three with wide gaps, landscape 1536x1024. Office cut-out.
- **G42** — (STYLE-P + FIXED) Subject: Vorathul lunging straight at the viewer, the greatsword thrust directly into the lens, the blade extremely foreshortened so the tip is huge in the centre and the crossguard and gauntlet behind it, helm and horns above the guard, violet rune line racing down the fuller, cape flaring behind. Composition: landscape 1536x1024, the blade tip at the exact centre. Cut-out.
- **G43** — (STYLE-P + FIXED) Subject: Vorathul in his second form, helm split open on both sides showing a black void with seven violet eyes, both spiked gauntlets reaching toward the viewer with clawed fingers spread, extreme close-up, violet armour cracks. Composition: landscape 1536x1024, the claws at the left and right thirds, the eyes centred above them. Cut-out.
- **G44** — (STYLE-P + FIXED) Subject: Vorathul landing in a deep crouch after a jump, one knee down, sword point driven into the ground in front of him with both hands on the hilt, cape and pipe wings flung up by the impact, low front view. Composition: landscape 1536x1024, figure centred, the sword point at the bottom edge. Cut-out.
- **G45** — (STYLE-P + FIXED) Subject: Vorathul seated on a tall heap of grey office chairs as a throne, sword raised straight up overhead, wings fully spread with every pipe mouth glowing violet, seen from a low angle; the chairs drawn in the same thick brush ink as he is. Composition: landscape 1536x1024, the figure centred in the upper two thirds, the chair heap below. Cut-out.

### 6.3 Drawn in code (30)

| Id | What | Shots | Why code |
|---|---|---|---|
| C23 | NERFED rubber stamp (N1) | S46, S48, S68, S70, S91 | text, slam, tear |
| C24 | Gold stone tablets with engraved patch lines | S47 | text in Anton, falls and cracks |
| C25 | Sticker-cutout border + torn edge (N2) | S49, S76 | filter on any layer |
| C26 | LV 12 nameplate, "−1", "MISS", ticket pills | S50–S52, S68–S72 | office UI text |
| C27 | Marquee selection (marching ants) | S54 | animated dashes |
| C28 | Padlock icon | S55 | flat UI |
| C29 | Laser beams + dashed disabled lines | S56 | path animation |
| C30 | Storm: ink-recoloured G02, violet lightning | S57 | material override + paths |
| C31 | "Cursed storm" toggle | S57 | flat UI |
| C32 | Letterbox bars + cutscene title | S58, S60, S64 | layout, text |
| C33 | Video timeline, ▶▶ ×16, hold-to-skip rings | S58–S60 | text and fill per frame |
| C34 | Smoke wisp from the corked pipes | S66 | thin tapered path |
| C35 | Frame-edge line + canvas weave tile | S71, S78, S79, S91 | must be ruler-straight |
| C36 | Spawn rings P1–P4 | S75 | UI rings |
| C37 | Dust motes | S74 | seeded particles |
| C38 | Canvas bulge mesh + weave ring (N4) | S78, S80 | displacement |
| C39 | Crack graph, 19 steps, inside/outside/wall (N5) | S81–S90 | shared geometry |
| C40 | Forum cards, posters, petition bar | S82, S84, S86 | text |
| C41 | Canvas shards (render-target face, ivory back) + frame-bar shards | S91, S94 | `Shards` with a texture face |
| C42 | Ink/gold paint spread (N3) | S92, S95, S105, S115 | growth per frame |
| C43 | Gold tile wave over the office floor | S95 | radial mask over a tile pattern |
| C44 | "Unsaved changes" dialog and its two halves | S96 | `RevertDialog` variant |
| C45 | Desktop + Recycle Bin icon | S98 | flat UI |
| C46 | Browser window stack ×5 | S99 | flat UI, torn by Shards |
| C47 | Cursor swarm (seeded paths, `Cursor` ×60) | S100, S102 | many copies |
| C48 | Boss nameplate band | S101 | text |
| C49 | Office ceiling as a curling paper card | S108 | card bend by segments |
| C50 | Revert rewind (N6) | S107 | time remap |
| C51 | Grade cue lists (N10) | S54, S56, S67, S112, S113 | anchored frames only |
| C52 | End card | S115 | `TypingText` with `cutAtFrame` |

Reused kit and VFX: `PatchNotesCard` (2.4, 2.5), `SkipButton`, `VolumeSlider`, `HealthBar`,
`Cursor`, `RevertDialog`, `StickyNote`, `ProgressSun` (office, petition), `MissingTexture`,
`TypingText`; `InkSplash`, `SpeedLines`, `ImpactBurst`, `Shards`, `Meteor`, `shake`, `EchoTrail`,
`DuotoneFlash`, `ScribbleBoil`, `DryBrushStroke`, `Misregister`, `PrintTexture`.

Totals: **44 new assets — 14 generated (15 images), 30 drawn in code**, plus 3 approved frames
reused and the rig requests R1–R5.

### 6.4 On-screen text (all code)

| Text | Where | Face | When (frame) |
|---|---|---|---|
| NERFED | rubber stamps | Anton, UI blue | f3027, f3179, f4541, f4696; torn f6701 |
| HEALTH −40 % · METEOR RAIN: REMOVED · PHASE III: REMOVED | stone tablets | Anton, engraved | f3080, f3098, f3116 |
| LV 12 · −1 · MISS · #47, #48 … | nameplate, damage numbers, tickets | Inter | f3482–f3560, f4541–f4627, f4993–f5012 |
| THE LAMENT OF VORATHUL · I | cutscene title | Anton | f3814 |
| 0:00 / 7:00 · ▶▶ ×16 · HOLD TO SKIP | timeline | IBM Plex Mono | f3831–f4018 |
| Cursed storm | toggle | Inter | f3780–f3811 |
| PATCH 2.4 · Vorathul's dialogue: can now be skipped · Vorathul's theme song: volume reduced · LIVE | patch card | Inter / Plex Mono | f4117–f4388 |
| SKIP | pill on the painting | Inter | f4260 |
| bring back phase 3 · boss is a tutorial now 2/10 · #UnnerfVorathul · WE WANT VORATHUL · REVERT · UNNERF · PHASE 3 PLS | forum cards, posters, notes | Inter | f6023–f6313 |
| Unsaved changes — Are you sure? | system dialog | Inter | f6991 |
| VORATHUL · THE FINAL BOSS | nameplate band | Anton, gold | f7153 |
| PATCH 2.5 · Revert | patch card, RevertDialog | Inter | f7321–f7417 |
| METEOR RAIN (strike-through peels off) | caption box | Anton | f7515 |
| Patch 2.6 notes: (cut at "Patch 2.6 no") | end card | IBM Plex Mono, ivory on black | f8179–f8209 |

---

## 7. Risks and open questions

1. **Rig hold rule vs. "never stands still".** Rig §5.2 asks for a 30-frame hold between
   transitions. The final fight has a strike every 1–3 beats (10–30 frames). This plan changes pose
   on cuts, keeps the root drifting and asks for a 12-frame hold between attack moves (R4). Decide R4
   before the fight is built.
2. **No onsets under the choruses and the fight** (§1.2). Every strike there sits on a beat or a
   word; bar lines are only ±1 beat reliable. A listening check of S91–S104 and S108–S113 is needed
   to confirm the big impacts feel on the downbeat; the fallback is shifting an impact by one beat
   index, which beatcheck re-verifies.
3. **Flash rate.** The build strobe (S90, one cut per beat ≈ 3.1 a second) and the blast grades
   (S113, one per beat) are at the edge of the usual 3-flashes-a-second photosensitivity limit. The
   strobe alternates gold and grey of similar brightness, which flashes less than a white-out. A
   frame-luminance check of f6410–f6680 and f7991–f8030 should be run before final render; the fix
   is the 2-beat spacing of S89 everywhere.
4. **The heaviest frames.** S91–S95 combine the painting render target on a shattering card,
   ~60 shards, a growing `PaintSpread`, EchoTrail copies of the rig and full-frame SVG filters
   (`DuotoneFlash`, `Misregister`). Test-render f6670–f6960 first and measure render time per frame.
5. **Scene boundaries that follow words, not section lines.** Scene 9 starts 1.26 s inside the
   measured Verse 2 (on "Patch" 137.22) and the first chant (248.48) is one frame before the Choir
   section. Confirm that the scene map follows the words here.
6. **Approved frames on screen and image volume.** S49 shows crops of approved style frames
   `06`/`04`/`03` full screen (their generation quirks become visible), and part 2 adds 15 images,
   four of them Vorathul key stills that must match the rig to the stroke under a 2–6 frame cut.
   Proposal: generate K1–K4 (G42–G45) in the same test round as the kid (G32), check them against
   the rig render, and approve the collage use.

---

## Appendix A — event schedule

Frame, anchor, label; the first event of each shot is its cut. Generated from the same plan file
that produced §1.3, so every frame equals `round(anchor × 30)`.

- **S46** — f3000 `beat[308]` cut: nerfed wide · f3020 `beat[310]` flakes settle on his crown · f3027 `word('Nerf', 0)` STAMP 1: UI-blue NERFED rubber stamp slams diagonally across the painting · f3039 `beat[312]` stamp ink bleeds into the paper grain · f3058 `beat[314]` he glances at the stamp, sighs (shoulders drop)
- **S47** — f3067 `word('in', 0)` cut: tablets in the sky · f3080 `word('patch', 2)` tablet 1 lands beside him · f3098 `word('of', 2)` tablet 2 lands · f3116 `word('doom', 0)` tablet 3 lands on his helm · f3126 `beat[321]` dust cloud · f3145 `beat[323]` he peeks out from under it · f3164 `beat[325]` tablets crack
- **S48** — f3179 `word('Nerf', 1)` cut: STAMP 2 on his chest · f3193 `beat[328]` he looks down at the stamp · f3213 `beat[330]` tries to rub it off · f3225 `word('god', 0)` shrink step 1 · f3232 `word('reduced', 1)` scale settles · f3251 `word('dust', 0)` shrink step 2 + dust puff · f3263 `word('and', 1)` he re-forms from the dust, smaller · f3272 `word('gloom', 0)` office-grey bleed (soft duotone grey/white) · f3290 `beat[338]` grey drains back out
- **S49** — f3299 `word('I', 2)` cut: torn paper ground · f3309 `beat[340]` paper ground tears open · f3328 `word('was', 2)` panel 1 (06) slams · f3347 `word('wall', 1)` panel 2 (04) slams · f3362 `word('that', 0)` panel 3 (03) slams · f3377 `beat[347]` his old roar echoes as a printed SFX word · f3387 `word('no', 1)` the panels lock into a wall · f3406 `word('could', 0)` the paper bulges · f3425 `word('through', 0)` the kid bursts through the paper wall · f3435 `beat[353]` paper shreds fall
- **S50** — f3452 `word('Now', 0)` cut: hero angle on the kid · f3464 `beat[356]` kid twirls the shoe · f3482 `word('level', 0)` nameplate types LV · f3499 `word('twelve', 0)` nameplate types 12
- **S51** — f3513 `word('kids', 0)` cut: high angle, cleave antic · f3522 `beat[362]` A1 cleave strike: MISS
- **S52** — f3533 `word('beat', 0)` cut: smack 1 · f3552 `word('me', 0)` smack 2 · f3560 `word('with', 0)` smack 3
- **S53** — f3576 `word('shoe', 0)` cut: SHOE — posterise, he flies
- **S54** — f3590 `word('They', 0)` cut: GROWL FLASH second form (black/violet) · f3599 `beat[370]` flash ends; he gets up · f3628 `hit[59]` A2 pipe-fan blast strike · f3633 `word('took', 0)` marquee round the right wing · f3646 `hit[60]` shift: marquee round the left wing · f3652 `hit[61]` Delete key · f3656 `word('wings', 0)` WINGS DELETED: checker fan outline
- **S55** — f3674 `word('my', 2)` cut: close on the helm · f3676 `beat[378]` helm splits · f3679 `word('second', 0)` seven eyes open · f3690 `word('form', 0)` void turns checker · f3695 `beat[380]` padlock clamps the halves
- **S56** — f3702 `word('My', 3)` cut: GROWL FLASH, ECU slit · f3713 `word('laser', 0)` lasers fire · f3733 `word('eyes', 0)` beams become dashed disabled lines · f3744 `beat[385]` slit flickers to sad
- **S57** — f3751 `word('my', 4)` cut: sky · f3754 `word('cursed', 0)` storm boils · f3766 `word('storm', 0)` lightning strike · f3780 `word('I', 3)` cursor enters the sky · f3792 `hit[62]` toggle flicked: storm freezes magenta · f3811 `hit[63]` storm deleted, clouds slide back
- **S58** — f3814 `word('cutscene', 0)` cut: letterbox slams in · f3831 `word('seven', 0)` timeline appears · f3847 `word('minutes', 0)` timeline stretches off frame · f3879 `word('long', 0)` pose: raise_sword (act I) · f3898 `beat[401]` pose: conduct_wide (act II)
- **S59** — f3930 `word('Now', 1)` cut: office, all monitors · f3936 `hit[64]` rings start filling · f3946 `word('everybody', 0)` rings at 60 %
- **S60** — f3968 `word('skips', 0)` cut: 16x fast-forward · f3995 `beat[411]` scrub head at 4:00 · f4018 `word('it', 3)` timeline hits 7:00: END, frozen mid-gesture
- **S61** — f4027 `word('What', 0)` cut: ECU helm · f4033 `hit[65]` slit flicker · f4052 `word('went', 0)` head tilts · f4074 `word('wrong', 0)` slit dims · f4082 `hit[66]` slit out · f4101 `beat[422]` head sinks
- **S62** — f4117 `word('Patch', 3)` cut: office, card slams in · f4138 `hit[67]` types PATCH · f4143 `word('two', 1)` types 2 · f4155 `hit[69]` types . (strongest hit of the scene) · f4169 `word('four', 0)` types 4 · f4175 `hit[71]` LIVE badge
- **S63** — f4183 `word('Voratho's', 0)` cut: editor monitor · f4224 `word('dialogue', 0)` line types · f4230 `hit[72]` dev drags SKIP
- **S64** — f4260 `hit[73]` cut: SKIP pill lands on the painting · f4271 `word('be', 0)` cursor hovers · f4280 `word('skipped', 0)` PRESS: letterbox guillotine · f4306 `beat[441]` he blinks in the silence
- **S65** — f4317 `word('Voratho's', 1)` cut: wide inside · f4339 `word('theme', 0)` slider appears · f4349 `word('song', 0)` slider at 100 · f4363 `word('volume', 0)` handle slides: corks 1-3 pop · f4382 `beat[448]` corks 4-6 pop
- **S66** — f4388 `word('reduced', 2)` cut: clutches his throat · f4404 `beat[450]` smoke wisp · f4413 `hit[74]` last puff ring
- **S67** — f4427 `word('My', 5)` cut: black/violet · f4443 `word('theme', 1)` cut: office grey/white · f4465 `word('song', 1)` cut: gold/ivory, pipes strain · f4473 `beat[457]` corks tremble · f4492 `beat[459]` pipes swell · f4511 `beat[461]` violet leaks round the corks
- **S68** — f4531 `beat[463]` cut: hero queue · f4541 `word('Nerf', 2)` STAMP 3 in the corner · f4560 `beat[466]` queue steps forward
- **S69** — f4577 `word('In', 1)` cut: sweep antic · f4592 `word('patch', 4)` A3 sweep strike: hop 1 · f4601 `word('notes', 1)` hop 2 · f4609 `word('of', 3)` hop 3 · f4619 `word('my', 6)` hop 4 · f4627 `word('doom', 1)` blade bonks a shin: −1 · f4647 `beat[475]` heroes laugh · f4666 `beat[477]` he lowers the sword · f4686 `beat[479]` shoulders sag
- **S70** — f4696 `word('Nerf', 3)` cut: STAMP 4 on the HP label · f4705 `beat[481]` label wobbles · f4724 `beat[483]` hero fetches a broom · f4737 `word('god', 1)` broom ready · f4744 `word('reduced', 3)` sweep starts · f4763 `word('dust', 1)` swept aside · f4775 `word('and', 2)` he skids to a stop · f4785 `word('gloom', 1)` office-grey bleed · f4802 `beat[491]` grey drains · f4821 `beat[493]` he stays where he landed
- **S71** — f4828 `word('I', 4)` cut: he looks up · f4840 `word('was', 3)` tilt begins · f4859 `word('wall', 2)` sky flat · f4874 `word('that', 1)` a cloud slides · f4889 `beat[500]` the corner comes into view · f4899 `word('no', 2)` THE STRAIGHT EDGE · f4907 `word('one', 2)` push in · f4918 `word('could', 1)` push in · f4927 `word('get', 1)` push in · f4937 `word('through', 1)` ECU: the line and the weave
- **S72** — f4948 `word('Now', 3)` cut: staring helm · f4966 `beat[508]` slit narrows · f4986 `beat[510]` the kid enters · f4993 `word('level', 1)` nameplate LV · f5012 `word('twelve', 1)` nameplate 12 · f5024 `word('kids', 1)` kid tugs his cape · f5034 `beat[515]` kid winds up
- **S73** — f5045 `word('beat', 1)` cut: smack 1 · f5064 `word('me', 1)` smack 2 · f5072 `word('with', 1)` smack 3 · f5087 `word('shoe', 1)` SHOE: posterise, no reaction · f5102 `beat[522]` the kid looks up too · f5121 `beat[524]` heroes walk out
- **S74** — f5140 `beat[526]` cut: empty cathedral, sit_alone · f5159 `word('I', 5)` dust motes · f5185 `word('was', 4)` head sinks · f5203 `word('not', 0)` slit dims · f5231 `word('win', 0)` a helmet rolls off the pile · f5252 `word('know', 0)` helmet stops · f5262 `beat[538]` motes drift · f5292 `beat[541]` cape hem settles
- **S75** — f5308 `word('I', 7)` cut: hero-height view · f5333 `word('was', 5)` floor glints · f5357 `word('made', 1)` ring outline begins · f5372 `word('stand', 0)` P1 · f5384 `word('there', 0)` P2 · f5405 `word('your', 0)` P3 · f5414 `word('way', 0)` P4 · f5445 `beat[556]` rings pulse
- **S76** — f5464 `word('So', 0)` cut: memory panel · f5490 `word('when', 0)` push in · f5501 `word('finally', 0)` hero raises the sword · f5524 `word('beat', 2)` hero shouts · f5545 `word('me', 2)` push in · f5564 `word('finally', 1)` PULL BACK: it is a monitor; player cheers · f5598 `beat[571]` arms up, cheering
- **S77** — f5627 `word('You', 1)` cut: slit · f5653 `word('feel', 1)` slit relights 0.5 · f5684 `word('someone', 0)` cut MED: standing · f5698 `word('new', 0)` he steps to the picture plane · f5731 `word('day', 0)` he is at the canvas
- **S78** — f5753 `word('I', 8)` cut: office side, painting fills frame · f5771 `beat[588]` he raises the gauntlet · f5792 `word('was', 6)` transition to hand_on_canvas · f5823 `word('built', 0)` PALM MEETS THE CANVAS: bulge · f5854 `word('be', 1)` bulge grows · f5861 `word('loved', 0)` bulge holds
- **S79** — f5882 `word('by being hated', 0)` cut: POV through the canvas (existing event `hated`) · f5909 `word('being', 0)` the dev glances up
- **S80** — f5933 `word('hated', 0)` cut: THE BULGE ON THE WALL · f5936 `beat[604]` bulge relaxes
- **S81** — f5946 `beat[605]` cut: crack 1 · f5965 `beat[607]` he presses · f5984 `beat[609]` crack 2 · f6004 `beat[611]` canvas dust falls
- **S82** — f6023 `beat[613]` cut: forum card 1, crack 3 · f6042 `beat[615]` forum card 2 · f6062 `beat[617]` crack 4 · f6081 `beat[619]` forum card 3
- **S83** — f6100 `beat[621]` cut: crack 5 · f6120 `beat[623]` cracks branch · f6139 `beat[625]` crack 6 · f6158 `beat[627]` left fist punches the canvas
- **S84** — f6178 `beat[629]` cut: posters, crack 7 · f6197 `beat[631]` petition + · f6216 `beat[633]` crack 8 · f6226 `hit[75]` poster pinned · f6245 `hit[76]` poster 2 pinned
- **S85** — f6255 `beat[637]` cut: crack 9 · f6274 `beat[639]` fingers spread
- **S86** — f6294 `beat[641]` cut: notes, crack 10 · f6313 `beat[643]` note swarm
- **S87** — f6332 `beat[645]` cut: crack 11 · f6352 `beat[647]` he leans in · f6361 `hit[77]` slit flares violet
- **S88** — f6371 `beat[649]` cut: dev turns, crack 12 · f6390 `beat[651]` coffee spurt
- **S89** — f6410 `beat[653]` cut inside: crack 13 · f6429 `beat[655]` cut office · f6448 `beat[657]` cut inside: crack 14 · f6468 `beat[659]` cut office · f6487 `beat[661]` cut inside: crack 15 · f6506 `beat[663]` cut office · f6526 `beat[665]` cut inside: crack 16 · f6545 `beat[667]` cut office
- **S90** — f6564 `beat[669]` cut inside: crack 17 · f6574 `beat[670]` cut office · f6584 `beat[671]` cut inside · f6593 `beat[672]` cut office · f6603 `beat[673]` cut inside: crack 18 · f6613 `beat[674]` cut office · f6622 `beat[675]` cut inside · f6632 `beat[676]` cut office · f6642 `beat[677]` cut inside: crack 19 hits the frame · f6651 `beat[678]` cut office: CRACK CROSSES INTO THE WALL · f6661 `beat[679]` cut inside: eye full violet · f6671 `beat[680]` WHITE-OUT
- **S91** — f6680 `beat[681]` cut: CANVAS SHATTERS · f6690 `beat[682]` shards hit the lens · f6701 `word('Nerf', 4)` gauntlet grips the frame, rips the stamp · f6719 `beat[685]` frame creaks
- **S92** — f6737 `word('but', 0)` cut: helm pushes through · f6751 `word('rise', 0)` he rises · f6764 `word('from', 0)` paint pours · f6772 `word('my', 7)` paint runs down the wall · f6788 `word('doom', 2)` crown full again · f6806 `beat[694]` paint reaches the skirting · f6825 `beat[696]` paint spreads on the floor · f6845 `beat[698]` desk legs drown in gold
- **S93** — f6855 `word('Nerf', 5)` cut: over the fleeing dev · f6864 `beat[700]` cards torn off · f6883 `beat[702]` crumpled
- **S94** — f6902 `word('burst', 0)` cut: A4 BURST OUT · f6913 `word('out', 0)` frame bars fly · f6925 `word('of', 4)` echo copies catch up · f6935 `word('this', 0)` airborne
- **S95** — f6944 `word('tomb', 0)` cut: A5 SLAM LANDING · f6951 `beat[709]` gold floor wave · f6971 `beat[711]` desks jump
- **S96** — f6991 `word('Restore', 0)` cut: dialog pops up, cleave antic · f7009 `beat[715]` A6 CLEAVE splits the dialog
- **S97** — f7020 `word('health', 1)` cut: he drags his own bar · f7029 `beat[717]` bar at 100 %
- **S98** — f7039 `word('wings', 1)` cut: recycle bin bursts, pipe 1 · f7048 `beat[719]` pipe 2 · f7058 `word('burning', 0)` pipe 3 · f7068 `beat[721]` pipe 4
- **S99** — f7076 `word('rage', 1)` cut: ECU, eyes · f7077 `beat[722]` helm splits, pipe 5 · f7087 `beat[723]` A7 CLAW LUNGE through the windows
- **S100** — f7098 `word('let', 0)` cut: cursor swarm · f7106 `beat[725]` pipe 8 · f7116 `beat[726]` pipe 9 · f7126 `beat[727]` pipe 10 · f7135 `beat[728]` pipe 11
- **S101** — f7153 `word('boss', 0)` cut: BOSS NAMEPLATE · f7155 `beat[730]` pipe 13
- **S102** — f7167 `word('again', 0)` cut: A8 THRUST, cursor kebab · f7184 `beat[733]` pipe 16: fan complete
- **S103** — f7194 `beat[734]` cut: from the ceiling, blast antic · f7203 `beat[735]` pipes charge · f7223 `beat[737]` A9 PIPE-FAN BLAST · f7242 `beat[739]` light strips burst
- **S104** — f7261 `beat[741]` cut: under the desk, sweep antic · f7281 `beat[743]` A10 SWEEP · f7291 `beat[744]` monitors land
- **S105** — f7300 `beat[745]` cut: ruins · f7321 `word('Patch', 5)` card types PATCH · f7343 `word('two', 2)` types 2
- **S106** — f7361 `hit[78]` cut: HIS EYE FILLS THE MONITOR · f7376 `hit[79]` RevertDialog enters · f7381 `word('five', 0)` types 5 · f7386 `hit[80]` cursor starts toward Revert · f7393 `hit[81]` tremble grows
- **S107** — f7417 `word('Vorathul', 1)` cut: CLICK REVERT · f7426 `beat[758]` rewind begins · f7445 `beat[760]` sticky note peels off the helm
- **S108** — f7454 `word('Vorathul', 2)` cut: A11 SUMMON (choir VO-RA-THUL) · f7475 `beat[763]` ceiling peels · f7495 `beat[765]` painted sky over the office · f7515 `beat[767]` METEOR RAIN caption un-struck · f7535 `beat[769]` first meteors
- **S109** — f7554 `beat[771]` cut: meteor 1 lands · f7574 `beat[773]` meteor 2 · f7590 `word('Vorathul', 3)` chairs stack: tier 1 · f7604 `beat[776]` chairs spin · f7624 `beat[778]` meteor 3 · f7644 `beat[780]` meteor 4
- **S110** — f7653 `beat[781]` cut: from above, slam antic · f7673 `beat[783]` chairs scattered · f7693 `beat[785]` slam antic peak · f7713 `hit[82]` A12 GROUND SLAM · f7725 `word('Vorathul', 4)` chairs land: tier 2
- **S111** — f7753 `beat[791]` cut: THE THRONE · f7772 `beat[793]` crane rises · f7792 `beat[795]` devs flee past · f7812 `beat[797]` meteor · f7832 `beat[799]` meteor
- **S112** — f7852 `hit[83]` cut: panel 1 meteor · f7861 `hit[84]` panel 2 · f7877 `hit[85]` panel 3 · f7892 `hit[86]` panel 4 · f7902 `hit[87]` panel 5 · f7924 `hit[88]` panel 6
- **S113** — f7949 `word('Vorathul', 5)` cut: A13 summon from the throne · f7961 `beat[812]` giant meteor appears · f7971 `beat[813]` it grows · f7981 `beat[814]` it fills the sky · f7991 `beat[815]` BIGGEST BLAST (loudest bar) · f8000 `beat[816]` palette cut 1 of 3 (one per beat)
- **S114** — f8020 `beat[818]` cut: smoke clears · f8040 `beat[820]` silhouette · f8060 `beat[822]` embers · f8080 `hit[89]` chair clonks a dev · f8100 `beat[826]` push in · f8119 `beat[828]` push in · f8139 `beat[830]` head back: laugh
- **S115** — f8149 `beat[831]` cut: paint floods in · f8159 `beat[832]` half covered · f8169 `beat[833]` screen black · f8179 `beat[834]` end card starts typing · f8189 `beat[835]` types "Patch 2." · f8199 `beat[836]` types "Patch 2.6 no" · f8209 `beat[837]` CUT OFF

## Architect decisions (20 Oct 2026)

1. **Holds:** the "≥ 1 s calm between transitions" rule applies inside one continuous shot only. In
   fights, attacks are separated by cuts; two attacks inside the same shot keep ≥ 12 frames apart
   (rig request R4 accepted).
2. **Photosensitivity is a hard rule:** no more than **3 flashes per second** in any 1-second window
   (a flash = a large luminance swing of the frame, both directions; red flashes count double). A
   frame-luminance check tool gates every render; strobe and grade cues are tuned until it passes.
   Tool: `tools/flashcheck.py` (default counts every opposing luminance change as one flash — stricter
   than WCAG's pair counting, kept on purpose; `--count pairs` shows the WCAG reading). Measured: the
   VFX gallery fails at 00:06 and 00:15 (5 changes/s at ~90 % area) — ImpactBurst's 3-frame
   ivory → posterise → black flash is ~2–3 changes, so allow at most one such impact per second.
3. **Render the breakout (f6670–f6960) first** as the heavy-load test, twice, through
   `tools/glitchcheck.py`, with no other Remotion process running.
4. **Approved style frames may appear on screen as collage material** — they are our own images.
5. **Cuts that follow words** instead of section lines stay (scene 9 on "Patch" 137.22, the first
   choir chant one frame early).
6. **Open for the director's listening check:** no measured onsets under the choruses and the final
   fight; strikes sit on beats/words. Confirm they land by ear.

### Flash budget audit (20 Oct 2026, after the strict-count fix)

[`flash-audit.md`](flash-audit.md) counts every planned swing in both storyboards: 94 sources, six
zones over the limit (Z1 S22, Z2 S24, Z3 S53+S54, Z4 S90+S91, Z5 S99+S100, Z6 S113). Binding for
the scene lanes:

- Apply the audit's proposed fix for each zone (the "After" column); `gradeCues` and
  `assertFlashBudget` throw otherwise.
- The 2-frame posterise belongs to the 10 impacts listed in the collision table only, not to every
  fight impact (§0.2 is read that way).
- A panel cut and its grade cue land on the same frame (X04, X14, X27 pass only then).
- A "one beat" grade returns on the next beat unless the shot says otherwise.
- S107's TimeRemap must not replay DuotoneFlash tracks.
- S57 (lightning) and S60 (25 pose cuts in 50 frames) are measured with flashcheck on their render.
- `timing.json` `hits[].frame` differs by 1 from `round(t * 30)` on 20 hits; anchor on `t`, as
  `events.ts` does.
