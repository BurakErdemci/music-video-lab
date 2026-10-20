import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { LinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';

export type Vec3 = [number, number, number];

export interface CardProps {
  /** Path under public/ (resolved with staticFile). */
  src: string;
  /** Size in world units. */
  width: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  opacity?: number;
  /** Optional explicit draw order; by default transparent cards sort back to front by depth. */
  renderOrder?: number;
}

/**
 * Suspends until the image is decoded (R3F useLoader); @remotion/three holds the frame while the canvas is suspended,
 * so a frame is never captured with a missing card.
 */
export const useCardTexture = (src: string): Texture => {
  const texture = useLoader(TextureLoader, staticFile(src));
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  return texture;
};

/** A flat, unlit drawing on a plane. No lights, no tone mapping. */
export const Card = ({ src, width, height, position, rotation, scale, opacity = 1, renderOrder }: CardProps) => {
  const texture = useCardTexture(src);
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};
