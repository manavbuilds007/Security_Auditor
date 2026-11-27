import { describe, expect, it } from 'vitest';
import { CATEGORY_STYLES } from './categoryStyles';
import { PII_TYPES } from '../utils/piiEngine';

describe('category styles', () => {
  const styles = PII_TYPES.map((t) => CATEGORY_STYLES[t]);

  it('gives every type its own colour family', () => {
    expect(new Set(styles.map((s) => s.family)).size).toBe(PII_TYPES.length);
  });

  it('never uses emerald, which is reserved for the brand and "safe" states', () => {
    for (const s of styles) expect(`${s.mark} ${s.chipOn} ${s.dot}`).not.toMatch(/emerald|green/);
  });

  it('keeps each style internally consistent with its family', () => {
    for (const s of styles) {
      for (const cls of [s.mark, s.chipOn, s.dot].join(' ').split(' ').filter((c) => /-(50|200|300|500|900|950)$/.test(c))) {
        expect(cls, s.tag).toContain(s.family);
      }
    }
  });

  it('has a distinct short text label per type, so colour is not the only cue', () => {
    expect(new Set(styles.map((s) => s.tag)).size).toBe(PII_TYPES.length);
  });
});
