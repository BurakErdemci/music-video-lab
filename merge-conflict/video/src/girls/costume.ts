// The costume belongs to the girl (scene-map.md, Burak 2026-10-21): blue = the disco girl, orange = the metal
// girl, with places where both are metal. The metal amount (metal/metal.ts) drives only the SET; the costume is
// this per-girl schedule. Boundaries are written in seconds (take-v4) as in the scene map and checked at load
// against the measured section starts and the measured "ORANGE!" shout, to one 60 fps frame.
// Erasable TypeScript only: node tests it in tools/gridcheck.mjs.
import { DURATION_SEC, f, sections, words } from '../timing.ts';

export type Form = 'disco' | 'metal' | 'plain' | 'mix';
export interface CostumeSpan {
  from: number;
  to: number;
  form: Form;
  /** not on screen in this span */
  hidden?: boolean;
  /** shown only as a backlit silhouette (outline, no costume detail): a foreshadowing */
  glimpse?: boolean;
  /** the measured point the start is checked against: a section name, or "word:<text>#<nth>" */
  at: string;
}
export type Girl = 'B' | 'O';

export const COSTUME: Record<Girl, readonly CostumeSpan[]> = {
  B: [
    { from: 0, to: 4.37, form: 'disco', at: 'intro_robot' },
    // the groove is all metal and hers is not shown (scene-map.md, 23d272a): she enters on the verse downbeat
    { from: 4.37, to: 16.33, form: 'disco', hidden: true, at: 'intro_groove' },
    { from: 16.33, to: 117.36, form: 'disco', at: 'verse1_sweet' },
    { from: 117.36, to: 140.04, form: 'metal', at: 'scream' },
    { from: 140.04, to: 160.06, form: 'plain', at: 'piano_interlude' },
    { from: 160.06, to: 181.44, form: 'mix', at: 'final_chorus' },
    { from: 181.44, to: DURATION_SEC, form: 'metal', at: 'post_chorus_chant' },
  ],
  O: [
    { from: 0, to: 4.37, form: 'disco', hidden: true, at: 'intro_robot' },
    { from: 4.37, to: 16.33, form: 'metal', glimpse: true, at: 'intro_groove' },
    { from: 16.33, to: 40.58, form: 'disco', at: 'verse1_sweet' },
    { from: 40.58, to: 140.04, form: 'metal', at: 'word:orange#3' },
    { from: 140.04, to: 160.06, form: 'plain', at: 'piano_interlude' },
    { from: 160.06, to: 181.44, form: 'mix', at: 'final_chorus' },
    { from: 181.44, to: DURATION_SEC, form: 'metal', at: 'post_chorus_chant' },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const measured = (at: string): number => {
  if (at.startsWith('word:')) {
    const [text, nth] = at.slice(5).split('#');
    const hits = words.filter((w) => norm(w.w) === norm(text as string));
    const w = hits[Number(nth ?? 0)];
    if (!w) throw new Error(`costume: no measured word ${at}`);
    return w.s;
  }
  const s = sections.find((x) => x.name === at);
  if (!s) throw new Error(`costume: no section ${at}`);
  return s.start;
};
for (const [girl, spans] of Object.entries(COSTUME)) {
  spans.forEach((s, i) => {
    if (Math.abs(f(s.from) - f(measured(s.at))) > 1) throw new Error(`costume ${girl}: span ${i} starts at ${s.from} s but ${s.at} is measured at ${measured(s.at).toFixed(2)} s`);
    const next = spans[i + 1];
    if (next && next.from !== s.to) throw new Error(`costume ${girl}: span ${i} ends at ${s.to}, the next starts at ${next.from}`);
  });
}

/** The costume span of a girl at t (a span owns the 60 fps frame it starts on). */
export const costumeAt = (girl: Girl, t: number): CostumeSpan => {
  const spans = COSTUME[girl];
  return [...spans].reverse().find((s) => f(t) >= f(s.from)) ?? (spans[0] as CostumeSpan);
};

export type Family = 'pop' | 'metal';
/** The type family of a line: a solo line takes its singer's costume (mix: the set's metal amount decides,
 *  passed in), a duet line takes the set's metal amount. */
export const familyFor = (singer: Girl | 'both', t: number, setMetal: number): Family => {
  if (singer === 'both') return setMetal >= 0.55 ? 'metal' : 'pop';
  const c = costumeAt(singer, t);
  if (c.form === 'metal') return 'metal';
  if (c.form === 'mix') return setMetal >= 0.55 ? 'metal' : 'pop';
  return 'pop';
};
