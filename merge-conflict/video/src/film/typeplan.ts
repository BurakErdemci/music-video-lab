// The film's type plan: every sung line's designed form and window, section by section (scene-map.md "Type is
// the star again"). Data only; tools/typecheck.mjs reads it and the shots draw from the same entries.
import { CHORUS1, CHORUS2 } from './chorus/plan.ts';
import { REST_TYPE } from './rest/plan.ts';
import { chorusType, type TypeEntry } from './chorus/typeplan.ts';
import { INTRO_TYPE, VERSE_TYPE } from './verses/plan.ts';

export const TYPE_PLAN: readonly TypeEntry[] = [...INTRO_TYPE, ...VERSE_TYPE, ...chorusType(CHORUS1), ...REST_TYPE, ...chorusType(CHORUS2)].sort((a, b) => a.t0 - b.t0);
