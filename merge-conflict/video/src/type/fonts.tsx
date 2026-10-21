// Local fonts for every type layer (architecture.md: all fonts are local; public/fonts/FONTS.md lists them
// and their OFL licences), held with delayRender until loaded. Letter geometry comes from measured advances
// (tools/font_metrics.py -> metrics.json), never from the DOM.
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import metrics from './metrics.json' with { type: 'json' };

/** Face keys: 'display' is Anton and 'mono' is IBM Plex Mono (the first engine's names). */
export type Face = 'display' | 'mono' | 'bebas' | 'bungee' | 'monoton' | 'shrikhand' | 'righteous' | 'jetbrains';

const FAMILY: Record<Face, { css: string; file: string; weight: string; metric: keyof typeof metrics | null }> = {
  display: { css: 'MCAnton', file: 'Anton-Regular.ttf', weight: '400', metric: 'anton' },
  mono: { css: 'MCPlexMono', file: 'IBMPlexMono-Medium.ttf', weight: '500', metric: null },
  bebas: { css: 'MCBebas', file: 'BebasNeue-Regular.ttf', weight: '400', metric: 'bebas' },
  bungee: { css: 'MCBungee', file: 'Bungee-Regular.ttf', weight: '400', metric: 'bungee' },
  monoton: { css: 'MCMonoton', file: 'Monoton-Regular.ttf', weight: '400', metric: 'monoton' },
  shrikhand: { css: 'MCShrikhand', file: 'Shrikhand-Regular.ttf', weight: '400', metric: 'shrikhand' },
  righteous: { css: 'MCRighteous', file: 'Righteous-Regular.ttf', weight: '400', metric: 'righteous' },
  jetbrains: { css: 'MCJetBrains', file: 'JetBrainsMono-Variable.ttf', weight: '100 800', metric: 'jetbrains' },
};

export const familyOf = (face: Face): string => `'${FAMILY[face].css}', ${face === 'mono' || face === 'jetbrains' ? 'monospace' : 'sans-serif'}`;
export const DISPLAY = familyOf('display');
export const MONO = familyOf('mono');
export const SANS = "'MCInter', system-ui, sans-serif";

const css = (): string =>
  [
    ...Object.values(FAMILY).map((f) => `@font-face { font-family: '${f.css}'; src: url('${staticFile(`fonts/${f.file}`)}') format('truetype'); font-weight: ${f.weight}; }`),
    `@font-face { font-family: 'MCInter'; src: url('${staticFile('fonts/Inter-Variable.ttf')}') format('truetype'); font-weight: 100 900; }`,
  ].join('\n');

export const Fonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([...Object.values(FAMILY).map((f) => document.fonts.load(`40px '${f.css}'`)), document.fonts.load("800 40px 'MCInter'"), document.fonts.load("800 40px 'MCJetBrains'")])
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
  return <style>{css()}</style>;
};

export const MONO_ADV = 0.6;
const M = metrics as Record<string, { cap: number; adv: Record<string, number> }>;
/** Cap height in em of a face. */
export const capOf = (face: Face): number => {
  const k = FAMILY[face].metric;
  return k ? (M[k] as { cap: number }).cap : 0.7;
};
export const CAP = capOf('display');
const advOf = (face: Face, ch: string): number | undefined => {
  const k = FAMILY[face].metric;
  return k ? (M[k] as { adv: Record<string, number> }).adv[ch] : MONO_ADV;
};
const isMono = (face: Face) => face === 'mono' || face === 'jetbrains';

/** x of each letter's left edge, each advance and the total width, in px, at `size` px with `track` em extra. */
export const layout = (text: string, size: number, face: Face = 'display', track = isMono(face) ? 0 : 0.02): { xs: number[]; ws: number[]; width: number } => {
  const xs: number[] = [];
  const ws: number[] = [];
  let x = 0;
  for (const ch of text) {
    const a = advOf(face, ch);
    if (a === undefined) throw new Error(`type: no advance for "${ch}" in metrics.json (${face})`);
    xs.push(x);
    ws.push(a * size);
    x += (a + track) * size;
  }
  return { xs, ws, width: Math.max(0, x - track * size) };
};
/** Width in px of a text set at `size` px. */
export const widthOf = (text: string, size: number, face: Face = 'display', track?: number): number => layout(text, size, face, track).width;
