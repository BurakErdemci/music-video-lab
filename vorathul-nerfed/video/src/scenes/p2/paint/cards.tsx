// Two card kinds the stage lacks: a code-drawn SVG texture (flat shapes the painting needs that no plate gives us)
// and a crop of an approved style frame. Both are flat, unlit and keep their texture loaded when hidden.
import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { DoubleSide, LinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { useCardTexture, type Vec3 } from '../../../stage/Card.tsx';

interface Place {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  opacity?: number;
  renderOrder?: number;
  hidden?: boolean;
}

const Quad = ({ map, width, height, position, rotation, scale, opacity = 1, renderOrder, hidden }: Place & { map: Texture; width: number; height: number }) => (
  <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder} visible={!hidden}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={map} toneMapped={false} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
  </mesh>
);

export const svgUri = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** An SVG document (must carry width/height attributes, in px) drawn on a card; the texture loads once per distinct string. */
export const SvgCard = ({ svg, width, height, ...place }: Place & { svg: string; width: number; height: number }) => {
  const texture = useLoader(TextureLoader, svgUri(svg));
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  return <Quad map={texture} width={width} height={height} {...place} />;
};

/** u0..u1 and v0..v1 are fractions of the image, v measured from the TOP. width/height are the card's world size. */
export const CropCard = ({ src, u0, u1, v0, v1, width, height, ...place }: Place & { src: string; u0: number; u1: number; v0: number; v1: number; width: number; height: number }) => {
  const base = useCardTexture(src);
  const map = useMemo(() => {
    const t = base.clone();
    t.colorSpace = SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = LinearFilter;
    t.repeat.set(u1 - u0, v1 - v0);
    t.offset.set(u0, 1 - v1);
    t.needsUpdate = true;
    return t;
  }, [base, u0, u1, v0, v1]);
  return <Quad map={map} width={width} height={height} {...place} />;
};
