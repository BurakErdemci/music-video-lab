# Merge conflict - song v3 (20 Oct 2026)

v2 failed in Suno v6 (normal): no heavy-metal feel, both girls in the same voice, the one-word "Blue!" /
"Orange!" lines sung by a robotic voice. v3 follows the prompt research of the same day (sources and evidence
levels: vault `Teknik/Arastirmalar/Suno_Prompt_Kurallari_2026-10-20`):

- Genre first and heavy: the first tag weighs most, and soft words ("melodic", "anime", "kawaii") in genre
  position pull toward pop. The sweet voice is now a vocal ROLE, not a genre.
- No robot voice inside Suno at all: "Automatic merge failed" / "Build failed" are made outside (TTS + ffmpeg)
  and dropped in. Asking Suno for a robotic voice is what leaked it onto the short lines.
- Single-word shouts became short phrases or (parentheses) backing shouts under a lead line.
- Two voices are made in separate takes and stitched (Suno labels steer but do not command; stems cannot split
  two voices blended in one take).

## What worked (Burak, 20 Oct 2026)

One change from the researched draft: the first tag "Modern metalcore" replaced by **"Kawaii heavy metal"** -
"şov attı" (it delivered). The style below is the working one.

## Chorus fix (Burak, 20 Oct 2026)

The v3 take's chorus "does not flow, is not catchy, I stumble when singing it"; the v1 chorus stuck in his head.
The lyrics differed in two places, both reverted to v1: the third line changed every chorus ("One conflict" ->
"Forty conflicts, forty files, the whole repo's on fire", too many syllables), and the tag asked for gang vocals,
which can push Suno to shout instead of sing a melody. Now both choruses are identical and sung; the gang shouts
stay only in the (parentheses). The final chorus keeps its own words, as in v1.

## Settings

- Model: try **v6** and **v6-wild** (one guide reports heavy genres respond better on wild). Max Mode on.
- **Variety 0** (above 0 Suno rewrites the style prompt), Weirdness 40-50, Style Influence 75-85.
- Vocal Gender: Female.

## Style (master take, one female lead)

```
Kawaii heavy metal, 152 BPM, 4/4, E minor, drop-C chugging high-gain palm-muted guitars, scooped mids, thick sub bass, tight double-kick drums, syncopated half-time breakdowns, crushing riffs, aggressive dense production, fast guitar solo. Female lead vocal, sweet bright high-pitched idol voice singing over the heavy riffs, gang shouts on the choruses. Hard stops before the choruses, a stripped piano interlude, huge final chorus.
```

## Exclude

```
pop, synthpop, EDM, robotic vocals
```

## Workflow for two different voices (NOT NEEDED - kept for reference)

Burak, 20 Oct 2026: the same voice for both girls "does not bother me much; they separate enough in the build-up".
One take is enough; the steps below are only for a future song that truly needs two voices.

1. **Master take.** Generate with the style above until the backing, tempo and structure are right. The voice
   does not matter yet. Keep the best one.
2. **Voice A (sweet).** Cover the master with the same lyrics; in the style replace the vocal sentence with:
   `sweet bright high-pitched young female idol lead vocal, airy, clean, light`.
3. **Voice B (raspy).** Cover the master again with:
   `low raspy gritty female rock vocal, chesty mezzo, aggressive rasp, shouted lines, mature`.
   If A and B still sound alike, make B a male vocal (the largest timbre jump) - decide with Burak.
4. Upload the master, A and B to the draft release; the main loop splits stems (demucs), aligns them, keeps A on
   A's lines and B on B's lines (both on the "together" lines), mixes on the master's backing, cuts the real
   silences, and adds the TTS robot lines. Checks: tempo, the two voices' pitch and timbre apart, silences.

## Lyrics with section tags (same lyrics for all three takes)

Cue rule: one structure tag per section, at most 3-6 words after the dash; who sings is a short tag line of its
own. Timbre lives in the style box, not in the lyrics.

```
[Intro - heavy riff, then hard stop]

[Verse 1 - bouncy, bass out]
[Sweet voice]
I'm HEAD, I'm main, I'm stable and clean
Line forty-two, the button was blue, the calmest you've seen
Reviewed and approved by the whole design team
Then somebody pushed at midnight... who are you?

[Verse 2 - full band]
[Raspy voice]
I'm feature branch, I'm fresh from the night
The button is ORANGE now and baby, orange is right
I rewrote your CSS and I'm ready to fight
Three hundred commits and I never asked twice!

[Pre-Chorus - drums only, building]
[Sweet voice]
Blue, it's always blue!
[Raspy voice]
Orange, orange, ORANGE!
[Sweet voice]
Blue, it's always blue!
[Raspy voice]
Orange, orange, ORANGE!
(Somebody resolve this!)

[Break]

[Chorus - catchy sung melody, both voices, full band]
Accept current change! (NO!)
Accept incoming change! (NO!)
Two girls, one line, the build is on fire
Merge conflict, merge conflict, heart going haywire
Accept current change! (NEVER!)
Accept incoming change! (NEVER!)
Equals, equals, equals in the middle of my soul
Merge conflict, merge conflict, I can't take control

[Post-Chorus - chant]
(Current! Incoming! Current! Incoming!)
Conflict, conflict, CONFLICT!

[Verse 3 - fast trading, bass out]
[Sweet voice]
You use tabs, you use tabs!
[Raspy voice]
You use spaces, spaces!
[Sweet voice]
You named a variable "data2"!
[Raspy voice]
You wrote a comment that just says "don't touch"!
[Sweet voice]
I wrote that comment!
[Raspy voice]
I KNOW! I TOUCHED IT!
(AAAAAH!)

[Chorus - same melody, both voices, bigger]
Accept current change! (NO!)
Accept incoming change! (NO!)
Two girls, one line, the build is on fire
Merge conflict, merge conflict, heart going haywire
Accept current change! (NEVER!)
Accept incoming change! (NEVER!)
Equals, equals, equals in the middle of my soul
Merge conflict, merge conflict, I can't take control

[Verse 4 - double-kick, aggressive]
[Raspy voice]
I rebased your history while you were asleep!
[Sweet voice]
That history was mine, those commits were sweet!
[Raspy voice]
I squashed all your sorries into one tiny line!
[Sweet voice]
Then git blame says it's YOUR name on every line!
[Raspy voice]
The pipeline is red!
[Sweet voice]
The reviewers are gone!
(And the standup's in five and nobody's on!)

[Breakdown - half-time, heaviest]
[Raspy voice]
GIT! PUSH! FORCE!

[Break]

[Sweet voice - whispered]
...you wouldn't.

[Guitar Solo - fast, no vocals]

[Interlude - piano only, soft]
[Sweet voice]
Maybe blue was never really mine
[Raspy voice]
Maybe orange was just my way to say hello
[Sweet voice]
We're the same file, just from different times
[Both voices]
Two branches of the same old tree, you know

[Build - drums return]

[Break]

[Final Chorus - same melody, both voices, loudest]
Accept both changes! (YES!)
Accept both changes! (YES!)
Blue and orange together, it's a gradient now
Nine hundred conflicts and we figured it out
Accept both changes! (YES!)
Commit and push it! (PUSH IT!)
Equals, equals, equals, now we're whole
Merge conflict resolved inside my soul

[Outro - chant, double-kick]
(Accept both! Accept both! Ship it, ship it!)
Accept both, accept both, SHIP IT!
(AAAAAAAH!)

[End]
```

The robot lines added outside Suno, before the first riff and after [End]:
"Automatic merge failed. Fix conflicts and then commit the result." / "Build failed. Syntax error on line forty-two."
