// The two new painting-world locations of part 1 (storyboard 03 §1-§3): the organ loft, Vorathul's home (S17-S24),
// and the cathedral rooftop under open sky (S25, Meteor Rain). Every layer is a frontal card at the depth of the
// storyboard 03 §2 table, drawn through AssetCard (final image, sized by height; flat palette stand-in before).
// Lane p2 builds its own rooftop at the same depths, so the two read as the same place.
import { useMemo } from 'react';
import { AdditiveBlending, DoubleSide } from 'three';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { assetSize } from '../../cast/available.ts';
import type { CameraPose } from '../../camera/api.ts';
import { useCardTexture, type Vec3 } from '../../stage/Card.tsx';
import { Glint } from './fx.tsx';
import { seeded } from '../../vfx/effects.ts';
import { GOLD, INK, inkFilterDef, IVORY, project, r2, SKY, SvgCard, svgDoc, two, VIOLET } from './kit.tsx';

/** Width the card takes once its final image is drawn (AssetCard keeps the image's aspect from the height). */
const wOf = (id: string, h: number, fallbackAspect = 1.5): number => {
  const s = assetSize(id);
  return s ? (h * s[0]) / s[1] : h * fallbackAspect;
};

/** A frontal layer card: bottom-anchored at y0, centred on x, optionally mirrored. */
const Layer = ({ id, color, h, x, y0, z, ro, mirror }: { id: string; color: string; h: number; x: number; y0: number; z: number; ro: number; mirror?: boolean }) => (
  <group position={[x, y0 + h / 2, z]} scale={mirror ? [-1, 1, 1] : 1}>
    <AssetCard id={id} standIn={{ color }} width={wOf(id, h)} height={h} renderOrder={ro} />
  </group>
);

/** LX-rays: painted halftone light on black, added to the picture (black adds nothing). Never a flat strip. */
const LightLayer = ({ position, height, opacity, ro }: { position: Vec3; height: number; opacity: number; ro: number }) => {
  const tex = useCardTexture('assets/LX-rays.png');
  const w = wOf('LX-rays', height);
  const mat = useMemo(() => ({ transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, side: DoubleSide }), []);
  return (
    <mesh position={position} renderOrder={ro}>
      <planeGeometry args={[w, height]} />
      <meshBasicMaterial map={tex} opacity={opacity} {...mat} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// L1 organ loft
// ---------------------------------------------------------------------------------------------------------------

/** The pipe wall: L1-wall-a | L1-wall-b edge to edge at P0, 70 units tall (pipe feet at 75 % = y 17.5). */
export const LOFT = { wallH: 70, wallZ: -80, feetY: 70 * 0.25 };
const WALL_W = wOf('L1-wall-a', LOFT.wallH);

/**
 * The loft floor, drawn in code like the nave floor: L1-floor is painted in its own perspective, so laid on the
 * ground plane it doubled the perspective and read as one flat gold sheet. Dark planks running away from the lens,
 * thin gold inlay strips, ivory dry-brush wear; the stage gives the real perspective.
 */
const FLOOR = { w: 180, d: 110 };
const LOFT_FLOOR_SVG = (() => {
  const pw = 4096;
  const ph = Math.round((pw * FLOOR.d) / FLOOR.w);
  const u = pw / FLOOR.w;
  const rng = seeded('p1-loft-floor');
  let body = `<rect width="${pw}" height="${ph}" fill="${INK}"/>`;
  for (let x = 0; x < pw; x += 2.2 * u) {
    body += `<rect x="${r2(x)}" y="0" width="${r2(2.2 * u - 6)}" height="${ph}" fill="#1A1714"/>`;
    if (Math.round(x / (2.2 * u)) % 4 === 0) body += `<rect x="${r2(x - 5)}" y="0" width="10" height="${ph}" fill="${GOLD}"/>`;
  }
  for (let i = 0; i < 140; i++) {
    const x = rng.range(0, pw);
    const y = rng.range(0, ph);
    body += `<path d="M${r2(x)} ${r2(y)}l${r2(rng.range(-3, 3))} ${r2(rng.range(60, 220))}" stroke="${IVORY}" stroke-width="${r2(rng.range(2, 6))}" opacity="0.55"/>`;
  }
  for (let y = 0; y < ph; y += 7 * u) body += `<rect x="0" y="${r2(y)}" width="${pw}" height="6" fill="${INK}"/>`;
  return svgDoc(pw, ph, `<g filter="url(#k)">${body}</g>`, inkFilterDef('k', 2601, 6, 0.3));
})();

export interface LoftProps {
  /** LX-rays strength (0 = no light layer). */
  light?: number;
}

export const OrganLoft = ({ light = 0 }: LoftProps) => (
  <>
    {/* P0: the 3072-wide pipe wall; it is wide enough that its sky-arched outer edges stay outside every p1 frame */}
    <Layer id="L1-wall-a" color={INK} h={LOFT.wallH} x={-WALL_W / 2 + 0.2} y0={0} z={LOFT.wallZ} ro={-200} />
    <Layer id="L1-wall-b" color={INK} h={LOFT.wallH} x={WALL_W / 2 - 0.2} y0={0} z={LOFT.wallZ} ro={-200} />
    {/* P4: the loft floor, laid on the ground plane from the wall to behind the cameras */}
    <SvgCard svg={LOFT_FLOOR_SVG} width={FLOOR.w} height={FLOOR.d} position={[0, 0, LOFT.wallZ + FLOOR.d / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-190} />
    {light > 0 ? <LightLayer position={[-8, 34, -60]} height={52} opacity={0.32 * light} ro={-185} /> : null}
    {/* P1: the console behind him */}
    <Layer id="L1-console" color={GOLD} h={24} x={0} y0={0} z={-50} ro={-180} />
    {/* P2: far copies of the near pipe cluster, scaled down */}
    <Layer id="L1-pipes-near" color={INK} h={34} x={-24} y0={0} z={-30} ro={-160} />
    <Layer id="L1-pipes-near" color={INK} h={34} x={24} y0={0} z={-30} ro={-160} mirror />
    {/* P5 / P6: the bellows prop and the near pipe clusters framing the shot */}
    <Layer id="L1-bellows" color={INK} h={4.6} x={11.5} y0={0} z={-4} ro={400} />
    <Layer id="L1-pipes-near" color={INK} h={22} x={-17.5} y0={0} z={-3} ro={410} />
    <Layer id="L1-pipes-near" color={INK} h={22} x={17.5} y0={0} z={-3} ro={410} mirror />
  </>
);

/** S22, the loft wakes up: the pipe mouths along the wall flare violet in a wave out from the centre. */
export const LoftWake = ({ frame, pose, start, span = 20 }: { frame: number; pose: CameraPose; start: number; span?: number }) => {
  if (frame < start || frame > start + span + 10) return null;
  const xs = Array.from({ length: 31 }, (_, i) => (i - 15) * 6.2);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {xs.map((x, i) => {
        const p = project(pose, [x, LOFT.feetY + 1.2, LOFT.wallZ + 0.1]);
        const at = start + Math.round((Math.abs(x) / 93) * span);
        return <Glint key={i} frame={two(frame)} at={at} x={p.x} y={p.y} size={p.s * 1.6} hold={false} color={VIOLET} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// L2 rooftop
// ---------------------------------------------------------------------------------------------------------------

const SKY_H = 80;
const SKY_W = wOf('L2-sky-a', SKY_H);
const LAND_H = 26;
const LAND_W = wOf('L2-land', LAND_H, 3.4);
const SPIRES_H = 40;
const SPIRES_W = wOf('L2-spires', SPIRES_H);
const ROOF_H = 56;
/** The walkway is a painted-perspective backdrop just behind him: its parapet (35 % from the top) sits at y 1.6. */
const ROOF_Y0 = 1.6 + 0.35 * ROOF_H - ROOF_H;

export const Rooftop = () => (
  <>
    {/* P0: the 3072-wide sky, with a mirrored repeat each side for the wide lenses */}
    {[-1, 0, 1, 2].map((k) => (
      <Layer key={`s${k}`} id={k % 2 ? 'L2-sky-b' : 'L2-sky-a'} color={SKY} h={SKY_H} x={(k - 0.5) * (SKY_W - 0.2)} y0={-12} z={-80} ro={-200 + k * 0.001} mirror={k === -1 || k === 2} />
    ))}
    {/* P0.5: the distant land below the roofline */}
    {[-1, 0, 1].map((k) => <Layer key={`l${k}`} id="L2-land" color={GOLD} h={LAND_H} x={k * (LAND_W - 0.2)} y0={-10} z={-65} ro={-195 + k * 0.001} mirror={k !== 0} />)}
    {/* P1: the roof skyline */}
    {[-1, 0, 1].map((k) => <Layer key={`p${k}`} id="L2-spires" color={INK} h={SPIRES_H} x={k * (SPIRES_W - 0.4)} y0={-6} z={-50} ro={-180 + k * 0.001} mirror={k !== 0} />)}
    {/* P2: flying buttresses, scaled down */}
    <Layer id="L2-buttress" color={IVORY} h={34} x={-23} y0={-2} z={-30} ro={-160} />
    <Layer id="L2-buttress" color={IVORY} h={34} x={23} y0={-2} z={-30} ro={-160} mirror />
    {/* P4: the walkway behind his feet */}
    <Layer id="L2-roof" color={GOLD} h={ROOF_H} x={0} y0={ROOF_Y0} z={-16} ro={-140} />
    {/* P5: the gargoyle prop, low left */}
    <Layer id="L2-gargoyle" color={IVORY} h={6} x={-19} y0={-6.5} z={-3} ro={400} />
  </>
);
