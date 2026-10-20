import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { Color, DoubleSide, LinearFilter, NoBlending, NormalBlending, SRGBColorSpace, TextureLoader, type Texture } from 'three';

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
  /** Hides the card without unmounting it (its texture stays loaded, so a later swap never suspends). */
  hidden?: boolean;
  /**
   * ID pass for measurement: the card is drawn as a flat colour (any CSS hex, written to the framebuffer
   * unconverted) wherever texture alpha x opacity >= 0.5; no blending, so ID pixels are exact.
   */
  idColor?: string;
  /**
   * Missing-texture checkerboard (#E0129A / #0A0A0A) drawn through the texture's alpha. Cells are counted in
   * texture space, so the pattern turns and stretches with the part.
   */
  checker?: { cellsX: number; cellsY: number };
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

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// Raw output on purpose: ShaderMaterial skips the sRGB output conversion, so a colour written here is the framebuffer value.
const FRAG = `
uniform sampler2D map; uniform float uAlpha; uniform vec3 idColor; uniform vec3 magenta; uniform vec3 ink;
uniform vec2 cells; uniform float useId; uniform float useChecker;
varying vec2 vUv;
void main() {
  float a = texture2D(map, vUv).a * uAlpha;
  vec3 col = idColor;
  if (useChecker > 0.5) {
    vec2 c = floor(vUv * cells);
    col = mod(c.x + c.y, 2.0) < 0.5 ? magenta : ink;
  }
  if (useId > 0.5) { if (a < 0.5) discard; gl_FragColor = vec4(col, 1.0); }
  else { gl_FragColor = vec4(col, a); }
}`;

const rawColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Flat-shader variants of a card (ID pass, checkerboard). Plain cards keep the original MeshBasicMaterial path. */
const FlatMaterial = ({ texture, opacity, idColor, checker }: { texture: Texture; opacity: number; idColor?: string; checker?: CardProps['checker'] }) => {
  const uniforms = useMemo(
    () => ({
      map: { value: texture }, uAlpha: { value: 1 }, idColor: { value: new Color() }, magenta: { value: rawColor('#E0129A') },
      ink: { value: rawColor('#0A0A0A') }, cells: { value: [1, 1] }, useId: { value: 0 }, useChecker: { value: 0 },
    }),
    [texture],
  );
  uniforms.uAlpha.value = opacity;
  uniforms.idColor.value.copy(rawColor(idColor ?? '#000000'));
  uniforms.cells.value = checker ? [checker.cellsX, checker.cellsY] : [1, 1];
  uniforms.useId.value = idColor ? 1 : 0;
  uniforms.useChecker.value = checker ? 1 : 0;
  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={VERT}
      fragmentShader={FRAG}
      transparent
      blending={idColor ? NoBlending : NormalBlending}
      depthWrite={false}
      side={DoubleSide}
    />
  );
};

/** A flat, unlit drawing on a plane. No lights, no tone mapping. DoubleSide so a scale.x = -1 (mirrored) parent never hides it. */
export const Card = ({ src, width, height, position, rotation, scale, opacity = 1, renderOrder, hidden, idColor, checker }: CardProps) => {
  const texture = useCardTexture(src);
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder} visible={!hidden}>
      <planeGeometry args={[width, height]} />
      {idColor || checker ? (
        <FlatMaterial texture={texture} opacity={opacity} idColor={idColor} checker={checker} />
      ) : (
        <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
      )}
    </mesh>
  );
};
