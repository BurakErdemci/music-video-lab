// Binding a lyric line to measured words (docs/architecture.md "Lyric token map"). Every token gets the time
// of the measured word(s) the token map points it at; nothing is guessed:
//  - word: i          -> that word's start..end (several tokens may share one word: "Three hundred" -> "300")
//  - word: [a, b]     -> from word a's start to word b's end (one token sung as several words)
//  - word: null       -> unmeasured: shown together with the previous mapped token, at its time; a null at the
//                        start of a line takes the next mapped token's time. A line with no mapped token throws.
// Without a token map (the 2026-10-20 take) a line binds only when its tokens pair one-to-one with the measured
// words of its window, and throws otherwise.
// Pure, erasable TypeScript: tools/gridcheck.mjs runs it against other takes.

export type WordRef = number | [number, number] | null;
export interface MapToken { text: string; word: WordRef }
export interface LineData { text: string; start: number | null; end: number | null; tokens?: readonly MapToken[] }
export interface WordData { w: string; s: number; e: number }
export interface Token { text: string; start: number; end: number; word: WordRef }

const timesOf = (ref: number | [number, number], words: readonly WordData[], where: string): [number, number] => {
  const [a, b] = typeof ref === 'number' ? [ref, ref] : ref;
  const wa = words[a];
  const wb = words[b];
  if (!wa || !wb || b < a) throw new Error(`${where}: word ref ${JSON.stringify(ref)} is not a measured word range`);
  return [wa.s, wb.e];
};

export const bindLine = (lines: readonly LineData[], words: readonly WordData[], i: number): Token[] => {
  const line = lines[i];
  if (!line) throw new Error(`no lyric line ${i}`);
  const where = `lyric line ${i} "${line.text}"`;
  if (line.tokens) {
    const toks = line.tokens;
    if (!toks.some((t) => t.word !== null)) throw new Error(`${where}: no token is mapped to a measured word`);
    let last = -1;
    const timed = toks.map((t) => {
      if (t.word === null) return null;
      const first = typeof t.word === 'number' ? t.word : t.word[0];
      if (first < last) throw new Error(`${where}: token "${t.text}" maps to word ${first}, before word ${last}`);
      last = typeof t.word === 'number' ? t.word : t.word[1];
      return timesOf(t.word, words, where);
    });
    const firstMapped = timed.findIndex((x) => x !== null);
    return toks.map((t, k) => {
      // a null token takes the previous mapped token's time (or, at the line start, the next one's)
      let j = k;
      while (j >= 0 && timed[j] === null) j--;
      const [s, e] = (j >= 0 ? timed[j] : timed[firstMapped]) as [number, number];
      return { text: t.text, start: s, end: e, word: t.word };
    });
  }
  if (line.start === null || line.end === null) throw new Error(`${where}: not sung and has no token map`);
  const next = lines.slice(i + 1).find((l) => l.start !== null);
  const until = next ? (next.start as number) : line.end + 1.5;
  const idx = words.map((w, k) => ({ w, k })).filter(({ w }) => w.s >= (line.start as number) - 0.005 && w.s < until - 0.005);
  const toks = line.text.split(/\s+/).filter(Boolean);
  if (toks.length !== idx.length) {
    throw new Error(`${where}: ${toks.length} tokens but ${idx.length} measured words (${idx.map(({ w }) => w.w).join(' ')}) and no token map`);
  }
  return toks.map((text, k) => {
    const { w, k: wi } = idx[k] as { w: WordData; k: number };
    return { text, start: w.s, end: w.e, word: wi };
  });
};
