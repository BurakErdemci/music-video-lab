// The type of verse 3 through the whisper (round 7): every REST_TYPE entry with its designed form. Forms that live on
// a world object get their screen box from the shot (anchors): the blame gutter, the countdown frame, the guilty
// name tag, the code line in the display case.
import type { ReactNode } from 'react';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { Counter } from '../../type/Counter.tsx';
import { Code, Diff } from '../../type/forms/Code.tsx';
import type { FormSpec } from '../../type/forms/common.tsx';
import { Marquee } from '../../type/forms/Dots.tsx';
import { Flap, Wave } from '../../type/forms/Letters.tsx';
import { Shout } from '../../type/forms/Mega.tsx';
import { Extrude, Stamp } from '../../type/forms/Plates.tsx';
import { Stack } from '../../type/forms/Stack.tsx';
import { DissolveText } from '../../type/DissolveText.tsx';
import { faceBoxes, Knockout, planeFaceBoxes, planeMarginPath } from '../../type/Knockout.tsx';
import { LightBox } from '../../type/LightBox.tsx';
import { Scrim } from '../../type/Scrim.tsx';
import { Slam } from '../../type/Slam.tsx';
import { layout, MONO } from '../../type/fonts.tsx';
import { beatPos } from '../../timing.ts';
import type { TypeEntry } from '../chorus/typeplan.ts';
import { type RShot, RSHOTS } from './plan.ts';
import { restStateAt } from './RestShot.tsx';

export interface Box { x: number; y: number; w: number; h: number }
export interface RestAnchors { gutter?: Box; countdown?: Box; tag?: Box; caseLine?: Box; /** GIT! and PUSH! end with their shots. */ gitUntil?: number; pushUntil?: number }

/** The breakdown's command as a small corner HUD (round 7c storyboard: never full screen), typed through the build. */
export const GitHud = ({ t, t0, t1, until }: { t: number; t0: number; t1: number; until: number }) => {
  if (t < t0 || t >= until) return null;
  const text = '$ git push --force';
  const n = Math.min(text.length, Math.floor(((t - t0) / (t1 - t0)) * text.length));
  // the cursor blinks on the beat (half a beat on, half off)
  const cursor = beatPos(t) % 1 < 0.5;
  return (
    <g>
      <Scrim x={100} y={928} w={520} h={82} pad={0} opacity={0.82} edge="#ffb08a" />
      <text x={124} y={982} fontFamily={MONO} fontSize={40} fill="#ffd6c2">
        {text.slice(0, n)}
        <tspan fill="#ff4a1a">{cursor ? '█' : ' '}</tspan>
      </text>
    </g>
  );
};

const spec = (e: TypeEntry, box: Box): FormSpec => ({ id: `r-${e.id}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box, range: e.range });
const words = (e: TypeEntry) => lineTokens(e.line).slice(e.range[0], e.range[1]);
const upper = (e: TypeEntry) => words(e).map((w) => w.text.toUpperCase()).join(' ');

/** The moment painting is on (scene 'panel'): its painted faces are not cards, so no checker sees them (the type keeps off them by eye). */
const panelAt = (t: number): boolean => {
  const i = RSHOTS.reduce((a, s, k) => (t >= s.t ? k : a), -1);
  return i >= 0 && (RSHOTS[i] as RShot).scene === 'panel';
};

export const RestType = ({ entries, t, anchors }: { entries: readonly TypeEntry[]; t: number; anchors: RestAnchors }) => {
  const out: ReactNode[] = [];
  for (const e of entries) {
    // a dissolving line drifts 0.6 s past its end, but the whisper's must not drift onto the solo's first face
    if (t < e.t0 || t >= e.t1 + (e.form === 'DissolveText' && e.id !== 'r-wouldnt' ? 0.6 : 0)) continue;
    switch (e.id) {
      case 'r-rebased': {
        // the line must fit the margin box of the painting it ends on (the plane shows it at 1.1x there): sized to 860 px
        const ws = words(e).map((w) => w.text.replace(/[!,]$/, '').toUpperCase());
        const size = Math.min(96, 860 / (layout(ws.join(' '), 1, 'display', 0.06).width + 0.7));
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: words(e).map((w, i) => ({ text: w.text.replace(/[!,]$/, '').toUpperCase(), color: i === 1 ? '#ff2a14' : '#ffb07a' })), t0: e.t0 + 0.05, stagger: 0.035, t1: e.t1, x: 960, y: 170, size, box: true, backing: true }} t={t} />);
        break;
      }
      case 'r-mine':
        out.push(<Wave key={e.id} spec={spec(e, { x: 120, y: 120, w: 1680, h: 300 })} t={t} opt={{ size: 130, face: 'shrikhand', amp: 40 }} />);
        break;
      case 'r-squash':
        out.push(<Stack key={e.id} spec={spec(e, { x: 340, y: 140, w: 720, h: 420 })} t={t} />);
        break;
      case 'r-blame': {
        // the blame shots push in so far that the plane shows 2.3x here: the panel is authored at the size that fits the
        // margin in the tightest of them (the canyon's own gutter box overflowed it), the type sized to its width
        const g = { x: 640, y: 330, w: 640, h: 270 };
        const toks = words(e);
        const chars = toks.reduce((a, tk, i) => a + (tk.text.length + 1) * (i === e.key ? 1.6 : 1), 'blue'.length + 2);
        out.push(<Code key={e.id} spec={spec(e, g)} t={t} opt={{ gutter: 'blue', size: Math.min(64, g.h / 6, (g.w - 90) / (0.6 * chars)), keyScale: 1.6, chrome: 'git blame button.css', backing: true }} />);
        break;
      }
      case 'r-red':
        out.push(
          <g key={e.id}>
            <Scrim x={140} y={110} w={1640} h={250} pad={20} />
            <Marquee spec={spec(e, { x: 140, y: 110, w: 1640, h: 250 })} t={t} />
          </g>,
        );
        break;
      case 'r-gone':
        out.push(<DissolveText key={e.id} spec={{ id: e.id, text: upper(e).replace(/!$/, ''), t0: e.t0, t1: e.t1 - 0.35, x: 960, y: 260, size: Math.min(150, 760 / layout(upper(e).replace(/!$/, ''), 1, 'bungee').width), color: '#7fe3ff', face: 'bungee', halo: true }} t={t} />);
        break;
      case 'r-five': {
        const c = anchors.countdown ?? { x: 660, y: 70, w: 600, h: 260 };
        const tok = lineTokens(e.line);
        out.push(<Counter key={e.id} spec={{ from: 0, to: 5, t0: tok[0]?.start ?? e.t0, t1: tok[4]?.start ?? e.t1, x: c.x + c.w / 2, y: c.y + c.h * 0.82, size: c.h * 0.85, color: '#ff3d9a', digits: 1, backing: true }} t={t} />);
        break;
      }
      case 'r-nobody':
        out.push(<Flap key={e.id} spec={spec(e, { x: 360, y: 760, w: 1200, h: 220 })} t={t} cols={16} backing />);
        break;
      case 'r-tabs':
        out.push(<Slam key={e.id} spec={{ text: 'TABS!', t0: lineTokens(e.line)[2]?.start ?? e.t0, t1: e.t1 - 0.02, x: 1340, y: 620, size: 300, color: '#19c8ff', face: 'bungee', rot: -5 }} t={t} />);
        break;
      case 'r-spaces':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 160, y: 200, w: 1100, h: 420 })} t={t} opt={{ size: 260, face: 'metalmania', depth: 0.3 }} />);
        break;
      case 'r-data2': {
        const g = anchors.tag ?? { x: 760, y: 300, w: 400, h: 160 };
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: [{ text: 'DATA2', color: '#ff7a1a' }], t0: lineTokens(e.line)[4]?.start ?? e.t0, stagger: 0.05, t1: e.t1, x: g.x + g.w / 2, y: g.y + g.h * 0.75, size: Math.min(150, g.h * 0.8), face: 'mono', box: false }} t={t} />);
        out.push(<LightBox key={`${e.id}-q`} spec={{ id: `${e.id}-q`, words: words(e).slice(0, 4).map((w) => ({ text: w.text.toUpperCase(), color: '#7fe3ff' })), t0: e.t0 + 0.05, stagger: 0.04, t1: e.t1, x: 960, y: 150, size: 84, box: true }} t={t} />);
        break;
      }
      case 'r-touch': {
        // the case's own line box overflowed the margin when the plane magnified: the panel is authored at the size that
        // fits the tightest of the comment shots, the type sized to its width
        const b = { x: 700, y: 330, w: 690, h: 370 };
        const chars = words(e).reduce((a, tk, i) => a + (tk.text.length + 1) * (i === e.key ? 1.5 : 1), '//'.length + 2);
        out.push(<Code key={e.id} spec={spec(e, b)} t={t} opt={{ gutter: '//', size: Math.min(62, (b.w - 90) / (0.6 * chars)), keyScale: 1.5, chrome: 'comment.js', backing: true }} />);
        break;
      }
      case 'r-wrote':
        out.push(<Stamp key={e.id} spec={spec(e, { x: 210, y: 300, w: 1000, h: 420 })} t={t} />);
        break;
      case 'r-touched':
        out.push(<Diff key={e.id} spec={spec(e, { x: 390, y: 250, w: 1110, h: 450 })} t={t} opt={{ minus: "// don't touch", size: Math.min(78, (1110 - 90) / (0.6 * (2 + words(e).reduce((a, tk, i) => a + (tk.text.length + 1) * (i === e.key ? 1.8 : 1), 0)))), keyScale: 1.8, title: 'comment.js', backing: true }} />);
        break;
      case 'r-scream':
        // it slams once the scream's shatter cover has cleared (10 frames; over the cover it read at 1.9:1), and sits
        // a few px above the bottom margin
        out.push(<Shout key={e.id} spec={{ id: 'r-scream-s', text: 'AAAAAH!', at: e.t0 + 10 / 60, until: e.t1, style: 'steel', color: '#ff2a14', ...(panelAt(t) ? { cx: 960, cy: 880, w: 985 } : { cx: 960, cy: 700, w: 1480 }), rot: -3 }} t={t} />);
        break;
      // GIT! PUSH! FORCE! (round 7c storyboard): each word stands beside orange (she is on the right third), never
      // over her face or her action, and leaves with her shot; the painting after PUSH! stays uncovered
      case 'r-git':
        out.push(<Slam key={e.id} spec={{ text: 'GIT!', t0: e.t0, t1: Math.min(e.t1, anchors.gitUntil ?? e.t1) - 0.02, x: 520, y: 400, size: 300, color: '#ff2a14', face: 'metalmania', rot: -3 }} t={t} />);
        break;
      case 'r-push':
        if (t < (anchors.pushUntil ?? e.t1)) out.push(<Extrude key={e.id} spec={spec(e, { x: 70, y: 180, w: 780, h: 420 })} t={t} opt={{ size: 300, face: 'metalmania', depth: 0.35 }} />);
        break;
      case 'r-force':
        out.push(<Shout key={e.id} spec={{ id: 'r-force-s', text: 'FORCE!', at: e.t0, until: e.t1, style: 'steel', color: '#ff2a14', cx: 540, cy: 330, w: 860, rot: -4 }} t={t} />);
        break;
      case 'r-wouldnt':
        // the quietest frame: small, low, and it dissolves as she finishes
        out.push(<DissolveText key={e.id} spec={{ id: e.id, text: '...you wouldn’t.', t0: e.t0, t1: e.t1 - 0.3, x: 1240, y: 820, size: 64, color: '#9fb8d8', face: 'mono' }} t={t} />);
        break;
      default:
        break;
    }
  }
  // the Shouts are drawn in screen space, the rest on the type plane (RestShot.tsx)
  const onScreen = entries.some((e) => e.form === 'Shout');
  const st = restStateAt(t);
  return <Knockout id={onScreen ? 'r-face-knockout-s' : 'r-face-knockout'} faces={(onScreen ? faceBoxes : planeFaceBoxes)(st)} clip={onScreen ? undefined : planeMarginPath(st)}>{out}</Knockout>;
};
