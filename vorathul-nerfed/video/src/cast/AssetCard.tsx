import { DoubleSide } from 'three';
import { Card, type CardProps, type Vec3 } from '../stage/Card.tsx';
import { assetSize, AVAILABLE } from './available.ts';

/** What to draw while the final image is missing: an approved style frame under public/plates/, or a flat colour. */
export type StandIn = { src: string } | { color: string };

export interface AssetCardProps extends Omit<CardProps, 'src'> {
  /** Storyboard asset id (G01, G42, office-plate, ...); a pose of a pose sheet is <id>-<n> (G15-3). */
  id: string;
  standIn: StandIn;
}

const ColorCard = ({ color, width, height, position, rotation, scale, opacity = 1, renderOrder, hidden }: { color: string; width: number; height: number; position?: Vec3; rotation?: Vec3; scale?: number | Vec3; opacity?: number; renderOrder?: number; hidden?: boolean }) => (
  <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder} visible={!hidden}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} side={DoubleSide} />
  </mesh>
);

/** A storyboard asset on the card stage: the final image once it is AVAILABLE, the stand-in before that. */
export const AssetCard = ({ id, standIn, ...card }: AssetCardProps) => {
  // The final image keeps its own aspect: the card keeps the given height and takes the image's width,
  // so swapping a stand-in for the real cut-out never stretches it.
  const size = assetSize(id);
  if (AVAILABLE.has(id) && size) return <Card src={`assets/${id}.png`} {...card} width={(card.height * size[0]) / size[1]} />;
  if ('src' in standIn) return <Card src={standIn.src} {...card} />;
  return <ColorCard color={standIn.color} {...card} />;
};
