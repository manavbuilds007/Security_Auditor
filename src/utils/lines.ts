import type { Segment } from './piiEngine';

export interface LinePair {
  source: Segment[];
  output: Segment[];
}

/**
 * Splits the engine's parallel source/output segment lists into per-line pairs. Replacements never contain a
 * line break and matches never span one, so source line N always corresponds to output line N. Rendering the
 * pairs as rows of one grid keeps both sides aligned however each side wraps.
 */
export function pairLines(source: Segment[], output: Segment[]): LinePair[] {
  const pairs: LinePair[] = [{ source: [], output: [] }];
  const current = () => pairs[pairs.length - 1];
  for (let i = 0; i < source.length; i++) {
    const s = source[i];
    const o = output[i];
    if (s.kind === 'text' && o.kind === 'text') {
      s.text.split(/\r\n|\r|\n/).forEach((part, k) => {
        if (k > 0) pairs.push({ source: [], output: [] });
        if (part) {
          current().source.push({ ...s, text: part });
          current().output.push({ ...o, text: part });
        }
      });
    } else {
      current().source.push(s);
      current().output.push(o);
    }
  }
  return pairs;
}
