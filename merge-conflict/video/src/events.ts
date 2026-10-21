// Every beat-locked event of the film, as authored. tools/beatcheck.mjs imports this list and recomputes
// each anchor from data/take-2026-10-20/mc-timing.json. The shots read their times from here through at(),
// so the schedule and the checked list cannot drift apart.
// anchor 'beat': ref = beat index; 'downbeat': ref = downbeat index; 'hook': ref = accept_hooks index;
// 'word': ref = "<text>#<nth>". t is the scene-clock time in seconds the event fires at.
// Erasable TypeScript only: node loads this file in tools/.
import { acceptHook, beat, downbeat, word } from './timing.ts';

export type EventAnchor = 'beat' | 'downbeat' | 'hook' | 'word';
export interface FilmEvent { id: string; anchor: EventAnchor; ref: number | string; t: number; kind: string }

const timeOf = (anchor: EventAnchor, ref: number | string): number => {
  if (anchor === 'beat') return beat(ref as number);
  if (anchor === 'downbeat') return downbeat(ref as number);
  if (anchor === 'hook') return acceptHook(ref as number)[0];
  const [text, nth] = String(ref).split('#');
  return word(text as string, Number(nth ?? 0)).start;
};
const ev = (id: string, kind: string, anchor: EventAnchor, ref: number | string): FilmEvent => ({ id, anchor, ref, t: timeOf(anchor, ref), kind });

export const EVENTS: FilmEvent[] = [
  // Intro 0-10.05 s: black, the spot snaps on, the light-box rig flickers the markers and "42", the riff
  // burst, both girls drop in on downbeats, the eye-split on the last downbeat. Limit 2 beats.
  ev('spot-on', 'light', 'beat', 0),
  ev('sign-head', 'lightbox', 'downbeat', 0),
  ev('spot-whip-1', 'light', 'beat', 3),
  ev('sign-sep', 'lightbox', 'downbeat', 1),
  ev('spot-whip-2', 'light', 'beat', 7),
  ev('sign-feature', 'lightbox', 'downbeat', 2),
  ev('sign-42', 'lightbox', 'beat', 11),
  ev('riff-burst', 'burst', 'downbeat', 3),
  ev('cam-push-1', 'camera', 'downbeat', 3),
  ev('spot-whip-3', 'light', 'beat', 15),
  ev('drop-orange', 'card', 'downbeat', 4),
  ev('scribble-orange', 'scribble', 'beat', 18),
  ev('spot-whip-4', 'light', 'beat', 19),
  ev('drop-blue', 'card', 'downbeat', 5),
  ev('scribble-blue', 'scribble', 'beat', 22),
  ev('spot-whip-5', 'light', 'beat', 23),
  ev('cam-pull-1', 'camera', 'beat', 23),
  ev('eye-split', 'whiteout', 'downbeat', 6),
  // Verse 1 to 20 s: the blue girl alone on the Reviewed Stage. Limit 4 beats.
  ev('head-burst', 'whiteout', 'word', 'head#0'),
  ev('lyric-head', 'type', 'word', 'head#0'),
  ev('sign-main', 'lightbox', 'word', 'main#0'),
  ev('tiles-align', 'set', 'word', 'stable#0'),
  ev('tiles-clean', 'set', 'word', 'clean#0'),
  ev('plate-42', 'lightbox', 'word', 'line#0'),
  ev('cam-truck-2', 'camera', 'word', 'line#0'),
  ev('plate-42-hit', 'lightbox', 'word', 'button#0'),
  ev('swap-b01', 'dissolve', 'word', 'blue#0'),
  ev('lyric-blue', 'type', 'word', 'blue#0'),
  ev('scribble-b01', 'scribble', 'word', 'commas#0'),
  ev('cam-push-2', 'camera', 'downbeat', 10),
  ev('swap-b03', 'dissolve', 'word', 'reviewed#0'),
  ev('cam-pull-2', 'camera', 'word', 'reviewed#0'),
  ev('stamp-1', 'stamp', 'word', 'approved#0'),
  ev('stamp-2', 'stamp', 'beat', 46),
  ev('stamp-3', 'stamp', 'beat', 47),
  ev('stamp-4', 'stamp', 'beat', 48),
  ev('stamp-5', 'stamp', 'beat', 49),
  ev('stamp-6', 'stamp', 'beat', 50),
  ev('lyric-then', 'type', 'word', 'then#0'),
];

const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
/** Time (seconds) of a registered event; throws for an unknown id. */
export const at = (id: string): number => {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`no event "${id}" in events.ts`);
  return e.t;
};
