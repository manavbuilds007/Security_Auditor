import { describe, expect, it } from 'vitest';
import {
  detect,
  expandIPv6,
  isValidIPv6,
  luhnCheck,
  sanitize,
  verhoeffCheck,
  verhoeffDigit,
  type PiiType,
  type SanitizeOptions,
} from './piiEngine';
import { describeCsv, detectDelimiter, sameStructure } from './csv';
import { HOW_IT_WORKS_EXAMPLE, SAMPLE_CSV, SAMPLE_TEXT } from '../data/sampleData';

const full: SanitizeOptions = { mode: 'full' };
const typesOf = (text: string, opts: Partial<SanitizeOptions> = {}) =>
  detect(text, opts).matches.map((m) => [m.type, m.value]);

describe('checksums', () => {
  it('Luhn accepts known valid card numbers and rejects others', () => {
    for (const n of ['4111111111111111', '5500000000000004', '378282246310005', '4012888888881881']) {
      expect(luhnCheck(n)).toBe(true);
    }
    expect(luhnCheck('1234567812345678')).toBe(false);
    expect(luhnCheck('4111111111111112')).toBe(false);
  });

  it('Verhoeff matches the published example and round-trips generated digits', () => {
    expect(verhoeffDigit('236')).toBe(3);
    expect(verhoeffCheck('2363')).toBe(true);
    expect(verhoeffCheck('2364')).toBe(false);
    expect(verhoeffCheck('234567890124')).toBe(true);
    expect(verhoeffCheck('234567890123')).toBe(false);
    const payload = '49876543210';
    expect(verhoeffCheck(payload + verhoeffDigit(payload))).toBe(true);
  });
});

describe('detectors', () => {
  it('finds emails', () => {
    expect(typesOf('mail rahul.sharma+tag@example.org now')).toEqual([['EMAIL', 'rahul.sharma+tag@example.org']]);
    expect(typesOf('not an email: user@ or @domain.com')).toEqual([]);
  });

  it('finds Indian and international phones', () => {
    expect(typesOf('call +91 98765 43210 now')).toEqual([['PHONE', '+91 98765 43210']]);
    expect(typesOf('call 9876543210.')).toEqual([['PHONE', '9876543210']]);
    expect(typesOf('call 09876543210')).toEqual([['PHONE', '09876543210']]);
    expect(typesOf('US +1 (415) 555-2671 ok')).toEqual([['PHONE', '+1 (415) 555-2671']]);
    expect(typesOf('UK +44 20 7946 0958 ok')).toEqual([['PHONE', '+44 20 7946 0958']]);
    expect(typesOf('too short 12345')).toEqual([]);
  });

  it('validates IPv4 octets 0-255', () => {
    expect(typesOf('ip 192.168.1.1 and 0.0.0.0 and 255.255.255.255')).toEqual([
      ['IPV4', '192.168.1.1'],
      ['IPV4', '0.0.0.0'],
      ['IPV4', '255.255.255.255'],
    ]);
    expect(typesOf('bad 999.1.1.1 and 256.1.1.1 and 1.2.3')).toEqual([]);
    expect(typesOf('version 1.2.3.4.5')).toEqual([]);
  });

  it('finds IPv6 (full and compressed) but not timestamps or C++ scopes', () => {
    expect(typesOf('a 2001:0db8:85a3:0000:0000:8a2e:0370:7334 b')).toHaveLength(1);
    expect(typesOf('a 2001:db8::1 b')).toEqual([['IPV6', '2001:db8::1']]);
    expect(typesOf('loopback ::1.')).toEqual([['IPV6', '::1']]);
    expect(typesOf('at 10:42:13 std::vector')).toEqual([]);
    expect(isValidIPv6('1::2::3')).toBe(false);
    expect(isValidIPv6('12345::1')).toBe(false);
    expect(expandIPv6('2001:DB8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });

  it('does not treat ticket#9876543210 (an identifier) as a mobile number, but still finds real ones', () => {
    expect(typesOf('ticket#9876543210')).toEqual([]);
    expect(typesOf('Ref #9876543210 closed')).toEqual([]);
    expect(typesOf('ticket 9876543210')).toEqual([['PHONE', '9876543210']]);
    expect(typesOf('ticket: 9876543210')).toEqual([['PHONE', '9876543210']]);
    expect(sanitize('ticket#9876543210', full).output).toBe('ticket#9876543210');
  });

  it('requires a valid PAN holder-type 4th letter, so words like ERROR1234X are ignored', () => {
    expect(typesOf('code ERROR1234X seen')).toEqual([]);
    expect(sanitize('ERROR1234X', full).output).toBe('ERROR1234X');
    // Every real holder type is accepted...
    for (const c of 'ABCFGHLJPT') expect(typesOf(`PAN ABC${c}E1234F`), c).toEqual([['PAN', `ABC${c}E1234F`]]);
    // ...and other 4th letters are not.
    for (const c of 'DEIKMNOQRSUVWXYZ') expect(typesOf(`PAN ABC${c}E1234F`), c).toEqual([]);
  });

  it('finds PAN with exact shape only', () => {
    expect(typesOf('PAN ABCPE1234F ok')).toEqual([['PAN', 'ABCPE1234F']]);
    expect(typesOf('abcde1234f ABCD1234F ABCDE12345 ABCDEF1234F')).toEqual([]);
  });

  it('finds Aadhaar: 12 digits, not starting with 0 or 1', () => {
    expect(typesOf('id 2345 6789 0124')).toEqual([['AADHAAR', '2345 6789 0124']]);
    expect(typesOf('id 234567890124')).toEqual([['AADHAAR', '234567890124']]);
    expect(typesOf('id 2345-6789-0124')).toEqual([['AADHAAR', '2345-6789-0124']]);
    expect(typesOf('id 0345 6789 0124')).toEqual([]);
    expect(typesOf('id 1345 6789 0124')).toEqual([]);
  });

  it('Aadhaar Verhoeff toggle rejects checksum failures only when enabled', () => {
    const text = 'a 2345 6789 0124 b 2345 6789 0123';
    expect(detect(text).matches).toHaveLength(2);
    const strict = detect(text, { aadhaarVerhoeff: true });
    expect(strict.matches.map((m) => m.value)).toEqual(['2345 6789 0124']);
    expect(strict.rejections).toMatchObject([{ type: 'AADHAAR', value: '2345 6789 0123', reason: 'verhoeff' }]);
  });
});

describe('credit cards', () => {
  it('accepts Luhn-valid 13-19 digit numbers with spaces or dashes', () => {
    expect(typesOf('4111 1111 1111 1111')).toEqual([['CARD', '4111 1111 1111 1111']]);
    expect(typesOf('5500-0000-0000-0004')).toEqual([['CARD', '5500-0000-0000-0004']]);
    expect(typesOf('378282246310005')).toEqual([['CARD', '378282246310005']]);
  });

  it('rejects non-Luhn 16-digit IDs, counts them, and leaves them untouched', () => {
    const text = 'order 1234567812345678 and ref 9876543210123456';
    const r = sanitize(text, full);
    expect(r.matches).toEqual([]);
    expect(r.rejections.map((x) => x.value)).toEqual(['1234567812345678', '9876543210123456']);
    expect(r.rejectedCounts.luhn).toBe(2);
    expect(r.output).toBe(text);
    // Digits inside a rejected number must not be re-claimed as a phone.
    expect(r.counts.PHONE).toBe(0);
  });
});

describe('overlap resolution', () => {
  it('card beats phone and Aadhaar on the same digits', () => {
    expect(typesOf('pay 4111111111111111 now').map(([t]) => t)).toEqual(['CARD']);
    expect(typesOf('pay 5500 0000 0000 0004 now').map(([t]) => t)).toEqual(['CARD']);
  });

  it('Aadhaar beats phone', () => {
    expect(typesOf('id 987654321012').map(([t]) => t)).toEqual(['AADHAAR']);
  });

  it('does not carve digits out of emails', () => {
    expect(typesOf('x 987654321012@example.com y')).toEqual([['EMAIL', '987654321012@example.com']]);
    expect(typesOf('x john.9876543210@example.com y').map(([t]) => t)).toEqual(['EMAIL']);
  });

  it('never returns overlapping matches', () => {
    const { matches } = detect(SAMPLE_TEXT, { aadhaarVerhoeff: false });
    for (let i = 1; i < matches.length; i++) expect(matches[i].start).toBeGreaterThanOrEqual(matches[i - 1].end);
  });
});

describe('redaction modes', () => {
  it('full mask, plain and typed', () => {
    expect(sanitize('a@b.com', full).output).toBe('[REDACTED]');
    expect(sanitize('a@b.com 4111111111111111', { mode: 'full', typedTags: true }).output).toBe(
      '[REDACTED_EMAIL] [REDACTED_CARD]',
    );
  });

  it('partial mask formats', () => {
    const p = (s: string) => sanitize(s, { mode: 'partial' }).output;
    expect(p('john@domain.com')).toBe('j***@domain.com');
    expect(p('4111 1111 1111 1111')).toBe('XXXX-XXXX-XXXX-1111');
    expect(p('378282246310005')).toBe('XXXX-XXXX-XXX-0005');
    expect(p('ABCPE1234F')).toBe('XXXXX1234X');
    expect(p('2345 6789 0124')).toBe('XXXX-XXXX-0124');
    expect(p('+91 98765 43210')).toBe('+91-XXXXXX3210');
    expect(p('9876543210')).toBe('+91-XXXXXX3210');
    expect(p('+1 (415) 555-2671')).toBe('+X (XXX) XXX-2671');
    expect(p('192.168.10.45')).toBe('192.168.XXX.XXX');
    expect(p('2001:db8::1')).toBe('2001:0db8:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX');
  });

  it('pseudonymization is consistent for repeats and normalized variants', () => {
    const text = 'A@X.com b@y.com a@x.com | 192.168.1.1 2001:db8::1 192.168.1.1 | +91 98765 43210, 09876543210, 9876543210';
    const out = sanitize(text, { mode: 'pseudonym' }).output;
    expect(out).toBe('USER_01 USER_02 USER_01 | IP_01 IP_02 IP_01 | PHONE_01, PHONE_01, PHONE_01');
  });

  it('pseudonym counters are per type and restart on every run', () => {
    const text = 'a@x.com 4111111111111111 ABCPE1234F 4111 1111 1111 1111 b@x.com 2345 6789 0124';
    const first = sanitize(text, { mode: 'pseudonym' }).output;
    expect(first).toBe('USER_01 CARD_01 PAN_01 CARD_01 USER_02 AADHAAR_01');
    expect(sanitize(text, { mode: 'pseudonym' }).output).toBe(first);
  });

  it('category filter leaves disabled types unchanged but still counts them', () => {
    const text = 'a@b.com 9876543210';
    const r = sanitize(text, { mode: 'full', enabled: { EMAIL: false } });
    expect(r.output).toBe('a@b.com [REDACTED]');
    expect(r.counts.EMAIL).toBe(1);
    expect(r.counts.PHONE).toBe(1);
  });

  it('segments reassemble to the source and the output', () => {
    const r = sanitize(SAMPLE_TEXT, { mode: 'partial' });
    expect(r.sourceSegments.map((s) => s.text).join('')).toBe(SAMPLE_TEXT);
    expect(r.outputSegments.map((s) => s.text).join('')).toBe(r.output);
  });
});

describe('sample data', () => {
  it('contains every category plus rejected false positives', () => {
    const r = sanitize(SAMPLE_TEXT, { mode: 'full', aadhaarVerhoeff: true });
    const counts = r.counts as Record<PiiType, number>;
    for (const t of Object.keys(counts) as PiiType[]) expect(counts[t], t).toBeGreaterThan(0);
    expect(r.rejectedCounts.luhn).toBe(2);
    expect(r.rejectedCounts.verhoeff).toBe(1);
    expect(r.output).not.toMatch(/4111 1111/);
    expect(r.output).toContain('999.1.1.1');
    expect(r.output).toContain('10:42:13');
  });
});

describe('CSV structure preservation', () => {
  it('detects delimiters', () => {
    expect(detectDelimiter(SAMPLE_CSV)).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it.each([
    ['LF', '\n'],
    ['CRLF', '\r\n'],
  ])('keeps delimiters, quotes, rows and %s line endings', (_name, eol) => {
    const csv = SAMPLE_CSV.replace(/\n/g, eol);
    for (const mode of ['full', 'partial', 'pseudonym'] as const) {
      const out = sanitize(csv, { mode, typedTags: true }).output;
      expect(sameStructure(csv, out, ',')).toBe(true);
      expect(describeCsv(out)).toEqual(describeCsv(csv));
      expect(out.endsWith(eol)).toBe(true);
      expect(out).not.toContain('rahul.sharma@example.com');
    }
  });

  it('keeps quoted cells quoted', () => {
    const csv = 'id,note\n1,"call 9876543210, then email a@b.com"\n';
    expect(sanitize(csv, full).output).toBe('id,note\n1,"call [REDACTED], then email [REDACTED]"\n');
  });
});

describe('How it works examples (shown in the UI)', () => {
  it('match what the engine actually produces', () => {
    const run = (mode: 'full' | 'partial' | 'pseudonym') => sanitize(HOW_IT_WORKS_EXAMPLE, { mode }).output;
    expect(run('full')).toBe('Reach Jane at [REDACTED] or [REDACTED]. Card [REDACTED] (again: [REDACTED]).');
    expect(run('partial')).toBe(
      'Reach Jane at j***@example.com or +91-XXXXXX3210. Card XXXX-XXXX-XXXX-1111 (again: j***@example.com).',
    );
    expect(run('pseudonym')).toBe('Reach Jane at USER_01 or PHONE_01. Card CARD_01 (again: USER_01).');
  });
});
