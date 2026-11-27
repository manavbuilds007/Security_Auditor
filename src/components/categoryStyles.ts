import type { PiiType } from '../utils/piiEngine';

/** Full class strings (not interpolated) so Tailwind can see them. */
export const CATEGORY_STYLES: Record<PiiType, { mark: string; chipOn: string; dot: string }> = {
  CARD: {
    mark: 'bg-rose-200 text-rose-950',
    chipOn: 'border-rose-300 bg-rose-50 text-rose-900',
    dot: 'bg-rose-400',
  },
  AADHAAR: {
    mark: 'bg-violet-200 text-violet-950',
    chipOn: 'border-violet-300 bg-violet-50 text-violet-900',
    dot: 'bg-violet-400',
  },
  PAN: {
    mark: 'bg-indigo-200 text-indigo-950',
    chipOn: 'border-indigo-300 bg-indigo-50 text-indigo-900',
    dot: 'bg-indigo-400',
  },
  EMAIL: {
    mark: 'bg-sky-200 text-sky-950',
    chipOn: 'border-sky-300 bg-sky-50 text-sky-900',
    dot: 'bg-sky-400',
  },
  IPV6: {
    mark: 'bg-teal-200 text-teal-950',
    chipOn: 'border-teal-300 bg-teal-50 text-teal-900',
    dot: 'bg-teal-400',
  },
  IPV4: {
    mark: 'bg-cyan-200 text-cyan-950',
    chipOn: 'border-cyan-300 bg-cyan-50 text-cyan-900',
    dot: 'bg-cyan-400',
  },
  PHONE: {
    mark: 'bg-emerald-200 text-emerald-950',
    chipOn: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    dot: 'bg-emerald-400',
  },
};
