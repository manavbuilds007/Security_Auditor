/**
 * PII detection + redaction engine. Pure functions, no DOM, no network.
 */

import { luhnCheck, verhoeffCheck } from './checksums';
import {
  RE_AADHAAR,
  RE_CARD,
  RE_EMAIL,
  RE_IPV4,
  RE_IPV6_CANDIDATE,
  RE_PAN,
  RE_PHONE_IN,
  RE_PHONE_INTL,
  digitsOf,
  expandIPv6,
  isValidIPv6,
  normalize,
  normalizePhone,
} from './patterns';

export { luhnCheck, verhoeffCheck, verhoeffDigit } from './checksums';
export { expandIPv6, isValidIPv6 } from './patterns';

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

  // Checksummed types: a failing candidate is tracked as a rejected false positive instead of dropped silently.
  const collectChecked = (
    type: 'CARD' | 'AADHAAR',
    re: RegExp,
    reason: RejectionReason,
    passes: (digits: string) => boolean,
  ) => {
    for (const m of text.matchAll(re)) {
      const value = m[0];
      const start = m.index ?? 0;
      const span = { start, end: start + value.length, value };
      if (passes(digitsOf(value))) candidates.push({ type, ...span });
      else rejections.push({ type, reason, ...span });
    }
  };

  collectChecked('CARD', RE_CARD, 'luhn', luhnCheck);
  collectChecked('AADHAAR', RE_AADHAAR, 'verhoeff', (d) => !opts.aadhaarVerhoeff || verhoeffCheck(d));

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

/** Pseudonym tokens are numbered per run: identical normalized values always map to the same token. */
function createPseudonymizer(): (m: Match) => string {
  const tokensByPrefix = new Map<string, Map<string, string>>();
  return (m) => {
    const prefix = PSEUDONYM_PREFIX[m.type];
    let tokens = tokensByPrefix.get(prefix);
    if (!tokens) tokensByPrefix.set(prefix, (tokens = new Map()));
    let token = tokens.get(m.normalized);
    if (!token) {
      token = `${prefix}_${String(tokens.size + 1).padStart(2, '0')}`;
      tokens.set(m.normalized, token);
    }
    return token;
  };
}

function createReplacer(options: SanitizeOptions): (m: Match) => string {
  const pseudonymFor = createPseudonymizer();
  return (m) => {
    switch (options.mode) {
      case 'full':
        return options.typedTags ? `[REDACTED_${m.type}]` : '[REDACTED]';
      case 'partial':
        return partialMask(m);
      case 'pseudonym':
        return pseudonymFor(m);
    }
  };
}

type Span = { start: number; end: number; match?: Match; rejection?: Rejection };

/** Builds the parallel source/output segment lists that the diff view renders. */
function buildSegments(text: string, matches: Match[], rejections: Rejection[], options: SanitizeOptions) {
  const replacementFor = createReplacer(options);
  const spans: Span[] = [
    ...matches.map((match) => ({ start: match.start, end: match.end, match })),
    ...rejections.map((rejection) => ({ start: rejection.start, end: rejection.end, rejection })),
  ].sort((a, b) => a.start - b.start);

  const sourceSegments: Segment[] = [];
  const outputSegments: Segment[] = [];
  const pushText = (s: string) => {
    if (!s) return;
    sourceSegments.push({ kind: 'text', text: s });
    outputSegments.push({ kind: 'text', text: s });
  };

  let cursor = 0;
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
      const seg: Segment = {
        kind: 'rejected',
        text: original,
        type: span.rejection.type,
        reason: span.rejection.reason,
      };
      sourceSegments.push(seg);
      outputSegments.push({ ...seg });
    }
    cursor = span.end;
  }
  pushText(text.slice(cursor));
  return { sourceSegments, outputSegments };
}

export function sanitize(text: string, options: SanitizeOptions): SanitizeResult {
  const { matches, rejections } = detect(text, options);
  const counts = Object.fromEntries(PII_TYPES.map((t) => [t, 0])) as Record<PiiType, number>;
  const rejectedCounts: Record<RejectionReason, number> = { luhn: 0, verhoeff: 0 };
  for (const m of matches) counts[m.type]++;
  for (const r of rejections) rejectedCounts[r.reason]++;

  const { sourceSegments, outputSegments } = buildSegments(text, matches, rejections, options);
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
