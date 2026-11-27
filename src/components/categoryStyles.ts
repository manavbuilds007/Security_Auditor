import type { PiiType } from '../utils/piiEngine';

/**
 * One hue per type, spaced around the colour wheel and deliberately avoiding emerald (the brand / "safe" colour).
 * Full class strings (not interpolated) so Tailwind can see them. Colour is never the only cue: `tag` is printed
 * on highlights in the Sanitized pane.
 */
/** How a rejected look-alike number (failed Luhn/Verhoeff) is drawn, and the words used to describe it in help text. */
export const REJECTED_MARK_CLASS =
  'rounded-sm bg-slate-200/70 underline decoration-slate-500 decoration-dotted underline-offset-4';
export const REJECTED_MARK_DESCRIPTION = 'dotted grey underline';

export const CATEGORY_STYLES: Record<
  PiiType,
  { family: string; tag: string; mark: string; chipOn: string; dot: string }
> = {
  CARD: {
    family: 'red',
    tag: 'CARD',
    mark: 'bg-red-200 text-red-950',
    chipOn: 'border-red-300 bg-red-50 text-red-900',
    dot: 'bg-red-500',
  },
  PHONE: {
    family: 'amber',
    tag: 'PHONE',
    mark: 'bg-amber-200 text-amber-950',
    chipOn: 'border-amber-300 bg-amber-50 text-amber-900',
    dot: 'bg-amber-500',
  },
  PAN: {
    family: 'lime',
    tag: 'PAN',
    mark: 'bg-lime-200 text-lime-950',
    chipOn: 'border-lime-300 bg-lime-50 text-lime-900',
    dot: 'bg-lime-500',
  },
  IPV6: {
    family: 'teal',
    tag: 'IPv6',
    mark: 'bg-teal-200 text-teal-950',
    chipOn: 'border-teal-300 bg-teal-50 text-teal-900',
    dot: 'bg-teal-500',
  },
  IPV4: {
    family: 'sky',
    tag: 'IPv4',
    mark: 'bg-sky-200 text-sky-950',
    chipOn: 'border-sky-300 bg-sky-50 text-sky-900',
    dot: 'bg-sky-500',
  },
  EMAIL: {
    family: 'indigo',
    tag: 'EMAIL',
    mark: 'bg-indigo-200 text-indigo-950',
    chipOn: 'border-indigo-300 bg-indigo-50 text-indigo-900',
    dot: 'bg-indigo-500',
  },
  AADHAAR: {
    family: 'purple',
    tag: 'AADHAAR',
    mark: 'bg-purple-200 text-purple-950',
    chipOn: 'border-purple-300 bg-purple-50 text-purple-900',
    dot: 'bg-purple-500',
  },
};
