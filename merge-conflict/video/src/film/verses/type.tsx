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
import { Scrim } from '../../type/Scrim.tsx';
import { Slam } from '../../type/Slam.tsx';
import type { TypeEntry } from '../chorus/typeplan.ts';
import { avoidFaces, type Box as AvoidBox } from '../../type/avoid.ts';
import { KICK, STACK2 } from '../proof.ts';
import { VERSES_LIVE } from './VersesShot.tsx';

export interface Anchors { clock?: { cx: number; cy: number; r: number }; panel?: { x: number; y: number; w: number; h: number }; board?: { x: number; y: number; w: number; h: number } }

const spec = (e: TypeEntry, box: FormSpec['box']): FormSpec => ({ id: `v-${e.id}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box, range: e.range });

/** Each form's box for type/avoid.ts (plane coordinates; the CSS block's in screen space). The hoop, the clock ring,
 *  the scoreboard counter and the words thrown between the girls play with their objects and stay. */
const AVOID: Record<string, AvoidBox> = {
  'v-head': STACK2.box,
  'v-line42': { x: 740, y: 220, w: 680, h: 540 },
  'v-approved': { x: 1060, y: 200, w: 760, h: 380 },
  'v-fresh': { x: 120, y: 140, w: 1680, h: 300 },
  'v-css': { x: 260, y: 90, w: 1400, h: 440 },
  'v-never': { x: 200, y: 680, w: 1500, h: 250 },
  'p-blue': { x: 730, y: 410, w: 900, h: 300 },
  'p-orange': { x: 120, y: 260, w: 1000, h: 420 },
  'p-blue2': { x: 940, y: 590, w: 800, h: 360 },
  'p-transform': { x: 110, y: 650, w: 1300, h: 220 },
  'p-resolve': { x: 460, y: 200, w: 1000, h: 140 },
};

/** The verse entries drawn in screen space (the rest ride the type plane). */
export const VERSE_SCREEN: readonly string[] = ['v-feature', 'v-css', 'v-orange'];

export const VerseType = ({ entries, t, pose, anchors, hoop, throwP }: { entries: readonly TypeEntry[]; t: number; pose: CameraPose; anchors: Anchors; hoop?: HoopPlan; throwP?: ThrowPlan }) => {
  const out: ReactNode[] = [];
  for (const e of entries) {
    const n0 = out.length;
    // a box the case computes from its anchor (the clock, the panel, the board)
    let dyn: AvoidBox | undefined;
    if (t < e.t0 || t >= e.t1) continue;
    switch (e.id) {
      case 'v-head':
        // STACK2 + the kick that sends HEAD flying (proof.ts plans, unchanged since round 4)
        out.push(<Stack key={e.id} spec={{ ...STACK2, t0: e.t0, t1: e.t1 }} t={t} hide={[1]} />, <g key={`${e.id}-kick`} clipPath={t >= KICK.kick ? 'url(#v-kick-clip)' : undefined}>
            {/* the kicked word leaves at the margin: its flight ends at the plane's right limit, not at the frame's edge */}
            <clipPath id="v-kick-clip"><rect x={-3000} y={-3000} width={4540} height={7000} /></clipPath>
            <KickWord plan={KICK} t={t} />
          </g>);
        break;
      case 'v-line42':
        // (round 7d: 12 columns, so the board fits beside the run-blue close-up without shrinking)
        out.push(<Flap key={e.id} spec={spec(e, { x: 760, y: 240, w: 620, h: 500 })} t={t} cols={12} backing />);
        break;
      case 'v-approved':
        out.push(<Stamp key={e.id} spec={spec(e, { x: 1060, y: 200, w: 760, h: 380 })} t={t} />);
        break;
      case 'v-midnight': {
        const c = anchors.clock ?? { cx: 1180, cy: 420, r: 300 };
        // the arc sits low in the dial: round the dial's rim it would run off the top of the frame
        out.push(<Ring key={e.id} spec={spec(e, { x: c.cx - c.r, y: c.cy - c.r, w: 2 * c.r, h: 2 * c.r })} t={t} opt={{ cx: c.cx, cy: c.cy + 310, r: c.r * 0.77, size: 64, face: 'righteous', backing: true }} />);
        dyn = { x: c.cx - c.r * 0.77 - 60, y: c.cy + 310 - c.r * 0.77 - 60, w: 2 * (c.r * 0.77 + 60), h: 2 * (c.r * 0.77 + 60) };
        break;
      }
      case 'v-feature':
        if (hoop) out.push(<HoopType key={e.id} plan={hoop} t={t} />);
        break;
      case 'v-fresh':
        out.push(<Wave key={e.id} spec={spec(e, { x: 120, y: 140, w: 1680, h: 300 })} t={t} opt={{ size: 150, face: 'shrikhand', amp: 50 }} />);
        break;
      case 'v-orange': {
        // round 7d: a wide terminal in screen space at a readable size (on the painted panel it shrank to a 1.5 % cap
        // under the plane); it takes the band clear of her face (type/avoid.ts)
        const p = { x: 150, y: 715, w: 1620, h: 300 };
        out.push(<Diff key={e.id} spec={spec(e, p)} t={t} opt={{ minus: 'the button was blue', size: 60, keyScale: 1.5, title: 'button.css', backing: true }} />);
        dyn = p;
        break;
      }
      case 'v-css':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 260, y: 90, w: 1400, h: 440 })} t={t} opt={{ size: 300, face: 'shrikhand', depth: 0.28 }} />);
        break;
      case 'v-commits': {
        const b = anchors.board ?? { x: 560, y: 120, w: 800, h: 360 };
        const tok = lineTokens(e.line);
        // the count lives on the scoreboard: it stays there, and leaves at the cut to her close-up, where the board is out
        // of the frame (round 7d: moved off her face it landed under the NEVER marquee)
        if (t < (tok[5]?.start ?? e.t1)) out.push(<Counter key={e.id} spec={{ from: 0, to: 300, t0: tok[0]?.start ?? e.t0, t1: tok[2]?.end ?? e.t0 + 0.8, x: b.x + b.w / 2, y: b.y + b.h * 0.78, size: b.h * 0.78, color: '#ff7a1a', digits: 3, backing: true }} t={t} />);
        break;
      }
      case 'v-never':
        out.push(
          <g key={e.id}>
            <Scrim x={200} y={680} w={1500} h={250} pad={20} />
            <Marquee spec={spec(e, { x: 200, y: 680, w: 1500, h: 250 })} t={t} />
          </g>,
        );
        break;
      case 'p-blue':
        out.push(<Slam key={e.id} spec={{ text: 'BLUE!', t0: e.t0, t1: e.t1 - 0.02, x: 1180, y: 560, size: 300, color: '#19c8ff', face: 'bungee', rot: -4 }} t={t} />);
        break;
      case 'p-orange':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 120, y: 260, w: 1000, h: 420 })} t={t} opt={{ size: 260, face: 'shrikhand', depth: 0.3 }} />);
        break;
      case 'p-blue2':
        out.push(<Flap key={e.id} spec={spec(e, { x: 940, y: 590, w: 800, h: 360 })} t={t} cols={6} />);
        break;
      case 'p-transform':
        out.push(<Shout key={e.id} spec={{ id: 'p-orange-shout', text: 'ORANGE!', at: e.t0, until: e.t1, style: 'steel', color: '#ff2a14', cx: 760, cy: 760, w: 1300, rot: -6 }} t={t} />);
        break;
      case 'p-resolve':
        out.push(<LightBox key={e.id} spec={{ id: 'p-resolve', words: lineTokens(e.line).map((tk, i) => ({ text: tk.text.replace(/!$/, '').toUpperCase() + (i === 2 ? '!' : ''), color: i === 1 ? '#ff3d9a' : i === 0 ? '#19c8ff' : '#ff7a1a' })), t0: e.t0 + 0.05, stagger: 0.05, t1: e.t1, x: 960, y: 300, size: 120, box: true, backing: true }} t={t} />);
        break;
      default:
        break;
    }
    // round 7d: no knockout; the form moves or shrinks off the faces of the shot (type/avoid.ts)
    const b = dyn ?? AVOID[e.id];
    if (b && out.length > n0) {
      const tf = avoidFaces(VERSES_LIVE, t, b, !VERSE_SCREEN.includes(e.id));
      if (tf) out.push(<g key={`${e.id}-avoid`} transform={tf}>{out.splice(n0)}</g>);
    }
    // the words thrown between the girls fly to them, wherever the CSS block went
    if (e.id === 'v-css' && throwP && t >= e.t0 && t < e.t1) out.push(<ThrowWords key={`${e.id}-throw`} plan={throwP} t={t} />);
  }
  // the hoop and the CSS block are drawn in screen space, the rest on the type plane (VersesShot.tsx); no form is cut
  // around a face (round 7d, "No knockouts")
  return <g>{out}</g>;
};

export const hoopFill = (i: number) => hueAt('O', 28, i);
export const hoopKey = keyFill('O');
