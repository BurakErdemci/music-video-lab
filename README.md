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

## Repository layout

```
her-sabah-bastan/   clip 1: song data, style frames, Remotion project, tools, briefs
vorathul-nerfed/    clip 2: same layout, plus docs/scene-map.md and docs/making-of/
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
