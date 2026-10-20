// The painting stage behind the nerfed Vorathul (storyboard 1 §0.1 layers P0-P4).
// Stand-ins: the cathedral wall and floor are crops of approved frame 01 (its side galleries hold no Vorathul),
// the sky a flat SKY card. A crop is a cloned texture with offset/repeat, so the shared texture is never touched;
// when the final asset lands (AVAILABLE) the plain AssetCard is drawn instead.
import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../cast/available.ts';
import { useCardTexture, type Vec3 } from '../../stage/Card.tsx';

export const PLATE = {
  style: 'plates/01-tarz-cizgi-roman.jpg',
  fan: 'plates/03-kanat-yelpaze.jpg',
  second: 'plates/04-ikinci-form.jpg',
  nerf: 'plates/05-nerf-hali.jpg',
  fight: 'plates/06-dovus-faz3.jpg',
  office: 'plates/07-ofis-tablo.jpg',
} as const;

/** [u0, v0, u1, v1] in image fractions, v from the top. */
export type Crop = [number, number, number, number];

interface CropCardProps {
  src: string;
  crop: Crop;
  width: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  opacity?: number;
  renderOrder?: number;
}

const CropCard = ({ src, crop, width, height, position, rotation, scale, opacity = 1, renderOrder }: CropCardProps) => {
  const base = useCardTexture(src);
  const [u0, v0, u1, v1] = crop;
  const tex = useMemo(() => {
    const t = base.clone();
    t.repeat.set(u1 - u0, v1 - v0);
    t.offset.set(u0, 1 - v1);
    t.needsUpdate = true;
    return t;
  }, [base, u0, v0, u1, v1]);
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};

/** A storyboard asset whose stand-in is a crop of an approved plate. */
export const PlateAsset = ({ id, plate, crop, ...card }: Omit<CropCardProps, 'src'> & { id: string; plate: string }) =>
  AVAILABLE.has(id) ? <AssetCard id={id} standIn={{ src: plate }} {...card} /> : <CropCard src={plate} crop={crop} {...card} />;

const WALL_H = 78;
const WALL_W = WALL_H * ((0.345 * 1536) / (0.56 * 1024));

/** P0 sky as one flat card; `rect` = [x0, y0, x1, y1] so a shot can place its corner (S71). */
// Default z -68: a tilted-up view of a farther sky reached past the stage camera's far plane (200) and showed black.
export const Sky = ({ rect = [-220, -40, 220, 240], z = -68, color = '#8EC5E8' }: { rect?: [number, number, number, number]; z?: number; color?: string }) => (
  <AssetCard
    id="G01" standIn={{ color }} width={rect[2] - rect[0]} height={rect[3] - rect[1]}
    position={[(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2, z]} renderOrder={-100}
  />
);

/** P1 cathedral back wall: the left and right gallery halves of frame 01, meeting at the black spires. */
export const Wall = ({ z = -50, pitch = 0 }: { z?: number; pitch?: number }) => (
  <group position={[0, -6, z]} rotation={[pitch, 0, 0]}>
    <PlateAsset id="G03" plate={PLATE.style} crop={[0, 0, 0.345, 0.56]} width={WALL_W} height={WALL_H} position={[-WALL_W / 2, WALL_H / 2, 0]} renderOrder={-90} />
    <PlateAsset id="G03" plate={PLATE.style} crop={[0.655, 0, 1, 0.56]} width={WALL_W} height={WALL_H} position={[WALL_W / 2, WALL_H / 2, 0]} renderOrder={-90} />
  </group>
);
export const WALL_TOP = WALL_H - 6;

/** P4 floor plate, lying flat at y 0 from the wall to behind the camera. */
export const Floor = ({ z0 = -52, z1 = 24 }: { z0?: number; z1?: number }) => (
  <PlateAsset
    id="G06" plate={PLATE.style} crop={[0, 0.9, 1, 1]} width={170} height={z1 - z0}
    position={[0, 0, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-80}
  />
);

/** The whole cathedral: sky, wall, floor. */
export const Cathedral = ({ wallPitch = 0, sky }: { wallPitch?: number; sky?: [number, number, number, number] }) => (
  <>
    <Sky rect={sky} />
    <Wall pitch={wallPitch} />
    <Floor />
  </>
);
