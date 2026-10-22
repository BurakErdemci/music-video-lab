// The face and action boxes of the round-9 GIT! PUSH! FORCE! cards (BB1 braced against a blast from the left, BF2
// airborne, thrown right), measured on the cards viewed on a 0.05 grid (the face from the top of the head to the
// chin, hair excluded; the action box the alpha box without the hair). public/cards/frames.json belongs to another
// lane this round, so they are merged into the shared table when this family loads, as film/finale/frames.ts does.
import { CARD_FRAMES, type CardFrames } from '../framing.ts';
import pushFrames from './frames.json' with { type: 'json' };

for (const [id, fr] of Object.entries(pushFrames as unknown as Record<string, CardFrames>)) {
  // a measurement already in the shared table wins (frames.json is the source of truth once it holds them)
  if (!CARD_FRAMES[id]) CARD_FRAMES[id] = fr;
}
