// Stand-in cards for part 4: AssetCard for flat colours and whole plates, plus a cropped plate (a UV window) for the
// stand-ins that are a part of an approved frame. When the final image of an id lands in AVAILABLE the real card wins.
import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { AssetCard, type StandIn } from '../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../cast/available.ts';
import { Card, useCardTexture, type Vec3 } from '../../stage/Card.tsx';

/** Window into a plate, as fractions of the image: [u0, v0, u1, v1] with v measured from the top. */
export type Crop = [number, number, number, number];

interface Common {
  width: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  opacity?: number;
  renderOrder?: number;
  hidden?: boolean;
}

const CropCard = ({ src, crop, width, height, position, rotation, scale, opacity = 1, renderOrder, hidden }: Common & { src: string; crop: Crop }) => {
  const base = useCardTexture(src);
  const map = useMemo(() => {
    const t = base.clone();
    t.repeat.set(crop[2] - crop[0], crop[3] - crop[1]);
    t.offset.set(crop[0], 1 - crop[3]);
    t.needsUpdate = true;
    return t;
  }, [base, crop[0], crop[1], crop[2], crop[3]]);
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder} visible={!hidden}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={map} toneMapped={false} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};

export type Look = StandIn | { src: string; crop: Crop };

/** A storyboard asset on the stage: the final image once it is AVAILABLE, else the stand-in (flat colour, plate or plate crop). */
export const Asset = ({ id, look, ...card }: Common & { id: string; look: Look }) =>
  'crop' in look && !AVAILABLE.has(id) ? <CropCard src={look.src} crop={look.crop} {...card} /> : <AssetCard id={id} standIn={'crop' in look ? { src: look.src } : look} {...card} />;

export { Card };
