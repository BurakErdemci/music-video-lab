// The particle size cap (round 11, Burak via the architect: near confetti reached about 100x50 px at 1080p on RK11 and
// read as flat UI rectangles crossing the girls). Every point sprite in the film - field, drift, dissolve, embers,
// sparks - is drawn at most PARTICLE_MAX_PX on its longest side at 1080 lines, scaled with the canvas's real size.
// Every shader's gl_PointSize is min(<size>, uMaxPx); tools/particlecheck.mjs fails a shader that is not.
import { useThree } from '@react-three/fiber';

export const PARTICLE_MAX_PX = 28;
/** The cap in the canvas's own pixels (gl_PointSize units): 28 px at 1080 lines, more on a larger canvas. */
export const particleCapPx = (canvasHeightPx: number): number => (PARTICLE_MAX_PX * canvasHeightPx) / 1080;
/** The cap for the canvas this component draws in. */
export const useParticleCap = (): number => {
  const h = useThree((s) => s.size.height * s.viewport.dpr);
  return particleCapPx(h);
};
