import type { ComponentType } from 'react';

/** One storyboard shot: frames [from, to) of the film. The component gets the absolute film frame. */
export interface Shot {
  id: string;
  from: number;
  to: number;
  Component: ComponentType<{ frame: number }>;
}

/** Each part lane owns one contiguous frame range (scene lanes contract, src/scenes/README.md). */
export const PART_RANGES = {
  p1: [0, 1850],
  p2: [1850, 3000],
  p3: [3000, 5140],
  p4: [5140, 6680],
  p5: [6680, 8215],
} as const;
