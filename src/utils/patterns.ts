/** Detection regexes and value normalisation. Pure, no DOM. */
import type { PiiType } from './piiEngine';

/* Patterns                                                            */
/* ------------------------------------------------------------------ */

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

export const RE_EMAIL = /(?<![\w.%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w-])/g;
export const RE_CARD = /(?<![\w@.])(?<!\d[ -])\d(?:[ -]?\d){12,18}(?![\w@])(?![ -]\d)(?!\.\d)/g;
export const RE_AADHAAR = /(?<![\w@.])(?<!\d[ -])[2-9]\d{3}([ -]?)\d{4}\1\d{4}(?![\w@])(?![ -]\d)(?!\.\d)/g;
// 4th letter is the holder type: P person, C company, H HUF, F firm, A AOP, T trust, B BOI, L local authority, J juridical, G government.
// This rejects uppercase words that merely look like a PAN, e.g. ERROR1234X.
export const RE_PAN = /(?<![\w@.])[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z](?![\w@])/g;
export const RE_IPV4 = new RegExp(`(?<![\\w.])(?:${OCTET}\\.){3}${OCTET}(?![\\w@]|\\.\\d)`, 'g');
export const RE_IPV6_CANDIDATE = /(?<![\w:])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![\w:])/g;
// '#' is excluded so identifiers like ticket#9876543210 are not mistaken for a mobile number.
export const RE_PHONE_IN = /(?<![\w@.+#])(?<!\d[ -])(?:\+91[ -]?|0)?[6-9]\d{4}[ -]?\d{5}(?![\w@])(?![ -]\d)(?!\.\d)/g;
export const RE_PHONE_INTL =
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

export function digitsOf(s: string): string {
  return s.replace(/\D/g, '');
}

/** National significant number for Indian numbers; plain digits otherwise. */
export function normalizePhone(value: string): string {
  const d = digitsOf(value);
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  return d;
}

export function normalize(type: PiiType, value: string): string {
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
