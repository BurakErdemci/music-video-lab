import { AbsoluteFill } from 'remotion';
import { Card } from './stage/Card.tsx';
import { fitDistance, Stage, type CameraPath } from './stage/Stage.tsx';
import { Hud } from './Hud.tsx';

const IMG = '01-tarz-cizgi-roman.jpg';
const CARD_W = 16 * 1.6;
const CARD_H = CARD_W / 1.5;
const D0 = fitDistance(9) + 6;

// Slow push in with a small lateral sway so the three depths visibly slide against each other.
const camera: CameraPath = (frame) => {
  const push = 3.5 * (1 - Math.exp(-frame / 1500));
  const sway = Math.sin(frame / 90) * 0.6;
  return { position: [sway, 0, D0 - push], target: [0, 0, 0] };
};

/** Placeholder scene proving the card stage: three copies of the style frame at different depths. */
export const SkeletonScene = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Stage camera={camera}>
      <Card src={IMG} width={CARD_W} height={CARD_H} position={[0, 0, -8]} scale={1.8} />
      <Card src={IMG} width={CARD_W} height={CARD_H} position={[1.5, -0.5, -3]} scale={0.6} opacity={0.75} />
      <Card src={IMG} width={CARD_W} height={CARD_H} position={[-2.5, -1, 1.5]} scale={0.25} opacity={0.9} />
    </Stage>
    <Hud />
  </AbsoluteFill>
);
