/**
 * PII detection + redaction engine. Pure functions, no DOM, no network.
 */

export type PiiType = 'CARD' | 'AADHAAR' | 'PAN' | 'EMAIL' | 'IPV6' | 'IPV4' | 'PHONE';
export type RedactionMode = 'full' | 'partial' | 'pseudonym';

/** Highest precedence first. Used to break overlaps between candidate spans. */
export const PII_TYPES: readonly PiiType[] = ['CARD', 'AADHAAR', 'PAN', 'EMAIL', 'IPV6', 'IPV4', 'PHONE'];

export const TYPE_LABELS: Record<PiiType, string> = {
  CARD: 'Credit card',
  AADHAAR: 'Aadhaar',
  PAN: 'PAN',
  EMAIL: 'Email',
  IPV6: 'IPv6',
  IPV4: 'IPv4',
  PHONE: 'Phone',
};

const PSEUDONYM_PREFIX: Record<PiiType, string> = {
  CARD: 'CARD',
  AADHAAR: 'AADHAAR',
  PAN: 'PAN',
  EMAIL: 'USER',
  IPV6: 'IP',
  IPV4: 'IP',
  PHONE: 'PHONE',
};

export interface Match {
  type: PiiType;
  start: number;
  end: number;
  value: string;
  /** Canonical form: identical normalized values get identical pseudonyms. */
  normalized: string;
}

export type RejectionReason = 'luhn' | 'verhoeff';

export interface Rejection {
  type: 'CARD' | 'AADHAAR';
  start: number;
  end: number;
  value: string;
  reason: RejectionReason;
}

export interface SanitizeOptions {
  mode: RedactionMode;
  /** Full mask only: `[REDACTED_EMAIL]` instead of `[REDACTED]`. */
  typedTags?: boolean;
  /** Reject 12-digit Aadhaar candidates that fail the Verhoeff checksum. */
  aadhaarVerhoeff?: boolean;
  /** Categories set to `false` are detected and counted but left unchanged. */
  enabled?: Partial<Record<PiiType, boolean>>;
}

export interface Segment {
  kind: 'text' | 'match' | 'rejected';
  text: string;
  type?: PiiType;
  /** For matches: what the text is replaced with. */
  replacement?: string;
  /** For matches: false when the category filter left it untouched. */
  applied?: boolean;
  reason?: RejectionReason;
}

export interface SanitizeResult {
  output: string;
  matches: Match[];
  rejections: Rejection[];
  counts: Record<PiiType, number>;
  rejectedCounts: Record<RejectionReason, number>;
  sourceSegments: Segment[];
  outputSegments: Segment[];
}

/* ------------------------------------------------------------------ */
/* Checksums                                                           */
/* ------------------------------------------------------------------ */

export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits.charCodeAt(digits.length - 1 - i) - 48;
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][d]];
  }
  return c === 0;
}

/** Check digit to append to `payload` so the whole string passes `verhoeffCheck`. */
export function verhoeffDigit(payload: string): number {
  let c = 0;
  for (let i = 0; i < payload.length; i++) {
    const d = payload.charCodeAt(payload.length - 1 - i) - 48;
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][d]];
  }
  return VERHOEFF_INV[c];
}

/* ------------------------------------------------------------------ */
/* Patterns                                                            */
/* ------------------------------------------------------------------ */

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

const RE_EMAIL =
  /(?<![\w.%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w-])/g;
const RE_CARD = /(?<![\w@.])(?<!\d[ -])\d(?:[ -]?\d){12,18}(?![\w@])(?![ -]\d)(?!\.\d)/g;
const RE_AADHAAR = /(?<![\w@.])(?<!\d[ -])[2-9]\d{3}([ -]?)\d{4}\1\d{4}(?![\w@])(?![ -]\d)(?!\.\d)/g;
// 4th letter is the holder type: P person, C company, H HUF, F firm, A AOP, T trust, B BOI, L local authority, J juridical, G government.
// This rejects uppercase words that merely look like a PAN, e.g. ERROR1234X.
const RE_PAN = /(?<![\w@.])[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z](?![\w@])/g;
const RE_IPV4 = new RegExp(`(?<![\\w.])(?:${OCTET}\\.){3}${OCTET}(?![\\w@]|\\.\\d)`, 'g');
const RE_IPV6_CANDIDATE = /(?<![\w:])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![\w:])/g;
// '#' is excluded so identifiers like ticket#9876543210 are not mistaken for a mobile number.
const RE_PHONE_IN = /(?<![\w@.+#])(?<!\d[ -])(?:\+91[ -]?|0)?[6-9]\d{4}[ -]?\d{5}(?![\w@])(?![ -]\d)(?!\.\d)/g;
const RE_PHONE_INTL =
  /(?<![\w@.])\+\d{1,3}[ .-]?(?:\(\d{1,4}\)|\d{1,4})(?:[ .-]?\d{2,4}){1,4}(?![\w@])(?!\.\d)/g;

export function isValidIPv6(s: string): boolean {
  if (!/^[0-9a-f:]+$/i.test(s) || s.includes(':::')) return false;
  const hex = /^[0-9a-f]{1,4}$/i;
  const parts = s.split('::');
  if (parts.length > 2) return false;
  if (parts.length === 1) {
    const groups = s.split(':');
    return groups.length === 8 && groups.every((g) => hex.test(g));
  }
  const left = parts[0] === '' ? [] : parts[0].split(':');
  const right = parts[1] === '' ? [] : parts[1].split(':');
  return left.length + right.length <= 7 && [...left, ...right].every((g) => hex.test(g));
}

export function expandIPv6(s: string): string {
  const parts = s.toLowerCase().split('::');
  const left = parts[0] === '' ? [] : parts[0].split(':');
  const right = parts.length > 1 && parts[1] !== '' ? parts[1].split(':') : [];
  const fill = parts.length > 1 ? new Array(8 - left.length - right.length).fill('0') : [];
  return [...left, ...fill, ...right].map((g) => g.padStart(4, '0')).join(':');
}

function digitsOf(s: string): string {
  return s.replace(/\D/g, '');
}

/** National significant number for Indian numbers; plain digits otherwise. */
function normalizePhone(value: string): string {
  const d = digitsOf(value);
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  return d;
}

function normalize(type: PiiType, value: string): string {
  switch (type) {
    case 'EMAIL':
      return value.toLowerCase();
    case 'CARD':
    case 'AADHAAR':
      return digitsOf(value);
    case 'PAN':
      return value.toUpperCase();
    case 'PHONE':
      return normalizePhone(value);
    case 'IPV6':
      return expandIPv6(value);
    case 'IPV4':
      return value;
  }
}

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

interface Candidate {
  type: PiiType;
  start: number;
  end: number;
  value: string;
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function detect(
  text: string,
  opts: Pick<SanitizeOptions, 'aadhaarVerhoeff'> = {},
): { matches: Match[]; rejections: Rejection[] } {
  const candidates: Candidate[] = [];
  const rejections: Rejection[] = [];

  const collect = (type: PiiType, re: RegExp, accept?: (value: string) => boolean) => {
    for (const m of text.matchAll(re)) {
      const value = m[0];
      if (accept && !accept(value)) continue;
      const start = m.index ?? 0;
      candidates.push({ type, start, end: start + value.length, value });
    }
  };

  // Cards: Luhn-validated; failures are tracked as rejected false positives.
  for (const m of text.matchAll(RE_CARD)) {
    const value = m[0];
    const start = m.index ?? 0;
    if (luhnCheck(digitsOf(value))) {
      candidates.push({ type: 'CARD', start, end: start + value.length, value });
    } else {
      rejections.push({ type: 'CARD', start, end: start + value.length, value, reason: 'luhn' });
    }
  }

  for (const m of text.matchAll(RE_AADHAAR)) {
    const value = m[0];
    const start = m.index ?? 0;
    if (opts.aadhaarVerhoeff && !verhoeffCheck(digitsOf(value))) {
      rejections.push({ type: 'AADHAAR', start, end: start + value.length, value, reason: 'verhoeff' });
    } else {
      candidates.push({ type: 'AADHAAR', start, end: start + value.length, value });
    }
  }

  collect('PAN', RE_PAN);
  collect('EMAIL', RE_EMAIL);
  collect('IPV6', RE_IPV6_CANDIDATE, isValidIPv6);
  collect('IPV4', RE_IPV4);
  collect('PHONE', RE_PHONE_IN);
  collect('PHONE', RE_PHONE_INTL, (v) => {
    const n = digitsOf(v).length;
    return n >= 8 && n <= 15;
  });

  // Overlap resolution: precedence first (CARD > AADHAAR > ... > PHONE), then longer, then earlier.
  const rank = (t: PiiType) => PII_TYPES.indexOf(t);
  const ordered = [...candidates].sort(
    (a, b) => rank(a.type) - rank(b.type) || b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const accepted: Candidate[] = [];
  for (const c of ordered) {
    if (!accepted.some((a) => overlaps(a, c))) accepted.push(c);
  }
  accepted.sort((a, b) => a.start - b.start);

  const matches: Match[] = accepted.map((c) => ({ ...c, normalized: normalize(c.type, c.value) }));

  // A rejection only counts if nothing else claimed that text, and rejections don't overlap each other.
  const keptRejections: Rejection[] = [];
  for (const r of rejections.sort((a, b) => a.start - b.start)) {
    if (matches.some((m) => overlaps(m, r))) continue;
    if (keptRejections.some((k) => overlaps(k, r))) continue;
    keptRejections.push(r);
  }

  return { matches, rejections: keptRejections };
}

/* ------------------------------------------------------------------ */
/* Redaction                                                           */
/* ------------------------------------------------------------------ */

function chunkX(n: number): string {
  const groups: string[] = [];
  for (let left = n; left > 0; left -= 4) groups.push('X'.repeat(Math.min(4, left)));
  return groups.join('-');
}

export function partialMask(m: Match): string {
  const v = m.value;
  switch (m.type) {
    case 'EMAIL': {
      const at = v.indexOf('@');
      return `${v[0]}***${v.slice(at)}`;
    }
    case 'CARD': {
      const d = digitsOf(v);
      return `${chunkX(d.length - 4)}-${d.slice(-4)}`;
    }
    case 'AADHAAR':
      return `XXXX-XXXX-${digitsOf(v).slice(-4)}`;
    case 'PAN':
      return `XXXXX${v.slice(5, 9)}X`;
    case 'PHONE': {
      const d = digitsOf(v);
      const national = normalizePhone(v);
      if (national.length === 10 && /^[6-9]/.test(national)) return `+91-XXXXXX${d.slice(-4)}`;
      // Other numbers: keep formatting, hide every digit except the last four.
      let seen = 0;
      const total = d.length;
      return v.replace(/\d/g, (ch) => (++seen > total - 4 ? ch : 'X'));
    }
    case 'IPV4': {
      const [a, b] = v.split('.');
      return `${a}.${b}.XXX.XXX`;
    }
    case 'IPV6': {
      const g = expandIPv6(v).split(':');
      return `${g[0]}:${g[1]}:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX`;
    }
  }
}

export function sanitize(text: string, options: SanitizeOptions): SanitizeResult {
  const { matches, rejections } = detect(text, options);
  const counts = Object.fromEntries(PII_TYPES.map((t) => [t, 0])) as Record<PiiType, number>;
  const rejectedCounts: Record<RejectionReason, number> = { luhn: 0, verhoeff: 0 };
  for (const m of matches) counts[m.type]++;
  for (const r of rejections) rejectedCounts[r.reason]++;

  // Fresh per run: identical normalized values always map to the same token.
  const pseudonyms = new Map<string, Map<string, string>>();
  const pseudonymFor = (m: Match): string => {
    const prefix = PSEUDONYM_PREFIX[m.type];
    let map = pseudonyms.get(prefix);
    if (!map) pseudonyms.set(prefix, (map = new Map()));
    let token = map.get(m.normalized);
    if (!token) {
      token = `${prefix}_${String(map.size + 1).padStart(2, '0')}`;
      map.set(m.normalized, token);
    }
    return token;
  };

  const replacementFor = (m: Match): string => {
    switch (options.mode) {
      case 'full':
        return options.typedTags ? `[REDACTED_${m.type}]` : '[REDACTED]';
      case 'partial':
        return partialMask(m);
      case 'pseudonym':
        return pseudonymFor(m);
    }
  };

  type Span = { start: number; end: number; match?: Match; rejection?: Rejection };
  const spans: Span[] = [
    ...matches.map((match) => ({ start: match.start, end: match.end, match })),
    ...rejections.map((rejection) => ({ start: rejection.start, end: rejection.end, rejection })),
  ].sort((a, b) => a.start - b.start);

  const sourceSegments: Segment[] = [];
  const outputSegments: Segment[] = [];
  let cursor = 0;
  const pushText = (s: string) => {
    if (!s) return;
    sourceSegments.push({ kind: 'text', text: s });
    outputSegments.push({ kind: 'text', text: s });
  };

  for (const span of spans) {
    pushText(text.slice(cursor, span.start));
    const original = text.slice(span.start, span.end);
    if (span.match) {
      const m = span.match;
      const applied = options.enabled?.[m.type] !== false;
      // Replacements are generated in order of appearance, but only for applied matches.
      const replacement = applied ? replacementFor(m) : original;
      sourceSegments.push({ kind: 'match', text: original, type: m.type, replacement, applied });
      outputSegments.push(
        applied
          ? { kind: 'match', text: replacement, type: m.type, replacement, applied }
          : { kind: 'text', text: original },
      );
    } else if (span.rejection) {
      const seg: Segment = { kind: 'rejected', text: original, type: span.rejection.type, reason: span.rejection.reason };
      sourceSegments.push(seg);
      outputSegments.push({ ...seg });
    }
    cursor = span.end;
  }
  pushText(text.slice(cursor));

  return {
    output: outputSegments.map((s) => s.text).join(''),
    matches,
    rejections,
    counts,
    rejectedCounts,
    sourceSegments,
    outputSegments,
  };
}
