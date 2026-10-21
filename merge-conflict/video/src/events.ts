// Every beat-locked event of the film, as authored. tools/beatcheck.mjs imports this list and recomputes
// each anchor from data/take-v4/mc-timing.json (and its token_map.json). The shots read their times from here
// through at(), so the schedule and the checked list cannot drift apart.
// anchor 'beat': ref = beat index; 'downbeat': ref = downbeat index; 'hook': ref = accept_hooks index;
// 'word': ref = "<text>#<nth>"; 'token': ref = "<line>:<token>" (the token's time through the token map).
// t is the scene-clock time in seconds the event fires at. Erasable TypeScript only: node loads this file.
import { bindLine } from './lyrics/bind.ts';
import { acceptHook, beat, downbeat, lines, word, words } from './timing.ts';

export type EventAnchor = 'beat' | 'downbeat' | 'hook' | 'word' | 'token';
export interface FilmEvent { id: string; anchor: EventAnchor; ref: number | string; t: number; kind: string }

const timeOf = (anchor: EventAnchor, ref: number | string): number => {
  if (anchor === 'beat') return beat(ref as number);
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
  ev('kick-head', 'kick', 'downbeat', 14),
  ev('framing-stage-2', 'framing', 'downbeat', 14),
  ev('morph-line', 'transition', 'token', '2:7'),
  ...tokens(3, 2, 'type'),
];

const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
/** Time (seconds) of a registered event; throws for an unknown id. */
export const at = (id: string): number => {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`no event "${id}" in events.ts`);
  return e.t;
};
