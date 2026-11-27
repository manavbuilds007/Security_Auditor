import { describe, expect, it } from 'vitest';
import { isSupportedTextFile } from './files';
import { pairLines } from './lines';
import { shouldReveal } from './reveal';
import { sanitize } from './piiEngine';
import { SAMPLE_CSV, SAMPLE_TEXT } from '../data/sampleData';

describe('isSupportedTextFile', () => {
  it('accepts .txt and .csv in any case, or plain-text MIME types', () => {
    expect(isSupportedTextFile('log.txt')).toBe(true);
    expect(isSupportedTextFile('EXPORT.CSV')).toBe(true);
    expect(isSupportedTextFile('notes', 'text/plain')).toBe(true);
    expect(isSupportedTextFile('data', 'text/csv')).toBe(true);
  });
  it('refuses everything else', () => {
    expect(isSupportedTextFile('photo.png', 'image/png')).toBe(false);
    expect(isSupportedTextFile('report.pdf', 'application/pdf')).toBe(false);
    expect(isSupportedTextFile('archive.csv.zip', 'application/zip')).toBe(false);
  });
});

describe('pairLines', () => {
  const lines = (text: string, opts: Parameters<typeof sanitize>[1] = { mode: 'full' }) => {
    const r = sanitize(text, opts);
    return { r, pairs: pairLines(r.sourceSegments, r.outputSegments) };
  };

  it('gives source and output the same number of lines, matching the input', () => {
    for (const text of [SAMPLE_TEXT, SAMPLE_CSV, 'a@b.com\n\n\nx', 'one line', '']) {
      const { pairs } = lines(text);
      expect(pairs).toHaveLength(text.split(/\r\n|\r|\n/).length);
    }
  });

  it('keeps lines in step even though redactions change their length', () => {
    const { r, pairs } = lines(SAMPLE_TEXT, { mode: 'pseudonym' });
    const join = (segs: { text: string }[][]) => segs.map((l) => l.map((s) => s.text).join('')).join('\n');
    expect(join(pairs.map((p) => p.source))).toBe(SAMPLE_TEXT.replace(/\r\n?/g, '\n'));
    expect(join(pairs.map((p) => p.output))).toBe(r.output.replace(/\r\n?/g, '\n'));
  });

  it('handles CRLF files and filtered-off matches', () => {
    const csv = SAMPLE_CSV.replace(/\n/g, '\r\n');
    const { pairs } = lines(csv, { mode: 'full', enabled: { EMAIL: false } });
    expect(pairs).toHaveLength(csv.split('\r\n').length);
    const emailsLeft = pairs.flatMap((p) => p.output).filter((s) => s.text.includes('@')).length;
    expect(emailsLeft).toBeGreaterThan(0);
  });
});

describe('shouldReveal', () => {
  it('reveals anything in view or already scrolled past, but not content far below the fold', () => {
    expect(shouldReveal(300, 900)).toBe(true); // visible
    expect(shouldReveal(-2000, 900)).toBe(true); // scrolled past (End key / scrollbar drag)
    expect(shouldReveal(1500, 900)).toBe(false); // still well below
  });
});
