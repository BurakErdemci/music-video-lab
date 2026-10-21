# Merge Conflict: scene map (v1, 2026-10-21)

Built on `direction.md` (concept, references, look rules), the approved look `stil/onayli/01-tarz-ve-ikili-F5.png` and the approved characters `stil/onayli/02-karakter-turuncu.png` and `03-karakter-mavi.png`. All times are measured: `data/take-2026-10-20/mc-timing.json`, 153.08 BPM, one beat = 0.392 s.

## Identity

Two girls fight over one line of code the way two divas fight over one spotlight. It is a heavy-metal disco dance battle where every git command is a move, until "accept both" turns the spotlight into a gradient.

## Scalar (before the first commit of code)

- Event drift: 0 frames on every beat event (beatcheck).
- Dead air:
  - chorus, build, final, outro: at most 2 beats;
  - verse: at most 4 beats.
- Render errors: 0.
- Flashes: at most 3 per second (flashcheck).

## Rules carried into every shot

- **One hue per shot.** The rival's colour is the cutting light (rim or split light). The hue changes on phrase boundaries; hits use white-out frames within the flash budget.
- **The spotlight is "line 42".** Whoever stands in the hard white cone owns the line.
  - The spotlight and the particle field (confetti and mirror-ball sparkles) outlive every scene. They carry continuity.
  - Scene changes are spotlight whips, a scatter into particles and a rebuild, or a burst.
- **Characters are still painted poses,** not limb animation.
  - Life comes from a slight float, the hair, the neon scribbles tracing them, the particles and the type.
  - A pose change goes through particles (scatter 10-14 frames, gather 6-10, at 30 fps units; ×2 at 60).
- **Git commands are the dance moves.**
  - They appear as light-box signs and as kinetic type that slams, multiplies and dissolves into letters (NWF).
  - Every key word gets its own object.
- **The camera** moves 14-24 frames with `Easing.out(quad)`, then stops fully. The layers never stop.
- **60 fps from the first frame.** The scene clock runs in seconds.

## Sets

| Set | Where | Hue family | Used in |
|---|---|---|---|
| HOME: The Mainline | Disco club: particle dance floor, a giant spiked mirror ball, a rig of light-box signs over the stage, the spotlight from above | Changes per shot; the chorus escalates | Choruses, breakdown, solo, final |
| BLUE: The Reviewed Stage | A pristine catwalk with a neat light grid and aligned mirror tiles | Cyan / electric blue | Verse 1 |
| ORANGE: The Night Shift | The same catwalk being spray-painted over, neon tags, a commit counter | Orange / red | Verse 2 |
| CUT-OUT: The Diff Panels | Flat poster cut-outs on one flat hue, as in Enemy (green on red) | Magenta, then acid green | Verse 3, verse 4 |
| QUIET: After Hours | The empty club after closing, navy dark, slow confetti | Navy plus one warm light | Piano interlude |
| GRADIENT | The Mainline with every light flowing from orange to blue | Full gradient | Final chorus, outro |

## Sections

| Time (s) | Section | What happens | Key words and objects | Hue |
|---|---|---|---|---|
| 0.00-10.05 | Intro (riff, hard stop) | Black. One spotlight snaps on an empty floor. The light-box rig flickers "line 42". The riff kicks in, confetti bursts, and both girls drop into the frame from opposite sides on the downbeats. On the stop, both freeze nose to nose in the eye-split close-up. | Light-box `<<<<<<<`, `=======`, `>>>>>>>` bars | Black → white burst |
| 10.05-23.10 | Verse 1, blue | The blue girl owns the Reviewed Stage, alone in the spotlight with precise disco steps.<br>"stable and clean": aligned mirror tiles.<br>"line forty-two": a light-box plate "42".<br>"approved by the whole design team": a row of glowing check stamps (NWF "RIGHT ✓" multiply).<br>"who are you?": an orange light cuts into her blue. | HEAD, 42, ✓ ✓ ✓ | Cyan / blue |
| 23.20-35.24 | Verse 2, orange | The orange girl crashes in. The catwalk is spray-painted over, and her neon scribbles trace everything.<br>"button is ORANGE": the plate repaints.<br>"rewrote your CSS": paint drips down the light-box letters.<br>"three hundred commits": a commit counter races to 300. | feature branch, ORANGE, 300 | Orange / red |
| 35.24-46.25 | Pre-chorus (drums only) | A call-and-response of close-ups. Each "Blue!" and "Orange!" flips the hue of the whole frame to that girl's colour; hue, not brightness, keeps it flash-safe.<br>"Somebody resolve this!": the spotlight swings wildly between them. | BLUE / ORANGE slams | Alternating |
| 46.25-72.94 | Chorus 1, HOME | The spotlight shove. Two giant light-box buttons stand on the stage: ACCEPT CURRENT and ACCEPT INCOMING. Each girl stomps hers; the gang "NO!" hits a white-out frame.<br>"Two girls, one line": both in one cone, shoulder to shoulder, shoving.<br>"Equals, equals, equals": three horizontal LED bars stack between them.<br>The camera rests; the layers boil. | ACCEPT CURRENT, ACCEPT INCOMING, NO!, `=======` | Magenta / cyan per shot |
| 72.94-77.60 | Post-chorus chant | Split-lit faces alternate on "Current! Incoming!". "CONFLICT!" ×3 slams. | CURRENT / INCOMING | Split |
| 77.60-91.18 | Verse 3, CUT-OUT (tabs vs spaces) | Fast shot-reverse-shot of poster cut-outs on flat magenta. Every insult becomes an object card:<br>TAB key vs SPACE bar;<br>a sticky note "data2";<br>a sign `// don't touch`.<br>"I KNOW! I TOUCHED IT!": she rips the sign.<br>"AAAAH": both scream in a white-out. | TAB, SPACE, data2, // don't touch | Magenta |
| 91.18-117.00 | Chorus 2, HOME (escalated) | Same choreography as chorus 1, bigger: "the build is on fire" puts orange and blue flames on the floor edge, there are more signs, and confetti storms. | as chorus 1 | Red / blue |
| 118.00-139.20 | Verse 4, CUT-OUT (rebase) | Acid green on red.<br>"rebased your history": the commit history is a string of glowing disco bulbs, and the orange girl yanks it.<br>"squashed all your sorries": a stack of SORRY cards is crushed into one strip.<br>"git blame": the blue girl's name tag lights on every LED line.<br>"pipeline is red": red neon pipes.<br>"reviewers are gone": empty chair silhouettes.<br>"standup's in five": a clock. | rebase, SORRY ×n, blame, red pipeline | Green / red |
| 139.24-141.62 | Breakdown: GIT! PUSH! FORCE! | The slowest, heaviest moment. The three light-box words light one per shout (139.24, 139.98, 140.80), each in its own colour. The floor tiles explode under the stomp. | GIT, PUSH, --FORCE | Orange, magenta, blue |
| 141.62-155.99 | Guitar solo: the BIG PERFORMANCE | The dance-off climax. On every bar the spotlight whips to whoever lands the stronger pose, so the poses fire on the beat. Neon scribbles go wild and the mirror ball spins faster. This is the clip's show moment (Vorathul's mic show counterpart). | Light-box scores flip | Every hue, one per bar |
| 155.99-166.91 | Piano interlude, QUIET | The colour drains. The girls sit back to back on the stage edge with slow confetti and quiet small type.<br>"Maybe blue was never really mine" / "orange was my way to say hello": each turns her head a little. | small serif lyric type | Navy plus warm light |
| 166.91-177.14 | Build (drums return) | "same file, different times": the two poses ghost over each other.<br>"two branches of the same old tree": a particle tree grows behind them, one branch orange, one branch blue.<br>The light-box rig rebuilds letter by letter. | particle tree | Navy → rising |
| 177.14-177.70 | HARD STOP | Everything freezes. Black. One spark. | | Black |
| 177.75-209.00 | Final chorus, GRADIENT | Both stand in ONE spotlight. The buttons merge into ACCEPT BOTH, and the spotlight and the whole club flow orange → blue.<br>"gradient now": the gradient sweeps the frame.<br>"Commit and push it": all git words light at once.<br>They dance together, hand in hand and spinning. | ACCEPT BOTH, YES!, gradient | Gradient |
| 209.00-218.40 | Outro chant | "Accept both! Ship it!": confetti cannons. The mirror ball bursts into particles on the last "SHIP IT!". Both scream. | SHIP IT! | Gradient, full riot |
| 218.40-232.96 | Instrumental tail and end | The particles settle into the title MERGE CONFLICT and a "merged" commit line. Fade on the last note. | title | Gradient → black |

## Asset list (Codex image_gen, one image per call, the approved sheets as references)

**Pose cards per girl (cut-outs on a flat key background), about 12 each:**

- Orange: spot-dive leap; shove; cocky hands on hips; point at camera; shout close-up; disco point-up; stomp; spin; power slide; wink close-up; sitting (back to back); joyful spin (final).
- Blue: arms-crossed proud; hair whip; precise disco step; disco point-up; shout close-up; eye-roll close-up; stomp; stumbling back (shoved); furious close-up; reaching for the light; sitting (back to back); joyful spin (final).

**Duo cards (painted with the scene, not cut out):**

- eye-split nose to nose;
- back to back (F5);
- spotlight shove (F2);
- both scream;
- hand-in-hand spin (F6);
- both in one spotlight.

**Set plates:**

- the Mainline floor, wide and low;
- the light-box rig;
- the Reviewed Stage;
- the Night Shift;
- After Hours;
- the gradient club.

**Props:**

- spiked mirror ball;
- two giant buttons;
- TAB key and SPACE bar;
- sticky note;
- `// don't touch` sign;
- commit-bulb string;
- SORRY cards;
- red neon pipes;
- empty chairs;
- particle tree.

**Code-drawn, not image_gen:** all text (light-box words, kinetic lyric type, counters), particles, neon scribble animation, the spotlight, LED bars and flame edges.

## Open

- SFX plan, built with the beat map (risers into the choruses, the breakdown slams, the hard stop).
- Whether the solo needs one extra hero card per girl (a signature finishing pose).

## Two modes: DISCO → METAL → FUSION (Burak, 2026-10-21)

"Start as a bright, chirpy disco; in the hard metal parts the colours, the setting and the characters turn metal; chill parts disco; metal parts with a metal font, palette and theme." The turn is also the story: the rivalry starts as a disco flirt and turns serious when the metal hits. The final "gradient now" fuses both.

Mode map. Loudness per section is flat (−15 to −20 dB, a compressed master; only the piano drops to −22 dB with the bass gone). The split therefore follows the measured bass weight and the take's own section tags.

| Time (s) | Sections | Mode |
|---|---|---|
| 0-117 | intro, verse 1 (bass out), verse 2, pre-chorus, chorus 1, post-chorus, verse 3 (bass out), chorus 2 | DISCO. The club catches fire on chorus 2's "the build is on fire", the first spark of the turn. |
| 118-156 | verse 4 (double-kick), GIT! PUSH! FORCE!, guitar solo | METAL. The club burns into a cathedral of amp stacks. The girls take their metal forms. |
| 156-177 | piano, build | CHILL. Ash and quiet after the fire, still in the metal forms, with the disco slowly returning in the light. |
| 177.7-end | final chorus, outro, tail | FUSION. The disco and metal worlds and outfits merge on "gradient now". |

| | DISCO | METAL | FUSION |
|---|---|---|---|
| Palette | hot pink, magenta, cyan, gold, violet | black, blood red, steel and chrome, ember orange, ice blue for the blue girl | the orange→blue gradient over black with chrome |
| Particles | candy confetti, mirror-ball sparkles | embers, sparks, ash, fire flecks | confetti and embers together |
| Set | the Mainline club, mirror ball | the club burnt into an amp-stack cathedral, a spiked iron ball, chains, fire | a chrome mirror ball with spikes, the gradient club |
| Type | neon-sign and rounded heavy display faces (chrome, glow) | blackletter and jagged band-logo faces, slams with debris | both, the key word in the gradient |
| Girls | approved disco outfits | metal forms: spiked leather, flames, studs; same faces and hair | disco outfits with metal pieces |

Fonts: OFL faces from Google Fonts, kept as files under `video/public/fonts/` with their licences. These are not npm dependencies.
