// Which layer of the film a render draws (round 7c, the type check): 'all' is the film; 'type' draws only the type
// over a transparent background (no Stage, no transitions, no white-outs); 'world' draws everything but the SVG
// layers. tools/framecheck.mjs --type renders both at sampled frames to measure the type's box and contrast.
import { createContext, useContext } from 'react';

export type Layer = 'all' | 'type' | 'world';
export const LayerContext = createContext<Layer>('all');
export const useLayer = (): Layer => useContext(LayerContext);
/** A shot's full-frame background: black, or transparent when only the type is drawn. */
export const useShotBackground = (): string => (useLayer() === 'type' ? 'transparent' : '#000');
