import { describe, expect, it } from 'vitest';
import { CATEGORY_STYLES, REJECTED_MARK_CLASS, REJECTED_MARK_DESCRIPTION } from './categoryStyles';
import { SCENARIOS } from '../data/globeScenarios';
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

describe('copy that must match behaviour', () => {
  it('describes rejected numbers the way they are actually drawn', () => {
    // If the styling changes, this fails until the help text (HowItWorks, empty state) is updated with it.
    expect(REJECTED_MARK_DESCRIPTION).toBe('dotted grey underline');
    expect(REJECTED_MARK_CLASS).toContain('decoration-dotted');
    expect(REJECTED_MARK_CLASS).toMatch(/slate/);
    expect(REJECTED_MARK_CLASS).not.toMatch(/amber|dashed/);
  });

  it('never claims the app blocks, intercepts or prevents anything: it cleans text the user then shares', () => {
    for (const s of SCENARIOS) expect(`${s.leak} ${s.outcome}`, s.id).not.toMatch(/\b(block(ed|s|ing)?|prevent(ed|s)?|intercept(ed|s)?|stop(ped|s)?)\b/i);
  });
});
