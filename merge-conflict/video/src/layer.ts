// Which layer of the film a render draws (round 7c, the type check): 'all' is the film; 'type' draws only the type
// over a transparent background (no Stage, no transitions, no white-outs); 'world' draws everything but the SVG
// layers; 'set' draws the world without the girls too (round 11d: tools/framecheck.mjs --set measures whether the
// set covers the frame). tools/framecheck.mjs --type renders 'type' and 'world' to measure the type's box and contrast.
import { createContext, useContext } from 'react';

export type Layer = 'all' | 'type' | 'world' | 'set' | 'setkey' | 'worldkey';
/** The set alone: no girls, no type ('setkey' also keys the dark backdrops, so framecheck --set can tell them apart). */
export const isSetLayer = (l: Layer): boolean => l === 'set' || l === 'setkey';
/** The worlds' dark backdrops (the "no set" fill) drawn in the key magenta: 'setkey', and 'worldkey' (the world with
 *  the girls, as the frame shows it), each compared by framecheck --set with its plain twin. */
export const isKeyed = (l: Layer): boolean => l === 'setkey' || l === 'worldkey';
/** No SVG (type, covers, overlays) in these layers. */
export const isWorldLayer = (l: Layer): boolean => l === 'world' || l === 'worldkey' || isSetLayer(l);
export const LayerContext = createContext<Layer>('all');
export const useLayer = (): Layer => useContext(LayerContext);
/** One type-plan entry drawn alone (round 9, tools/framecheck.mjs --type's overlap check): its id, '__none__' for no
 *  entry (what is left is the type outside the plan: HUDs, the GIT! PUSH! FORCE! words), null for every entry. */
export const TypeOnlyContext = createContext<string | null>(null);
export const useTypeOnly = (): string | null => useContext(TypeOnlyContext);
/** Whether a type-plan entry is drawn under the current TypeOnlyContext. */
export const typeShown = (only: string | null, id: string): boolean => only === null || only === id;
/** A shot's full-frame background: black; transparent when only the type is drawn; the key magenta in 'setkey', so
 *  every pixel the set leaves to its dark backdrop shows it there (framecheck --set compares it with 'set'). */
export const SET_KEY = '#ff00ff';
export const useShotBackground = (): string => {
  const layer = useLayer();
  return layer === 'type' ? 'transparent' : isKeyed(layer) ? SET_KEY : '#000';
};
