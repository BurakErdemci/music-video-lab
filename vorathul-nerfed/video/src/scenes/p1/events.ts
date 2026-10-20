// Beat-locked events of part 1 (S01-S25, film frames 0-1850): storyboard 01 Appendix A, built only from measured
// anchors. Plain .ts (beatcheck loads it with node). Shots read their frames from here through `at(id)`, so a
// picture and its event can never drift apart.
import { onBeat, onHit, onWord, type VideoEvent } from '../../anchors.ts';
import { TIMING } from '../../timing.ts';

const B = (id: string, kind: string, i: number): VideoEvent => onBeat(`p1-${id}`, kind, TIMING.beats[i] as number);
const H = (id: string, kind: string, i: number): VideoEvent => onHit(`p1-${id}`, kind, (TIMING.hits[i] as { t: number }).t);
const W = (id: string, kind: string, text: string, nth = 0): VideoEvent => onWord(`p1-${id}`, kind, text, nth);

export const EVENTS: VideoEvent[] = [
  // S01 the world is being painted
  B('s01-stroke-1', 'stroke', 1), B('s01-stroke-2', 'stroke', 3), B('s01-stroke-3', 'stroke', 5), B('s01-stroke-4', 'stroke', 7),
  B('s01-stroke-5', 'stroke', 9),
  // S02 the black hole establishing shot
  W('s02-cut', 'cut', 'VORASOL', 0), B('s02-rays-1', 'key', 12), B('s02-rays-2', 'key', 14), B('s02-rays-3', 'key', 16),
  B('s02-clouds-1', 'key', 18), B('s02-rays-4', 'key', 20), B('s02-clouds-2', 'key', 22),
  // S03 the kneeling army
  B('s03-cut', 'cut', 23), B('s03-bow-1', 'key', 25), B('s03-bow-2', 'key', 27), B('s03-bow-3', 'key', 29), B('s03-banners', 'key', 31),
  B('s03-bow-4', 'key', 33), B('s03-bow-5', 'key', 35),
  // S04 the eye slit ignites, then the violet climbs the armour
  W('s04-cut', 'cut', 'VORASOL', 1), B('s04-gem-1', 'glow', 39), B('s04-gem-2', 'glow', 40), B('s04-gem-3', 'glow', 41),
  B('s04-stud-l', 'glow', 43), B('s04-stud-r', 'glow', 44), B('s04-rune', 'glow', 46),
  // S05 the organ lights pair by pair
  B('s05-cut', 'cut', 48), B('s05-pipes-1', 'glow', 49), B('s05-pipes-2', 'glow', 50), B('s05-pipes-3', 'glow', 51), B('s05-pipes-4', 'glow', 52),
  B('s05-pipes-5', 'glow', 53), B('s05-pipes-6', 'glow', 54), B('s05-pipes-7', 'glow', 55),
  // S06 four hero panels slam in on the drum fill
  H('s06-knight', 'panel', 0), H('s06-mage', 'panel', 1), H('s06-archer', 'panel', 2), H('s06-rogue', 'panel', 3),
  // S07 band entry: the first clash (the base list also carries riff-first-clash on this hit)
  H('s07-clash', 'impact', 4), H('s07-bolt-1', 'attack', 5), H('s07-bolt-2', 'attack', 6),
  // S08
  H('s08-ping', 'impact', 7), H('s08-tremble', 'key', 8),
  // S09 the fan opens
  H('s09-fan', 'impact', 9), H('s09-volley', 'attack', 10), B('s09-arrows', 'key', 68),
  // S10 arrows shatter, two pipe pistons
  H('s10-shatter', 'impact', 11), H('s10-piston-knight', 'impact', 12), H('s10-piston-mage', 'impact', 13),
  // S11 sweep and heap
  H('s11-sweep', 'impact', 14), B('s11-tumble', 'key', 78), H('s11-heap', 'impact', 15), B('s11-knight-up', 'pose', 82),
  // S12 bash, regen, beam
  B('s12-bash', 'impact', 84), B('s12-regen', 'ui', 86), B('s12-beam', 'impact', 88), B('s12-splinter', 'key', 90),
  // S13 backstab and grab
  B('s13-backstab', 'impact', 92), B('s13-head-turn', 'pose', 94), B('s13-grab', 'impact', 96), B('s13-windup', 'pose', 98),
  // S14 the throw
  H('s14-throw', 'impact', 16), B('s14-duck', 'key', 101), B('s14-double', 'impact', 103), B('s14-pose', 'pose', 105),
  // S15 slam shockwave
  H('s15-slam', 'impact', 17), B('s15-fly-past', 'key', 109), B('s15-banners', 'impact', 111), B('s15-sigil', 'pose', 113),
  // S16 gold explosion, unharmed
  H('s16-explosion', 'impact', 18), B('s16-clear', 'key', 117), B('s16-gust', 'impact', 119), B('s16-sweat', 'key', 121),
  // S17 four charge-up panels, the combo
  B('s17-panel-knight', 'impact', 123), B('s17-panel-mage', 'panel', 125), B('s17-panel-archer', 'impact', 127),
  B('s17-panel-rogue', 'panel', 129), H('s17-combo', 'impact', 19), H('s17-eye-narrow', 'key', 20),
  B('s17-combo-hold', 'key', 132), B('s17-combo-near', 'key', 134),
  // S18 combo on the fan, three dagger pings
  H('s18-combo-hit', 'impact', 21), H('s18-ping-1', 'impact', 22), H('s18-ping-2', 'impact', 23), H('s18-ping-3', 'impact', 24),
  B('s18-glare', 'key', 138), B('s18-cock', 'pose', 140),
  // S19 swat, crash-landing, the combined strike sticks
  H('s19-swat', 'impact', 25), B('s19-airborne', 'key', 143), B('s19-land', 'impact', 144), B('s19-charge', 'pose', 146),
  B('s19-strike', 'impact', 148), B('s19-head-down', 'pose', 150),
  // S20 verse 1: the trophy pile
  B('s20-cut', 'cut', 152), W('s20-tilt', 'key', 'For', 0), B('s20-tiptoe', 'key', 156), W('s20-pile', 'key', 'thousand', 0),
  // S21 the crack spreads
  H('s21-crack', 'key', 26), H('s21-widen', 'key', 27),
  // S22 second form
  H('s22-split', 'impact', 28), H('s22-eyes-1', 'key', 29), H('s22-eyes-2', 'key', 30), H('s22-eyes-3', 'key', 31),
  // S23 the three phase pips
  W('s23-pip-1', 'ui', 'Three', 0), H('s23-pulse', 'ui', 32), W('s23-pip-2', 'ui', 'phases', 0), W('s23-pip-3', 'ui', 'of', 0),
  // S24 second-form slam
  H('s24-slam', 'impact', 33), H('s24-fly', 'key', 34), W('s24-shield', 'key', 'flawless', 0), H('s24-debris', 'key', 35),
  W('s24-eyes', 'key', 'rage', 0), H('s24-bolt', 'impact', 36),
  // S25 phase III, Meteor Rain begins
  H('s25-phase3', 'impact', 37), W('s25-meteor-rain', 'attack', 'Players', 0), W('s25-wept', 'impact', 'wept', 0),
];

const BY_ID = new Map(EVENTS.map((e) => [e.id, e.frame]));
/** Film frame of a p1 event (id without the `p1-` prefix); throws on a typo instead of drawing at frame 0. */
export const at = (id: string): number => {
  const v = BY_ID.get(`p1-${id}`);
  if (v === undefined) throw new Error(`no p1 event ${id}`);
  return v;
};
