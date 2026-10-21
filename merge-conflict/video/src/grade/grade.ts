// Per-shot grade (architecture.md "grade/"): one saturated hue per shot, the rival's colour as the cutting
// light. Cards tint toward `hue` and take a `rival` rim from their alpha gradient; plates and the code-built
// set take the tint without the rim. All colours are raw (gamma-encoded) values: the stage renders flat
// and linear, so a value written by a shader is the framebuffer value.
import { type Hex, mixHex, rgb } from '../lib/ease.ts';

export interface Grade {
  /** The shot's hue: background, particles and the card tint pull toward it. */
  hue: Hex;
  /** The rival colour: the rim light that cuts into the card. */
  rival: Hex;
  /** 0..1, how far painted colour is pulled toward `hue` (luminance kept). */
  amount: number;
  /** Rim strength, 0..2. */
  rim: number;
  /** Background brightness, 0 = black stage. */
  stage: number;
}

export const ORANGE: Hex = '#ff7a1a';
export const BLUE: Hex = '#2f7bff';
export const CYAN: Hex = '#19c8ff';
export const MAGENTA: Hex = '#ff2a9a';
export const WHITE: Hex = '#ffffff';
/** The riot palette for confetti: saturated, built on the orange-vs-blue clash, not limited to it. */
export const RIOT: readonly Hex[] = ['#ff7a1a', '#2f7bff', '#ff2a9a', '#19c8ff', '#ffd23a', '#b04dff', '#ff3b3b', '#3dff9a'];

export const GRADES = {
  /** Before the riff burst: black stage, only the white spotlight. */
  black: { hue: '#5a2a8a', rival: WHITE, amount: 0, rim: 0, stage: 0 },
  /** The Mainline after the burst: magenta (the approved F5 look). */
  mainline: { hue: MAGENTA, rival: CYAN, amount: 0.32, rim: 1.2, stage: 1 },
  /** Verse 1, the Reviewed Stage: cyan / electric blue, orange cuts in. */
  reviewed: { hue: '#1a8cff', rival: ORANGE, amount: 0.38, rim: 1.35, stage: 1 },
} as const satisfies Record<string, Grade>;

/** The rim colour a girl takes is the other girl's colour. */
export const rivalOf = (girl: 'B' | 'O'): Hex => (girl === 'B' ? ORANGE : BLUE);

export const gradeUniform = (g: Grade) => ({ hue: rgb(g.hue), rival: rgb(g.rival), amount: g.amount, rim: g.rim, stage: g.stage });

/**
 * GLSL shared by cards, dissolve points and plates: pull a colour toward the hue, keeping its luminance
 * so the painting's detail survives the tint.
 */
export const GRADE_GLSL = /* glsl */ `
vec3 gradeTint(vec3 c, vec3 hue, float amount) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float hl = max(dot(hue, vec3(0.299, 0.587, 0.114)), 0.08);
  vec3 tinted = clamp(hue * (l / hl) * 0.9 + c * 0.1, 0.0, 1.0);
  return mix(c, tinted, amount);
}
`;

/** The metal grade (scene-map.md pop-metal blend): black stage, red light, steel as the cutting rim. */
export const METAL_GRADE: Grade = { hue: '#c81414', rival: '#d8dee6', amount: 0.42, rim: 1.4, stage: 0.85 };
/** Slide a shot's grade toward the metal grade by the metal amount m (0..1). */
export const metalGrade = (g: Grade, m: number): Grade => ({
  hue: mixHex(g.hue, METAL_GRADE.hue, m),
  rival: mixHex(g.rival, METAL_GRADE.rival, m),
  amount: g.amount + (METAL_GRADE.amount - g.amount) * m,
  rim: g.rim + (METAL_GRADE.rim - g.rim) * m,
  stage: g.stage + (METAL_GRADE.stage - g.stage) * m,
});
