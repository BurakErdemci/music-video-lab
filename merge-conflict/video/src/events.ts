// Every beat-locked event of the film, as authored. tools/beatcheck.mjs imports this list and recomputes
// each anchor from data/take-v4/mc-timing.json (and its token_map.json). The shots read their times from here
// through at(), so the schedule and the checked list cannot drift apart.
// anchor 'beat': ref = beat index; 'downbeat': ref = downbeat index; 'hook': ref = accept_hooks index;
// 'word': ref = "<text>#<nth>"; 'token': ref = "<line>:<token>" (the token's time through the token map).
// t is the scene-clock time in seconds the event fires at. Erasable TypeScript only: node loads this file.
import { bindLine } from './lyrics/bind.ts';
import { acceptHook, beat, beats, downbeat, lines, sectionNamed, word, words } from './timing.ts';

const beatsIn = (a: number, b: number): number[] => beats.map((x, i) => [x, i] as const).filter(([x]) => x >= a && x < b).map(([, i]) => i);

/** 'offbeat': halfway between beat `ref` and the next (the riff's eighth notes, round 7b). */
export type EventAnchor = 'beat' | 'offbeat' | 'downbeat' | 'hook' | 'word' | 'token';
export interface FilmEvent { id: string; anchor: EventAnchor; ref: number | string; t: number; kind: string }

const timeOf = (anchor: EventAnchor, ref: number | string): number => {
  if (anchor === 'beat') return beat(ref as number);
  if (anchor === 'offbeat') return (beat(ref as number) + beat((ref as number) + 1)) / 2;
  if (anchor === 'downbeat') return downbeat(ref as number);
  if (anchor === 'hook') return acceptHook(ref as number)[0];
  if (anchor === 'token') {
    const [li, ki] = String(ref).split(':').map(Number);
    const tk = bindLine(lines, words, li as number)[ki as number];
    if (!tk) throw new Error(`no token ${ref}`);
    return tk.start;
  }
  const [text, nth] = String(ref).split('#');
  return word(text as string, Number(nth ?? 0)).start;
};
const ev = (id: string, kind: string, anchor: EventAnchor, ref: number | string): FilmEvent => ({ id, anchor, ref, t: timeOf(anchor, ref), kind });
const tokens = (line: number, n: number, kind: string): FilmEvent[] => Array.from({ length: n }, (_, k) => ev(`tok-${line}-${k}`, kind, 'token', `${line}:${k}`));

/** Beats of chorus 1 (42.90-64.15 s): the chorus pulse. */
const CHORUS = sectionNamed('chorus1');
const CHORUS2 = sectionNamed('chorus2');
// round 6: the camera punches on EVERY chorus beat (scene-map.md "The chorus is the peak")
const CHORUS_PULSES = beatsIn(CHORUS.start, CHORUS.end);
/** intro_groove (4.37-16.33 s, hard metal by Burak's ear): a metal hit on every second beat, 13..47. */
const GROOVE_HITS = Array.from({ length: 18 }, (_, k) => 13 + 2 * k);

export const EVENTS: FilmEvent[] = [
  // intro_robot 0-4.37 s: a girl reads git's error out loud; every word lands on its measured token
  ...tokens(0, 3, 'type'),
  ev('speaker-in', 'framing', 'downbeat', 0),
  ev('framing-face', 'framing', 'downbeat', 1),
  ...tokens(1, 7, 'type'),
  ev('morph-fix', 'transition', 'token', '1:0'),
  ev('wipe-flap', 'transition', 'token', '1:1'),
  // intro_groove 4.37-16.33 s: all metal, blue not shown; orange's silhouettes, the type, the light, the cuts
  ev('whip-groove', 'transition', 'downbeat', 3),
  ev('metal-hit', 'whiteout', 'downbeat', 3),
  ...GROOVE_HITS.map((b) => ev(`hit-${b}`, 'slash', 'beat', b)),
  // the groove's type changes at least once per bar (round 3): kind 'type-change' is measured by gridcheck
  ev('marker-head', 'type-change', 'downbeat', 3),
  ev('marker-sep', 'type-change', 'downbeat', 4),
  ev('marker-feature', 'type-change', 'downbeat', 5),
  ev('framing-clones', 'framing', 'downbeat', 5),
  ev('slam-ours', 'type-change', 'downbeat', 6),
  ev('echo-ours-1', 'type-change', 'beat', 26),
  ev('echo-ours-2', 'type-change', 'beat', 27),
  ev('counter-dive', 'type-change', 'beat', 28),
  ev('slam-theirs', 'type-change', 'downbeat', 7),
  ev('framing-low', 'framing', 'downbeat', 7),
  ev('echo-theirs', 'type-change', 'beat', 31),
  ev('split-theirs', 'type-change', 'downbeat', 8),
  ev('framing-knee', 'framing', 'downbeat', 8),
  ev('logo-in', 'type-change', 'downbeat', 9),
  ev('framing-tiny', 'framing', 'downbeat', 9),
  ev('logo-shove-1', 'type-change', 'downbeat', 10),
  ev('logo-punch', 'type-change', 'downbeat', 11),
  ev('framing-waist', 'framing', 'downbeat', 11),
  ev('logo-shove-2', 'type-change', 'beat', 46),
  // verse 1 from 16.33 s: the logo whips out over the last 12 frames of the groove; blue cuts in on the downbeat
  ev('whip-verse', 'type-change', 'downbeat', 12),
  ev('blue-enter', 'card', 'downbeat', 12),
  ...tokens(2, 8, 'type'),
  // anticipation then release on the word: a crouch on "main" (about half a bar), the kick on "stable"
  ev('kick-anticipate', 'card', 'token', '2:3'),
  ev('kick-head', 'kick', 'token', '2:5'),
  ev('framing-stage-2', 'framing', 'token', '2:5'),
  ev('morph-line', 'transition', 'token', '2:7'),
  ...tokens(3, 10, 'type'),
  ev('framing-v1-low', 'framing', 'downbeat', 15),
  ev('framing-v1-waist', 'framing', 'downbeat', 16),
  ...tokens(4, 8, 'type'),
  ev('framing-v1-face', 'framing', 'downbeat', 18),
  ...tokens(5, 8, 'type'),
  // orange's first real entrance, the intruder: anticipation on "who", release on "you?"
  ev('orange-anticipate', 'card', 'token', '5:5'),
  ev('orange-release', 'card', 'token', '5:7'),
  // verse 2 (orange, disco)
  ...tokens(6, 8, 'type'),
  ev('framing-v2-waist', 'framing', 'downbeat', 22),
  ...tokens(7, 10, 'type'),
  ev('framing-v2-split', 'framing', 'downbeat', 24),
  ...tokens(8, 9, 'type'),
  ev('framing-v2-low', 'framing', 'downbeat', 26),
  ev('framing-v2-stage', 'framing', 'downbeat', 27),
  ...tokens(9, 8, 'type'),
  // pre-chorus: the ping-pong, then orange's metal transformation on "ORANGE!"
  ...tokens(10, 1, 'type'),
  ...tokens(11, 1, 'type'),
  ...tokens(12, 1, 'type'),
  ...tokens(13, 1, 'type'),
  ev('framing-pre-both', 'framing', 'downbeat', 31),
  ...tokens(14, 3, 'type'),
  // chorus 1
  ev('framing-c1', 'framing', 'downbeat', 32),
  ...[15, 16, 17, 18, 19, 20, 21, 22].flatMap((l) => tokens(l, lines[l]?.text.split(/\s+/).filter(Boolean).length ?? 0, 'type')),
  ev('framing-c3', 'framing', 'downbeat', 34),
  ev('framing-c7', 'framing', 'downbeat', 39),
  ev('framing-c8', 'framing', 'downbeat', 41),
  ev('framing-c9', 'framing', 'downbeat', 42),
  ev('framing-c13', 'framing', 'downbeat', 47),
  // a visible pulse on every chorus beat: the camera punch, the floor and LED wall pulse
  ...CHORUS_PULSES.map((b) => ev(`pulse-${b}`, 'pulse', 'beat', b)),
  // round 7: verse 3 (rebase), chorus 2, verse 4 (trade), the scream, GIT! PUSH! FORCE!, the whisper, the solo
  ...[23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48].flatMap((l) => tokens(l, lines[l]?.text.split(/\s+/).filter(Boolean).length ?? 0, 'type')),
  ...beatsIn(CHORUS2.start, CHORUS2.end).map((b) => ev(`pulse-${b}`, 'pulse', 'beat', b)),
  // the scream, the breakdown and the solo hit on every second beat (camera punch, sparks); "AAAAAH!" has no
  // measured word, so the scream's events are its beats
  // round 7b ("No cliff after the chorus"): in the scream, the breakdown and the solo the camera kicks on every
  // beat and sparks burst on every second offbeat; verses 3 and 4 get a camera accent on every second beat
  ...[sectionNamed('scream'), sectionNamed('breakdown_git_push_force'), sectionNamed('guitar_solo')].flatMap((sec) => beatsIn(sec.start, sec.end).flatMap((b) => [ev(`hit-${b}`, 'hit', 'beat', b), ...(b % 2 === 0 ? [ev(`spark-${b}`, 'spark', 'offbeat', b)] : [])])),
  ...[sectionNamed('verse3_rebase'), sectionNamed('verse4_trade')].flatMap((sec) => beatsIn(sec.start, sec.end).filter((b) => b % 2 === 1).map((b) => ev(`accent-${b}`, 'accent', 'beat', b))),
];

const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
/** Time (seconds) of a registered event; throws for an unknown id. */
export const at = (id: string): number => {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`no event "${id}" in events.ts`);
  return e.t;
};
