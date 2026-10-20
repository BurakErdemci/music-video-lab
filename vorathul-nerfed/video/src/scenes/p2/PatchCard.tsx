// The patch-note card as a pure function of the frame: the title types on the announcer's robot words, the lines fill in
// word by word on their measured frames (storyboard 1, section 4.3). Same card as a screen overlay and as a pinned card.
import { PatchNotesCard, type PatchLine } from '../../ui/kit.ts';
import { C } from '../../ui/theme.tsx';
import { T, wf } from './frames.ts';

const TITLE: readonly [string, number][] = [
  ['P', T.typePatch],
  ['a', T.typePatch + 2],
  ['t', T.typePatch + 3],
  ['c', T.typePatch + 5],
  ['h', T.typePatch + 6],
  [' 2', T.typeTwo],
  ['.', T.typePoint],
  ['3', T.typeThree],
];

const title = (f: number): string => TITLE.filter(([, at]) => f >= at).map(([c]) => c).join('');

/** Words of a line with the frame each appears on. */
type Word = readonly [string, number];
const LINES: readonly (readonly Word[])[] = [
  [['Vorathul:', T.tapVorathul], ['health', T.health], ['reduced', T.reduced], ['by', T.by], ['40%', T.percent]],
  [['Meteor', T.meteorWord], ['Rain:', T.rain], ['removed', T.removed]],
  [['Phase', T.phase], ['3:', T.three], ['removed', T.removed2]],
  [['Reason:', T.players], ['players', T.players + 6], ['felt', T.felt], ['the', wf('the', 6)], ['fight', T.fight], ['was', T.was], ['unfair.', T.unfair1]],
];

export const cardLines = (f: number): PatchLine[] =>
  LINES.filter((w) => f >= (w[0] as Word)[1]).map((words) => ({
    text: words.filter(([, at]) => f >= at).map(([w]) => w).join(' '),
    appearAt: (words[0] as Word)[1],
  }));

/** The card, at screen position (x, y) and px width; its own clock is the film frame. */
export const PatchCard = ({ frame, x, y, width }: { frame: number; x: number; y: number; width: number }) => {
  if (frame < T.unfreeze) return null;
  return (
    <>
      <PatchNotesCard frame={frame} x={x} y={y} width={width} title={title(frame)} enterAt={T.unfreeze} lines={cardLines(frame)} footer="Balance team" />
      {frame >= T.live ? <LivePill x={x + width * 0.62} y={y + width * 0.014} width={width * 0.14} /> : null}
    </>
  );
};

const LivePill = ({ x, y, width }: { x: number; y: number; width: number }) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, width, height: width * 0.3, borderRadius: width, background: C.blue, color: C.white,
      fontFamily: "'UiInter', sans-serif", fontWeight: 800, fontSize: width * 0.2, letterSpacing: width * 0.02, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    LIVE
  </div>
);
