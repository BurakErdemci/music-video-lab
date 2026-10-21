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

## ~~Two modes: DISCO → METAL → FUSION~~ (DROPPED by Burak the same day: the song keeps one tone throughout, so a metal turn would look absurd)

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

## Typography-led clip (Burak, 2026-10-21, replaces the mode idea)

"Text arriving in different shapes, changing colour, with elite transitions, and the girls behind it: a more typography-heavy clip." The lyric type is the lead; the girls dance behind it. They are graded, slightly soft in depth, and step forward on the choruses and the big moments. One disco look throughout.

Type forms (each lyric line is designed as one of these; never the same form twice in a row):

- DIFF: `- blue` in red and `+ orange` in green, unified-diff style. This is the song's own subject.
- CODE: an editor line with syntax colours and a cursor typing on the beat.
- RING: text running on a circle around the mirror ball or a girl.
- WAVE: the baseline waves on the beat.
- FLOOR: letters lighting up in the dance-floor tiles.
- MARQUEE: light-box bulbs.
- STACK: a justified block of words in mixed weights and sizes.
- STAMP: plates multiplying on the beats.
- FLAP: a split-flap departure board.
- EXTRUDE: thick 3D letters turning in space.

Colour:
- The orange girl's lines sit in the orange family, the blue girl's in the blue family, lines sung together in the gradient.
- Words change hue on the beats.
- The key word of each line is the biggest and the most saturated.

Transitions (the "elite" part):
- **Letter morph:** the letters of one word fly into the next word, reusing shared letters.
- **Conflict-marker wipes:** a mask shaped like `<<<<<<<`, `=======` or `>>>>>>>`.
- **Through-the-counter:** the camera flies through the O of a word into the next scene.
- **Particles:** letters shatter into particles and re-form.
- **Whip:** a smear whip.

Assets still needed: the 16 disco dance cards (j-dance) for the dancing girls behind the type, and the SET-disco-club plate. Cancelled: the metal forms (k-metal) and the metal, ash and fusion plates.

## The girls are never wallpaper (Burak, 2026-10-21)

Burak loves the type library and the fonts. His one concern is a girl standing behind the type, lightly dancing: "that will make it very monotonous". Rule: on every lyric line the girls do at least ONE of these:

1. **Play with the type.** Kick a word off screen, sit or lean on a letter, spin the RING like a hula hoop, appear from behind a flipping FLAP board, throw words at each other (the call-and-response becomes literal throwing).
2. **The singer steps forward.** Whoever sings the line is big and sharp; the other is soft behind. In call-and-response the focus ping-pongs left and right.
3. **Change the framing.** A giant face close-up, a tiny figure behind huge type, a low angle, cloned copies, a split screen. The same framing never holds longer than 2 bars.
4. **Change the pose on the beat.** In choruses, a new dance pose every bar, leaving coloured ghost trails (Arcane graphic layer).
5. **Become part of the type.** The silhouette filled with text, or the girl seen through knockout letters.

These are measurable and checked in the review: the longest hold of one framing (≤ 2 bars), the number of poses per chorus bar (≥ 1), and that every line has at least one action from the list.

## Final song and the pop–metal blend (Burak, 2026-10-21)

- **Song:** `audio/merge-conflict-v4.wav`, timing `data/take-v4/`.
  - 180.09 BPM, F minor, 3:52, 173 bars.
  - A Suno Cover of v1 with "orange", a new rebase verse, a second chorus, a guitar solo and the "Ship it" chant.
  - Burak: "the best thing I have made in Suno". The audio is kept as is: no voice post-processing, even though the measured voice contrast is weak.
- **The blend:** "metal and pop are interleaved; metal shoots up in places, but overall they are mixed." There is no hard mode switch. A continuous METAL AMOUNT per frame is driven by the measured per-bar heaviness (`bars[].heavy`, 0–100), smoothed across bar boundaries.
  - **Low:** disco-pop. Candy palette, confetti, rounded neon type.
  - **Rising:** the palette darkens toward black, red and steel; embers and sparks mix into the confetti; blackletter and jagged faces start to take over the type.
  - ~~**Surges (heavy ≥ 65):** the girls swap to their metal forms (`stil/prompts/k-metal`), and swap back when the bar falls below the threshold. A hysteresis keeps them from flickering.~~ Replaced below: the costume belongs to the girl, not to the bar.
  - **Per singer:** the blue (sweet) lines sit one step toward pop, the orange (raspy) lines one step toward metal.
- **Measured surges:**
  - 117–140 s: the scream, GIT! PUSH! FORCE!, the whisper and the guitar solo; the solo is the mid-clip dance duel.
  - 181–193 s: the "Ship it" chant.
  - 196–232 s: the scream ending and outro, the all-out metal finale.
  - The piano (140–149 s) drops to 4, the calm After Hours.
  - The final chorus (160–181 s) is mid, the fusion and gradient moment.

## The costume belongs to the girl (Burak, 2026-10-21)

Burak: "the raspy voice is full metal everywhere except her first verse, screaming from the throat in most places", so "one girl metal, one girl disco, with places where both are metal". Pop against metal becomes the fight itself: **blue = the disco girl, orange = the metal girl.**

- **The metal amount (`metalAt`) still drives the set:** palette, light, particles. It no longer swaps costumes.
- **Costume schedule (seconds, take-v4):**

| Time | Section | Blue | Orange |
|---|---|---|---|
| 0–4.37 | intro, blue speaks the git error | disco | not shown |
| 4.37–16.33 | hard-metal groove, **all-metal set** (no mirror ball, no disco floor; Burak: the disco look under hard metal "feels odd") | **not shown** | metal **silhouette glimpses only** (outline, no costume detail), a foreshadowing |
| 16.33–40.58 | verse 1, verse 2 (orange's first verse), "Blue! Orange! Blue!" | disco | disco |
| 40.58 | "ORANGE!" (word 40.58–41.00) | disco | **turns metal on this shout**, the clip's first transformation |
| 40.58–117.36 | choruses 1–2, verses 3–4 | disco | metal |
| 117.36–140.04 | scream, GIT! PUSH! FORCE!, whisper, solo | **metal** | metal |
| 140.04–160.06 | piano, build | plain (soft) | plain (soft), the truce |
| 160.06–181.44 | final chorus "Accept both" | costumes mix | costumes mix |
| 181.44–end | chant, "Build failed" stop, scream end, outro | metal | metal |

- **Type and transitions follow the same split** (Burak: "pop transitions in the pop parts, metal transitions in the metal parts"). A solo line takes the style of its singer's costume at that moment. A `both` line takes the style of the set (`metalAt`).
- **Signature moment:** "Merge conflict, merge conflict" (49.14, 59.60, 91.68, 102.08 s) uses one type move every time; at 176.80 s ("Merge conflict resolved inside my soul") the same move returns resolved, the two colours joined.
