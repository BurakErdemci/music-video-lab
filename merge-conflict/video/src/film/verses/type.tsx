// The verses' type layer: draws every VERSE_TYPE entry with its designed form. Forms that live on a world object
// (the Ring around the clock face, the Diff on the graffiti panel, the Counter on the scoreboard) get their
// screen box from the shot (anchors), so the type plays with the object instead of floating over it.
import type { ReactNode } from 'react';
import type { CameraPose } from '../../camera/camera.ts';
import { KickWord, type HoopPlan, HoopType, type ThrowPlan, ThrowWords } from '../../girls/interact.tsx';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { Counter } from '../../type/Counter.tsx';
import { Diff } from '../../type/forms/Code.tsx';
import { type FormSpec, hueAt, keyFill } from '../../type/forms/common.tsx';
import { Marquee } from '../../type/forms/Dots.tsx';
import { Flap, Ring, Wave } from '../../type/forms/Letters.tsx';
import { Shout } from '../../type/forms/Mega.tsx';
import { Extrude, Stamp } from '../../type/forms/Plates.tsx';
import { Stack } from '../../type/forms/Stack.tsx';
import { LightBox } from '../../type/LightBox.tsx';
import { Slam } from '../../type/Slam.tsx';
import type { TypeEntry } from '../chorus/typeplan.ts';
import { KICK, STACK2 } from '../proof.ts';

export interface Anchors { clock?: { cx: number; cy: number; r: number }; panel?: { x: number; y: number; w: number; h: number }; board?: { x: number; y: number; w: number; h: number } }

const spec = (e: TypeEntry, box: FormSpec['box']): FormSpec => ({ id: `v-${e.id}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box, range: e.range });

export const VerseType = ({ entries, t, pose, anchors, hoop, throwP }: { entries: readonly TypeEntry[]; t: number; pose: CameraPose; anchors: Anchors; hoop?: HoopPlan; throwP?: ThrowPlan }) => {
  const out: ReactNode[] = [];
  for (const e of entries) {
    if (t < e.t0 || t >= e.t1) continue;
    switch (e.id) {
      case 'v-head':
        // STACK2 + the kick that sends HEAD flying (proof.ts plans, unchanged since round 4)
        out.push(<Stack key={e.id} spec={{ ...STACK2, t0: e.t0, t1: e.t1 }} t={t} hide={[1]} />, <KickWord key={`${e.id}-kick`} plan={KICK} t={t} />);
        break;
      case 'v-line42':
        out.push(<Flap key={e.id} spec={spec(e, { x: 760, y: 120, w: 1080, h: 520 })} t={t} cols={14} />);
        break;
      case 'v-approved':
        out.push(<Stamp key={e.id} spec={spec(e, { x: 760, y: 90, w: 1080, h: 600 })} t={t} />);
        break;
      case 'v-midnight': {
        const c = anchors.clock ?? { cx: 1180, cy: 420, r: 300 };
        out.push(<Ring key={e.id} spec={spec(e, { x: c.cx - c.r, y: c.cy - c.r, w: 2 * c.r, h: 2 * c.r })} t={t} opt={{ cx: c.cx, cy: c.cy, r: c.r * 1.18, size: 64, face: 'righteous' }} />);
        break;
      }
      case 'v-feature':
        if (hoop) out.push(<HoopType key={e.id} plan={hoop} t={t} />);
        break;
      case 'v-fresh':
        out.push(<Wave key={e.id} spec={spec(e, { x: 120, y: 140, w: 1680, h: 300 })} t={t} opt={{ size: 150, face: 'shrikhand', amp: 50 }} />);
        break;
      case 'v-orange': {
        const p = anchors.panel ?? { x: 160, y: 200, w: 1100, h: 460 };
        out.push(<Diff key={e.id} spec={spec(e, p)} t={t} opt={{ minus: 'the button was blue', size: Math.min(86, p.h / 4.2), keyScale: 1.7, title: 'button.css' }} />);
        break;
      }
      case 'v-css':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 260, y: 90, w: 1400, h: 440 })} t={t} opt={{ size: 300, face: 'shrikhand', depth: 0.28 }} />);
        if (throwP) out.push(<ThrowWords key={`${e.id}-throw`} plan={throwP} t={t} />);
        break;
      case 'v-commits': {
        const b = anchors.board ?? { x: 560, y: 120, w: 800, h: 360 };
        const tok = lineTokens(e.line);
        out.push(<Counter key={e.id} spec={{ from: 0, to: 300, t0: tok[0]?.start ?? e.t0, t1: tok[2]?.end ?? e.t0 + 0.8, x: b.x + b.w / 2, y: b.y + b.h * 0.78, size: b.h * 0.78, color: '#ff7a1a', digits: 3 }} t={t} />);
        break;
      }
      case 'v-never':
        out.push(<Marquee key={e.id} spec={spec(e, { x: 100, y: 690, w: 1720, h: 300 })} t={t} />);
        break;
      case 'p-blue':
        out.push(<Slam key={e.id} spec={{ text: 'BLUE!', t0: e.t0, t1: e.t1 - 0.02, x: 1350, y: 560, size: 300, color: '#19c8ff', face: 'bungee', rot: -4 }} t={t} />);
        break;
      case 'p-orange':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 120, y: 260, w: 1000, h: 420 })} t={t} opt={{ size: 260, face: 'shrikhand', depth: 0.3 }} />);
        break;
      case 'p-blue2':
        out.push(<Flap key={e.id} spec={spec(e, { x: 1000, y: 260, w: 820, h: 380 })} t={t} cols={6} />);
        break;
      case 'p-transform':
        out.push(<Shout key={e.id} spec={{ id: 'p-orange-shout', text: 'ORANGE!', at: e.t0, until: e.t1, style: 'steel', color: '#ff2a14', cx: 760, cy: 760, w: 1300, rot: -6 }} t={t} />);
        break;
      case 'p-resolve':
        out.push(<LightBox key={e.id} spec={{ id: 'p-resolve', words: lineTokens(e.line).map((tk, i) => ({ text: tk.text.replace(/!$/, '').toUpperCase() + (i === 2 ? '!' : ''), color: i === 1 ? '#ff3d9a' : i === 0 ? '#19c8ff' : '#ff7a1a' })), t0: e.t0 + 0.05, stagger: 0.05, t1: e.t1, x: 960, y: 300, size: 150, box: true }} t={t} />);
        break;
      default:
        break;
    }
  }
  return <g>{out}</g>;
};

export const hoopFill = (i: number) => hueAt('O', 28, i);
export const hoopKey = keyFill('O');
