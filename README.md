# music-video-lab

Music videos made with code and AI agents — the full source, every asset, and an honest
making-of for each clip: what was tried, what failed, and what the measurements said.

The songs are made in [Suno](https://suno.com). Everything you see is generated or written in
code: the pictures come from text prompts, the animation is [Remotion](https://www.remotion.dev)
(React) with Three.js, and every visual event is locked to a measured beat or word of the song.
One person directs; [Claude Code](https://claude.com/claude-code) runs the work as the main loop,
with Codex (`image_gen`) for images and sub-agents for measurement, scaffolding and review.

If you watched one of these videos and thought *"I want to make one too"* — this repo is meant to
be that reference.

## Finished clips

<table>
<tr>
<td colspan="2" valign="top">
<a href="merge-conflict/"><img src="merge-conflict/docs/media/hero.jpg" alt="Merge Conflict: the orange metal girl and the blue disco girl walk arm in arm at sunrise" width="100%"></a><br>
<b><a href="merge-conflict/">Merge Conflict</a></b><br>
Kawaii heavy-metal disco battle of two girls over one line of code, until "accept both changes" turns the
spotlight into a gradient. 3:52, 1440p at 60 fps. Painted poses, LED and laser worlds, living paintings and
a designed type form for every sung line.<br>
On YouTube soon.
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="her-sabah-bastan/"><img src="her-sabah-bastan/docs/media/hero.jpg" alt="Her Sabah Baştan: a human and an AI press palms on a halftone moon" width="100%"></a><br>
<b><a href="her-sabah-bastan/">Her Sabah Baştan</a></b><br>
Turkish duet about an AI that meets its human for the first time every morning. 4:01, 1440p at 60 fps.
Two-colour silk-screen print, drawn poses, and a camera and transitions built in code.<br>
<a href="https://www.youtube.com/watch?v=j-LT1IEJDvk">Watch on YouTube</a>
</td>
<td width="50%" valign="top">
<a href="vorathul-nerfed/"><img src="vorathul-nerfed/docs/media/hero.jpg" alt="Vorathul: a matte black knight with organ-pipe wings in a painted cathedral" width="100%"></a><br>
<b><a href="vorathul-nerfed/">Vorathul: NERFED</a></b><br>
Symphonic metal anthem of a final boss who is nerfed in a patch and climbs out of the painting he lives in.
4:33.8, 1440p at 60 fps. Graphic noir comic cut-outs on a 2.5D stage.<br>
<a href="https://www.youtube.com/watch?v=QUtyszbWdDg">Watch on YouTube</a>
</td>
</tr>
</table>

### Moments

Two excerpts from each final render, 15 fps. More in each clip's README.

<table>
<tr>
<td width="50%" valign="top"><img src="merge-conflict/docs/media/02-blue-orange.webp" alt="The orange girl turns metal on her shout ORANGE!" width="100%"><br>
<b>Merge Conflict 0:38</b> "Blue! Orange!" The orange girl turns metal on her own shout.</td>
<td width="50%" valign="top"><img src="merge-conflict/docs/media/05-push-it-whole.webp" alt="PUSH IT!, EQUALS, NOW WE'RE WHOLE, then the MERGE CONFLICT logo whole" width="100%"><br>
<b>Merge Conflict 2:53</b> "Push it!", "equals", "now we're whole", and the logo resolved.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="vorathul-nerfed/docs/media/01-fan-wings-fight.webp" alt="Close on the organ-pipe wings, then a wide shot with an impact burst" width="100%"><br>
<b>Vorathul: NERFED</b> The organ-pipe wings, then the fight.</td>
<td width="50%" valign="top"><img src="vorathul-nerfed/docs/media/05-breakout.webp" alt="A NERFED! balloon on the office wall, then Vorathul bursts out of the painting in shards" width="100%"><br>
<b>Vorathul: NERFED</b> He bursts out of the painting on the office wall.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="her-sabah-bastan/docs/media/03-bus-heart.webp" alt="On a night bus the AI draws a heart in the fogged window" width="100%"><br>
<b>Her Sabah Baştan 2:30</b> Night bus. The AI draws a heart in the fogged glass.</td>
<td width="50%" valign="top"><img src="her-sabah-bastan/docs/media/05-halftone-meeting.webp" alt="Human and AI press palms on a halftone moon, a heart is drawn, the frame floods moon yellow" width="100%"><br>
<b>Her Sabah Baştan 3:44</b> Palms meet on the moon and the frame floods one colour.</td>
</tr>
</table>

Each clip README has animated excerpts, the pipeline, what was tried and dropped, and how to run it.
The longer making-of for Vorathul starts at
[part 1: from song to style](vorathul-nerfed/docs/making-of/01-from-song-to-style.md).

Song files and finished videos are not stored in git; each clip's README says where its audio
and video stand.

## How a clip is made

1. **Measure the song before drawing anything.** Tempo, downbeats, sections, stops, key, loudness
   per bar and word-level timings (librosa, faster-whisper, demucs stems). The prompt you gave the
   music model is a claim, not a fact: *NERFED* was prompted at 170 BPM and measured at 186, and its
   "key change up" does not exist.
2. **Story, then style frames.** The same scene in several art techniques side by side; the
   director picks. Rejected rounds stay in the making-of.
3. **A contract** (`docs/scene-map.md`): every scene bound to measured anchors, plus rules every
   lane follows (dead-air limits, frame purity, how characters move).
4. **Build in lanes.** Separate agents own separate files; the main loop integrates and checks
   every result from the real entry point.
5. **Check, then show.** `beatcheck` (0 frames drift, dead-air rule), frame-purity scan, contact
   sheets, full-speed looks at every transition, a blind reviewer — and only then the director.

## The skill

The process behind these clips is written down as a Claude Code skill in
[`skill/music-video/`](skill/music-video/): ten phases from the input gate to delivery, plus
[the lessons](skill/music-video/references/lessons.md) with the evidence for each rule. Copy it into
`~/.claude/skills/` to use it with your own song.

## Repository layout

```
her-sabah-bastan/   clip 1: song data, style frames, Remotion project, tools, briefs
vorathul-nerfed/    clip 2: same layout, plus docs/scene-map.md and docs/making-of/
merge-conflict/     clip 3: same layout, plus docs/scene-map.md and round-by-round handoffs
skill/music-video/  the Claude Code skill and its lessons
```

Each clip currently carries its own copy of the measurement and check tools (`tools/`). They will
move to a shared `tools/` folder at the root; until then, `vorathul-nerfed/tools/` is the newer,
repo-relative version (the older copies in `her-sabah-bastan/` still contain absolute paths from
the machine they were written on).

## Running a clip

```bash
cd <clip>/video
npm ci
# get the song (see the clip README), place it under public/audio/
npm run studio          # preview
npm run check           # type check
npm run beatcheck       # sync check against data/timing.json
```

## Licenses

- Code: [MIT](LICENSE).
- Images, prompts, songs, lyrics, videos and documentation: [CC BY 4.0](LICENSE-ASSETS.md) — use them
  for anything, credit the clip and this repo.
- Third-party fonts (SIL OFL 1.1) and Kenney sound sources (CC0) keep their own licences; see
  [LICENSE-ASSETS.md](LICENSE-ASSETS.md).
