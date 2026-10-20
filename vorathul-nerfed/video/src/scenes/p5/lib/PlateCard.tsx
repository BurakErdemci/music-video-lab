// Stand-ins cut from the approved frames in public/plates/: a card that shows one crop of a plate, optionally
// keyed (office cut-outs lose their pale wall; painted figures keep only their ink and violet). When the final
// image of the asset id lands in AVAILABLE, the regular AssetCard draws it instead (same size and place).
import { useMemo } from 'react';
import { DoubleSide, type Texture } from 'three';
import { AssetCard } from '../../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../../cast/available.ts';
import { useCardTexture, type Vec3 } from '../../../stage/Card.tsx';

export type Key = 'none' | 'light' | 'ink';
export interface PlateCrop {
  plate: string;
  /** Crop box in source px [x, y, w, h] (the approved frames are 1536 x 1024). */
  crop: [number, number, number, number];
  keying?: Key;
}

const SRC_W = 1536;
const SRC_H = 1024;

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// The texture is sRGB (decoded to linear on sampling) and ShaderMaterial writes raw values, so encode back to sRGB.
const FRAG = `
uniform sampler2D map; uniform vec4 rect; uniform float keyMode; uniform vec3 tint; uniform float flipX;
varying vec2 vUv;
vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 uv = vec2(mix(rect.x, rect.z, flipX > 0.5 ? 1.0 - vUv.x : vUv.x), mix(rect.y, rect.w, vUv.y));
  vec3 c = enc(texture2D(map, uv).rgb);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float mx = max(c.r, max(c.g, c.b)); float mn = min(c.r, min(c.g, c.b));
  float sat = mx - mn;
  if (keyMode > 0.5 && keyMode < 1.5) { if (l > 0.84 && sat < 0.09) discard; }
  if (keyMode > 1.5) {
    bool violet = c.b > c.g + 0.18 && c.r > c.g + 0.05;
    if (!(l < 0.2 || violet)) discard;
    if (!violet) c = vec3(0.039);
  }
  gl_FragColor = vec4(c * tint, 1.0);
}`;

const KeyedMaterial = ({ texture, rect, keyMode, tint, flipX }: { texture: Texture; rect: [number, number, number, number]; keyMode: number; tint: [number, number, number]; flipX: boolean }) => {
  const uniforms = useMemo(() => ({ map: { value: texture }, rect: { value: [0, 0, 1, 1] }, keyMode: { value: 0 }, tint: { value: [1, 1, 1] }, flipX: { value: 0 } }), [texture]);
  uniforms.rect.value = rect;
  uniforms.keyMode.value = keyMode;
  uniforms.tint.value = tint;
  uniforms.flipX.value = flipX ? 1 : 0;
  return <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} side={DoubleSide} />;
};

export interface PlateCardProps extends PlateCrop {
  /** World width; height follows the crop's aspect unless given. */
  width: number;
  height?: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  renderOrder?: number;
  hidden?: boolean;
  flipX?: boolean;
  /** Multiplies the colour (e.g. [0.8, 0.8, 0.85] to sink a figure into the background). */
  tint?: [number, number, number];
}

/** One plate crop on the stage. Opaque with depth (keyed pixels are discarded), so it occludes like a real cut-out. */
export const PlateCard = ({ plate, crop, keying = 'none', width, height, position, rotation, scale, renderOrder, hidden, flipX = false, tint = [1, 1, 1] }: PlateCardProps) => {
  // `plate` is a file in public/plates/, or a public/assets/ path for a crop of a final image.
  const texture = useCardTexture(plate.startsWith('assets/') ? plate : `plates/${plate}`);
  const [x, y, w, h] = crop;
  const rect: [number, number, number, number] = [x / SRC_W, 1 - (y + h) / SRC_H, (x + w) / SRC_W, 1 - y / SRC_H];
  const hh = height ?? (width * h) / w;
  const mode = keying === 'light' ? 1 : keying === 'ink' ? 2 : 0;
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={renderOrder} visible={!hidden}>
      <planeGeometry args={[width, hh]} />
      <KeyedMaterial texture={texture} rect={rect} keyMode={mode} tint={tint} flipX={flipX} />
    </mesh>
  );
};

export interface AssetProps extends Omit<PlateCardProps, keyof PlateCrop> {
  /** Storyboard asset id. */
  id: string;
  standIn: PlateCrop;
}

/** A storyboard asset: its final image once AVAILABLE, the plate crop stand-in before that. */
export const Asset = ({ id, standIn, ...card }: AssetProps) => {
  if (AVAILABLE.has(id)) {
    const hh = card.height ?? (card.width * standIn.crop[3]) / standIn.crop[2];
    return <AssetCard id={id} standIn={{ color: '#000' }} width={card.width} height={hh} position={card.position} rotation={card.rotation} scale={card.scale} renderOrder={card.renderOrder} hidden={card.hidden} />;
  }
  return <PlateCard {...standIn} {...card} />;
};
