// Local fonts for every type layer (architecture.md: all fonts are local), held with delayRender until
// loaded. Letter geometry comes from measured advances (tools/font_metrics.py), never from the DOM.
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import metrics from './anton-metrics.json' with { type: 'json' };

export const DISPLAY = "'MCAnton', Impact, sans-serif";
export const MONO = "'MCPlexMono', monospace";
export const SANS = "'MCInter', system-ui, sans-serif";

const css = (): string => `
@font-face { font-family: 'MCAnton'; src: url('${staticFile('fonts/Anton-Regular.ttf')}') format('truetype'); font-weight: 400; }
@font-face { font-family: 'MCPlexMono'; src: url('${staticFile('fonts/IBMPlexMono-Medium.ttf')}') format('truetype'); font-weight: 500; }
@font-face { font-family: 'MCInter'; src: url('${staticFile('fonts/Inter-Variable.ttf')}') format('truetype'); font-weight: 100 900; }`;

export const Fonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([document.fonts.load("400 40px 'MCAnton'"), document.fonts.load("500 40px 'MCPlexMono'"), document.fonts.load("800 40px 'MCInter'")])
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
  return <style>{css()}</style>;
};

const ADV = metrics.adv as Record<string, number>;
export const CAP = metrics.cap;
export const MONO_ADV = 0.6;
export type Face = 'display' | 'mono';

/** x of each letter's left edge and the total width, in px, at `size` px with `track` em extra spacing. */
export const layout = (text: string, size: number, face: Face = 'display', track = 0.02): { xs: number[]; ws: number[]; width: number } => {
  const xs: number[] = [];
  const ws: number[] = [];
  let x = 0;
  for (const ch of text) {
    const a = face === 'mono' ? MONO_ADV : ADV[ch];
    if (a === undefined) throw new Error(`type: no advance for "${ch}" in anton-metrics.json`);
    xs.push(x);
    ws.push(a * size);
    x += (a + track) * size;
  }
  return { xs, ws, width: Math.max(0, x - track * size) };
};
export const familyOf = (face: Face): string => (face === 'mono' ? MONO : DISPLAY);
