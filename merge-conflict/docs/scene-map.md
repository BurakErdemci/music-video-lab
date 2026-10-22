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

- **Logo (Burak, 2026-10-21):** design **B**, the split word (blue-chrome disco half against orange-flame metal half, cut on a diagonal with diff marks). Code: `video/src/type/logo/Logo.tsx`; resolved state for 176.80 s.

## Motion: the camera moves, the girls hold (Burak, 2026-10-21)

Burak: "this swaying looks really absurd". Measured reference: the new Nothing Went Foom clip, "Scroll Up!" by Bright Mirror (YouTube s1R93ErmdlU; Gemini 3.8 Flash on 0:14-0:34 and 2:00-2:30, plus 4 s contact sheets):
- Characters hold still key poses: zero body motion, or faint breathing of at most about 2 %. Nobody rocks, bobs or squashes on the beat.
- A pose holds about 3.5-5 s; a pose changes by a hard cut, a particle scatter-and-regather or a camera reveal.
- About 85 % of the felt motion is the camera plus particles and type moving through depth.

Rules:
- **No loop dance.** A held card breathes at most 0.5 % of its height.
- **The camera carries the motion:** dolly, push, parallax, travel, plus beat punches in the metal parts.
- **Poses change by a cut on a beat, a particle dissolve or a reveal.** Holds are 2-3 bars in the pop parts, 1-2 in the metal ones.
- **The rig only plays single eased accents** (a kick, a point, a head turn), then holds.
- **Accents are stepped on threes (measured):** the "Scroll Up!" mascot face close-up at 3:18.7-3:19.2 changes once every 3 frames of its 30 fps (about 10 drawings/s), while the camera stays smooth. Our rig accents hold each state 6 frames at 60 fps; camera, type and particles stay smooth. Accents are rare and deliberate (Burak: "very cute and rare").
- **Accent recipe ("Scroll Up!" 1:13-1:21):** an anticipation pose (she crouches on "UP:"), the release on the sung word (she springs up pointing on "SCROLL"), a new pose on the next word ("UP!"). The camera amplifies the release with a low-angle swing and a punch while the type word slams, and a continuous travel device (her rising platform) carries the shot between accents. Ours: "ORANGE!", GIT! PUSH! FORCE!, the HEAD kick.

## What we take from "Scroll Up!" and what we leave (Burak, 2026-10-21)

Burak: "take the good things that fit our theme, but overall it is a different theme."

**Taken, in our own look** (disco against metal, git, typography-led):
- still key poses with the camera carrying the motion;
- accents stepped on threes;
- anticipation, then the release on the sung word;
- a continuous travel device between accents.

**One-time glyph moment (later sections, not the proof):** the girls rebuilt from their own git lines (blue from `- color: blue;`, orange from `+ color: orange;`) through the card point clouds. It happens only at the piano truce and/or the final "Accept both", where the two text clouds mix into one picture.

**Not taken:**
- the warm cosy bokeh palette;
- the anime/VTuber mascot look;
- the text mosaic as the main look;
- the life-in-questions content.

## Type: every line is a git object (lesson from LGTM, Burak 2026-10-21: "the peak of type in a clip")

Measured from LGTM (Degenerative Pixels, youtube 3TNpOD6bov8; 5 s contact sheets):
- Every sung line lives INSIDE a software object that means it: a Slack message, an org chart ("right-sized"), a roadmap Gantt, a PR with a racing "+90,112" counter, a status page, an incident channel, a postmortem form ("Root cause: unclear."), an ID badge, code with "// DON'T TOUCH THIS", a stamped ticket ("WE DID!"), a 3:00 alarm.
- ~~One bold grotesk plus one monospace UI face.~~ NOT FOR US (Burak, 2026-10-21: after round 5 "the type looks like any text, zero impressiveness"; it was the type of the first proofs he loved). Lines are revealed word by word as they are sung; the key word turns the accent colour.
- Editing as type: a typed line with a cursor, a strike-through correction, red handwritten notes ("(IT ISN'T)"), rubber stamps ("APPROVED", "BLAMELESS").
- The title recurs as PHYSICAL OBJECTS: LGTM as boxes, ship containers, server-rack lights, keycaps. Counters grow every chorus (90 thousand → a million lines).
- Big left-aligned text, generous empty space, the object beside it; dark scenes broken by light-mode scenes.

**Binding over the table (Burak, 2026-10-21: "if we slide too far into the LGTM theme, the disco vs rock theme falls behind"):**
- The stage is always disco or metal. A git object is a PROP inside that stage. It never replaces the stage: no flat dark app screen filling the frame.
- Every git object is built from the material of the side it is in. Disco: a neon light box, mirror tiles, glitter, lit floor panels. Metal: forged steel, flame, blackletter, amp stacks, stone. Example: the Accept buttons are lit disco floor tiles in the pop parts and steel plaques in the metal parts.
- Not every line is an object: one or two per section. The other lines stay kinetic type in the pop or metal families.
- A girl always plays with the object (who presses the button is the fight).

Ours (keep our two families: pop/blue against metal/orange; the logo B is the recurring title object):

| Line | Git object |
|---|---|
| intro "Automatic merge failed. Fix conflicts..." | the real terminal message (done) |
| "I'm HEAD, I'm main, I'm stable and clean" | `git branch` list with `* main` highlighted |
| "Line forty-two, the button was blue" | the CSS file, line 42 `color: blue;` |
| "Reviewed and approved by the whole design team" | a PR with APPROVED stamps from reviewers |
| "Then someone pushed at midnight... who are you?" | a push notification at 00:00, unknown author avatar |
| "I'm feature branch, I'm fresh from the night" | `git log --graph`, a new branch line splitting off |
| "The button is ORANGE now" | the same line 42, diff `- blue` / `+ orange` |
| "Three hundred commits and I never asked once!" | a racing commit counter 0 → 300 |
| pre-chorus "Blue! Orange!" | the two conflict halves flipping |
| chorus "Accept current change! / Accept incoming change!" | the editor's conflict buttons "Accept Current Change \| Accept Incoming Change \| Accept Both Changes", pressed on the word; "(NO!)" as a red stamp |
| "Merge conflict, merge conflict" | logo B (the signature move) |
| "Equals, equals, equals in the middle of my soul" | the `=======` divider filling the frame |
| V3 "I rebased your history" / "squashed all your sorries into one tiny line" | commits sliding and collapsing into one |
| "git blame says it's YOUR name on every line" | the blame gutter, one name repeated |
| "The pipeline is red!" | CI checks turning red one by one |
| "the standup's in five" | a calendar alert, 5-minute countdown |
| V4 "You use tabs! / You use spaces!" | whitespace shown as arrows and dots |
| "You named a variable data2" / "a comment that just says don't touch" | code lines; "I TOUCHED IT" as a strike-through edit |
| GIT! PUSH! FORCE! | `git push --force` typed word by word, the warning screen |
| final "Accept both changes!" / "Commit and push it!" | the Accept Both button; a green commit, then a push progress bar |
| "Merge conflict resolved inside my soul" | logo B resolved |
| chant "Ship it" | a deploy counter, "SHIPPED" stamps |
| "Build failed. Syntax error on line forty-two." | the red build log pointing at line 42 |

Title objects for logo B (recurring like LGTM's boxes): disco floor tiles and a light-box sign (pop), amp stacks and a stage banner (metal).

## Elite pass (Burak, 2026-10-21, after the 64 s proof)

Burak: "the background is always the same, so it is very static and plain; the git interfaces are weak; the effects and transitions feel like a few PNG pictures with some text and animation singing. We need crazier, more elite scenes, transitions and effects."

Measured gap (vault notes Nothing_Went_Foom, Arcane_Enemy, Arcane_Ma_Meilleure_Ennemie):
- NWF has 70 scene changes in 300 s (median scene 3.3 s). Most are a particle dissolve that rebuilds the next scene. Each verse has its own art language; the chorus returns to one set. 94 % of frames move.
- Arcane lights the characters with the scene: two-colour split light, rim light, confetti acting as light sources, light swelling rather than sliding.
- Our 64 s proof has 4-5 sets, git objects as small signs in front of one plate, and unlit cut-out girls.

Rules from here:
1. **Scene cadence:** a new scene (set + framing + light) every 2-4 bars, median about 3 s. The 64 s proof needs about 18-22 distinct scenes, not 5.
2. **The git object IS the world, not a sign in front of it.** It is built in disco or metal material and you can stand in it, fly along it or crash through it. Examples:
   - `git branch` is a neon subway map the camera rides;
   - line 42 is a giant glowing code line she stands on like a runway;
   - APPROVED is a wall of stamping presses;
   - "pushed at midnight" is a clock tower striking 00:00;
   - `git log --graph` is branch tubes as 3D rails;
   - 300 commits is a stadium scoreboard;
   - the Accept buttons are a giant dance-arcade platform;
   - "the build is on fire" is a burning server hall;
   - "equals" is the walls of the stage closing in.
3. **Transitions are events, never plain cuts:**
   - the whole scene dissolves into particles and rebuilds the next one;
   - a tunnel dive through a glyph;
   - glass shatter on the metal hits;
   - a mirror-ball reflection sweep (disco);
   - light-speed streaks;
   - a paint or ink smear (Arcane);
   - a diff wipe where lines delete and insert;
   - a kaleidoscope mirror in the chorus.
   Continuity is carried by a persistent layer (the particle field, the type, the light), as in NWF.
4. **Effects in the one canvas:** bloom, volumetric beams, lasers, smoke volumes, sparks and embers, mirror-ball dots sweeping over everything including the girls, and confetti coloured by the light. Still NO full-frame filter (halftone, grain, broken TV): a standing rule.
5. **The girls are lit by the scene:** two-colour split light, a rim on the side away from the key, spill from beams and signs, light sweeps crossing them. Foreground occluders and depth of field. Expression animation from the n-faces sequences, and the mouth opens on sung words. A girl crossing between scenes dissolves into particles.
6. **Art language per section, chorus returns to one arena:**
   - V1: a neon light-box city (disco);
   - V2: orange's night world (spray paint and neon);
   - pre-chorus: a strobe split;
   - chorus: the battle arena, the recurring set.
7. **Style frames before code for the new worlds** (video-yapim lesson): painted world plates and key scene frames from Codex, approved by Burak, then built.

## The chorus is the peak (Burak, 2026-10-21)

Burak: "the chorus, the part of the clip that must be the most memorable, came out so dull that I enjoyed the song far more listening blind; watching with the clip lowered my enjoyment." The clip must ADD to the song, most of all in the chorus.

**Measurable rule:** the chorus is the most intense part of the clip. Its visible events per beat and its mean frame-to-frame motion are at least 1.5x the verses' (measured on the render; reported every round). Camera punch on every beat, a cut or transition every 2 beats (about 0.67 s at 180 BPM; Arcane 2:18 runs a 0.9 s median). Every sung word hits something. Flash budget still holds: energy comes from motion, scale, colour and particles, not white flashes.

**Line by line (chorus 1 and 2 identical, as the song is):**
- **"Accept current change!"** The camera slams onto blue on the arena platform; she stomps the button; the words stack huge in the pop family and the floor erupts in light.
- **"(NO!)"** Hard cut to orange's face close-up screaming (OMX3), a giant metal "NO!" filling the frame, a shockwave and a glass shatter.
- **"Accept incoming change!" / "(NO!)"** The mirror image: orange slams her plaque (OC1); then blue's shouting close-up (BX4) and a giant pop "NO!".
- **"Two girls, one line,"** Both on one glowing line (the line-42 runway), back to back.
- **"the build is on fire"** The whole arena ignites: a fire wall rises, sparks and embers burst.
- **"Merge conflict, merge conflict,"** Logo B slams massive and its two halves are the two girls crashing into each other; a kaleidoscope burst.
- **"heart going haywire"** A heartbeat line (a git graph gone mad) races across the frame.
- **"(NEVER!)"** Bigger than NO!: both screaming close-ups in a split frame.
- **"Equals, equals, equals"** The `=======` bars slam in like walls closing in, a camera punch on each.
- **"in the middle of my soul"** The walls crush to a single line of light.
- **"Merge conflict... I can't take control"** Logo B's second variation spins out of control: a barrel roll, then everything bursts into particles at the chorus end.
- **Throughout:** lasers sweep on every downbeat, mirror-ball dots run over everything, confetti and embers burst on every NO!/NEVER!, and the girls' faces act through the expression sequences.

## Type is the star again (Burak, 2026-10-21)

Burak: "the type came out dull; the first version had effects and different type forms; the last one feels like any text, zero impressiveness." Measured in round 5: 15 sung lines drawn with the plain `Lyric` component of type/objects/git.tsx, while the designed forms were barely used (Slam 6, Flap 2, Stack 1, LightBox 1, Counter 1, Code 1; Diff, Hoop, Letters, Plates, Dots 0). Cause: the LGTM "one grotesk + one monospace" line, now struck.

Rules:
- Every sung line is drawn with a DESIGNED form from the type library (Code, Flap, Diff, Hoop, Stack, Plates, Letters, Dots, Slam, Stamp, LightBox, DissolveText, CodeLine, Counter, or a new one), with its effects (per-letter motion, chrome, neon glow, flame fill, extrusion, glitch slices, morphs between words). The plain `Lyric` component is not used for sung lines.
- At least 6 distinct forms in every 30 s, and never the same form twice in a row.
- The faces come from the two families at full range: pop (Bungee and the other display faces) and metal (Metal Mania, Pirata One, UnifrakturMaguntia, Anton).
- Git objects are the WORLD the type lives in. They never replace the type form. The type plays with the object (it lands on the sign, it is stamped by the press, it rides the rail).

## Round 6 approved; decisions for the rest (Burak, 2026-10-21)

- Burak on the round-6 proof: "the chorus came out right, this road is good, I expect the same performance for the rest." Round 6's rules are the bar for every later section: a scene every 2-4 bars, git worlds, event transitions, lit girls, designed type, and the chorus intensity rule (chorus 2 and the final chorus are measured against it too).
- **"Build failed. Syntax error on line forty-two." (193.1-196.49):** the BLUE girl reads it, mirroring the intro (she reads the git error at the start), in her metal costume per the schedule.
- **Final chorus "Accept both" (160.06-181.44):** the approved fusion sheets stil/prompts/o-keys/out/PF1-blue-fusion.png and PF2-orange-fusion.png are the "mix" costume. Cards: PB1-4 / PO1-4 (accept both, push it, reach, celebrate) and face sequences PBX1-3 / POX1-3.

### Round 7: 64.15-140.04
- **V3 rebase (64.15-85.42), raspy and sweet trading:**
  - commits slide and collapse into one tiny line on "squashed all your sorries";
  - the blame gutter repeating one name;
  - CI checks turning red one by one on "the pipeline is red";
  - a 5-minute standup countdown on "standup's in five".
- **Chorus 2 (85.42-106.68):** the chorus-1 plan word for word (film/chorus/plan.ts), with a fresh variation in the camera and worlds only. It must pass the intensity rule again.
- **V4 trade (106.68-117.36), getting faster:**
  - tabs against spaces as visible whitespace arrows and dots;
  - the variable `data2`;
  - the `// don't touch` comment;
  - "I TOUCHED IT" as a strike-through edit.
  - The cuts accelerate toward the scream.
- **Scream (117.36-120.03):** blue turns METAL here (the costume schedule), both screaming.
- **GIT! PUSH! FORCE! (120.03-125.36), the slowest and heaviest:** `git push --force` typed word by word, one OQ1/OQ2/OQ3 pose per word, the warning screen, metal worlds (W04, W11).
- **Whisper "...you wouldn't" (125.36-126.70):** blue's horror (BQ3 and BMX5), near silence. The quietest frame of the clip.
- **Solo (126.70-140.04):** the dance duel. Air guitar OQ4 against BQ1, BQ2 blade slash, cuts on the riff, metal worlds.

## No cliff after the chorus (Burak, 2026-10-21, after the 140 s proof)

Burak: "the chorus is so good, it lifts so much; the new parts after it went dull, the metal part too. Make
the other parts crazier, but not everything a chorus, that would tire." Measured on proof140 (motion = mean
frame-to-frame luma difference, `tools/intensity.mjs`): chorus 1 and 2 at 26.4; verse 3 at 6.1, scream 9.0,
GIT PUSH FORCE 11.3, solo 18.8. Leaving the chorus drops the film to under a quarter of its motion.

Binding rules, measured by `tools/intensity.mjs` (extend it; exit 1 on any failure):
- The chorus stays the peak: each chorus >= 1.5x the verses' mean on events per beat and on motion (unchanged).
- **Floor after a chorus:** verse 3 and verse 4 each reach motion >= 0.5x the chorus mean and events per beat
  >= the mean of verses 1-2 (1.10).
- **Metal sits just under the chorus:** scream, GIT PUSH FORCE and the solo each reach motion between 0.7x and
  1.0x the chorus mean, events per beat >= 1.10. The whisper (1.3 s) is the one deliberate drop and is exempt.
- **No cliff:** the 4 s after each chorus ends average >= 0.5x the chorus mean motion.
- Verses 1-2 (approved in round 6) stay as they are.

How (take the chorus's tools, not its signature): camera moves on every line (push-in, whip pan, orbit, dolly
zoom on the accent word), lyric-locked hits, type with effects; in metal add stepped camera shake on kicks,
fire and spark bursts, cut-ins to the faces (BX/OX/BMX/OMX), a new framing every bar in the solo (duel
alternation, split screen, low angles), never two bars on the same full-body stage shot. The "Merge conflict"
logo move stays the chorus's own. Flash <= 3/s still holds.

## Framing: the face and the action stay in frame (Burak, 2026-10-21, on proof140-r7b)

Burak, with a screenshot at 2:15 (an orange face close-up showing only mouth and chest): "most of the new images
are like this, bigger than the screen, as if zoomed 2x." The camera punches, pushes and dolly zooms are stacked on
top of cards already placed tight, so the eyes leave the frame.

Binding, measured per frame by a new `tools/framecheck.mjs` (exit 1 on any failure):
- Every card carries a measured **face box** (both eyes, brows and the top of the head, hair excluded) and an
  **action box** (head, both hands, anything held, feet) in normalised card coordinates, stored next to the card.
- Whenever a card is the subject of a shot, its face box stays fully inside the frame with a 4 % margin in every frame,
  including through punches, shakes and dolly zooms.
- A full-body action card shows its whole action box, except a framing that deliberately cuts at the knees or below.
- A face close-up may fill the frame, but the face box may not exceed 70 % of the frame height.
- The 0-64 s part (approved) is measured too; only frames that fail are changed there.

## Polish from Gemini's review of proof140-r7b (verified frame by frame, Burak 2026-10-21)

Gemini's points that held up when the frames were checked, now binding:
- **Type stays readable and inside the frame.** Every type form's box stays inside the frame with a 4 % margin at
  its settled state (fly-in letters may start outside), never covers a subject's face box, and has a backing that
  separates it from the plate (stroke, shadow or a dark scrim) with local luminance contrast >= 3:1, measured on the
  render. Found: "ACCEPT CURRENT" cut at the right edge and the target rings over the blue girl's head (43.5 s and
  chorus 2), "two girls, one line" blue on a blue floor (47.5 s), "I CAN'T TAKE CONTROL" glitch unreadable (62.5 s, 105.5 s).
- **Contact shadows.** Every standing card gets a contact shadow on the floor it stands on, plus the plate's light
  colour as a floor glow. The translucent podium boxes sit clearly under the feet or go.
- **Confetti is earned.** Confetti only in the choruses, the "Merge conflict" hits and the big panel moments; verses
  get dust, sparks or embers at most, and the metal parts embers and sparks.
- **Transitions match the clip.** The halftone-dot and wavy-paper covers in muted purple and brown go; disco parts use
  neon, laser, mirror-shard and glitch transitions, metal parts fire, shatter and screen-tear ones.
- **Card defect:** the blue face close-up at the whisper (126.2 s) shows a sharp cyan triangle on her neck; fix the card.
Rejected at first, then REVERSED by Burak (see "Living motion" below).

## Living motion (Burak, 2026-10-21: "let's do Gemini's idea; ours swayed too much and always at the same tempo")

The old sway failed on two counts: too big, and one constant tempo. The new secondary motion is small and follows the music:
- **Camera shake** is always on, its amplitude driven per frame by the measured kick/bass energy (bigger on hits,
  near zero in the piano), stepped every 3 frames in metal and smooth in disco.
- **No frozen frame:** every held shot carries a slow push or pull (Ken Burns, 2-6 % over the shot).
- **Hair and clothes ripple:** a mesh deformation on the card weighted to the outer silhouette (hair ends, flares,
  coat tails, chains), zero inside the face box and the torso. The peak displacement is <= 0.6 % of the card height,
  so roughly a tenth of the old sway. Amplitude follows the section energy (off in the piano, low in the verses, full
  in the choruses and metal), and the phase is driven by the beat grid, never a free-running loop. It is measured:
  max displacement, face-box displacement = 0, and the correlation of the amplitude with the section energy.
- **Solo:** the cut rate doubles (a new framing every half bar or faster) and the camera trembles on the tempo; the
  solo may reach 1.15x the chorus motion (Burak's call).

## GIT! PUSH! FORCE! storyboard (Burak, 2026-10-21: "the power-up, the wave that pushes the blue girl is not there")

proof140-r7b had the cards, but tiny on stage, a full-screen terminal in between, and giant type over the impact
painting; the blue girl was missing. Shot by shot (the subject card >= 60 % of the frame height, type never over a face or action box):
1. 120.03-120.68: a two-shot that sets up the target: orange (OF1) gathering power on the left, embers and light sucked
   toward her fists; blue (metal) on the right, bracing. A low angle.
2. 120.68 "GIT!": camera punch and shake on OF1 roaring; GIT! slams behind her, not over her face.
3. 120.9-124.2: the build. Her charge grows (glow, cracks lighting up across the floor toward blue); `git push --force`
   types as a small HUD in a corner, never full screen; OF2 leaps, the camera tilts up after her; a cut-in to blue's face (BMX) seeing it coming.
4. 124.32 "PUSH!": OF3 smashes down; an impact frame; a shockwave ring races across the floor; cut to QK1, uncovered, with shake.
5. 124.5-125.0: BF1 blue is thrown back across the frame with speed streaks and debris: the wave visibly hits and pushes her.
6. 125.02 "FORCE!": OF4, finger to the sky, low angle; FORCE! behind her.

## Resolution: no blur (Burak, 2026-10-21, on the 1:06 heist painting zoomed 2x)

- Plates are upscaled 2x with Upscayl's digital-art-4x model (3072x2048).
- No plate or card is ever shown above 1.25x its native pixel scale at the 2K output; `tools/framecheck.mjs` measures this.
- Cards shown large (face close-ups and big action shots) get an upscaled copy the same way.

## Drawn motion loops everywhere (Burak, 2026-10-22: "this method is good; use it really, not in one or two places, this kind of motion brings life")

Proven by the headbang test (OH1 plus two Codex in-betweens on the same base frame: the lower body stays put, only
the head, hair and arms change). Every card that is on screen for more than a beat plays a short **drawn loop**
instead of a still:
- **Drawings:** each card gets 2-3 Codex in-betweens made from the card itself as the base frame, with the same framing,
  scale, stance and feet, changing only what the loop is about. Loop types:
  - **face:** mouth and eyes while singing;
  - **idle:** breath plus a hair or cloth blow, for full-body holds;
  - **action:** anticipation and follow-through around the key pose.
  Ids: <card>b, <card>c (e.g. OH1b, OH1c), cut out with tools/imagegen/cutout.py, inheriting the base card's face/action boxes.
- **Timing:** stepped, never tweened, at about 10 drawings per second (holds of 5-7 frames at 60 fps). The phase is locked
  to the beat grid; the key pose lands on the beat. Speed follows the section energy: the piano is slow and sparse, the
  verses medium, the choruses and metal fast. Never a free-running cycle at one tempo.
- **Combined with** the camera, the shake and the hair/cloth ripple, but the ripple is turned down on cards that
  already loop drawn hair.
- **Order of work:** the most-seen cards first (measured screen time), then every action card.

## Round 7d: what proof140-r7c still gets wrong (night review 2026-10-22, verified frame by frame; Burak asleep)

A blind viewer and the architect checked proof140-r7c at full size. All checks pass, yet these read badly, so they
become rules (later rounds keep them):
- **No knockouts.** Never punch a hole in a type panel, terminal or word to show a face through it (74.5 s, 114.4 s
  showed the face as a hard rectangle in the window with the text cut). A type form that would cover a subject's face
  moves or shrinks (other side, other band, smaller size) until it clears the face; `type/Knockout.tsx` goes.
- **Type is never hidden by a card.** A type form is fully visible at its settled state; no card or effect is drawn
  over it ("AAAAAH!" at 117.9 s lost its end behind the orange girl).
- **The faces keep their chins.** The face box used by the framing rules runs down to the chin; a bust or face cut-in
  never cuts the face at the mouth or chin (the orange head rising from the bottom edge at 127.5 s and 135.5 s).
  Split screens may crop below the chin.
- **Covers are events, not punctuation.** From the scream to the end, an opaque cover (a transition hiding >= 50 % of
  the frame) fires at most once per 4 s and lasts at most 6 frames; the other cuts are hard cuts on the beat. In the
  solo the covers came every 2 s (130.5, 132.5, 134.5, 138.5 s) and read as a loop.
- **GIT! PUSH! FORCE! cause and effect.** Between the PUSH! smash (124.32) and FORCE! (125.02) there is no cover at
  all. The shockwave ring leaves OF3's fists and the next shot shows it reaching BF1, who is thrown across >= 40 % of
  the frame width over >= 0.4 s, >= 50 % of the frame height, in her own colours (not tinted into the red). r7c had a
  burst cover, a 0.1 s painting and a torn-paper cover in those 0.7 s, so the blue girl was seen for 0.2 s.
- **Type never shrinks to clear a face.** A lyric line's glyph cap height is >= 3.5 % of the frame height at its
  settled state, code text in terminals included. To clear a face a form moves to another band or side, or the shot's
  framing changes (wider, or the girl to one side); it never shrinks below that floor. Measured by
  `tools/framecheck.mjs --type` (`small` in tools/typeframe.py, with a selftest).

## Burak's notes on proof140-r7c (2026-10-22 morning, watched on a 2K monitor)

Burak: "the motion work came out very well, it really brought the clip to life." His defects, by timestamp:
- **Faces through windows** at 0:21 (flap board), 0:31 (button.css), 0:35 (CSS letters), 0:37 (300 scoreboard),
  1:13 (git blame) and through the second git sequence 1:53-1:56: all the knockout. Covered by "Round 7d" (no knockouts);
  each of these timestamps is checked by eye on the next proof.
- **The paintings do not fit the screen** (1:06 the leash, 1:24 the run, 2:13 the duel): heads and feet are cut. The
  paintings are 3:2 and were cover-cropped to 16:9, then pushed in. Binding from now on: **a painting is always shown
  whole.** It is fitted to the frame height, and the side bands are filled with the painting's own edge, blurred and
  darkened. Ken Burns stays <= 3 %, and depth parallax stays inside the painting's own bounds. Every head and foot that
  is in the painting stays in frame.
- **Nothing is pasted over a painting.** 1:24 put two big face cut-ins on top of the run painting; a painting shot
  carries only its own lyric type, which follows the type rules.
- **A stray glyph:** at 1:55 an "I" type tile sits on the blue girl's head before her line starts. No type element shows
  before its line, and none over a head.

## GIT! PUSH! FORCE! rebuilt (Burak 2026-10-22 morning: "still not impressive, it really does not read; that scene can be much better")

This replaces the 2026-10-21 storyboard. Why the old one fails: 11 shots in 5.3 s, each from a new place, so the
viewer loses who stands where; the wave and the blue girl are never in the same frame; everything is red (floor,
lasers, and the blue girl tinted red); and BF1 is drawn blown by a blast from the RIGHT while orange stands on the LEFT.

One stage, one geography: orange LEFT, blue RIGHT, the whole time. Four shots only:
1. **GIT! (120.03-121.36):** a wide low two-shot. Orange (OF1, looping) gathers power, light growing in her fists;
   blue (BB1 brace, new card) on the right in her OWN cold blue light. GIT! slams behind orange.
2. **The charge (121.36-124.32):** ONE continuous slow push toward orange, no cuts except one. Cracks of light race
   across the floor from orange toward blue, the `git push --force` HUD types small in a corner, and the charge glow
   grows bar by bar. The one cut: a single cut-in to blue's face (BMX1, looping: glare, then realisation) of about
   one bar, then back to the same push. Orange leaps (OF2) and the camera tilts up after her.
3. **PUSH! (124.32-125.02):** ONE continuous wide shot that holds both girls. Orange lands (OF3); the shockwave ring
   runs across the floor from left to right; the frame is shaken when it hits blue. Blue goes from BB1 to BF2 (new,
   airborne) and is thrown out of frame right, with speed streaks. The camera whips after the wave. No cover, no
   insert, no painting in this span.
4. **FORCE! (125.02-125.36):** OF4 low angle, finger to the sky, FORCE! behind her.

Colour: orange's side is fire, blue's side stays cold blue until the wave crosses into it. The lasers are dimmed in
this sequence, and blue is never tinted red. BF1, if used at all, is mirrored so the blast comes from the left. Every
card here plays its drawn loop (OF1-4, BF1, BMX1: loops-4).

## The breakdown's intensity (round 9, 2026-10-22, the architect's decision)

GIT! PUSH! FORCE! (120.03-125.36 s) is exempt from the intensity floor of 0.7x the chorus motion while its storyboard
is the four-shot, one-continuous-push version ("GIT! PUSH! FORCE! rebuilt"; proof232-r9 measures 0.48x). Its 1.0x
ceiling and its events-per-beat rule stay. Its gate is `node tools/pushcheck.mjs`: the girls in frame at the cut, the
ring between them, the throw seen for >= 0.35 s and >= 40 % of the frame wide, scale and blue's saturation. If Burak
finds the scene weak, apply `docs/patches/push-motion-levers.patch` first (measured gains in its `.md`).

## Paintings that live (round 10, 2026-10-22; Burak on proof232-r9: "slayt resmi gibi duruyor", "yanlardan siyah bant")

Burak approved the plan: every painting widened to 16:9 so it fills the frame; the long-held ones become living,
layered paintings with a drawn loop; live effects in front of every painting. This replaces "a painting is always
shown whole" (round 7d) and its side bands. Binding from now on:
- **A painting covers the frame.** Every QK/RK painting shot draws its 16:9 plate (`public/plates/wide/<ID>.webp`, the
  approved 3:2 original untouched in the middle, the sides outpainted). Its Ken Burns only pushes in, 100 % (covering)
  to 103 %; a beat punch spends part of that same room, never more. The original 3:2 centre stays >= 97 % visible
  (`tools/framecheck.mjs`). The build's flight into RK3 keeps its push (round 9).
- **Every painting shot moves like a camera, not a zoom:** a truck, an arc (pivoting on the girls), a push or a rise
  works the painting's depth map (`public/plates/depth/wide/`, Depth Anything V2 small, `tools/depthmap.py`): near
  pixels slide and swell against far ones. Metal shots take the live camera's shake inside the push's room. The table
  is `LIFE` in `video/src/worlds/paintview.ts`, one entry per painting shot.
- **Life in front of every painting:** particles matched to the painting (confetti, embers, sparks, dust in the light,
  glitter) drifting toward the camera through depth (`particles/drift.tsx`), the shared field in the same kind, a
  light sweep every bar (two in the piano), a soft bloom of the painting's own highlights on the beat (stronger on the
  downbeat), and a particle surge on every downbeat. Type is still drawn after all of it; flash <= 3/s holds.
- **Living paintings (RK1, RK2, RK11, RK12):** the empty painting and the girls on their own plane in front, sliding
  against it by their own depth; their drawn loop (base, b, c, b) plays at the section's `rig/loop.ts` rate; a beat
  bob (a lift, 0.25 % of the frame) where the drawing is not cut by the frame; a contact shadow and a rim glow. The
  girls' plane is the painting's own layer, not a card: "nothing pasted over a painting" still fails any card, and the
  girls must stay inside the frame on every side their drawing did not cut (they may lose what the 3 % push hides)
  and reach past it on every side it did.
- **Paintings are not slides (`tools/slidecheck.mjs`):** every painting shot's mean frame-to-frame motion (the
  intensity measure, inside the shot, covers and fades left out) is >= 0.5x the median of the live shots of its own
  section. Why 0.5: on proof232-r9, which Burak called slides, every painting outside the piano measured 0.16-0.49x
  its section's live median (the two highest rode on confetti and spark bursts), so the floor sits just above the
  highest of them.

Decisions taken in this round (the architect may overrule):
- The girls' depth on the layered paintings is where they touch the ground (RK11 0.1) or, in the air or cut by the
  frame, the median depth under them (RK2 0.46, RK12 0.62); RK1 0.65, between her seat and the near floor her boots
  stand on, so the boots slip under 15 px.
- RK2's girls do not bob (their drawing is cut on every side). RK12 moves as an arc about the girls: their hair
  reaches the top edge, so they may not rise or swell.
- The dawn walk (RK11, 5.35 s, the longest hold) pivots at mid depth: the girls and the city slide one way, the near
  rubble the other; with an arc about the girls it measured 0.34x the outro's live median. Long holds also sway over
  two bars, wider the longer the hold. The weak push moves were turned into trucks and arcs (a depth swell alone
  measured 0.32-0.47x).
- The keyed layers are upscaled before keying (the key runs on the 3640x2048 image); a thin blue strand on the green
  reads cyan, so within 10 px of the screen green above 0.55 of the blue counts as screen (`tools/imagegen/greenkey.py`).
- The scream may reach 1.1x the chorus motion (was 1.0x): QK2 brought up to the slide floor lifts the section to
  1.07x, and calming the scream's live shots to make room did not reach 1.0x. Architect's call, round 10.
