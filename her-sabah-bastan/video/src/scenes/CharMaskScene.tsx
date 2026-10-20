// One character alone as a black silhouette on white, for video/scripts/jumpcheck.mjs: the same Actor the film
// renders (morphs included), with the colours flattened so the check sees only the outline. The human's desk
// prop is included the way the film draws it, so a desk drawing handing over to the prop is not counted as
// the desk vanishing.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Actor } from '../characters/Actor.tsx';
import { H, W } from '../layout.ts';
import { DeskProp, humanHasDesk } from '../world/Desk.tsx';
import { AI, HUMAN } from './acting.ts';

export const CharMaskScene = ({ who }: { who: 'human' | 'ai' }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#ffffff' }}>
      <svg key={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <filter id="flat" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
        </defs>
        <g filter="url(#flat)">
          {who === 'human' && !humanHasDesk(frame) && <DeskProp />}
          <Actor frame={frame} acts={who === 'ai' ? AI : HUMAN} phase={who === 'ai' ? 3.1 : 0.6} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
