# NERFED — scene map (contract §1)

Every time below is measured (`data/timing.json`, commit 25ac30d). Bars are ~1.29 s at the
~186 BPM pulse; bar lines are only ±1 beat reliable, so **sync to `beats` and `hits`, never to
bar numbers**. A row marked *word* is bound to a measured word in `words`; a row marked *hit*
is bound to an onset in `hits`.

## Identity

> A god of a painted world finds out he lives inside a painting in a game studio office —
> and climbs out.

Three visual languages, never mixed inside one shape:

| World | Look | Source frame |
|---|---|---|
| The painting (game world) | Graphic noir comic: ivory, warm gold, one pale sky blue, thick dry-brush ink | `stil/onayli/01-tarz-cizgi-roman.jpg` |
| Vorathul | Solid flat black hole in that world; violet only on eye slit, crown gems, chest studs, pipe mouths, sword runes | `stil/onayli/02-kanonik-karakter-sayfasi.jpg`, `KARAKTER.md` |
| The office (real world) | Sterile flat vector: cool greys, white, one UI blue, thin uniform lines | `stil/onayli/07-ofis-tablo.jpg` |

The only colour outside the three palettes is the missing-texture magenta `#E0129A`, used only
for deleted things.

## Awareness ladder

Vorathul's realisation that the sky is a canvas is the spine of the film. Each step happens once,
in this order:

1. 1:38.8 — looks up for the first time (UNFAIR scream).
2. 2:31–2:51 — sees a straight frame edge at the corner of the sky.
3. 2:51–3:18 — puts his gauntlet against the inside of the canvas; the office is visible, blurred.
4. 3:18–3:42 — the canvas cracks from his side.
5. 3:42 — breaks out.

## Scenes

| # | Time | Section (measured) | Inside / outside | What happens | Anchors |
|---|---|---|---|---|---|
| 1 | 0:00.0–0:19.5 | Intro: organ + choir chant | Painting | Darkness to gold; the "black hole" establishing shot; light and clouds bend toward him; name chant | chant words only from vocal stem (`VORASOL` 3.5, 12.1 s) — treat as approximate |
| 2 | 0:19.5–0:49.2 | Instrumental riff (not in lyrics) | Painting | The fight, phase 1: a hero party (knight, mage, archer, rogue) storms the cathedral; sword and pipe-wing strikes | *hit* 19.55 band entry = first clash; *hit* 21.33 second layer; one impact per bar |
| 3 | 0:49.2–1:11.1 | Verse 1 | Painting (one office cut) | Phase 2: helm splits — second form; phase 3: Meteor Rain; heroes fall. "controllers shattered on the wall" = one cut to a cracked gamepad in the office | *hits* 52.78, 56.64; lyric line times from `lines` |
| 4 | 1:11.1–1:17.6 | Pre-chorus "And then came the dawn… of the update" | Pull-back | The sun rising in the painting is a progress bar; camera pulls back through the frame: it is a painting on an office wall | *hit* 72.32 |
| 5 | 1:17.6–1:38.7 | Announcer 1 (Patch 2.3) | Office + painting | 78.3–78.8 the only true silence: everything freezes. A bored dev edits the painting: health −40 % (bar dragged), meteors erased, "Phase 3" sticky note | silence 78.3–78.8; *hits* 78.80, 80.08, 81.62, 82.81; *word* "forty percent" 84.40–86.96, "Meteor Rain: removed" 86.96–89.28, "Phase three: removed" 89.83–91.82 |
| 6 | 1:38.7–1:40.0 | Scream "UNFAIR?!" | Painting | Almost unaccompanied scream; the canvas shakes; awareness step 1 | *word* 98.76–99.62 |
| 7 | 1:40.0–1:59.6 | Chorus 1 | Painting | Shrunken, dimmed Vorathul; a level-12 kid beats him with a shoe | NERFED 100.90, 105.98; *word* "with a shoe" 117.76–119.68 |
| 8 | 1:59.6–2:18.5 | Verse 2 (growl / operatic trading) | Painting | Each line deletes one thing: wings → magenta checkerboard in wing shape, second form, laser eyes, storm. Growl lines flash the second form for one beat | *word* "They took my wings" 119.68, "second form" 122.48, "laser eyes" 123.40, "cursed storm" 125.04, "seven minutes long" 127.70, "skips it" 132.26 |
| 9 | 2:18.5–2:27.2 | Announcer 2 (Patch 2.4) | Office + painting | SKIP button on his cutscene; a volume slider: cork stoppers pop into the pipe mouths | *hits* 136.06–142.0; *word* "can now be skipped" 141.18, "volume reduced" 145.42 |
| 10 | 2:27.2–2:31.0 | Scream "MY THEME SONG?!" | Painting | Corked pipes strain | *word* 147.58–149.54 |
| 11 | 2:31.0–2:51.3 | Chorus 2 | Painting | Same nerfed state; awareness step 2 (frame edge) | NERFED 151.38, 156.54; shoe 168.16 |
| 12 | 2:51.3–3:18.2 | Soft interlude (176.6 BPM, slower) | Painting, then both | Empty cathedral; he sits alone; memory of a player cheering after finally beating him; awareness step 3 (hand on the canvas) | *word* "built to be loved" 194.10, "By being hated" 196.08–199.94 |
| 13 | 3:18.2–3:42.7 | Build (drums return one by one) | Both | Players outside want him back (posters, forum cards in the office); awareness step 4: cracks spread from his gauntlet | crack growth one step per downbeat |
| 14 | 3:42.7–4:03.3 | Final chorus (no key change — the climax must be visual) | Breakout | He bursts through the frame into the office; his black ink and gold paint spread over the flat office; pipes fly back and relight | NERFED 223.36, 228.50 |
| 15 | 4:03.3–4:08.5 | Announcer 3 (Patch 2.5) | Office | His eye fills a monitor; a trembling hand clicks "Revert" | *hits* 245.37–246.18; "changes reverted" not heard by whisper — anchor to *word* "Vorathul" 247.22 |
| 16 | 4:08.5–4:31.6 | Choir "VO-RA-THUL" | Office in ruins | Throne built from office chairs on the wreckage; biggest blast at the loudest bar | loudest bar 4:26.4; chant words 248.48, 253.0, 257.5, 264.98 |
| 17 | 4:31.6–4:33.8 | Outro, final organ chord | — | Paint covers the whole screen; end card | laughter position not measured |

## Rules for every lane

- **Dead air:** chorus, build, final chorus and outro ≤ 2 beats without an event; verse and
  interlude ≤ 4; deliberate holds in the interlude up to 8. The intro also ≤ 2 beats.
- **Fights are comic panels, not choreography:** a strong pose, then an impact frame, sold by
  camera shake, ink splashes, speed lines and flying heroes. One big impact per bar.
- **Character motion** uses the cut-out rig (separate parts and joint rotation), never shape
  morphing between two pose images.
- **Frame purity:** no `Math.random`, `Date.now`, `useFrame`, `requestAnimationFrame` or timers;
  randomness is seeded.
- **Lyrics** are bound only to measured words; never to a guessed time.
- Comedy is cartoon violence: no blood, the developers flee.
- **No JSX constants at module level** (the bundle compiles JSX to `React.createElement` and `React`
  is undefined while modules load — such a constant crashes the bundle).
- **Final renders are rendered twice and compared** with `tools/glitchcheck.py`: a full render once
  captured mosaic-tiled frames while other heavy renders ran on the machine. Render with no other
  Remotion process running.
- **Character motion = two layers:** big pose changes on twos (15 fps), a continuous small "life"
  layer every frame (breathing, cape, glow flicker); 2D overlays (ink, scribbles, collage) on twos —
  the recipe measured in the Arcane "Enemy" reference.

## Decided (Burak, 20 Oct 2026)

- The full 4:33.8 stays, intro chant included: 0:00–0:19.5 builds how epic and frightening he is.
- The audio is never ducked. "Volume reduced" is shown visually: he clutches his throat, only a
  thin wisp of smoke leaves the corked pipes.
- End card: "Patch 2.6 notes:" starts typing and is cut off.

## Rendering stage

- Three.js is used as a **2.5D card stage**: every drawing stays a flat 2D texture on an unlit
  plane (`meshBasicMaterial`, `toneMapped: false`), layered in depth for parallax and real camera
  moves (pull-back through the frame, the breakout shards). No 3D models, no lights, no shadows.
- One WebGL canvas per frame (a second canvas rendered black in parallel renders before).
- Post effects, if any, use `postprocessing` directly, not `@react-three/postprocessing`.
- The rig is the same stage: each Vorathul part is a card that rotates around its joint.
