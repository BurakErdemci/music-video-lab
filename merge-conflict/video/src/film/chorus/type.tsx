// The chorus type layer: draws every entry of chorusType() with its designed form (typeplan.ts). The Shouts are
// drawn in screen space (they fill the frame); the rest live on the type plane, so the camera carries them.
import { typeShown, useTypeOnly } from '../../layer.ts';
import type { ReactNode } from 'react';
import type { CameraPose } from '../../camera/camera.ts';
import { clamp01, outQuad } from '../../lib/ease.ts';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { beatIndexAt, beatPos } from '../../timing.ts';
import type { FormSpec } from '../../type/forms/common.tsx';
import { Marquee } from '../../type/forms/Dots.tsx';
import { Wave } from '../../type/forms/Letters.tsx';
import { FlameText, GlitchText, Shout } from '../../type/forms/Mega.tsx';
import { Extrude, Stamp } from '../../type/forms/Plates.tsx';
import { Stack } from '../../type/forms/Stack.tsx';
import { MergeConflictLogo } from '../../type/logo/Logo.tsx';
import { Kaleido } from '../../transitions/scene/scene.tsx';
import { Scrim } from '../../type/Scrim.tsx';
import { LOGO_DESIGN } from '../proof.ts';
import { avoidFaces, type Box as AvoidBox } from '../../type/avoid.ts';
import { CHORUS1_LIVE, CHORUS2_LIVE, CHORUS2_START } from './ChorusShot.tsx';
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
// upper half of every chorus frame), never cut around a face (round 7d, "No knockouts").
// The rest live on the type plane, so the camera carries them.
const SCREEN_FORMS: readonly string[] = ['Shout', 'Logo', 'Stack', 'Stamp', 'Extrude', 'Marquee', 'FlameText'];
const box = { x: 300, y: 520, w: 1320, h: 480 };
/** NO! sits off the screaming face (her bust is right of centre for orange, left for blue); NEVER! spans both. */
const shoutPlace = (e: TypeEntry) =>
  e.text === 'NEVER!' ? { cx: 960, cy: 820, w: 1800, rot: e.style === 'steel' ? -4 : 4 } : e.style === 'steel' ? { cx: 640, cy: 720, w: 1120, rot: -7 } : { cx: 1300, cy: 720, w: 1120, rot: 6 };
/** Each form's box for type/avoid.ts (the plane's coordinates for the plane forms, the screen's for the rest); the
 *  runway line lies on the floor and stays. */
const avoidBox = (e: TypeEntry, c2: boolean): AvoidBox | undefined => {
  switch (e.form) {
    case 'Stack': return e.id === 'one-line' ? { x: 240, y: 770, w: 1440, h: 230 } : box;
    case 'Stamp': return { x: 200, y: 520, w: 1500, h: 480 };
    case 'Shout': {
      const p = shoutPlace(e);
      const h = (p.w / (e.text ?? 'NO!').length) * 1.5 + p.w * Math.abs(Math.sin((p.rot * Math.PI) / 180));
      return { x: p.cx - p.w / 2, y: p.cy - h / 2, w: p.w, h };
    }
    case 'FlameText': return { x: 140, y: 590, w: 1640, h: 300 };
    case 'Wave': return { x: 140, y: 640, w: 1640, h: 380 };
    case 'Extrude': return { x: 260, y: 560, w: 1400, h: 440 };
    case 'Marquee': return { x: 140, y: 610, w: 1640, h: 390 };
    case 'GlitchText': return undefined;
    case 'Logo': return { x: 385, y: 200, w: 1150, h: 600 };
    default: return undefined;
  }
};
const form = (e: TypeEntry, b = box): FormSpec => ({ id: `ch-${e.id}-${e.line}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box: b, range: e.range });

export const ChorusType = ({ entries, t, pose, screen, merges }: { entries: readonly TypeEntry[]; t: number; pose: CameraPose; screen: boolean; merges: Record<string, readonly [number, number, number, number]> }) => {
  const out: ReactNode[] = [];
  const only = useTypeOnly();
  for (const e of entries) {
    if (!typeShown(only, e.id)) continue;
    const n0 = out.length;
    if (t < e.t0 - 0.02 || t >= e.t1) continue;
    // I CAN'T TAKE CONTROL is set in screen space in both choruses: on the plane the barrel roll carried its rows and
    // its backing off the frame (round 7d chorus 2 at 105.4-105.9 s; round 11 chorus 1 at 63.4-64.4 s)
    const c2 = t >= CHORUS2_START;
    const isScreen = SCREEN_FORMS.includes(e.form) || e.form === 'GlitchText';
    if (isScreen !== screen) continue;
    const toks = lineTokens(e.line).slice(e.range[0], e.range[1]);
    switch (e.form) {
      case 'Stack':
        if (e.id === 'one-line') {
          // round 11: "two girls, one line" stands in the bottom band (on the runway floor in steep perspective it
          // ran off both edges and only "two girls, o" was ever in frame)
          out.push(
            <g key={e.id}>
              <Scrim x={240} y={770} w={1440} h={230} pad={14} />
              <Stack spec={form(e, { x: 240, y: 770, w: 1440, h: 230 })} t={t} />
            </g>,
          );
        } else out.push(<Stack key={e.id} spec={form(e)} t={t} />);
        break;
      case 'Stamp':
        out.push(<Stamp key={e.id} spec={form(e, { x: 200, y: 520, w: 1500, h: 480 })} t={t} />);
        break;
      case 'Shout':
        out.push(<Shout key={e.id} spec={{ id: `sh-${e.id}`, text: e.text ?? 'NO!', at: e.t0, until: e.t1, style: e.style ?? 'chrome', color: e.style === 'steel' ? '#ff2a14' : '#19c8ff', ...shoutPlace(e) }} t={t} />);
        break;
      case 'RunwayLine':
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
        // chorus 2: in the bottom-right corner, wrapped onto two rows (the barrel roll sweeps the faces through the
        // left and the top of these shots; round 7d)
        // upright in screen space (round 11: on the plane the barrel roll turned it and its backing past the frame;
        // a lean that followed the roll drew differently in the type layer than in the frame, so it stays upright)
        out.push(<GlitchText key={e.id} spec={{ id: e.id, tokens: toks, x: 1000, y: 790, size: 120, face: 'metalmania', until: e.t1, key: 3, color: '#ffffff' }} t={t} />);
        break;
      case 'Logo': {
        const m = merges[e.id] as readonly [number, number, number, number];
        const apart = logoApart(t, m);
        const bp = beatPos(t);
        const crash = [m[1], m[3]].filter((c) => t >= c).at(-1);
        const kick = crash === undefined ? 1 : 1 + 0.25 * (1 - outQuad(clamp01((t - crash) / (10 / 60))));
        // chorus 2 (round 7d, 92-94 and 102.9-104 s read as red on blue): the letters aligned across the cut and no
        // kaleidoscope copies behind the crash
        const logo = <MergeConflictLogo id={`ch-logo-${e.id}`} design={LOGO_DESIGN} resolved={false} cx={960} cy={500} width={1150} beat={bp - Math.floor(bp)} beatIndex={beatIndexAt(t)} apart={apart} aligned={c2} />;
        out.push(
          <g key={e.id} transform={`translate(960 500) scale(${kick}) translate(-960 -500)`}>
            {crash !== undefined && t - crash < 0.45 && !c2 && (
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
    // round 7d: no knockout; the form moves or shrinks off the faces of the shot (type/avoid.ts)
    const b = avoidBox(e, c2);
    if (b && out.length > n0) {
      const tf = avoidFaces(c2 ? CHORUS2_LIVE : CHORUS1_LIVE, t, b, !isScreen);
      if (tf) out.push(<g key={`${e.id}-avoid`} transform={tf}>{out.splice(n0)}</g>);
    }
  }
  return <g>{out}</g>;
};
