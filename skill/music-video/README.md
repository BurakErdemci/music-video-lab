# music-video skill

A [Claude Code](https://claude.com/claude-code) skill that carries the process behind the three
clips in this repo. It tells an agent how to make a music-driven motion video: measure the song
first, lock every event to a beat or word, test style before code, and check the result with tools
that fail on planted defects. It also has a short track for product and launch videos.

- [`SKILL.md`](SKILL.md): the process in ten phases, with the core principles at the top.
- [`references/lessons.md`](references/lessons.md): every rule with its evidence and a tag
  (`[measured]`, `[decision]`, `[taste]`).

## Install

Copy the folder `skill/music-video` into `~/.claude/skills/` (all projects) or into a project's
`.claude/skills/`. Claude Code picks it up by its `description` when you ask for a music video, a
lyric video or a launch trailer.

## What it expects

- [Remotion](https://www.remotion.dev) with three.js for the video. Remotion's official agent skills
  cover the API; this skill covers the process around it.
- `ffmpeg` for frame cuts, loudness (`volumedetect`) and muxing.
- Python with [uv](https://docs.astral.sh/uv/) for the timing tools (librosa, faster-whisper).
- A song, for example from [Suno](https://suno.com), and an image model that can take reference images.
- The check tools live in each clip's `tools/` folder (`beatcheck`, `framecheck`, `flashcheck` and
  others). They are examples to copy and adapt, not a package.

## The clips behind it

| Clip | Folder | Video |
| --- | --- | --- |
| Vorathul: NERFED | [`vorathul-nerfed/`](../../vorathul-nerfed/) | [YouTube](https://www.youtube.com/watch?v=QUtyszbWdDg) |
| Her Sabah Baştan | [`her-sabah-bastan/`](../../her-sabah-bastan/) | [YouTube](https://www.youtube.com/watch?v=j-LT1IEJDvk) |
| Merge Conflict | [`merge-conflict/`](../../merge-conflict/) | [YouTube](https://www.youtube.com/watch?v=J37b5WfH-7w) |
