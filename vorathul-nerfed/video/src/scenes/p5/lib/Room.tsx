// The office room used by the p5 shots: wall, ceiling, floor (gold tile wave), desks with monitors and chairs.
import { AssetCard } from '../../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../../cast/available.ts';
import { PlateCard } from './PlateCard.tsx';
import type { Vec3 } from '../../../stage/Card.tsx';
import type { ReactNode } from 'react';
import { Ceiling, Chair, Desk, Floor, LightStrip, Monitor3D, O, PaintDecal, Panel, Rect, Wall, PAINT_Z, WALL_Z } from './Office.tsx';
import { OFFICE_FLOOR } from './vorathul.ts';

const F = OFFICE_FLOOR;
const PLATE01 = '01-tarz-cizgi-roman.jpg';

/** The office before the ruin: desks left and right, monitors, chairs, light strips. */
export const Room = ({ wave = 0, centre, desks, ceiling = true, strips = true, wallTop }: { wave?: number; centre?: [number, number]; desks?: (i: number) => { off?: Vec3; rot?: Vec3; hidden?: boolean }; ceiling?: boolean; strips?: boolean; wallTop?: number }) => {
  const D: Vec3[] = [[-11.5, F, -13], [-10.5, F, -6.5], [11.5, F, -13], [10.5, F, -6.5]];
  return (
    <>
      <Wall top={wallTop} />
      <Ceiling hidden={!ceiling} />
      <Floor wave={wave} centre={centre} />
      {strips ? [-14, -4, 6].map((z, i) => <LightStrip key={i} at={[0, 4.9, z]} len={12} />) : null}
      {D.map((at, i) => {
        const m = desks?.(i) ?? {};
        if (m.hidden) return null;
        return (
          <group key={i}>
            <Desk at={at} off={m.off} rot={m.rot} />
            <Monitor3D at={[at[0] + (at[0] < 0 ? 0.6 : -0.6) + (m.off?.[0] ?? 0), at[1] + 2.2 + (m.off?.[1] ?? 0) * 1.4, at[2] - 0.7 + (m.off?.[2] ?? 0)]} rot={m.rot ? [m.rot[0] * 1.5, m.rot[1], m.rot[2] * 1.8] : undefined} screen={i % 2 ? O.white : O.blue}>
              <Rect w={1.3} h={0.14} at={[-0.2, 0.3, 0]} color={O.mid} />
              <Rect w={0.9} h={0.14} at={[-0.4, 0.05, 0]} color={O.mid} />
            </Monitor3D>
            <Chair at={[at[0] + (at[0] < 0 ? 1.4 : -1.4), F, at[2] + 1.6]} size={2.3} />
          </group>
        );
      })}
    </>
  );
};

/** The empty painted world behind the breach. It must never show the old painting with him in it (he is out). */
// L4-painting-empty is the drained cathedral with no figure; its 3:2 image is cropped to the 16:9 centre
// (empty bands top and bottom). L3-wall-ruin stands in until it is live.
export const EMPTY_PAINTING = 'L4-painting-empty';
export const Inside = () =>
  AVAILABLE.has(EMPTY_PAINTING) ? (
    <PlateCard plate={`assets/${EMPTY_PAINTING}.png`} crop={[0, 80, 1536, 864]} width={26.7} height={15} position={[0, 0, -27]} />
  ) : (
    <AssetCard id="L3-wall-ruin" standIn={{ src: `plates/${PLATE01}` }} width={33} height={22} position={[-1, 1, -27]} />
  );

/** Paper patch-note print-outs pinned to the canvas rim (C40-style office paper). */
export const PinnedCards = ({ at, scale, rot }: { at: (i: number) => Vec3; scale?: (i: number) => number; rot?: (i: number) => number }) => (
  <>
    {[0, 1, 2].map((i) => (
      <group key={i} position={at(i)} rotation={[0, 0, rot?.(i) ?? 0]} scale={scale?.(i) ?? 1}>
        <Panel w={1.4} h={1.8} at={[0, 0, 0]} fill={O.white} />
        <Rect w={1.0} h={0.12} at={[0, 0.6, 0.01]} color={O.blue} />
        {[0, 1, 2, 3].map((k) => <Rect key={k} w={1.05 - (k % 2) * 0.3} h={0.07} at={[-0.02 - (k % 2) * 0.15, 0.25 - k * 0.27, 0.01]} color={O.dark} />)}
        <Rect w={0.18} h={0.18} at={[0, 0.82, 0.02]} color={O.blue} />
      </group>
    ))}
  </>
);


/**
 * The office after the breakout: the floor is his gold tile, the empty frame shows his world, and ink and gold
 * paint run down the wall under the breach and pool on the floor. `extra` = shot props on the same stage.
 */
export const AfterRoom = ({ desks, ceiling = true, strips = true, wallTop, floorPaint = true, topPaint = true, children }: { desks?: (i: number) => { off?: Vec3; rot?: Vec3; hidden?: boolean }; ceiling?: boolean; strips?: boolean; wallTop?: number; floorPaint?: boolean; topPaint?: boolean; children?: ReactNode }) => (
  <>
    <Room wave={80} centre={[-3, -10]} desks={desks} ceiling={ceiling} strips={strips} wallTop={wallTop} />
    <Inside />
    {/* Drips end above the skirting: a decal running below the floor line showed as a black blob at low cameras. */}
    <PaintDecal at={[-5.5, -3.4, WALL_Z + 0.06]} w={7} h={5} seed={21} drips order={40} />
    <PaintDecal at={[4.5, -3.4, WALL_Z + 0.06]} w={6} h={5} seed={22} drips order={41} />
    {topPaint ? <PaintDecal at={[0.5, 5.6, WALL_Z + 0.06]} w={9} h={4} seed={23} order={42} /> : null}
    {floorPaint ? (
      <>
        <PaintDecal at={[-1.2, F + 0.02, -16.5]} rot={[-Math.PI / 2, 0, 0]} w={15} h={7} seed={92} order={43} />
        <PaintDecal at={[-8.6, F + 0.03, -12.2]} rot={[-Math.PI / 2, 0, 0]} w={6.5} h={3.2} seed={93} order={44} />
        <PaintDecal at={[7.6, F + 0.03, -12.6]} rot={[-Math.PI / 2, 0, 0]} w={6} h={3} seed={94} order={45} />
      </>
    ) : null}
    {children}
  </>
);
