// Every beat-locked event of the film, as authored. tools/beatcheck.mjs imports this list and recomputes
// each anchor from data/take-2026-10-20/mc-timing.json. Empty until the scenes exist.
// anchor 'beat': ref = beat index; 'downbeat': ref = downbeat index; 'hook': ref = accept_hooks index;
// 'word': ref = "<text>#<nth>". t is the scene-clock time in seconds the event fires at.
export type EventAnchor = 'beat' | 'downbeat' | 'hook' | 'word';
export interface FilmEvent { id: string; anchor: EventAnchor; ref: number | string; t: number }

export const EVENTS: FilmEvent[] = [];
