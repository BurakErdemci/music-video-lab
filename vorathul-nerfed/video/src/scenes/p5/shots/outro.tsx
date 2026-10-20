// Scene 17, the outro (S115): ink and gold flood in from all four edges until the screen is solid black, then
// the end card types "Patch 2.6 notes:" and is cut off mid-word: the last frame reads "Patch 2.6 no".
import { AbsoluteFill, Freeze } from 'remotion';
import { TypingText } from '../../../ui/kit.ts';
import { PaintSpread } from '../../../vfx/effects.ts';
import { DomPlateFilters } from '../lib/DomPlate.tsx';
import { E } from '../lib/geom.ts';
import { S114 } from './choir.tsx';

const FLOOD = E('s115-cut');
const FULL = 'Patch 2.6 notes:';
/** Characters on screen, on the beats: "P" on 834, "Patch 2." on 835, "Patch 2.6 no" on 836; nothing after. */
const typed = (frame: number): number => {
  const keys: [number, number][] = [[E('s115-type'), 1], [E('s115-type2'), 8], [E('s115-typeno'), 12]];
  let n = 0;
  for (let i = 0; i < keys.length; i++) {
    const [f, k] = keys[i]!;
    const next = keys[i + 1];
    if (frame < f) break;
    n = next ? Math.min(next[1] - 1, k + Math.floor(((frame - f) * (next[1] - k)) / (next[0] - f))) : k;
  }
  return n;
};

export const S115 = ({ frame }: { frame: number }) => {
  const black = frame >= E('s115-black');
  const n = typed(frame);
  // Cut off on beat 837: the caret dies with the last half-typed word still on screen.
  const dead = frame >= E('s115-cutoff');
  return (
    <AbsoluteFill style={{ background: '#0A0A0A' }}>
      <DomPlateFilters />
      {!black ? (
        <Freeze frame={FLOOD - 1}>
          <S114 frame={FLOOD - 1} />
        </Freeze>
      ) : null}
      <PaintSpread frame={frame - FLOOD} seed={115} mode="cover" duration={E('s115-black') - FLOOD} />
      {n > 0 ? (
        <AbsoluteFill className={dead ? 'p5-endcard-dead' : undefined} style={{ filter: 'url(#p5-ivory)' }}>
          <style>{'.p5-endcard-dead span + span { visibility: hidden; }'}</style>
          <TypingText frame={frame} x={360} y={420} width={1200} text={FULL.slice(0, n)} startFrame={E('s115-type') - 2000} framesPerChar={1} chrome={false} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
