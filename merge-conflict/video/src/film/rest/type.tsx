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
import { LightBox } from '../../type/LightBox.tsx';
import { Slam } from '../../type/Slam.tsx';
import type { TypeEntry } from '../chorus/typeplan.ts';

export interface Box { x: number; y: number; w: number; h: number }
export interface RestAnchors { gutter?: Box; countdown?: Box; tag?: Box; caseLine?: Box }

const spec = (e: TypeEntry, box: Box): FormSpec => ({ id: `r-${e.id}`, line: e.line, key: e.key, singer: e.singer, t0: e.t0, t1: e.t1, box, range: e.range });
const words = (e: TypeEntry) => lineTokens(e.line).slice(e.range[0], e.range[1]);
const upper = (e: TypeEntry) => words(e).map((w) => w.text.toUpperCase()).join(' ');

export const RestType = ({ entries, t, anchors }: { entries: readonly TypeEntry[]; t: number; anchors: RestAnchors }) => {
  const out: ReactNode[] = [];
  for (const e of entries) {
    if (t < e.t0 || t >= e.t1 + (e.form === 'DissolveText' ? 0.6 : 0)) continue;
    switch (e.id) {
      case 'r-rebased':
        out.push(<LightBox key={e.id} spec={{ id: e.id, words: words(e).map((w, i) => ({ text: w.text.replace(/[!,]$/, '').toUpperCase(), color: i === 1 ? '#ff2a14' : '#ffb07a' })), t0: e.t0 + 0.05, stagger: 0.035, t1: e.t1, x: 960, y: 170, size: 96, box: true }} t={t} />);
        break;
      case 'r-mine':
        out.push(<Wave key={e.id} spec={spec(e, { x: 120, y: 120, w: 1680, h: 300 })} t={t} opt={{ size: 130, face: 'shrikhand', amp: 40 }} />);
        break;
      case 'r-squash':
        out.push(<Stack key={e.id} spec={spec(e, { x: 120, y: 60, w: 760, h: 420 })} t={t} />);
        break;
      case 'r-blame': {
        // blame's gutter is the world's: the line itself is typed beside the canyon's name tags
        const g = anchors.gutter ?? { x: 160, y: 160, w: 1200, h: 520 };
        out.push(<Code key={e.id} spec={spec(e, g)} t={t} opt={{ gutter: 'blue', size: Math.min(64, g.h / 6), keyScale: 1.6, chrome: 'git blame button.css' }} />);
        break;
      }
      case 'r-red':
        out.push(<Marquee key={e.id} spec={spec(e, { x: 80, y: 80, w: 1760, h: 300 })} t={t} />);
        break;
      case 'r-gone':
        out.push(<DissolveText key={e.id} spec={{ id: e.id, text: upper(e).replace(/!$/, ''), t0: e.t0, t1: e.t1 - 0.35, x: 960, y: 260, size: 150, color: '#7fe3ff', face: 'bungee' }} t={t} />);
        break;
      case 'r-five': {
        const c = anchors.countdown ?? { x: 660, y: 70, w: 600, h: 260 };
        const tok = lineTokens(e.line);
        out.push(<Counter key={e.id} spec={{ from: 0, to: 5, t0: tok[0]?.start ?? e.t0, t1: tok[4]?.start ?? e.t1, x: c.x + c.w / 2, y: c.y + c.h * 0.82, size: c.h * 0.85, color: '#ff3d9a', digits: 1 }} t={t} />);
        break;
      }
      case 'r-nobody':
        out.push(<Flap key={e.id} spec={spec(e, { x: 360, y: 760, w: 1200, h: 220 })} t={t} cols={16} />);
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
        const c = anchors.caseLine ?? { x: 560, y: 420, w: 800, h: 140 };
        out.push(<Code key={e.id} spec={spec(e, { x: c.x - 360, y: c.y - 220, w: c.w + 720, h: c.h + 260 })} t={t} opt={{ gutter: '//', size: Math.min(62, (c.h + 260) / 5.2), keyScale: 1.5, chrome: 'comment.js' }} />);
        break;
      }
      case 'r-wrote':
        out.push(<Stamp key={e.id} spec={spec(e, { x: 100, y: 80, w: 900, h: 420 })} t={t} />);
        break;
      case 'r-touched':
        out.push(<Diff key={e.id} spec={spec(e, { x: 340, y: 120, w: 1240, h: 520 })} t={t} opt={{ minus: "// don't touch", size: 78, keyScale: 1.8, title: 'comment.js' }} />);
        break;
      case 'r-scream':
        out.push(<Shout key={e.id} spec={{ id: 'r-scream-s', text: 'AAAAAH!', at: e.t0, until: e.t1, style: 'steel', color: '#ff2a14', cx: 960, cy: 820, w: 1820, rot: -3 }} t={t} />);
        break;
      case 'r-git':
        // GIT! hits and goes: the long gap before PUSH! belongs to the warning screen
        out.push(<Slam key={e.id} spec={{ text: 'GIT!', t0: e.t0, t1: Math.min(e.t1 - 0.02, e.t0 + 1.8), x: 960, y: 380, size: 380, color: '#ff2a14', face: 'metalmania', rot: -3 }} t={t} />);
        break;
      case 'r-push':
        out.push(<Extrude key={e.id} spec={spec(e, { x: 160, y: 200, w: 1600, h: 560 })} t={t} opt={{ size: 420, face: 'metalmania', depth: 0.35 }} />);
        break;
      case 'r-force':
        out.push(<Shout key={e.id} spec={{ id: 'r-force-s', text: 'FORCE!', at: e.t0, until: e.t1, style: 'steel', color: '#ff2a14', cx: 960, cy: 760, w: 1750, rot: 4 }} t={t} />);
        break;
      case 'r-wouldnt':
        // the quietest frame: small, low, and it dissolves as she finishes
        out.push(<DissolveText key={e.id} spec={{ id: e.id, text: '...you wouldn’t.', t0: e.t0, t1: e.t1 - 0.3, x: 1240, y: 820, size: 64, color: '#9fb8d8', face: 'mono' }} t={t} />);
        break;
      default:
        break;
    }
  }
  return <g>{out}</g>;
};
