import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
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

/** Loads a texture and holds the render until it is decoded, so a frame never renders with a black card. */
export const useCardTexture = (src: string): Texture | null => {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    const handle = delayRender(`texture ${src}`);
    let live = true;
    new TextureLoader().load(
      staticFile(src),
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearFilter;
        tex.generateMipmaps = false;
        if (live) setTexture(tex);
        continueRender(handle);
      },
      undefined,
      (err) => cancelRender(err instanceof Error ? err : new Error(`texture ${src} failed to load`)),
    );
    return () => {
      live = false;
    };
  }, [src]);
  return texture;
};

/** A flat, unlit drawing on a plane. No lights, no tone mapping. */
export const Card = ({ src, width, height, position, rotation, scale, opacity = 1, renderOrder }: CardProps) => {
  const texture = useCardTexture(src);
  if (!texture) return null;
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};
