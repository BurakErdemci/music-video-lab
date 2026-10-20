// Scheduled events. Every frame is derived from a measured anchor through timing.ts, never typed by hand.
// tools/beatcheck.mjs recomputes each frame from data/timing.json and requires drift 0.
// Each part lane keeps its own events in src/scenes/<part>/events.ts (plain .ts, anchors.ts helpers only).
import { onBeat, onHit, onWord, type VideoEvent } from './anchors.ts';
import { EVENTS as P1 } from './scenes/p1/events.ts';
import { EVENTS as P2 } from './scenes/p2/events.ts';
import { EVENTS as P3 } from './scenes/p3/events.ts';
import { EVENTS as P4 } from './scenes/p4/events.ts';
import { EVENTS as P5 } from './scenes/p5/events.ts';
import { TYPE_EVENTS } from './film/typography/schedule.ts';

export type { EventAnchor, VideoEvent } from './anchors.ts';

const BASE: VideoEvent[] = [
  onHit('riff-first-clash', 'impact', 19.55),
  onBeat('silence-start', 'freeze', 78.3),
  onHit('silence-end-hit', 'unfreeze', 78.8),
  onWord('hp-bar', 'ui-drag', 'forty percent'),
  // "UNFAIR" occurs twice in words: #0 (95.1 s) is the announcer's line, #1 (98.76 s) is the scream.
  onWord('scream-1', 'shake', 'UNFAIR', 1),
  onWord('hated', 'memory', 'by being hated'),
];

export const EVENTS: VideoEvent[] = [...BASE, ...P1, ...P2, ...P3, ...P4, ...P5, ...TYPE_EVENTS].sort((a, b) => a.frame - b.frame);
