import type { ReactNode } from 'react';
import { Card, type CardProps, type Vec3 } from './Card.tsx';

export interface PartProps extends Omit<CardProps, 'position'> {
  /** Joint position in the parent's space. */
  position?: Vec3;
  /** Joint offset from the card centre, in card world units; rotation happens around this point. */
  pivot?: [number, number];
  /** Child parts live in joint space (they rotate and scale with this part). */
  children?: ReactNode;
}

/** A card that rotates around a joint; nest Parts to build a cut-out rig. */
export const Part = ({ position, rotation, scale, pivot = [0, 0], children, ...card }: PartProps) => (
  <group position={position} rotation={rotation} scale={scale}>
    <Card {...card} position={[-pivot[0], -pivot[1], 0]} />
    {children}
  </group>
);
