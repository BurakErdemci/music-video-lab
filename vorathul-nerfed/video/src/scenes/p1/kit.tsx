// Shared machinery of lane p1: projection, code-drawn texture cards, the shot frame (roll, grade, print), and the
// small frame helpers every shot uses. Pure functions of the frame only.
import { useMemo, type ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { AbsoluteFill } from 'remotion';
import { DoubleSide, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, NormalBlending, TextureLoader, Color, type Texture } from 'three';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../cast/available.ts';
import { basis, type CameraPose } from '../../camera/api.ts';
import { DEFAULT_FOV } from '../../stage/Stage.tsx';
import type { Vec3 } from '../../stage/Card.tsx';
import { DuotoneFlash, PrintTexture, type DuotoneCue } from '../../vfx/effects.ts';

// ---- palette (storyboard 2 §3) ----
export const INK = '#0A0A0A';
export const IVORY = '#F4ECD8';
export const GOLD = '#E2B33C';
export const GOLD_DEEP = '#B8862A';
export const SKY = '#8EC5E8';
export const VIOLET = '#9B5CE0';
export const VIOLET_LIGHT = '#C9A2F4';
export const W = 1920;
export const H = 1080;

// ---- frame helpers ----
/** 2D overlays step on twos (scene-map rule): the frame they are drawn with. */
export const two = (f: number): number => f - (((f % 2) + 2) % 2);
export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** 0..1 progress of `frame` through [start, start + frames). */
export const prog = (frame: number, start: number, frames: number): number => clamp01((frame - start) / Math.max(1, frames));
export const outCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const inCubic = (t: number): number => clamp01(t) ** 3;
export const inOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
export const outBack = (t: number): number => {
  const x = clamp01(t) - 1;
  return 1 + 2.7 * x * x * x + 1.7 * x * x;
};
/** Value of the latest step at or before `frame`. */
export const stepVal = <T,>(frame: number, init: T, steps: readonly (readonly [number, T])[]): T => {
  let v = init;
  for (const [f, x] of steps) if (frame >= f) v = x;
  return v;
};
/** Number of the given frames already reached. */
export const count = (frame: number, frames: readonly number[]): number => frames.filter((f) => frame >= f).length;

// ---- projection (matches Stage's camera: lookAt with +Y up, vertical fov) ----
export interface Projected { x: number; y: number; /** px per world unit at this depth */ s: number; z: number }
export const project = (pose: CameraPose, p: Vec3): Projected => {
  const { fwd, right, up } = basis(pose.position, pose.target);
  const v: Vec3 = [p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]];
  const z = v[0] * fwd[0] + v[1] * fwd[1] + v[2] * fwd[2];
  const t = Math.tan(((pose.fov ?? DEFAULT_FOV) * Math.PI) / 360);
  const k = H / 2 / (Math.max(0.01, z) * t);
  return { x: W / 2 + (v[0] * right[0] + v[1] * right[1] + v[2] * right[2]) * k, y: H / 2 - (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) * k, s: k, z };
};

// ---- code-drawn texture cards ----
const configured = new WeakSet<Texture>();
const svgUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A texture rasterised from an SVG string (drawn in code, never a generated image). Suspends until decoded. */
export const useSvgTexture = (svg: string): Texture => {
  const url = useMemo(() => svgUrl(svg), [svg]);
  const tex = useLoader(TextureLoader, url);
  if (!configured.has(tex)) {
    configured.add(tex);
    // Raw values in, raw values out: the shader writes the SVG's own sRGB colours to the framebuffer.
    tex.colorSpace = NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = LinearMipmapLinearFilter;
    tex.magFilter = LinearFilter;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }
  return tex;
};

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = `
uniform sampler2D map; uniform float uAlpha; uniform vec3 flatCol; uniform float useFlat; uniform vec3 tint; uniform float tintMix;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vUv);
  if (useFlat > 0.5) { if (t.a < 0.5) discard; gl_FragColor = vec4(flatCol, uAlpha); return; }
  gl_FragColor = vec4(mix(t.rgb, tint, tintMix * t.a), t.a * uAlpha);
}`;
const hexColor = (hex: string): Color => {
  const n = parseInt(hex.slice(1), 16);
  return new Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export interface SvgCardProps {
  svg: string;
  width: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  /** Joint offset from the card centre, world units: rotation and scale happen around it. */
  pivot?: [number, number];
  opacity?: number;
  renderOrder?: number;
  hidden?: boolean;
  /** Impact-frame silhouette pass (storyboard 1 §0.2): the card is drawn as this flat colour. */
  flat?: string | null;
  /** Mixes a flat colour over the picture (fades, the office drain). */
  tint?: [string, number];
}

/** A flat unlit card whose picture is an SVG drawn in code. */
export const SvgCard = ({ svg, width, height, position, rotation, scale, pivot = [0, 0], opacity = 1, renderOrder, hidden, flat, tint }: SvgCardProps) => {
  const tex = useSvgTexture(svg);
  const uniforms = useMemo(
    () => ({ map: { value: tex }, uAlpha: { value: 1 }, flatCol: { value: new Color() }, useFlat: { value: 0 }, tint: { value: new Color() }, tintMix: { value: 0 } }),
    [tex],
  );
  uniforms.uAlpha.value = opacity;
  uniforms.useFlat.value = flat ? 1 : 0;
  uniforms.flatCol.value.copy(hexColor(flat ?? '#000000'));
  uniforms.tint.value.copy(hexColor(tint?.[0] ?? '#000000'));
  uniforms.tintMix.value = tint?.[1] ?? 0;
  return (
    <group position={position} rotation={rotation} scale={scale} visible={!hidden}>
      <mesh position={[-pivot[0], -pivot[1], 0]} renderOrder={renderOrder}>
        <planeGeometry args={[width, height]} />
        <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} transparent depthWrite={false} depthTest={false} blending={NormalBlending} side={DoubleSide} />
      </mesh>
    </group>
  );
};

/**
 * A storyboard asset. Once its final image is AVAILABLE it is drawn through AssetCard; until then its stand-in is a
 * flat palette drawing in code (the shape a flat colour card cannot give), placed and sized exactly like the image.
 */
export const Pic = ({ id, color, ...card }: SvgCardProps & { id: string; color: string }) => {
  if (AVAILABLE.has(id)) {
    const { svg: _svg, pivot = [0, 0], position, rotation, scale, flat: _flat, tint: _tint, ...rest } = card;
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <AssetCard id={id} standIn={{ color }} {...rest} position={[-pivot[0], -pivot[1], 0]} />
      </group>
    );
  }
  return <SvgCard {...card} />;
};

/** A flat coloured quad (code-drawn shapes: rays, panels, bands). */
export const Quad = ({ color, width, height, position, rotation, opacity = 1, renderOrder, hidden }: { color: string; width: number; height: number; position?: Vec3; rotation?: Vec3; opacity?: number; renderOrder?: number; hidden?: boolean }) => (
  <mesh position={position} rotation={rotation} renderOrder={renderOrder} visible={!hidden}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={false} side={DoubleSide} />
  </mesh>
);

// ---- SVG string helpers (textures are SVG text) ----
export const svgDoc = (w: number, h: number, body: string, defs = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
/** The dry-brush ink edge of vfx/style.tsx as an SVG string, for textures. */
export const inkFilterDef = (id: string, seed: number, rough: number, breakup = 0.15): string => {
  const cut = 0.776 - 0.2 * breakup;
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${seed % 997}" result="c"/>
<feDisplacementMap in="SourceGraphic" in2="c" scale="${rough}" xChannelSelector="R" yChannelSelector="G" result="d1"/>
<feTurbulence type="turbulence" baseFrequency="0.16" numOctaves="2" seed="${(seed + 7) % 997}" result="f"/>
<feDisplacementMap in="d1" in2="f" scale="${rough * 0.45}" xChannelSelector="G" yChannelSelector="B" result="d2"/>
<feTurbulence type="fractalNoise" baseFrequency="0.09 0.5" numOctaves="2" seed="${(seed + 13) % 997}" result="s"/>
<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -25 ${(25 * cut).toFixed(2)}" result="h"/>
<feComposite in="d2" in2="h" operator="in"/></filter>`;
};
export const r2 = (v: number): string => (Math.round(v * 10) / 10).toString();
export const poly = (pts: readonly (readonly [number, number])[]): string => `M${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L')}Z`;

// ---- the shot frame ----
export interface ShotFrameProps {
  frame: number;
  children: ReactNode;
  /** Duotone grade cues for this shot (built with gradeCues). */
  cues?: readonly DuotoneCue[];
  /** Screen roll in degrees (big impacts); the frame is scaled just enough to keep the corners covered. */
  roll?: number;
  /** Extra uniform zoom of the whole picture (comic punch-ins on 2D panels). */
  zoom?: number;
  background?: string;
  /** Paper grain on top; on by default. */
  print?: boolean;
  /** Layers drawn above the grade (HUD, captions): graded pictures keep their type legible. */
  over?: ReactNode;
}

/** Roll, grade and print for one shot. The HUD and captions sit above the grade, the paper grain above everything. */
export const ShotFrame = ({ frame, children, cues, roll = 0, zoom = 1, background = INK, print = true, over }: ShotFrameProps) => {
  const th = Math.abs((roll * Math.PI) / 180);
  const cover = Math.cos(th) + (W / H) * Math.sin(th);
  return (
    <AbsoluteFill style={{ background, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `rotate(${roll}deg) scale(${cover * zoom})` }}>
        {cues && cues.length ? <DuotoneFlash frame={frame} cues={cues} id="p1-grade">{children}</DuotoneFlash> : children}
        {over}
      </AbsoluteFill>
      {print ? <PrintTexture seed={11} /> : null}
    </AbsoluteFill>
  );
};
