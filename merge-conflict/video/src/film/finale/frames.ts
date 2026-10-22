// The face and action boxes of the round-8 cards (BP/OP piano, PB/PO/PBX/POX fusion, BH/OH metal moments, OS4,
// BS4 and their drawn in-betweens), measured on the cards (alpha box for the action, the face from the brows to
// the chin, viewed on a 0.02 grid). public/cards/frames.json belongs to another lane this round, so these are
// merged into the shared table when the finale loads: the live camera's framing guard, faceSized, the ripple mask
// and tools/framecheck.mjs (which bundles Film.tsx) all read CARD_FRAMES. Node-safe.
import { CARD_FRAMES, type CardFrames } from '../framing.ts';
import finaleFrames from './frames.json' with { type: 'json' };

for (const [id, fr] of Object.entries(finaleFrames as unknown as Record<string, CardFrames>)) {
  // a measurement already in the shared table wins (frames.json is the source of truth once it holds them)
  if (!CARD_FRAMES[id]) CARD_FRAMES[id] = fr;
}

export const FINALE_FRAMES = finaleFrames as unknown as Record<string, CardFrames>;
