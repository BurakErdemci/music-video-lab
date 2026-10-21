// The chorus type layer: draws every entry of chorusType() with its designed form (typeplan.ts). The Shouts are
// drawn in screen space (they fill the frame); the rest live on the type plane, so the camera carries them.
import type { ReactNode } from 'react';
import type { CameraPose } from '../../camera/camera.ts';
import { clamp01, outQuad } from '../../lib/ease.ts';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { beatIndexAt, beatPos } from '../../timing.ts';
import type { FormSpec } from '../../type/forms/common.tsx';
import { Marquee } from '../../type/forms/Dots.tsx';
import { Wave } from '../../type/forms/Letters.tsx';
import { FlameText, GlitchText, RunwayLine, Shout } from '../../type/forms/Mega.tsx';
import { Extrude, Stamp } from '../../type/forms/Plates.tsx';
import { Stack } from '../../type/forms/Stack.tsx';
import { MergeConflictLogo } from '../../type/logo/Logo.tsx';
import { Kaleido } from '../../transitions/scene/scene.tsx';
import { Knockout, faceBoxes } from '../../type/Knockout.tsx';
import { Scrim } from '../../type/Scrim.tsx';
import { LOGO_DESIGN } from '../proof.ts';
import { CHORUS2_START, chorus1StateAt, chorus2StateAt } from './ChorusShot.tsx';
import type { TypeEntry } from './typeplan.ts';

/** Logo B's signature move (the same both times): the halves fly in from off frame and crash on "conflict",
 *  shove apart on the second "merge" and crash again on the second "conflict". */
export const logoApart = (t: number, merge: readonly [number, number, number, number]): number => {
  const [m1, c1, m2, c2] = merge;
  if (t < c1) return 1300 * (1 - outQuad(clamp01((t - m1) / (c1 - m1))));
  if (t < m2) return 0;
  if (t < c2) return 520 * outQuad(clamp01((t - m2) / 0.12)) * (1 - clamp01((t - (c2 - 0.08)) / 0.08));
  return 0;
};

// Forms drawn in screen space: inside the 4 % margin whatever the camera does, below the girls' faces (they sit in the
// upper half of every chorus frame), and cut away around any face that still crosses them (type/Knockout.tsx).
// The rest live on the type plane, so the camera carries them.
const SCREEN_FORMS: readonly string[] = ['Shout', 'Logo', 'Stack', 'Stamp', 'Extrude', 'Marquee', 'FlameText'];
const box = { x: 300, y: 520, w: 1320, h: 480 };
/** NO! sits off the screaming face (her bust is right of centre for orange, left for blue); NEVER! spans both. */
const shoutPlace = (e: TypeEntry) =>
  e.text === 'NEVER!' ? { cx: 960, cy: 820, w: 1800, rot: e.style === 'steel' ? -4 : 4 } : e.style === 'steel' ? { cx: 640, cy: 720, w: 1120, rot: -7 } : { cx: 1300, cy: 720, w: 1120, rot: 6 };
const form = (e: TypeEntry, b = box): FormSpec => ({ id: `ch-${e.id}-${e.line}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box: b, range: e.range });

export const ChorusType = ({ entries, t, pose, screen, merges }: { entries: readonly TypeEntry[]; t: number; pose: CameraPose; screen: boolean; merges: Record<string, readonly [number, number, number, number]> }) => {
  const out: ReactNode[] = [];
  for (const e of entries) {
    if (t < e.t0 - 0.02 || t >= e.t1) continue;
    const isScreen = SCREEN_FORMS.includes(e.form);
    if (isScreen !== screen) continue;
    const toks = lineTokens(e.line).slice(e.range[0], e.range[1]);
    switch (e.form) {
      case 'Stack':
        out.push(<Stack key={e.id} spec={form(e)} t={t} />);
        break;
      case 'Stamp':
        out.push(<Stamp key={e.id} spec={form(e, { x: 200, y: 520, w: 1500, h: 480 })} t={t} />);
        break;
      case 'Shout':
        out.push(<Shout key={e.id} spec={{ id: `sh-${e.id}`, text: e.text ?? 'NO!', at: e.t0, until: e.t1, style: e.style ?? 'chrome', color: e.style === 'steel' ? '#ff2a14' : '#19c8ff', ...shoutPlace(e) }} t={t} />);
        break;
      case 'RunwayLine':
        // the line is laid across the runway in front of their feet, typed as it is sung
        out.push(<RunwayLine key={e.id} spec={{ id: e.id, text: toks.map((x) => x.text).join(' ').toLowerCase(), gutter: '42', t0: e.t0, t1: e.t1, cps: 26, origin: [-6.4, -3.38, 2.2], dir: [1, 0, 0], up: [0, 0, -1], size: 0.95, color: '#7fe3ff' }} t={t} pose={pose} />);
        out.push(<RunwayLine key={`${e.id}-41`} spec={{ id: `${e.id}-41`, text: '.button {', gutter: '41', t0: e.t0, t1: e.t1, cps: 80, origin: [-5.2, -3.38, -1.6], dir: [1, 0, 0], up: [0, 0, -1], size: 0.5, color: '#5f6b8a' }} t={t} pose={pose} />);
        out.push(<RunwayLine key={`${e.id}-43`} spec={{ id: `${e.id}-43`, text: '}', gutter: '43', t0: e.t0, t1: e.t1, cps: 80, origin: [-5.2, -3.38, 4.6], dir: [1, 0, 0], up: [0, 0, -1], size: 0.5, color: '#5f6b8a' }} t={t} pose={pose} />);
        break;
      case 'FlameText':
        out.push(<FlameText key={e.id} spec={{ id: e.id, tokens: toks, x: 140, y: 720, size: 150, face: 'metalmania', until: e.t1, key: 4 }} t={t} />);
        break;
      case 'Wave':
        out.push(<Wave key={e.id} spec={form(e, { x: 140, y: 640, w: 1640, h: 380 })} t={t} opt={{ size: 190, face: 'bungee', amp: 110 }} />);
        break;
      case 'Extrude':
        out.push(<Extrude key={e.id} spec={form(e, { x: 260, y: 560, w: 1400, h: 440 })} t={t} opt={{ size: 330, face: 'display', depth: 0.3 }} />);
        break;
      case 'Marquee':
        out.push(
          <g key={e.id}>
            <Scrim x={140} y={610} w={1640} h={390} pad={20} />
            <Marquee spec={form(e, { x: 140, y: 610, w: 1640, h: 390 })} t={t} />
          </g>,
        );
        break;
      case 'GlitchText':
        out.push(<GlitchText key={e.id} spec={{ id: e.id, tokens: toks, x: 140, y: 820, size: 170, face: 'metalmania', until: e.t1, key: 3, color: '#ffffff' }} t={t} />);
        break;
      case 'Logo': {
        const m = merges[e.id] as readonly [number, number, number, number];
        const apart = logoApart(t, m);
        const bp = beatPos(t);
        const crash = [m[1], m[3]].filter((c) => t >= c).at(-1);
        const kick = crash === undefined ? 1 : 1 + 0.25 * (1 - outQuad(clamp01((t - crash) / (10 / 60))));
        const logo = <MergeConflictLogo id={`ch-logo-${e.id}`} design={LOGO_DESIGN} resolved={false} cx={960} cy={500} width={1150} beat={bp - Math.floor(bp)} beatIndex={beatIndexAt(t)} apart={apart} />;
        out.push(
          <g key={e.id} transform={`translate(960 500) scale(${kick}) translate(-960 -500)`}>
            {crash !== undefined && t - crash < 0.45 && (
              <Kaleido t={t} at={crash} dur={0.45} wedges={8} cx={960} cy={500}>
                {logo}
              </Kaleido>
            )}
            {logo}
          </g>,
        );
        break;
      }
      default:
        break;
    }
  }
  if (!screen) return <g>{out}</g>;
  const faces = faceBoxes((t < CHORUS2_START ? chorus1StateAt : chorus2StateAt)(t));
  return <Knockout id="ch-face-knockout" faces={faces}>{out}</Knockout>;
};
