// TransLab: every scene transition of transitions/scene/ alone over a fake A/B scene, 40 frames per kind,
// the cut at local frame 20. The last segment shows the Kaleido group.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { H, W } from '../../camera/camera.ts';
import { Svg } from '../../type/Svg.tsx';
import { Kaleido, SceneTransition, type TransitionKind, type TransitionSpec } from './scene.tsx';

const SEG = 40;
const CUT = 20;
const KINDS: TransitionKind[] = ['streaks', 'mirror', 'shatter', 'ink', 'diff', 'tunnel', 'shock', 'dissolve', 'laser', 'glitch', 'fire', 'tear'];
export const TRANS_LAB_FRAMES = SEG * (KINDS.length + 1);

const PALETTE: [`#${string}`, `#${string}`][] = [
  ['#6a1fa8', '#ff4fa3'],
  ['#0f5f8f', '#ffd23f'],
  ['#8a1c3a', '#4fd1ff'],
  ['#1f7a4a', '#ff7a3d'],
];

// Hand-picked colours for the new kinds so each reads as its theme (neon, glitch, fire, steel).
const OVERRIDE: Partial<Record<TransitionKind, [`#${string}`, `#${string}`]>> = {
  laser: ['#4a1a8a', '#ff2fd0'],
  glitch: ['#2a1a7a', '#ffcf30'],
  fire: ['#8a1c1c', '#ffb020'],
  tear: ['#3a4a6a', '#ff7a2a'],
};

const specs: TransitionSpec[] = KINDS.map((kind, i) => ({ id: `lab-${kind}`, kind, at: (i * SEG + CUT) / 60, colors: OVERRIDE[kind] ?? PALETTE[i % PALETTE.length]!, origin: i % 3 === 1 ? [1100, 420] : undefined, glyph: i === 5 ? '=' : undefined }));

export const TransLab = () => {
  const frame = useCurrentFrame();
  const t = frame / 60;
  const seg = Math.floor(frame / SEG);
  const afterCut = frame % SEG >= CUT;
  const kaleido = seg === KINDS.length;
  const kAt = (KINDS.length * SEG) / 60;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Svg>
        <rect width={W} height={H} fill={kaleido ? '#10121c' : afterCut ? '#8f3f55' : '#3f4f9c'} />
        {!kaleido && (
          <text x={W / 2} y={H / 2 + 330} textAnchor="middle" fontFamily="sans-serif" fontWeight={900} fontSize={900} fill={afterCut ? '#a8566d' : '#5668b8'}>
            {afterCut ? 'B' : 'A'}
          </text>
        )}
        <text x={40} y={70} fontFamily="sans-serif" fontSize={44} fill="#8c93b8">
          {kaleido ? 'kaleido' : KINDS[seg]}
        </text>
        {specs.map((s) => (
          <SceneTransition key={s.id} spec={s} t={t} />
        ))}
        <Kaleido t={t} at={kAt} dur={SEG / 60} wedges={10} cx={W / 2} cy={H / 2}>
          <circle cx={W / 2 + 180} cy={H / 2 - 40} r={90} fill="#ff4fa3" />
          <rect x={W / 2 + 40} y={H / 2 + 60} width={260} height={90} fill="#ffd23f" />
          <polygon points={`${W / 2 + 320},${H / 2 - 260} ${W / 2 + 470},${H / 2 - 60} ${W / 2 + 280},${H / 2 - 120}`} fill="#4fd1ff" />
        </Kaleido>
      </Svg>
    </AbsoluteFill>
  );
};
