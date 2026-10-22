// The type of the last section (round 8): every FINALE_TYPE entry drawn with its designed form, in screen space
// (round 7c: type that rode the camera sat on faces). Round 7d from the start: no knockouts - every form is placed in
// a band its shot's faces do not use (the busts' faces sit in the upper half, the stage shots' faces in the top
// third), inside the 4 % margin, on a backing where the plate is as bright as the letters.
import type { ReactNode } from 'react';
import type { CameraPose } from '../../camera/camera.ts';
import { clamp01, type Hex, outQuad } from '../../lib/ease.ts';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { beatIndexAt, beatPos } from '../../timing.ts';
import { CodeLine } from '../../type/CodeLine.tsx';
import { Counter } from '../../type/Counter.tsx';
import { DissolveText } from '../../type/DissolveText.tsx';
import { Code, Diff } from '../../type/forms/Code.tsx';
import type { Box, FormSpec } from '../../type/forms/common.tsx';
import { Marquee } from '../../type/forms/Dots.tsx';
import { Flap, Ring, Wave } from '../../type/forms/Letters.tsx';
import { RunwayLine, Shout } from '../../type/forms/Mega.tsx';
import { Extrude, Stamp } from '../../type/forms/Plates.tsx';
import { Stack } from '../../type/forms/Stack.tsx';
import { LightBox } from '../../type/LightBox.tsx';
import { MergeConflictLogo } from '../../type/logo/Logo.tsx';
import { Scrim } from '../../type/Scrim.tsx';
import { Slam } from '../../type/Slam.tsx';
import { LOGO_DESIGN } from '../proof.ts';
import type { TypeEntry } from '../chorus/typeplan.ts';
import { MERGE_AT, logoIn } from './logo.ts';

const spec = (e: TypeEntry, box: Box): FormSpec => ({ id: `f-${e.id}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box, range: e.range });
const words = (e: TypeEntry) => lineTokens(e.line).slice(e.range[0], e.range[1]);
const clean = (s: string) => s.replace(/[()!,.]/g, '').toUpperCase();
const GRAD: readonly Hex[] = ['#ff7a1a', '#ff5a8a', '#b04dff', '#5a7bff', '#2f9bff'];

/** The logo, resolved: the halves fly in and lock on "conflict", a kick on the lock, then they hold joined. */
const ResolvedLogo = ({ id, t, cy, width, lock }: { id: string; t: number; cy: number; width: number; lock?: number }) => {
  const kick = lock === undefined || t < lock ? 1 : 1 + 0.2 * (1 - outQuad(clamp01((t - lock) / (10 / 60))));
  const bp = beatPos(t);
  return (
    <g transform={`translate(960 ${cy}) scale(${kick}) translate(-960 ${-cy})`}>
      <MergeConflictLogo id={id} design={LOGO_DESIGN} resolved cx={960} cy={cy} width={width} beat={bp - Math.floor(bp)} beatIndex={beatIndexAt(t)} apart={lock === undefined ? 0 : logoIn(t)} />
    </g>
  );
};

export const FinaleType = ({ entries, t, pose }: { entries: readonly TypeEntry[]; t: number; pose: CameraPose }) => {
  const out: ReactNode[] = [];
  for (const e of entries) {
    if (t < e.t0 - 0.02 || t >= e.t1 + (e.form === 'DissolveText' ? 0.6 : 0)) continue;
    switch (e.id) {
      // ---- piano truce
      case 'f-mine':
        // blue lets go of her line: the old `color: blue;` struck, her words added (right of her)
        out.push(<Diff key={e.id} spec={spec(e, { x: 1040, y: 640, w: 780, h: 300 })} t={t} opt={{ minus: 'color: blue;', size: 46, keyScale: 1.5, title: 'button.css', backing: true }} />);
        break;
      case 'f-hello':
        out.push(<Wave key={e.id} spec={spec(e, { x: 110, y: 820, w: 1700, h: 180 })} t={t} opt={{ size: 74, face: 'shrikhand', amp: 14 }} />);
        break;
      // ---- build
      case 'f-file':
        out.push(<Flap key={e.id} spec={spec(e, { x: 330, y: 830, w: 1260, h: 170 })} t={t} cols={20} backing />);
        break;
      case 'f-tree':
        out.push(<Ring key={e.id} spec={spec(e, { x: 560, y: 160, w: 800, h: 700 })} t={t} opt={{ cx: 960, cy: 600, r: 330, size: 54, face: 'righteous', backing: true }} />);
        break;
      // ---- final chorus
      case 'f-acc1':
      case 'f-acc7':
        out.push(<Stack key={e.id} spec={spec(e, { x: 300, y: 600, w: 1320, h: 400 })} t={t} />);
        break;
      case 'f-acc2':
        out.push(<Stamp key={e.id} spec={spec(e, { x: 200, y: 600, w: 1500, h: 420 })} t={t} />);
        break;
      case 'f-acc4':
        out.push(<Stamp key={e.id} spec={spec(e, { x: 200, y: 620, w: 1500, h: 400 })} t={t} />);
        break;
      case 'f-yes1':
      case 'f-yes2':
      case 'f-yes3':
        out.push(<Shout key={e.id} spec={{ id: `${e.id}-s`, text: 'YES!', at: e.t0, until: e.t1, style: 'chrome', color: '#ff3d9a', cx: 960, cy: 860, w: 760, rot: e.id === 'f-yes2' ? 4 : -4 }} t={t} />);
        break;
      case 'f-gradient':
        out.push(<Wave key={e.id} spec={spec(e, { x: 140, y: 760, w: 1640, h: 250 })} t={t} opt={{ size: 120, face: 'bungee', amp: 34 }} />);
        break;
      case 'f-line':
        // the line is typed across the runway floor in front of their feet, as in the choruses
        out.push(<RunwayLine key={e.id} spec={{ id: e.id, text: words(e).map((x) => x.text).join(' ').toLowerCase(), gutter: '42', t0: e.t0, t1: e.t1, cps: 26, origin: [-6.4, -3.38, 2.2], dir: [1, 0, 0], up: [0, 0, -1], size: 0.95, color: '#ffb07a' }} t={t} pose={pose} />);
        break;
      case 'f-figured':
        out.push(
          <g key={e.id}>
            <Scrim x={140} y={800} w={1640} h={210} pad={16} />
            <Marquee spec={spec(e, { x: 140, y: 800, w: 1640, h: 210 })} t={t} />
          </g>,
        );
        break;
      case 'f-acc3':
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: words(e).map((w, i) => ({ text: clean(w.text), color: GRAD[(i * 2) % GRAD.length] as Hex })), t0: e.t0 + 0.02, stagger: 0.03, t1: e.t1, x: 960, y: 930, size: 104, box: true, backing: true }} t={t} />);
        break;
      case 'f-commit':
        out.push(<Code key={e.id} spec={spec(e, { x: 560, y: 660, w: 800, h: 300 })} t={t} opt={{ gutter: '$', size: 58, keyScale: 1.5, chrome: 'git', terminal: true, backing: true }} />);
        break;
      case 'f-pushit':
        out.push(<Shout key={e.id} spec={{ id: `${e.id}-s`, text: 'PUSH IT!', at: e.t0, until: e.t1, style: 'chrome', color: '#ff7a1a', cx: 960, cy: 860, w: 1240, rot: -3 }} t={t} />);
        break;
      case 'f-equals':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 260, y: 640, w: 1400, h: 360 })} t={t} opt={{ size: 250, face: 'display', depth: 0.3 }} />);
        break;
      case 'f-whole':
        out.push(<Slam key={e.id} spec={{ text: "NOW WE'RE WHOLE", t0: e.t0, t1: e.t1 - 0.02, x: 960, y: 960, size: 120, color: '#ff5a8a', face: 'bungee', rot: -2 }} t={t} />);
        break;
      case 'f-merge':
        out.push(<ResolvedLogo key={e.id} id="f-logo-merge" t={t} cy={620} width={1150} lock={MERGE_AT[1]} />);
        break;
      case 'f-soul':
        out.push(<Stack key={e.id} spec={spec(e, { x: 300, y: 660, w: 1320, h: 360 })} t={t} />);
        break;
      // ---- the chant (metal)
      case 'f-ship1': {
        // the deploy counter: 0 to 100 % across "ship it, ship it"
        const toks = words(e);
        out.push(<Counter key={e.id} spec={{ from: 0, to: 100, t0: toks[0]?.start ?? e.t0, t1: toks.at(-1)?.end ?? e.t1, x: 960, y: 990, size: 190, color: '#ff4a1a', suffix: '%', backing: true }} t={t} />);
        break;
      }
      case 'f-acc5':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 200, y: 660, w: 1500, h: 360 })} t={t} opt={{ size: 240, face: 'metalmania', depth: 0.35 }} />);
        break;
      case 'f-ship2':
      case 'f-ship4':
        out.push(<Shout key={e.id} spec={{ id: `${e.id}-s`, text: 'SHIP IT!', at: e.t0, until: e.t1, style: 'steel', color: '#ff2a14', cx: 960, cy: 860, w: 1160, rot: e.id === 'f-ship2' ? -4 : 4 }} t={t} />);
        break;
      case 'f-acc6':
        out.push(<Slam key={e.id} spec={{ text: 'ACCEPT BOTH!', t0: e.t0, t1: e.t1 - 0.02, x: 960, y: 960, size: 150, color: '#ff4a1a', face: 'metalmania', rot: -3 }} t={t} />);
        break;
      case 'f-ship3':
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: words(e).map((w, i) => ({ text: clean(w.text), color: (i % 2 ? '#ffb020' : '#ff3014') as Hex })), t0: e.t0 + 0.02, stagger: 0.03, t1: e.t1, x: 960, y: 950, size: 100, face: 'metalmania', box: true, backing: true }} t={t} />);
        break;
      // ---- "Build failed. Syntax error on line forty-two."
      case 'f-failed':
        out.push(<Code key={e.id} spec={spec(e, { x: 1000, y: 690, w: 820, h: 270 })} t={t} opt={{ gutter: '!', size: 72, keyScale: 1.4, chrome: 'build.log', terminal: true, backing: true }} />);
        break;
      case 'f-syntax':
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: words(e).map((w) => ({ text: clean(w.text), color: '#ff3b3b' as Hex })), t0: e.t0 + 0.02, stagger: 0.04, t1: e.t1, x: 760, y: 960, size: 96, face: 'mono', box: true, backing: true }} t={t} />);
        break;
      case 'f-42': {
        const toks = words(e);
        out.push(<Counter key={e.id} spec={{ from: 0, to: 42, t0: toks[0]?.start ?? e.t0, t1: toks.at(-1)?.end ?? e.t1, x: 1060, y: 620, size: 300, color: '#ff3b3b', digits: 2, backing: true }} t={t} />);
        break;
      }
      // ---- the scream end and the outro: the merge's epilogue
      case 'f-scream':
        out.push(<Shout key={e.id} spec={{ id: `${e.id}-s`, text: 'AAAAAAAH!', at: e.t0 + 4 / 60, until: e.t1, style: 'steel', color: '#ff2a14', cx: 960, cy: 880, w: 1500, rot: -3 }} t={t} />);
        break;
      case 'f-fix':
      case 'f-log':
        out.push(
          <g key={e.id}>
            <Scrim x={100} y={930} w={e.id === 'f-fix' ? 420 : 900} h={80} pad={0} opacity={0.82} edge="#ffb08a" />
            <CodeLine spec={{ gutter: '>', text: e.text ?? '', color: '#ffd6c2', gutterColor: '#ff4a1a', x: 124, y: 984, size: 36, t0: e.t0, t1: e.t1, perBeat: 3 }} t={t} />
          </g>,
        );
        break;
      case 'f-commits':
        out.push(<Counter key={e.id} spec={{ from: 0, to: 300, t0: e.t0, t1: e.t1 - 0.3, x: 960, y: 1000, size: 130, color: '#ffb020', suffix: ' commits', backing: true }} t={t} />);
        break;
      case 'f-passing':
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: [{ text: 'BUILD', color: '#3dff9a' }, { text: 'PASSING', color: '#3dff9a' }], t0: e.t0 + 0.05, stagger: 0.04, t1: e.t1, x: 960, y: 950, size: 96, face: 'mono', box: true, backing: true }} t={t} />);
        break;
      case 'f-shipped':
        out.push(<Slam key={e.id} spec={{ text: 'SHIPPED!', t0: e.t0, t1: e.t1 - 0.02, x: 960, y: 950, size: 190, color: '#ff4a1a', face: 'metalmania', rot: -4 }} t={t} />);
        break;
      case 'f-merged':
        out.push(<DissolveText key={e.id} spec={{ id: e.id, text: 'merged.', t0: e.t0, t1: e.t1, x: 1460, y: 220, size: 96, color: '#ffe2b0', face: 'mono', halo: true }} t={t} />);
        break;
      case 'f-title':
        out.push(<ResolvedLogo key={e.id} id="f-logo-title" t={t} cy={540} width={1300} />);
        break;
      case 'f-end':
        out.push(<DissolveText key={e.id} spec={{ id: e.id, text: 'resolved.', t0: e.t0, t1: e.t1, x: 960, y: 1000, size: 64, color: '#ffffff', face: 'mono', halo: true }} t={t} />);
        break;
      default:
        break;
    }
  }
  return <g>{out}</g>;
};
