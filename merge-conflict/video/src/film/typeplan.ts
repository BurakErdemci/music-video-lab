// The film's type plan: every sung line's designed form and window, section by section (scene-map.md "Type is
// the star again"). Data only; tools/typecheck.mjs reads it and the shots draw from the same entries.
import { CHORUS1 } from './chorus/plan.ts';
import { chorusType, type TypeEntry } from './chorus/typeplan.ts';

export const TYPE_PLAN: readonly TypeEntry[] = [...chorusType(CHORUS1)].sort((a, b) => a.t0 - b.t0);
