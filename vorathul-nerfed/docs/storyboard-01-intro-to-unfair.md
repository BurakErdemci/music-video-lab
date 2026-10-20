# NERFED — storyboard 1: intro to UNFAIR (0:00.00–1:40.00)

Scenes 1–6 of [`scene-map.md`](scene-map.md). Every time here comes from `data/timing.json`
(commit 8389821). Frames are at 30 fps and computed exactly like `tools/beatcheck.mjs` does:
`round(t × 30)`. Times are written `mm:ss.cc`, where `cc` is hundredths of a second (frame / 30,
rounded), never frames. "Beats" are fractional beat positions on `beats[]` (the beatcheck
`beatPos`), so a duration of 4.0 means four measured beats, whatever the local tempo.

Anchors use the `events.ts` notation: `beat[i]` = `beats[i]`, `hit[i]` = `hits[i]`,
`word('x', n)` = the nth match of `x` in `words` (the match ignores case and punctuation; the exact
`timing.json` text is quoted in the shot table). The plan below was run through the beatcheck
dead-air rule before it was written down (§1.3). The five events already in `events.ts`
(`riff-first-clash` f587, `silence-start` f2347, `silence-end-hit` f2364, `hp-bar` f2574,
`scream-1` f2963) all keep their frames.

---

## 0. Stage conventions used in every shot

### 0.1 Depth layers

One WebGL canvas, flat unlit cards (`Card`, `Part`). Two stages share the canvas; only one is
drawn at a time, except during the pull-back (§3), where the painting stage is drawn into a
render target that the office stage shows on its painting card.

**Painting stage (P).** World units; Vorathul stands with his feet at y 0 and his helm top at
y 12 (horns to 13). Heroes are about 1.4 units tall, about one ninth of him.

| Layer | z | Contents |
|---|---|---|
| P0 sky | −80 | sky plate, cloud cards (the only layer that shakes in S45) |
| P0.5 horizon | −65 | progress-bar sun (rises behind the roofline in S30) |
| P1 back | −50 | cathedral back wall, arches, spires |
| P2 galleries | −30 | gallery tiers L/R, front-row crowd strips |
| P3 Vorathul | −15 | the rig (base parts + the pose parts listed in §5) |
| P4 floor | −8 | floor plate, heroes, debris, trophy pile |
| P5 foreground | −3 | kneeling soldiers, banners, ink splashes near camera |
| P6 pass-by | +6, +12, +20 | entrance pillars, used only by the pull-back |
| HUD | painting space | painted health bar and comic caption boxes; attached to the painting camera so they are part of the picture (the developer later drags the bar on the canvas surface) |

Named painting cameras (position → target, fov 40 unless stated):
`WIDE` (0, 2, 34) → (0, 6, −15) — the `01` composition · `MED` (0, 4, 14) → (0, 6, −15) — knees up ·
`CLOSE` (0, 9, 0) → (0, 9, −15) — chest up · `ECU` (0, 10.5, −8) → (0, 10.5, −15) — helm ·
`LOW` (0, 0.5, 8) → (0, 9, −15), fov 50 · `FLOOR` (x, 1, −2) → (x, 1, −8) — hero height.

**Office stage (O).** The painting card is 16 × 9 units at z −20, centred at (0, 0). `d0` =
`fitDistance(9)` = 12.36: at that distance the painting fills the 1920 × 1080 frame exactly.

| Layer | z | Contents |
|---|---|---|
| O0 wall | −20.05 | back wall plate (shelves, window, lights) |
| O0 painting | −20 | the painting card (live render target in S31 onward, a still otherwise) and the black frame with its sticky notes |
| O1 desks | −12 | the two seated developers at their desks |
| O2 developer | −8 | the bored developer (cut-out rig) |
| O3 foreground | −4 | plant, desk corner |
| UI | screen | patch-note card, monitor UI (code-drawn) |

Office cameras: `OFF-WIDE` at distance 21 from the painting, target (0, −1.6, −20) — the `07`
framing · `OFF-MED` distance 14, target on the developer · `OFF-CLOSE` distance 6, on the hands.

### 0.2 Motion rules

- **No morphing.** Characters move by joint rotation of rig parts and by **replacement**: a part
  card (a hand, a head) is swapped for another drawing of the same part on a key frame. Two pose
  images are never blended.
- **Vorathul never looks up before S45.** When he raises the sword "to the sky" his helm stays level
  and the eye slit faces forward. The heroes are allowed to look up; he is not. Awareness step 1 is
  the first time.
- **The impact recipe** (all fight impacts, frame N = the anchor frame):
  - N−2..N−1 — anticipation: pose card held, speed lines appear, camera pushes 3 %.
  - N, N+1 — impact frame: every painting card drawn as a flat `#0A0A0A` silhouette on ivory
    `#F4ECD8` (a material override, code); violet glows stay violet.
  - N+2 — colour back; an ink-splash sprite scales 0 → 1 in 3 frames at the contact point and fades
    by N+12; a comic burst shows for 4 frames.
  - Camera shake from N: offset amplitude **big** 2.5 %, **medium** 1.2 %, **small** 0.5 % of frame
    height, plus ±1.5° roll on big; exponential decay with a 4-frame half-life; direction seeded by
    the event id (no `Math.random`).
  - A struck hero swaps to its *flying* pose on N, travels a ballistic arc (code), spins 360° per
    12 frames, and either exits frame or lands on the next key.
- **Secondary keys.** The measured Intro section runs 0–49.25 s and has the ≤ 2-beat limit, riff
  included. A gap of exactly 2 beats measures 2.03–2.07 beats after frame rounding and fails
  beatcheck (`limit + 1e-6`). So in the Intro every beat that is not within half a beat of a named
  event gets a secondary key (kind `key`): a light pulse, a crowd bob, a banner sway, a step of a
  shake decay. They are listed by beat index at the end of Appendix A (66 keys).

---

## 1. Shot list

### 1.1 Table

Dead air = the longest gap in beats between consecutive events inside the shot, cut and next cut
included, then the limit beatcheck applies to that section (Intro 2, everything else in this
stretch 4; see §1.3).

| Shot | Time | Frames | Beats | Anchor (cut) | Camera | On screen (cards, rig poses) | Event on the anchor | Dead air / limit |
|---|---|---|---|---|---|---|---|---|
| **Scene 1 — Intro chant** | | | | | | | | |
| S01 | 00:00.00–00:03.47 | 0–104 | 10.7 | `beat[1]` 0.450 | Black, static; slow uniform scale 1.00 → 1.03 | Black field. Gold dry-brush strokes wipe on one by one and draw the outline of the cathedral (the world is being painted). Keys: gold dust motes glint | First gold stroke | 1.34 / 2 |
| S02 | 00:03.47–00:07.57 | 104–227 | 12.7 | `word('VORASOL', 0)` "VORASOL" 3.46 (whisper's hearing of the "Vo-ra-thul" chant, prob 0.357, approximate) | `WIDE`, slow push z 40 → 34; P0–P5 parallax | The black-hole establishing shot (`01` composition, wings folded): Vorathul hands on pommel, galleries, kneeling army. Gold light rays bend 3° toward him on each key; clouds slide toward his crown | Cut on the first chant | 1.03 / 2 |
| S03 | 00:07.57–00:12.13 | 227–364 | 14.1 | `beat[23]` 7.576 (downbeat) | `FLOOR` truck left → right at y 1 past P5 soldiers; Vorathul's cape fills the back | Kneeling soldiers and front-row crowd bow in waves; banners sway on `beat[31]` | Cut to the army | 1.03 / 2 |
| S04 | 00:12.13–00:15.67 | 364–470 | 10.9 | `word('VORASOL', 1)` "VORASOL" 12.12 (prob 0.769) | `ECU` on the helm, pulls back to `CLOSE` across the shot | Helm close-up plate; the eye slit ignites violet in 4 frames; crown gems 1–3, chest studs L/R, then the sword rune climbs the fuller | Eye slit ignites on the second chant | 1.03 / 2 |
| S05 | 00:15.67–00:18.27 | 470–548 | 8.0 | `beat[48]` 15.673 (downbeat) | `LOW`, slow tilt up | Pipes still folded behind him; on every beat one pair of pipe mouths lights violet, inner to outer (8 beats × 2 = 16 pipes) | Cut to the organ | 1.03 / 2 |
| S06 | 00:18.27–00:19.57 | 548–587 | 4.0 | `hit[0]` 18.26 | Screen-space comic layout, static, small shake per slam | Four diagonal panels slam in on the drum fill, one hero each in *ready* pose: knight, mage, archer, rogue | Panel 1 (knight) | 1.03 / 2 |
| **Scene 2 — Riff fight, phase 1** | | | | | | | | |
| S07 | 00:19.57–00:20.87 | 587–626 | 4.0 | `hit[4]` 19.55 — band entry (= `riff-first-clash`) | `WIDE` diagonal, big shake | Knight leaps, sword vs shield. The painted health bar slams in at the bottom of the painting, full, ten cells, "VORATHUL" above it. Mage bolts on `hit[5]`, `hit[6]` | **Impact** + HP bar in | 1.03 / 2 |
| S08 | 00:20.87–00:21.33 | 626–640 | 1.4 | `hit[7]` 20.85 | `MED` on the right wing, small shake | Bolts ping off the folded pipes; pipes tremble on `hit[8]` | Small impact | 0.93 / 2 |
| S09 | 00:21.33–00:22.80 | 640–684 | 4.5 | `hit[9]` 21.33 — "second layer" | Fast pull-back `MED` → `WIDE` in 6 frames, big shake | **The fan opens**: all 16 pipes rotate out on their joints into the `03` fan. Archer volley on `hit[10]` | **Impact** (fan opens) | 1.13 / 2 |
| S10 | 00:22.80–00:24.73 | 684–742 | 6.0 | `hit[11]` 22.79 | `MED`, medium shakes | Arrows shatter on the pipes; on `hit[12]` one pipe rams down like a piston, the knight flies; on `hit[13]` a second pipe, the mage flies | **Impact** ×2 | 1.03 / 2 |
| S11 | 00:24.73–00:27.33 | 742–820 | 8.0 | `hit[14]` 24.74 | `FLOOR` low, sweep goes across camera | Sword sweep bowls archer and rogue; they tumble; on `hit[15]` all four land in a heap with a big ink splash; knight gets up on `beat[82]` | **Impact** sweep, **impact** heap | 1.03 / 2 |
| S12 | 00:27.33–00:29.93 | 820–898 | 8.0 | `beat[84]` 27.334 (no hit near; downbeat) | `MED` | Shield bash bounces off; the bar loses a 1 % chip that **refills** with a gold shine on `beat[86]`; mage's gold beam meets the fan folded into a shield on `beat[88]`, beam splinters | **Impact** ×2, regen | 1.03 / 2 |
| S13 | 00:29.93–00:32.17 | 898–965 | 7.0 | `beat[92]` 29.925 | `CLOSE` over-shoulder from behind the rogue | Backstab: the dagger bends like rubber; helm turns slowly (head joint); gauntlet *grab* swap, rogue lifted by the hood; wind-up | **Impact** backstab, **impact** grab | 1.06 / 2 |
| S14 | 00:32.17–00:34.73 | 965–1042 | 8.0 | `hit[16]` 32.17 | `WIDE`, whip-pan to the gallery and back | Rogue thrown into the gallery crowd, crowd ducks; knight + archer double attack bounces off on `beat[103]` | **Impact** throw | 1.03 / 2 |
| S15 | 00:34.73–00:37.33 | 1042–1120 | 8.1 | `hit[17]` 34.74 | `FLOOR`, heroes fly past camera through P5 | Sword slam, floor shockwave, debris; heroes crash into banners on `beat[111]`; mage starts a sigil circle | **Impact** slam | 1.03 / 2 |
| S16 | 00:37.33–00:39.90 | 1120–1197 | 8.0 | `hit[18]` 37.32 | `WIDE`, big shake | Gold explosion on Vorathul; smoke clears: unharmed; one wing flap blows the smoke and the heroes back, 1 % chip refills; sweat drops | **Impact** explosion | 1.03 / 2 |
| S17 | 00:39.90–00:44.07 | 1197–1322 | 12.9 | `beat[123]` 39.904 | Screen-space 4-panel split, then full frame on `hit[19]` | One panel per hero charging up (knight, mage, archer, rogue); on `hit[19]` the four attacks merge into one gold combo; `hit[20]` insert: eye slit narrows | **Impact** panel slam | 1.03 / 2 |
| S18 | 00:44.07–00:45.70 | 1322–1371 | 5.1 | `hit[21]` 44.08 | `MED`, big shake then three tiny ones | Combo hits the fan; rogue's dagger flurry on the triplet `hit[22–24]`: ping, ping, ping on the sword | **Impact** combo | 1.03 / 2 |
| S19 | 00:45.70–00:49.23 | 1371–1477 | 11.0 | `hit[25]` 45.70 | `WIDE` → push to `MED` | Open-palm swat: all four fly, crash-land on `beat[144]`, desperate last charge, and on `beat[148]` the **combined strike sticks**: the bar falls from 100 % to the II pip (66.7 %) with a crack; a hairline crack appears on the helm; head tilts down | **Impact** swat, landing, combined strike | 1.03 / 2 |
| **Scene 3 — Verse 1, phases 2 and 3** | | | | | | | | |
| S20 | 00:49.23–00:51.83 | 1477–1555 | 8.1 | `beat[152]` 49.245 (section start) | `CLOSE` on the bowed helm, tilts down to the floor | On "thousand" the floor at his feet is revealed as a pile of a thousand defeated heroes' helmets and shields; the four heroes tiptoe closer | Cut | 3.31 / 4 |
| S21 | 00:51.83–00:52.77 | 1555–1583 | 2.9 | `hit[26]` 51.82 | `ECU` helm | The hairline crack spreads, widens on `hit[27]`, violet light leaks | Crack | 1.97 / 4 |
| S22 | 00:52.77–00:54.47 | 1583–1634 | 5.3 | `hit[28]` 52.78 (≈ "final" 52.80) | `LOW` bust (`04` composition), push in, big shake | **Second form**: the helm halves swing apart on their jaw hinges (±25°); the void inside opens seven violet eyes in three rings on `hit[29–31]`; caption "PHASE II"; pipes flare wider | **Impact** helm split | 2.07 / 4 |
| S23 | 00:54.47–00:56.63 | 1634–1699 | 6.7 | `word('Three', 0)` "Three" 54.46 | Insert on the health bar (HUD), slow truck right | The three phase pips light one per word: I on "Three", II on "phases", **III** on "of", which glows and pulses | Pip I lights | 2.17 / 4 |
| S24 | 00:56.63–00:59.23 | 1699–1777 | 8.1 | `hit[33]` 56.64 (≈ "destruction," 56.34) | `WIDE`, big shake | Second-form sword slam, all heroes fly; on "flawless" the knight's shield shatters (cartoon); on "rage" the seven eyes flare; on `hit[36]` the mage's lucky bolt lands | **Impact** slam | 2.17 / 4 |
| S25 | 00:59.23–01:01.67 | 1777–1850 | 7.6 | `hit[37]` 59.22 | `WIDE` diagonal (`06` composition), tilt up with the sword | The bar falls to the III pip: caption "PHASE III"; sword raised (head level). On "Players" a caption "METEOR RAIN" slams in and black meteors with violet trails start falling; on "wept," the first one lands, heroes cry comic tears | HP to III, phase 3 starts | 3.00 / 4 |
| S26 | 01:01.67–01:04.33 | 1850–1930 | 8.3 | `word('controllers', 0)` "controllers" 61.66 | Office stage, a plain flat grey wall in close-up, static; small shake on the hit | **The one office cut.** A flat-vector gamepad flies in and hits the wall on "shattered", cracks spread on "on", a button pops off on `hit[38]`. No painting, no people in frame — the reveal stays for S31 | Cut to the office | 2.49 / 4 |
| S27 | 01:04.33–01:07.60 | 1930–2028 | 10.1 | `word('wall', 0)` "wall" 64.32 | `WIDE`, medium shake per landing | Meteor Rain full: meteors land on `beat[201]`, `beat[203]`; knight KO on `hit[40]`, mage KO on `hit[41]` (KO stars, no blood) | Cut back | 2.17 / 4 |
| S28 | 01:07.60–01:10.07 | 2028–2102 | 7.7 | `hit[42]` 67.60 (= "finished" 67.60) | `FLOOR` | Archer KO; the rogue tries to run, a big meteor on "at", and on "all" he is flattened like a pancake. Party wiped; the bar **refills to 100 %** (the fight resets) | **Impact** KOs | 3.52 / 4 |
| **Scene 4 — Pre-chorus pull-back** | | | | | | | | |
| S29 | 01:10.07–01:12.33 | 2102–2170 | 7.0 | `word('And', 0)` "And" 70.08 | `MED` static, then the pull-back starts on "came" (§3) | Alone, victorious: helm halves close on `hit[43]`, sword planted point-down on `hit[44]` (`01` pose); meteors stop | Cut | 3.31 / 4 |
| S30 | 01:12.33–01:14.47 | 2170–2234 | 6.6 | `hit[45]` 72.32 | Pull-back continues, tilting up (§3) | A gold edge rises over the roofline; on "dawn" it clears the roofline and reads as a **progress bar**; fill steps on `hit[46]`, `beat[230]` | Sun edge rises | 2.49 / 4 |
| S31 | 01:14.47–01:17.57 | 2234–2327 | 9.6 | `word('Of', 1)` "Of" 74.48 (prob 0.275, see §6) | No cut: frame match, then office pull-back to `OFF-WIDE` (§3) | The black frame edge enters at the screen edges, then wall, sticky notes, desks, the seated developers; on `hit[47]` the `07` framing; on "update" the bar and the monitor both hit 100 % and the monitor reads "UPDATE 2.3" | Frame match | 2.07 / 4 |
| **Scene 5 — Announcer 1, Patch 2.3** | | | | | | | | |
| S32 | 01:17.57–01:18.23 | 2327–2347 | 2.1 | `hit[48]` 77.57 | `OFF-WIDE`, static | The bored developer walks in from the right with a coffee and the eraser; on `hit[50]` he clicks a clicker at the painting | Dev enters | 1.76 / 4 |
| S33 | 01:18.23–01:18.80 | 2347–2364 | 1.8 | `beat[242]` 78.221 (= `silence-start`; nearest beat to the measured silence start 78.3 = f2349) | Locked, zero shake | **Freeze** (§4.1) | Freeze | 1.76 / 4 |
| S34 | 01:18.80–01:22.80 | 2364–2484 | 12.1 | `hit[51]` 78.80 (= `silence-end-hit`, the strongest onset in the song) | `OFF-WIDE`, the patch card in screen space | The patch-note card slams in and types its title on the robot words (§4.3); "LIVE" badge on `hit[56]` | Unfreeze + card | 3.49 / 4 |
| S35 | 01:22.80–01:24.40 | 2484–2532 | 4.8 | `hit[57]` 82.81 | `OFF-MED` two-shot, dev beside the painting | On "Vorathul," he taps the painted Vorathul with the eraser end; inside the canvas the small Vorathul flinches | Cut | 3.19 / 4 |
| S36 | 01:24.40–01:25.80 | 2532–2574 | 4.2 | `word('health', 0)` "health" 84.40 | `OFF-CLOSE` on hand and bar | Two fingers pinch the right end cap of the painted bar; "reduced" types on the card; tension on "by" | Edit 1 begins | 1.60 / 4 |
| S37 | 01:25.80–01:26.97 | 2574–2609 | 3.5 | `word('forty', 0)` "forty" 85.80 (= `hp-bar`) | `MED` inside the painting | A giant flat-vector hand drags the bar end left; snap on "percent": four cells pop off as magenta checker tiles and fall, Vorathul's knees dip | **Drag**, snap | 1.90 / 4 |
| S38 | 01:26.97–01:28.57 | 2609–2657 | 4.8 | `word('Meteor', 0)` "Meteor" 86.96 | `WIDE` inside, low | He raises the sword to cast Meteor Rain again (head level); three meteors and the "METEOR RAIN" caption appear on `hit[58]`; on "rain" a giant eraser's corner enters from the top edge | Sword up | 2.59 / 4 |
| S39 | 01:28.57–01:29.83 | 2657–2695 | 3.8 | `word('removed', 0)` "removed" 88.56 | `WIDE` inside, small shake per stroke | The eraser sweeps the sky: meteors turn magenta checker for 6 frames and vanish; the caption is struck through; crumbs fall on his helm on `beat[275]`, he brushes them off without looking up | **Erase** | 1.99 / 4 |
| S40 | 01:29.83–01:30.87 | 2695–2726 | 3.1 | `word('Phase', 0)` "Phase" 89.83 | `OFF-CLOSE` on hands | Dev peels a sticky note, writes "Phase 3" on "three" and crosses it out | Note peeled | 1.80 / 4 |
| S41 | 01:30.87–01:32.40 | 2726–2772 | 4.6 | `word('removed', 1)` "removed" 90.88 | `CLOSE` inside | His helm halves start to open (phase III attempt) and a giant sticky note slaps onto the helm, clamping it shut; pip III turns magenta on `beat[281]`; he tugs at the note | **Slap** | 1.99 / 4 |
| S42 | 01:32.40–01:34.03 | 2772–2821 | 4.8 | `word('Players', 1)` "Players" 92.40 | `OFF-WIDE` | Dev pins the patch card to the frame beside the other notes; dusts his hands on "felt" | Card pinned | 3.07 / 4 |
| S43 | 01:34.03–01:35.50 | 2821–2865 | 4.6 | `word('fight', 0)` "fight" 94.04 | `FLOOR` inside | The dizzy knight pokes the short bar with his sword; heroes gather on "was"; on "unfair" (announcer, 95.10) four thumbs up toward the sky. Vorathul behind them, head down | Poke | 1.76 / 4 |
| S44 | 01:35.50–01:38.73 | 2865–2962 | 10.0 | `beat[294]` 95.825 | Four comic zoom panels, one per key: `WIDE` → `MED` → `CLOSE` → `ECU` | His tiny bar, the magenta tiles, the sticky note on his helm, then the eye slit; on `beat[302]` the slit dims | Zoom panel 1 | 2.07 / 4 |
| **Scene 6 — UNFAIR, awareness step 1** | | | | | | | | |
| S45 | 01:38.73–01:40.00 | 2962–3000 | 3.9 | `beat[304]` 98.721 (section start), scream `word('unfair', 1)` "Unfair" 98.76 (= `scream-1`) | `LOW` close in front of him | One frame after the cut he **tilts the helm up for the first time** (head card swaps to the helm-from-below drawing) and screams. Only P0 (sky and clouds) shakes, hard, while the cathedral stays still: the sky behaves like a separate surface. Paint flakes fall from the sky on `beat[306]`, `beat[307]`. Cut to Chorus 1 at f3000 | **Shake** on the scream | 1.04 / 4 |

45 shots, 180 named events plus 66 Intro secondary keys = 246 scheduled events (Appendix A).

### 1.2 Anchor notes

- **"VORASOL"** is how whisper heard the "Vo-ra-thul" chant (3.46 s prob 0.357, 12.12 s prob
  0.769). The summary says the choir may chant more often than twice; only these two are measured,
  and only these two carry events.
- **"Players"** at 60.20 comes from the vocal-stem pass; the full-mix pass heard "Layers" at 59.74
  (not matched to a lyric). `word('Players', 0)` resolves to 60.20, which is the one I use.
- **"Patch"** is measured twice: 77.76 (full mix) and 79.14 (vocal stem, `line: null`). 77.76 sits
  before the true silence (78.3–78.8) and the summary warns that the first word after a rest can be
  off by up to 1 s; I bind the title typing to `word('Patch', 1)` = 79.14, and nothing to 77.76.
- **"Of"** at 74.48 (prob 0.275, stretched to 76.50) carries the frame match in S31. Fallback
  if a listening check moves it: `beat[231]` 74.680 (f2240).
- **Repeated words** and the nth used: "three" #0 = 54.46 ("Three phases"), #1 = 81.43
  ("two point three"), #2 = 90.26 ("Phase three"); "removed" #0 88.56, #1 90.88; "unfair" #0
  95.10 (announcer), #1 98.76 (scream); "the" #4 = 76.50 ("of the update"); "was" #1 = 94.52;
  "Of" #1 = 74.48 (#0 is "of" in "phases of destruction").
- **Fight downbeats.** Between about 30 and 44 s the measured hits fall one beat **before** the
  computed bar lines: `hit[16]` on `beat[99]`, `hit[17]` on `beat[107]`, `hit[18]` on `beat[115]`,
  `hit[19]` on `beat[131]` (bars start at 100, 108, 116, 132). The summary already says bar lines
  are only ±1 beat reliable. The big impacts there follow the hits, so they land on
  `beat[4k+3]` (99, 103, 107, 111, 115, 119, 123, 127, 131) instead of the computed downbeats.
- **Announcer tempo.** 79.2–93.3 s is fitted at 179.5 BPM (beat ≈ 0.334 s); the beat indices above
  already carry that. Every edit in Scene 5 is bound to a word, not a beat.

### 1.3 Dead-air check

The plan was run with the beatcheck dead-air logic (same `beatPos`, same section limits:
`/^(intro|chorus|final chorus|build|outro)/` → 2, everything else → 4) over the 246 events above.

| Section (measured) | Limit | Worst gap (beats) | Where |
|---|---|---|---|
| Intro 0.00–49.25 (scenes 1–2) | 2 | 1.34 | S01 last stroke → S02 cut |
| Verse 1 49.25–71.14 | 4 | 3.52 | S28 archer KO → big meteor |
| Pre-Chorus 71.14–77.58 | 4 | 3.31 | S29 "came" → S30 sun edge |
| Announcer 1 77.58–98.72 | 4 | 3.49 | S34 LIVE badge → S35 cut |
| Scream 1 98.72–100.01 | 4 | 1.04 | S45 shake peak → flakes |

The scene-map table names no limit for Pre-Chorus, Announcer and Scream; beatcheck gives them 4,
and this plan meets 4. The freeze (S33, 1.76 beats) is the only deliberate hold and is within it.

---

## 2. The fight as comic panels (S06–S28)

### 2.1 The hero party

Small (one ninth of Vorathul), solid black ink silhouettes, ivory capes with gold trim, gold gear.
No violet ever touches a hero.

- **Knight** — stocky black armour, short ivory cape, a big gold kite shield with the banners' sun
  emblem, short sword; always first in and first launched.
- **Mage** — tall hooded black robe, ivory mantle, gold staff topped with a sun ring; flat gold
  bolts, one big gold sigil circle; lands the one lucky bolt (S24).
- **Archer** — slim, a long flowing ink ponytail, short ivory cape, gold longbow, thin gold arrows
  that snap on the pipes.
- **Rogue** — small and hunched, hood, ivory scarf, twin gold daggers; backstabs, bends daggers, is
  thrown, flattened, and tries to run.

### 2.2 Impact ladder

One big impact per bar, by the hit where a hit exists, else by the bar's downbeat (or by
`beat[4k+3]` in 30–44 s, see §1.2). Pose = the anticipation key before it.

| Phase | Impact anchor (frame) | Pose before | What lands | Sold by |
|---|---|---|---|---|
| 1 | `hit[4]` f587 | panel slams S06 | knight's sword vs shield; HP bar in | big shake, burst, speed lines radial |
| 1 | `hit[9]` f640 | `hit[8]` pipes tremble | the fan opens | big shake, fast pull-back, ink splash ring |
| 1 | `hit[11]` f684 | `beat[68]` arrows in flight | arrows shatter on pipes | medium shake, gold splinters |
| 1 | `hit[12]` f703 | `hit[11]` | pipe piston: knight flies | flying hero, speed lines parallel |
| 1 | `hit[14]` f742 | `hit[13]` | sword sweep | big shake, two flying heroes |
| 1 | `hit[15]` f781 | `beat[78]` tumble | heap landing | big ink splash, dust |
| 1 | `beat[84]` f820 | `beat[82]` knight up | shield bash, 1 % chip | medium shake; the chip refills on `beat[86]` |
| 1 | `beat[88]` f859 | `beat[86]` mage pose | beam vs fan shield | big shake, beam splinters |
| 1 | `beat[92]` f898 | `beat[90]` | backstab, dagger bends | small shake (the joke is the nothing) |
| 1 | `beat[96]` f936 | `beat[94]` head turn | grab by the hood | medium shake, freeze-hold 4 frames |
| 1 | `hit[16]` f965 | `beat[98]` wind-up | rogue thrown into the gallery | whip-pan, crowd ducks |
| 1 | `beat[103]` f1004 | `beat[101]` | double attack bounces off | medium shake |
| 1 | `hit[17]` f1042 | `beat[105]` | sword slam shockwave | big shake, debris, heroes past camera |
| 1 | `beat[111]` f1081 | `beat[109]` | heroes crash into banners | medium shake, banners swing |
| 1 | `hit[18]` f1120 | `beat[113]` sigil circle | gold explosion on him | big shake, gold flash 2 frames, dust |
| 1 | `beat[119]` f1158 | `beat[117]` smoke clears | wing-flap gust, chip refills | medium shake, parallel speed lines |
| 1 | `beat[123]` f1197, `beat[127]` f1236 | `beat[121]` sweat drops | panel slams (charge-up) | small shakes per panel |
| 1 | `hit[19]` f1274 | `beat[129]` | the combo launches | big shake, four streaks merge |
| 1 | `hit[21]` f1322 | `hit[20]` eye narrows | combo on the fan; `hit[22–24]` dagger pings | big shake, then three tiny |
| 1 | `hit[25]` f1371 | `hit[24]` | open-palm swat | big shake, four flying heroes |
| 1 | `beat[144]` f1400 | `beat[143]` airborne | crash-landing | ink splash |
| 1→2 | `beat[148]` f1439 | `beat[146]` last charge | **combined strike sticks**: bar 100 % → II pip; helm hairline | big shake, bar crack sound-shape (burst on the bar) |
| 2 | `hit[28]` f1583 | `hit[26–27]` crack | **helm splits** (second form) | big shake, violet light, caption PHASE II |
| 2 | `hit[33]` f1699 | `word('of', 0)` pip III glows | second-form slam | big shake, all heroes fly |
| 2→3 | `hit[37]` f1777 | `hit[36]` lucky bolt | bar to III pip; sword up; caption PHASE III | medium shake |
| 3 | `word('Players', 0)` f1806 → `word('all', 0)` f2087 | sword held up | **Meteor Rain**: meteors, then KOs on `hit[40]`, `hit[41]`, `hit[42]`, "all" | medium shakes per landing, debris, dust |

### 2.3 What Patch 2.3 removes, shown first

| Removed later | Where it is set up | How it reads on screen |
|---|---|---|
| 40 % health | S07 (bar slams in full), S12 and S16 (chips refill instantly), S19 (one third finally lost), S28 (refills to 100 %) | A long gold-framed bar of ten cells under "VORATHUL". The audience learns it is huge and it heals. |
| Meteor Rain | S25 caption "METEOR RAIN" + S27–S28 (the attack that wipes the party) | Named once in a caption, then seen winning the fight. S38 reuses the same caption so the erase lands on a named thing. |
| Phase 3 | S23 (pips I, II, III light on "Three phases of"), S25 caption "PHASE III" | Pip III is the only pip that pulses; S41's sticky note covers exactly that pip and that helm. |

---

## 3. The pull-back reveal (S29–S31)

"And then came the dawn… Of the update…". One continuous move, no cut from f2138 to f2327.

| Frames | Anchor | Camera | What appears |
|---|---|---|---|
| f2102–f2138 | "And" → "came" | Painting `MED` (0, 4, 14) → (0, 6, −15), static | Vorathul alone, helm closes (`hit[43]`), sword planted (`hit[44]`) |
| f2138–f2234 | "came" 71.26 → "Of" 74.48 | Painting camera dollies back z 14 → 34 and rises y 4 → 2 while the target rises y 6 → 9 (tilt up to take in the sky); ease-in cubic, so it is still accelerating at f2234 | The P6 pass-by pillars (z +20, then +12, then +6; x ±7) enter from the screen sides and slide inward as the camera passes them, so the camera is seen leaving through the entrance. The sun rises (below). By f2234 the frame is the `01` composition with the pillars at its edges |
| f2170–f2313 | `hit[45]` → "update" | — | **Progress-bar sun** at P0.5, a rounded rectangle 6 × 1.2 units with 12 short gold dry-brush rays, ink outline, ivory track, gold fill. Rises from behind the roofline from `hit[45]` f2170 and clears it on "dawn" f2194, where the rounded-rectangle shape is unmistakable. Fill: 10 % f2194, 35 % `hit[46]` f2210, 50 % `beat[230]` f2231, 70 % f2250, 85 % f2269, 95 % f2289, 100 % with a gold flash on "update" f2313 |
| f2234 | "Of" (frame match) | The painting camera locks at its f2234 pose. From this frame the painting stage is drawn into a 1920 × 1080 render target shown on the office painting card, and the office camera starts at distance `d0` = 12.36, where that card fills the frame exactly, so f2233 and f2234 are the same picture | Nothing changes on screen at the switch |
| f2234–f2305 | "Of" → `hit[47]` | Office camera dollies back from `d0` to 21 (`OFF-WIDE`), target y 0 → −1.6; ease-out cubic, with its starting speed matched to the painting camera's apparent zoom speed at f2233 | **Frame edge:** the inner edge of the black frame starts on the screen border at f2234; a band about 3 % of frame height is visible on all four sides by f2240; the full frame and a margin of grey wall by `beat[232]` f2250; sticky notes on the frame by `beat[234]` f2269; the O1 desks slide in from both sides (parallax) by `beat[236]` f2289; the monitors are readable on "the" f2295; the `07` framing (painting upper centre, a desk on each side) on `hit[47]` f2305 |
| f2295–f2313 | "the" → "update" | Holds with a 0.5 % drift | The left monitor shows the same progress bar in office style ("UPDATE 2.3", code-drawn), stepping on the same frames as the sun. Both hit 100 % on "update" f2313: the sun in the painting is that install bar |
| f2313–f2327 | → `hit[48]` | Hold | The office in quiet; the painting on the wall is the `01` image Vorathul was just standing in |

Verification for the coder: stills at f2232–f2236 must differ only by the office camera's motion
(a pixel diff of f2233 vs f2234 shows no jump).

---

## 4. Patch 2.3 staging (S32–S44)

### 4.1 The freeze

`beat[242]` f2347 → `hit[51]` f2364 (17 frames). The measured silence is 78.3–78.8 s (f2349–f2364);
the freeze starts on the nearest beat, two frames early, as `events.ts` already does.

- Cause: on `hit[50]` f2344 the developer clicks a clicker at the painting. The game is paused.
- During the freeze: every card holds its f2347 transform, inside and outside the painting (the
  painting texture is not re-rendered); the camera holds; shake is zero; no key fires.
- On f2364 everything moves again, and the patch-note card arrives on that frame, the strongest
  onset in the song.

### 4.2 The three edits

Each edit is played twice: the developer doing a small, bored thing on the canvas surface (office
style), and what it looks like from Vorathul's side (the same tool, giant, coming out of the sky).
Vorathul does not look up during any of it.

| Edit | Measured words | Office side | Inside the painting | Magenta use |
|---|---|---|---|---|
| 1. Health −40 % | "health" 84.40 · "reduced" 84.86 · "by" 85.40 · "forty" 85.80 · "percent" 86.42 | S36: two fingers pinch the right end cap of the painted bar (f2532), hold through "reduced", start pulling on "by" (f2562) | S37: a giant hand (flat white, thin grey line, grey hoodie cuff) reaches down from the top of the frame. On "forty" (f2574) it drags the end cap left over 19 frames, easing; on "percent" (f2593) it snaps at 60 %: the four right cells pop off and fall as tiles. Vorathul's knees dip (cape lower segment compresses, torso drops 0.3 units), shoulders sag. The KO'd heroes look up at the hand; he looks at his gauntlet | The four fallen cells are `#E0129A` / black checkerboard |
| 2. Meteor Rain removed | "Meteor" 86.96 · "rain" 88.16 · "removed" 88.56 | (seen in the S35 setup: the eraser in his hand, same object as in `07`) | S38: he raises the sword to cast it again, head level (f2609); three meteors and the "METEOR RAIN" caption on `hit[58]` (f2619); on "rain" (f2645) a giant eraser's corner enters from the top edge. S39: on "removed" (f2657) it sweeps the sky in three strokes; each meteor turns into a flat magenta checker silhouette for 6 frames, then is gone; a UI-blue line strikes through the caption; grey crumbs fall on his helm on `beat[275]` (f2675), he brushes his shoulder | The erased meteors, 6 frames each |
| 3. Phase 3 removed | "Phase" 89.83 · "three" 90.26 · "removed" 90.88 | S40: he peels a note from a pad (f2695), writes "Phase 3" on "three" (f2708, pen stroke reveal over ~10 frames) and crosses it out | S41: his helm halves start to open, the phase III transformation; on "removed" (f2726) a giant sticky note falls out of the sky and slaps flat onto the helm, clamping the halves shut; pip III on the bar turns magenta on `beat[281]` (f2735); he tugs at the note with both gauntlets on `beat[283]` (f2755); it does not come off | Pip III becomes a checker square |

Then "Players felt the fight was unfair": S42 the developer pins the patch card to the frame next to
the sticky notes and dusts his hands (office, `07` framing); S43 inside, the heroes agree with the
patch (poke, gather, four thumbs up toward the sky on the announcer's "unfair" f2853). S44 is four
comic zoom panels into Vorathul, ending on the eye slit dimming. S45 is the first look up.

### 4.3 On-screen text (all rendered in code, never in a generated image)

| Text | Where | Style role | When (frame) |
|---|---|---|---|
| VORATHUL | above the painted health bar | comic caption lettering, black on ivory | f587 on |
| I · II · III | phase pips on the bar | caption lettering, small | lit f1634 / f1658 / f1679 |
| PHASE II | caption box | caption box: ivory, hand-jittered black ink border | f1583, 1.5 s |
| PHASE III | caption box | same | f1777, 1 s |
| METEOR RAIN | caption box | same | f1806 (S25); again f2619 (S38), struck through f2657 |
| UPDATE 2.3 · 100 % | left monitor | office UI, UI blue on white | f2295; 100 % f2313 |
| PATCH 2.3 | patch-note card title | office UI, mono | typed: "PATCH" f2374, "2" f2404, "." f2425, "3" f2443 |
| LIVE | pill on the card | office UI, white on UI blue | f2449 |
| Vorathul: health −40 % | card line 1 | office UI | "Vorathul:" f2500, "health" f2532, "−40 %" f2593 |
| Meteor Rain: removed | card line 2 | office UI | f2609 → f2657 |
| Phase 3: removed | card line 3 | office UI | f2695 → f2726 |
| Reason: players felt the fight was unfair. | card line 4 | office UI, grey | f2772 → f2853 |
| Phase 3 (crossed out) | sticky note | handwriting, UI blue | written f2708; seen giant f2726 |

The card is a pure function of the frame: whenever it is on screen (S34–S36, S40, S42) it shows the
lines typed so far. In S42 it is a stage card pinned to the frame (the same SVG rasterised to a
texture), not a screen overlay.

---

## 5. Asset list

### 5.1 How prompts are assembled

One image per call (an earlier run returned zero files when asked for several). Every prompt is the
literal concatenation of:

1. `Use your built-in image_gen tool to generate ONE image, then copy it from $CODEX_HOME/generated_images/... into the current directory as ./<id>.png`
2. The style block (STYLE-P for the painting world, STYLE-O for the office).
3. For Vorathul assets: the FIXED block.
4. `Subject:` and `Composition:` from the asset's paragraph below.
5. The cut-out line where the asset is transparent.
6. The NEGATIVE block, then `After copying, print the output path and pixel size.`

References attached: painting assets `stil/onayli/01-tarz-cizgi-roman.jpg` (style) and
`02-kanonik-karakter-sayfasi.jpg` (character); office assets `07-ofis-tablo.jpg`. md5 every round.

**STYLE-P** (verbatim from `06-dovus-faz3.prompt.txt`):

> The attached image is the APPROVED STYLE AND CHARACTER REFERENCE. Match its art style EXACTLY: bold graphic comic panel in a noir style, huge flat areas of solid black, very simplified shapes, thick confident brush-ink edges with dry-brush breaks, minimal detail, flat colour with no gradients, slight screen-print paper texture. World palette: bright ivory #F4ECD8, warm gold #E2B33C, one flat pale sky blue #8EC5E8. Vorathul is solid flat black #0A0A0A with violet #9B5CE0 only on eye slit, crown gems, chest-studs and sword runes.

**FIXED** (verbatim from `06-dovus-faz3.prompt.txt` and `KARAKTER.md`):

> Character (keep exactly): Vorathul, colossal knight-king, closed great-helm with narrow violet eye slit, two long curved black horns, jagged black crown with violet gems, spiky black fur-like pauldrons, black organ pipes rising behind him like wings, long tattered black cape, huge greatsword with a violet-runed fuller and a spiked crossguard.
> 1. Closed black great-helm, ONE narrow horizontal violet eye slit, no visible face. 2. Two long black horns that curve outward and up like a crescent moon, from the sides of the helm. 3. Jagged black crown on the helm: five sharp spikes, three violet gems across the front. 4. Spiky black fur-like pauldrons on both shoulders, a high spiky collar. 5. Two small violet diamond studs on the upper chest, one on each side. 6. WINGS: on each side about eight long black organ pipes fan out sideways from the shoulder blades like a spread wing, short pipes near the body, long pipes at the outer edge; every pipe mouth glows violet. 7. Long tattered black cape reaching the floor, ragged flame-like lower edge. 8. Greatsword: black blade with one violet rune line in the fuller, spiked black crossguard with a violet gem in the centre, held point-down in front of him. 9. Body is solid flat black #0A0A0A; violet #9B5CE0 ONLY on items 1, 3, 5, 6 (pipe mouths) and 8. 10. Proportions: very tall, broad shoulders, the helm is small relative to the shoulders.

**STYLE-O** (from `07-ofis-tablo.prompt.txt`):

> The attached image is the APPROVED OFFICE REFERENCE. Match its office style EXACTLY: a video game studio office drawn in a sterile flat vector style (cool greys #E9ECEF #CED4DA #ADB5BD, white, one UI blue #3B82F6, thin uniform outlines, rounded rectangles, no texture).

**Cut-out line, painting:** `The subject is isolated on a plain flat #808080 mid-grey background with nothing else in the image; parts are separated by wide empty gaps and do not overlap. The grey will be removed and is the only colour allowed outside the palette.`
**Cut-out line, office:** the same with `plain flat #00FF00 green` (grey is inside the office palette, so it cannot be the key).

**NEGATIVE** (verbatim):

> - ABSOLUTELY NO text, letters, numbers, logos, signatures, watermarks or speech bubbles.
> - NOT glossy digital painting, NOT cinematic lighting, NOT photorealistic, NOT 3D. No other colours than the palette above.

**Prerequisite, not counted here:** `R0`, the Vorathul front-view base rig planned with the rig lane
(helm with horns and crown, torso with pauldrons and collar, cape in three segments, upper and
lower arms L/R, sword, organ pipes in three lengths, legs hidden by the cape). Everything below is
beyond R0.

### 5.2 Generated images (31 assets, 32 images)

Generation size is what `image_gen` returns (1536 × 1024, 1024 × 1536 or 1024 × 1024); "target"
is after upscaling for camera moves.

| Id | Purpose | Shots | Gen → target | Alpha |
|---|---|---|---|---|
| G01 | Sky plate (P0) | S02–S05, S07–S31, S37–S45 | 1536×1024 → 3840×2160 | opaque |
| G02 | Five cloud cards (P0) | S02, S45 | 1536×1024 sheet | cut-out |
| G03 | Cathedral back wall (P1) | all painting wides | 1536×1024 → 3840×2160 | cut-out (sky openings) |
| G04a/b | Gallery tiers left / right (P2) | wides, S14 | 1024×1536 ×2 → 2048×3072 | cut-out |
| G05 | Front-row crowd strips ×3 (P2) | S03, S14 | 1536×1024 sheet | cut-out |
| G06 | Floor plate (P4) | all painting wides, S11, S15 | 1536×1024 → 3840×1600 | opaque |
| G07 | Kneeling soldiers L/R (P5) | S02, S03, S29 | 1536×1024 sheet | cut-out |
| G08 | Three sun banners (P5) | S03, S15 | 1536×1024 sheet | cut-out |
| G09 | Pass-by entrance pillars L/R (P6) | S29–S31 | 1024×1536 sheet → 2048×4096 | cut-out |
| G10 | Trophy pile of fallen heroes' gear (P4) | S20 | 1536×1024 | cut-out |
| G11 | Second-form helm halves L/R | S22, S24, S25, S27, S41 | 1536×1024 sheet | cut-out |
| G12 | Gauntlet pose sheet ×6 | S13, S19, S25, S38, S39, S41 | 1536×1024 sheet | cut-out |
| G13 | Helm tilted up, from below | S45 | 1024×1024 | cut-out |
| G14 | Helm close-up plate | S04, S21, S44 panel 4 | 1536×1024 → 3840×2160 | opaque |
| G15 | Knight pose sheet ×7 | S06–S28, S43 | 1536×1024 sheet | cut-out |
| G16 | Mage pose sheet ×7 | same | 1536×1024 sheet | cut-out |
| G17 | Archer pose sheet ×7 | same | 1536×1024 sheet | cut-out |
| G18 | Rogue pose sheet ×7 | same | 1536×1024 sheet | cut-out |
| G19 | Ink splash sprites ×8 | every impact | 1536×1024 sheet | cut-out |
| G20 | Comic impact bursts ×4 | every big impact | 1536×1024 sheet | cut-out |
| G21 | Meteors ×4 | S25, S27, S28, S38 | 1536×1024 sheet | cut-out |
| G22 | Mage bolt, beam segment, sigil circle | S07, S12, S15, S16 | 1536×1024 sheet | cut-out |
| G23 | Floor debris chunks ×10 | S15, S24, S27 | 1536×1024 sheet | cut-out |
| G24 | Dust puffs ×5 | S11, S16, S27 | 1536×1024 sheet | cut-out |
| G25 | Health-bar frame: left cap, tileable middle, right cap | S07–S44 | 1536×1024 sheet | cut-out |
| G26 | Paper grain + dry-brush texture tile | all code-drawn painting shapes | 1024×1024, seamless | opaque |
| G27 | Office back wall, empty centre (O0) | S31–S42 | 1536×1024 → 3840×2160 | opaque |
| G28 | Desk groups L/R with the seated developers (O1) | S31, S32–S34, S42 | 1536×1024 sheet | cut-out |
| G29 | Office foreground: plant, desk corner (O3) | S31, S32, S42 | 1536×1024 sheet | cut-out |
| G30 | Bored developer rig parts | S32–S36, S40, S42 | 1536×1024 sheet | cut-out |
| G31 | Developer hands ×6 (also the giant hand) | S36, S37, S40, S42 | 1536×1024 sheet | cut-out |

Prompts (Subject and Composition; assemble per §5.1):

- **G01** — Subject: an empty sky of the painted world, flat pale sky blue #8EC5E8 with a few large flat ivory clouds outlined in thick dry-brush black ink; no buildings, no ground, no figures. Composition: landscape 1536x1024, clouds spread evenly so any 16:9 crop works, no horizon.
- **G02** — Subject: five separate large flat ivory cumulus clouds with thick dry-brush black ink outlines and one flat gold shadow band each, different shapes. Composition: five clouds in a loose grid, landscape 1536x1024. Cut-out.
- **G03** — Subject: the far back wall of the golden gothic cathedral seen straight on: ivory and warm gold pointed arches in tiers, black spires, deep black ink shadows; every opening where sky would show is filled flat #808080; no characters, no organ pipes. Composition: symmetrical, frontal, landscape 1536x1024, the centre bay kept simple because a colossal figure stands in front of it.
- **G04a / G04b** — Subject: curved tiers of arched galleries in ivory and gold, receding toward the centre of the cathedral, empty balconies with balustrades, tiny black crowd silhouettes only on the upper tiers. Composition: portrait 1024x1536, G04a is the left side (galleries curve to the right), G04b the right side mirrored. Cut-out.
- **G05** — Subject: three long horizontal strips of tiny black spectator silhouettes leaning on a gold balustrade, a few raised arms, ivory highlights. Composition: three separate strips stacked with wide gaps, landscape 1536x1024. Cut-out.
- **G06** — Subject: the cathedral floor, glossy black and gold tiles with ivory dry-brush reflections, perspective receding to a central vanishing point, no figures. Composition: landscape 1536x1024, viewed from a low eye level, the far edge flat.
- **G07** — Subject: two groups of kneeling soldiers seen from behind in three-quarter view, black silhouettes with ivory capes and gold kite shields carrying a sun emblem, spears upright. Composition: left group and right group separated by a wide gap, landscape 1536x1024. Cut-out.
- **G08** — Subject: three tall hanging gold banners with an ivory sun emblem, black poles and spear tips, ragged lower edges. Composition: three banners side by side with gaps, landscape 1536x1024. Cut-out.
- **G09** — Subject: two massive foreground gothic pillars of the cathedral entrance, ivory and gold with heavy black ink shadow on the inner side, carved capitals, seen very close. Composition: left pillar and right pillar side by side with a gap, each full height, portrait 1024x1536. Cut-out.
- **G10** — Subject: a wide heap of hundreds of defeated heroes' empty helmets, broken gold shields with sun emblems, snapped swords, bows and staffs; black silhouettes with ivory and gold edges; comic, not grim: no bodies, no bones, no blood. Composition: a low wide mound, landscape 1536x1024. Cut-out.
- **G11** — (+ FIXED) Subject: Vorathul's great-helm SPLIT VERTICALLY into two separate halves shown side by side, inner edges jagged like a broken shell, each half carrying one horn and half of the crown with its violet gems; the inside surface flat black. Composition: two halves facing each other with a wide gap, front view, landscape 1536x1024, no head and no body. Cut-out.
- **G12** — (+ FIXED) Subject: six separate black spiked gauntlets of Vorathul in different hand poses: a fist gripping a sword hilt seen from below, an open palm swatting, thumb and finger pinching a hood, a pointing finger, a flat hand brushing, a fist clenched in frustration. Composition: two rows of three, same scale, landscape 1536x1024. Cut-out.
- **G13** — (+ FIXED) Subject: Vorathul's helm, horns and crown seen from a low angle as he tilts his head back to look straight up, the violet eye slit foreshortened and blazing, the high spiky collar in front; no face. Composition: square 1024x1024, the helm centred, only the collar below it. Cut-out.
- **G14** — (+ FIXED) Subject: extreme close-up of Vorathul's helm face plate: the single narrow violet eye slit, the crown with five spikes and three violet gems, the roots of both horns; behind him flat gold and ivory cathedral arches. Composition: landscape 1536x1024, the eye slit on the horizontal centre line, crown at the top edge.
- **G15** — Subject: a small heroic knight shown in seven separate poses: ready behind the shield, leaping sword strike, flying backwards with arms flailing, knocked out flat on his back with a dizzy pose, tiptoeing, poking forward with the sword, thumbs up; black armour silhouette, short ivory cape with gold trim, big gold kite shield with a sun emblem. Composition: seven full figures in a row with wide gaps, same scale, landscape 1536x1024. Cut-out.
- **G16** — Subject: a small hooded mage shown in seven separate poses: ready with staff, casting a bolt with the staff forward, both arms raised casting a big circle, flying backwards, knocked out face down, tiptoeing, thumbs up; black robe silhouette, ivory mantle, gold staff topped with a sun ring. Composition: as G15. Cut-out.
- **G17** — Subject: a small archer shown in seven separate poses: ready with the bow drawn, firing upward, flying backwards, knocked out sitting with legs out, tiptoeing, crying comic tears, thumbs up; slim black silhouette with a long flowing ink ponytail, short ivory cape, gold longbow. Composition: as G15. Cut-out.
- **G18** — Subject: a small hooded rogue shown in seven separate poses: crouched with twin daggers, backstab lunge, dangling as if lifted by the hood, flying backwards, flattened flat as a pancake (cartoon), running away, thumbs up; hunched black silhouette, ivory scarf, two gold daggers. Composition: as G15. Cut-out.
- **G19** — Subject: eight separate black dry-brush ink splashes with small gold flecks: radial splats, a directional streak, a droplet spray, a ring burst; no liquid shine. Composition: two rows of four, varied sizes, landscape 1536x1024. Cut-out.
- **G20** — Subject: four comic impact bursts, jagged star shapes with flat ivory fill, thick black ink outline and a smaller gold star inside. Composition: four bursts in a row, landscape 1536x1024. Cut-out.
- **G21** — Subject: four black rock meteors with long violet #9B5CE0 flame trails and black ink speed streaks, all falling on the same diagonal from upper right to lower left (Vorathul's attack, as in the reference). Composition: four meteors spread apart, landscape 1536x1024. Cut-out.
- **G22** — Subject: three separate pieces of hero magic: a flat gold bolt projectile with an ivory core, a straight gold beam segment with ragged ink edges, and a large flat gold sigil circle shaped like a sun ring. Composition: three items spread across, landscape 1536x1024. Cut-out.
- **G23** — Subject: ten separate chunks of broken golden floor tile and ivory stone, flat gold and ivory faces with black ink edges and cracks. Composition: scattered with gaps, landscape 1536x1024. Cut-out.
- **G24** — Subject: five ivory dust and smoke puffs with dry-brush black ink edges and a flat gold shadow. Composition: five puffs in a row, landscape 1536x1024. Cut-out.
- **G25** — Subject: an ornate gold boss health-bar frame in three separate pieces: a left end cap shaped like a small black-and-gold crown, a plain straight frame segment that can tile horizontally, and a right end cap ending in a gold spike; the inside of the frame is empty. Composition: three pieces in a row with gaps, landscape 1536x1024. Cut-out.
- **G26** — Subject: a seamless tileable square of slight screen-print paper grain on ivory with faint dry-brush ink drag marks, no shapes, no objects. Composition: square 1024x1024, even texture edge to edge.
- **G27** — (STYLE-O) Subject: the game studio office wall from the reference without the painting: cool grey wall, a white shelf unit on the left, a window on the right, ceiling light strips, a large potted plant; the centre of the wall left completely empty and flat (a large picture will be placed there); no people, no desks. Composition: wide eye-level shot, landscape 1536x1024, the empty centre area about 60 percent of the width and the upper two thirds of the height.
- **G28** — (STYLE-O) Subject: two separate desk groups from the reference: on the left a developer with glasses and short dark hair seen from behind at a desk with a monitor, on the right a developer with a hair bun in a black jacket seen from behind at a desk with a monitor; office chairs; both monitor screens blank light grey. Composition: left group and right group with a wide gap, landscape 1536x1024. Office cut-out.
- **G29** — (STYLE-O) Subject: a potted plant with flat grey leaves and the corner of a white desk with a mug, drawn close to the viewer. Composition: two separate items, landscape 1536x1024. Office cut-out.
- **G30** — (STYLE-O) Subject: the bored developer from the reference (short black hair, grey hoodie, dark trousers, white sneakers) as separate cut-out body parts laid out with gaps: head with half-closed bored eyes, head yawning, torso with hood, left and right upper arms, left and right forearms, legs standing, legs mid-step; three-quarter front view, all parts at the same scale. Composition: parts laid out in a grid, landscape 1536x1024. Office cut-out.
- **G31** — (STYLE-O) Subject: six large hands of the developer, white with thin grey outlines and a grey hoodie cuff: thumb and finger pinching, gripping (for an eraser), holding a small pad, holding a pen writing, thumbs up, two hands dusting off. Composition: two rows of three, same scale, landscape 1536x1024. Office cut-out.

### 5.3 Drawn in code (22)

Better in code because they animate their shape, must stay razor-flat (office), carry text, or are
pure colour.

| Id | What | Shots | Why code |
|---|---|---|---|
| C01 | Gold light rays bending toward him | S02, S03 | rotate per key; flat wedges with G26 texture |
| C02 | Violet glows: eye slit, crown gems, chest studs, pipe mouths, sword rune | S04, S05, all | ignite/dim per event; one shape per glow on R0 |
| C03 | Second-form void and the seven violet eyes | S22–S27 | eyes open one by one on hits |
| C04 | Helm crack lines (hairline → wide, violet leak) | S19, S21 | path grows over frames |
| C05 | Speed lines, radial and parallel | all impacts | seeded procedural fields |
| C06 | Gold arrows | S09, S10 | trivial shape, many copies |
| C07 | Comic tears, sweat drops, KO stars | S16, S25, S27, S28, S43 | tiny, animated |
| C08 | Paint flakes falling from the sky | S45 | seeded particles, ivory/gold with ink edge |
| C09 | Health-bar fill, 10 cell ticks, phase pips, name text | S07–S44 | fill level and length change every shot |
| C10 | Comic caption boxes + text | S22, S25, S38, S39 | text is code; strike-through animates |
| C11 | Progress-bar sun (track, fill, rays) | S30, S31 | fill steps on keys; rhymes with C17 |
| C12 | Missing-texture checkerboard `#E0129A` / black | S37, S39, S41, S44 | a material, used on any deleted shape |
| C13 | Impact-frame silhouette pass | all impacts | material override, 2 frames |
| C14 | Comic panel borders and gutters | S06, S17, S44 | layout per beat |
| C15 | Black picture frame + the sticky notes on it | S31–S42 | plain rectangles; must line up with the render target to the pixel |
| C16 | Patch-note card | S34–S36, S40, S42 | text, typing, later pinned as a texture |
| C17 | Monitor UI: "UPDATE 2.3" progress bar | S31 | text + fill synced with C11 |
| C18 | Eraser (normal and giant) + crumbs | S32, S35, S38, S39 | flat vector block: white, grey, UI-blue sleeve |
| C19 | Sticky note + pad, "Phase 3" handwriting | S40, S41 | text + stroke reveal |
| C20 | Clicker, coffee mug | S32, S35, S42 | flat vector props |
| C21 | Gamepad, intact and 7 shards | S26 | flat vector; shards are clip paths of one SVG |
| C22 | Plain grey wall + crack lines (gamepad shot) | S26 | flat fill + growing crack path |

Totals: **53 assets — 31 generated (32 images: G04 is a left/right pair), 22 drawn in code** (plus the R0 base rig, planned elsewhere).

---

## 6. Risks and open questions for the director

1. **Painting aspect at the frame match.** The pull-back needs the painting stage rendered into a
   texture inside the one WebGL canvas (a render target, not a second canvas), and an invisible
   switch only works if the painting is 16:9 like the video. The `07` frame shows a painting of
   about 3:2. Proposal: the painting is 16:9 in the film (G27 leaves a 16:9 opening). Keep 3:2
   instead, and the match frame will show a thin band of wall at the sides.
2. **Every-beat keys in the intro.** The Intro section's ≤ 2-beat limit covers the whole riff
   (0–49.25 s), and a 2-beat spacing measures 2.03–2.07 beats after frame rounding, so this plan adds
   66 secondary keys. Alternative: allow beatcheck a one-frame tolerance and drop most of them.
   Which one?
3. **Two palette rulings.** (a) `07` shows a **pink** eraser, which is outside all three palettes;
   this plan draws it white, grey and UI blue, and only what it erases turns magenta. (b) The
   approved `04` and `06` frames put violet on Vorathul's attacks (meteor trails, armour cracks, the
   seven eyes), beyond the five items in `KARAKTER.md` item 9; the plan follows the approved frames.
   Confirm both.
4. **Low-confidence word anchors.** The frame match rides on "Of" 74.48 (prob 0.275), the patch
   title on the vocal-stem "Patch" 79.14 (the full mix heard it at 77.76), and the intro on
   "VORASOL" (prob 0.357 and 0.769). A listening check is needed before these are locked;
   the fallbacks are `beat[231]` for the match and `hit[51]` (already the card's slam) for the title.
5. **Fonts.** `vorathul-nerfed/` bundles no font. The text needs three: comic caption lettering, an
   office UI face (IBM Plex Mono is already in the repo under `her-sabah-bastan/`), and a
   handwriting face for the sticky note. Adding OFL fonts is a new dependency: approve, and choose
   the caption face?
6. **Image volume and cut-outs.** 32 generated images, most of them cut-outs keyed off #808080
   (painting) or #00FF00 (office), several at 2.5× upscale, and four hero sheets that must keep the
   same scale and look. Proposal: generate G15–G18 and G11 first as a test round and check keying,
   scale and drift before the plates.

---

## Appendix A — event schedule

Frame, anchor, label; the first event of each shot is its cut. Generated from the same plan file
that produced §1.3, so every frame here equals `round(anchor × 30)`.

- **S01** — f13 `beat[1]` first gold stroke · f33 `beat[3]` stroke · f52 `beat[5]` stroke · f72 `beat[7]` stroke · f91 `beat[9]` stroke
- **S02** — f104 `word('VORASOL', 0)` cut: black hole wide · f120 `beat[12]` rays bend · f140 `beat[14]` rays bend · f159 `beat[16]` rays bend · f179 `beat[18]` clouds bend · f198 `beat[20]` rays bend · f218 `beat[22]` clouds bend
- **S03** — f227 `beat[23]` cut: kneeling army · f247 `beat[25]` bow wave · f266 `beat[27]` bow wave · f286 `beat[29]` bow wave · f305 `beat[31]` banners · f324 `beat[33]` bow wave · f344 `beat[35]` bow wave
- **S04** — f364 `word('VORASOL', 1)` cut: eye slit ignites · f383 `beat[39]` gem 1 · f392 `beat[40]` gem 2 · f402 `beat[41]` gem 3 · f422 `beat[43]` stud L · f431 `beat[44]` stud R · f451 `beat[46]` rune climbs
- **S05** — f470 `beat[48]` cut: organ wide · f480 `beat[49]` pipes 1 · f490 `beat[50]` pipes 2 · f499 `beat[51]` pipes 3 · f509 `beat[52]` pipes 4 · f519 `beat[53]` pipes 5 · f528 `beat[54]` pipes 6 · f538 `beat[55]` pipes 7
- **S06** — f548 `hit[0]` panel: knight · f558 `hit[1]` panel: mage · f567 `hit[2]` panel: archer · f577 `hit[3]` panel: rogue
- **S07** — f587 `hit[4]` IMPACT first clash + HP bar · f606 `hit[5]` mage bolt · f616 `hit[6]` mage bolt
- **S08** — f626 `hit[7]` bolts ping off pipes · f635 `hit[8]` pipes tremble
- **S09** — f640 `hit[9]` IMPACT fan opens · f654 `hit[10]` archer volley · f665 `beat[68]` arrows in flight
- **S10** — f684 `hit[11]` IMPACT arrows shatter on pipes · f703 `hit[12]` IMPACT pipe piston: knight flies · f723 `hit[13]` pipe piston: mage flies
- **S11** — f742 `hit[14]` IMPACT sword sweep · f762 `beat[78]` tumble · f781 `hit[15]` IMPACT heap + ink splash · f801 `beat[82]` pose: knight up
- **S12** — f820 `beat[84]` IMPACT shield bash, HP chip · f839 `beat[86]` HP regen / pose mage · f859 `beat[88]` IMPACT beam vs fan shield · f878 `beat[90]` beam splinters
- **S13** — f898 `beat[92]` IMPACT backstab, dagger bends · f917 `beat[94]` head turn · f936 `beat[96]` IMPACT grab by the hood · f956 `beat[98]` wind-up
- **S14** — f965 `hit[16]` IMPACT rogue thrown into gallery · f985 `beat[101]` crowd ducks · f1004 `beat[103]` IMPACT double attack bounces off · f1023 `beat[105]` pose
- **S15** — f1042 `hit[17]` IMPACT sword slam shockwave · f1062 `beat[109]` heroes fly past camera · f1081 `beat[111]` IMPACT crash into banners · f1101 `beat[113]` pose: mage circle
- **S16** — f1120 `hit[18]` IMPACT gold explosion · f1139 `beat[117]` smoke clears, unharmed · f1158 `beat[119]` IMPACT wing-flap gust, HP chip regen · f1178 `beat[121]` sweat drops
- **S17** — f1197 `beat[123]` IMPACT panel slam: knight charges · f1216 `beat[125]` panel: mage charges · f1236 `beat[127]` IMPACT panel slam: archer charges · f1255 `beat[129]` panel: rogue charges · f1274 `hit[19]` IMPACT combo launched · f1293 `hit[20]` eye slit narrows
- **S18** — f1322 `hit[21]` IMPACT combo on fan · f1327 `hit[22]` dagger ping · f1332 `hit[23]` dagger ping · f1337 `hit[24]` dagger ping
- **S19** — f1371 `hit[25]` IMPACT swat · f1390 `beat[143]` heroes airborne · f1400 `beat[144]` IMPACT heroes crash-land · f1419 `beat[146]` pose: last charge · f1439 `beat[148]` IMPACT combined strike, HP to II, helm hairline · f1458 `beat[150]` head tilts down
- **S20** — f1477 `beat[152]` cut: trophy pile · f1484 `word('For', 0)` tilt down · f1516 `beat[156]` heroes tiptoe · f1525 `word('thousand', 0)` helmet pile revealed
- **S21** — f1555 `hit[26]` crack spreads · f1564 `hit[27]` crack widens
- **S22** — f1583 `hit[28]` IMPACT helm splits, PHASE II caption · f1603 `hit[29]` eyes ring 1 · f1622 `hit[30]` eyes ring 2 · f1632 `hit[31]` eyes ring 3
- **S23** — f1634 `word('Three', 0)` pip I · f1641 `hit[32]` bar pulse · f1658 `word('phases', 0)` pip II · f1679 `word('of', 0)` pip III glows
- **S24** — f1699 `hit[33]` IMPACT second-form slam · f1715 `hit[34]` heroes fly · f1724 `word('flawless', 0)` shield shatters · f1728 `hit[35]` debris · f1749 `word('rage', 0)` eyes flare · f1757 `hit[36]` lucky bolt hits
- **S25** — f1777 `hit[37]` HP to III, PHASE III caption, sword up · f1806 `word('Players', 0)` METEOR RAIN caption, meteors · f1835 `word('wept', 0)` first meteor impact, comic tears
- **S26** — f1850 `word('controllers', 0)` cut: office gamepad · f1871 `word('shattered', 0)` gamepad cracks on wall · f1888 `word('on', 0)` cracks spread · f1912 `hit[38]` button pops off
- **S27** — f1930 `word('wall', 0)` cut: meteor rain wide · f1951 `beat[201]` meteor · f1970 `beat[203]` meteor · f1989 `hit[40]` IMPACT knight KO · f2008 `hit[41]` IMPACT mage KO
- **S28** — f2028 `hit[42]` IMPACT archer KO · f2062 `word('at', 0)` big meteor · f2087 `word('all', 0)` IMPACT rogue flattened, HP refills
- **S29** — f2102 `word('And', 0)` cut: alone · f2105 `hit[43]` helm closes · f2124 `hit[44]` sword planted · f2138 `word('came', 0)` pull-back begins
- **S30** — f2170 `hit[45]` sun edge rises · f2194 `word('dawn', 0)` sun = progress bar · f2210 `hit[46]` fill jumps · f2231 `beat[230]` fill tick
- **S31** — f2234 `word('Of', 1)` frame match, frame edge appears · f2250 `beat[232]` frame fully visible · f2269 `beat[234]` office wall · f2289 `beat[236]` desks · f2295 `word('the', 4)` dev monitors · f2305 `hit[47]` office full (07) · f2313 `word('update', 0)` bar 100 %, monitor PATCH 2.3
- **S32** — f2327 `hit[48]` cut: dev walks in · f2344 `hit[50]` clicker click
- **S33** — f2347 `beat[242]` FREEZE (hold)
- **S34** — f2364 `hit[51]` UNFREEZE, patch card slams in · f2374 `word('Patch', 1)` type PATCH · f2404 `word('two', 0)` type 2 · f2425 `word('point', 0)` type . · f2443 `word('three', 1)` type 3 · f2449 `hit[56]` card LIVE badge
- **S35** — f2484 `hit[57]` cut: dev at painting · f2500 `word('Vorathul', 0)` card line 1, dev taps painting
- **S36** — f2532 `word('health', 0)` cut: dev pinches bar end · f2546 `word('reduced', 0)` line types · f2562 `word('by', 0)` pull
- **S37** — f2574 `word('forty', 0)` cut inside: giant hand drags bar · f2593 `word('percent', 0)` snap: 4 cells fall magenta, knees dip
- **S38** — f2609 `word('Meteor', 0)` cut: sword up again · f2619 `hit[58]` three meteors + caption · f2645 `word('rain', 0)` eraser enters from sky
- **S39** — f2657 `word('removed', 0)` ERASE swipe, magenta streaks · f2675 `beat[275]` crumbs on helm
- **S40** — f2695 `word('Phase', 0)` cut office: sticky pad · f2708 `word('three', 2)` writes Phase 3
- **S41** — f2726 `word('removed', 1)` cut inside: note slaps helm shut · f2735 `beat[281]` pip III magenta · f2755 `beat[283]` tugs note
- **S42** — f2772 `word('Players', 1)` cut office: card pinned to frame · f2789 `word('felt', 0)` dev dusts hands
- **S43** — f2821 `word('fight', 0)` cut inside: knight pokes bar · f2836 `word('was', 1)` heroes gather · f2853 `word('unfair', 0)` four thumbs up to the sky
- **S44** — f2865 `beat[294]` zoom panel 1 · f2884 `beat[296]` zoom panel 2 · f2904 `beat[298]` zoom panel 3 · f2923 `beat[300]` zoom panel 4 · f2942 `beat[302]` hold, eye dims
- **S45** — f2962 `beat[304]` cut: low angle under helm · f2963 `word('unfair', 1)` LOOKS UP, scream, sky shakes · f2971 `beat[305]` shake peak · f2981 `beat[306]` paint flakes fall · f2991 `beat[307]` flakes
- **Secondary keys (Intro section only, kind `key`):** beats 0, 2, 4, 6, 8, 11, 13, 15, 17, 19, 21, 24, 26, 28, 30, 32, 34, 36, 38, 42, 45, 47, 61, 66, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130, 132, 134, 135, 138, 139, 140, 142, 145, 147, 149, 151.
