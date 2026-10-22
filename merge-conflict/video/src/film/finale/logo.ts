// The logo move at 176.80 s in its resolved form (scene-map.md: "at 176.80 s the same move returns resolved"): the
// two halves fly in from 1300 px off frame as in every chorus, and on "conflict" they lock joined instead of shoving
// apart again. Node-safe: the shot (the girls riding the halves) and the type share it.
import { clamp01, outQuad } from '../../lib/ease.ts';
import { tk } from './plan.ts';

export const MERGE_AT: readonly [number, number] = [tk(60, 0), tk(60, 1)];
export const logoIn = (t: number): number => (t < MERGE_AT[1] ? 1300 * (1 - outQuad(clamp01((t - MERGE_AT[0]) / (MERGE_AT[1] - MERGE_AT[0])))) : 0);
