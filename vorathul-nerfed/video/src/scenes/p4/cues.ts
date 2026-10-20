// Every beat-locked cue of part 4 (frames 5140-6680, storyboard 2 Appendix A, S74-S90). Plain .ts: beatcheck loads it
// with node through events.ts. Shot components read their frames from here, so no frame is ever typed twice.
// The word 'hated' (f5882, S79 cut) is the base event in src/events.ts and is not repeated.
import { onBeat, onHit, onWord, type VideoEvent } from '../../anchors.ts';
import { f, TIMING, word as measuredWord } from '../../timing.ts';

const beat = (id: string, kind: string, i: number): VideoEvent => onBeat(`p4-${id}`, kind, TIMING.beats[i] as number);
const hit = (id: string, kind: string, i: number): VideoEvent => onHit(`p4-${id}`, kind, (TIMING.hits[i] as { t: number }).t);
const word = (id: string, kind: string, text: string, nth: number): VideoEvent => onWord(`p4-${id}`, kind, text, nth);

export const CUE = {
  // S74 empty cathedral
  s74cut: beat('s74-cut', 'cut', 526),
  s74motes: word('s74-motes', 'vfx', 'I', 5),
  s74sink: word('s74-sink', 'rig', 'was', 4),
  s74slit: word('s74-slit', 'rig', 'not', 0),
  s74roll: word('s74-roll', 'prop', 'win', 0),
  s74stop: word('s74-stop', 'prop', 'know', 0),
  s74drift: beat('s74-drift', 'vfx', 538),
  s74hem: beat('s74-hem', 'rig', 541),
  // S75 spawn rings
  s75cut: word('s75-cut', 'cut', 'I', 7),
  s75glint: word('s75-glint', 'vfx', 'was', 5),
  s75ring: word('s75-ring', 'ui', 'made', 1),
  s75p1: word('s75-p1', 'ui', 'stand', 0),
  s75p2: word('s75-p2', 'ui', 'there', 0),
  s75p3: word('s75-p3', 'ui', 'your', 0),
  s75p4: word('s75-p4', 'ui', 'way', 0),
  s75pulse: beat('s75-pulse', 'ui', 556),
  // S76 the memory is a monitor
  s76cut: word('s76-cut', 'cut', 'So', 0),
  s76push: word('s76-push', 'camera', 'when', 0),
  s76sword: word('s76-sword', 'vfx', 'finally', 0),
  s76shout: word('s76-shout', 'vfx', 'beat', 2),
  s76push2: word('s76-push2', 'camera', 'me', 2),
  s76pull: word('s76-pull', 'camera', 'finally', 1),
  s76arms: beat('s76-arms', 'vfx', 571),
  // S77 back inside
  s77cut: word('s77-cut', 'cut', 'You', 1),
  s77relight: word('s77-relight', 'rig', 'feel', 1),
  s77med: word('s77-med', 'cut', 'someone', 0),
  s77step: word('s77-step', 'rig', 'new', 0),
  s77canvas: word('s77-canvas', 'rig', 'day', 0),
  // S78 hand on the canvas (awareness step 3)
  s78cut: word('s78-cut', 'cut', 'I', 8),
  s78raise: beat('s78-raise', 'rig', 588),
  s78trans: word('s78-trans', 'rig', 'was', 6),
  s78palm: word('s78-palm', 'vfx', 'built', 0),
  s78grow: word('s78-grow', 'vfx', 'be', 1),
  s78hold: word('s78-hold', 'vfx', 'loved', 0),
  // S79 POV through the weave (its cut is the base event 'hated')
  s79glance: word('s79-glance', 'prop', 'being', 0),
  // S80 the bulge on the wall
  s80cut: word('s80-cut', 'cut', 'hated', 0),
  s80relax: beat('s80-relax', 'vfx', 604),
  // S81-S88 the build, one crack step per downbeat
  s81cut: beat('s81-cut', 'crack', 605),
  s81press: beat('s81-press', 'rig', 607),
  s81crack2: beat('s81-crack2', 'crack', 609),
  s81dust: beat('s81-dust', 'vfx', 611),
  s82cut: beat('s82-cut', 'crack', 613),
  s82forum2: beat('s82-forum2', 'ui', 615),
  s82crack4: beat('s82-crack4', 'crack', 617),
  s82forum3: beat('s82-forum3', 'ui', 619),
  s83cut: beat('s83-cut', 'crack', 621),
  s83branch: beat('s83-branch', 'crack', 623),
  s83crack6: beat('s83-crack6', 'crack', 625),
  s83punch: beat('s83-punch', 'rig', 627),
  s84cut: beat('s84-cut', 'crack', 629),
  s84petition: beat('s84-petition', 'ui', 631),
  s84crack8: beat('s84-crack8', 'crack', 633),
  s84poster1: hit('s84-poster1', 'ui', 75),
  s84poster2: hit('s84-poster2', 'ui', 76),
  s85cut: beat('s85-cut', 'crack', 637),
  s85spread: beat('s85-spread', 'rig', 639),
  s86cut: beat('s86-cut', 'crack', 641),
  s86swarm: beat('s86-swarm', 'ui', 643),
  s87cut: beat('s87-cut', 'crack', 645),
  s87lean: beat('s87-lean', 'rig', 647),
  s87flare: hit('s87-flare', 'rig', 77),
  s88cut: beat('s88-cut', 'crack', 649),
  s88spurt: beat('s88-spurt', 'vfx', 651),
  // S89 strobe, a world flip every two beats
  s89a: beat('s89-b653', 'crack', 653),
  s89b: beat('s89-b655', 'cut', 655),
  s89c: beat('s89-b657', 'crack', 657),
  s89d: beat('s89-b659', 'cut', 659),
  s89e: beat('s89-b661', 'crack', 661),
  s89f: beat('s89-b663', 'cut', 663),
  s89g: beat('s89-b665', 'crack', 665),
  s89h: beat('s89-b667', 'cut', 667),
  // S90 flash budget Z4 fix (a): the flips stay on the 2-beat cadence, the odd beats carry accents only
  s90a: beat('s90-b669', 'crack', 669),
  s90a2: beat('s90-b670', 'accent', 670),
  s90b: beat('s90-b671', 'cut', 671),
  s90b2: beat('s90-b672', 'accent', 672),
  s90c: beat('s90-b673', 'crack', 673),
  s90c2: beat('s90-b674', 'accent', 674),
  s90d: beat('s90-b675', 'cut', 675),
  s90d2: beat('s90-b676', 'accent', 676),
  s90e: beat('s90-b677', 'crack', 677),
  s90e2: beat('s90-b678', 'accent', 678),
  s90f: beat('s90-b679', 'crack', 679),
  s90end: beat('s90-b680', 'handoff', 680),
} satisfies Record<string, VideoEvent>;

/** Crack growth cues: the build's 19 downbeats (beat[605] ... beat[677], every 4 beats) plus step 20 on beat[679]. */
export const CRACK_STEPS: readonly number[] = [
  ...Array.from({ length: 19 }, (_, k) => onBeat('x', 'crack', TIMING.beats[605 + 4 * k] as number).frame),
  CUE.s90f.frame,
];

/** S79 cut: the base event `hated` (src/events.ts) on word('by being hated', 0). */
export const HATED_FRAME = f(measuredWord('by being hated', 0).start);
