import { CheckCircle2, Info, XCircle } from 'lucide-react';
import type { SanitizeResult } from '../utils/piiEngine';
import type { CsvInfo } from '../utils/csv';
import AnimatedNumber from './AnimatedNumber';

interface Props {
  result: SanitizeResult;
  redacted: number;
  hasText: boolean;
  csv: (CsvInfo & { preserved: boolean }) | null;
}

export default function SummaryBar({ result, redacted, hasText, csv }: Props) {
  if (!hasText) {
    return (
      <p className="text-[15px] font-medium text-slate-600" aria-live="polite">
        Waiting for text…
      </p>
    );
  }

  const { rejectedCounts } = result;
  const unchanged = result.matches.length - redacted;
  const rejected = rejectedCounts.luhn + rejectedCounts.verhoeff;

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8"
      aria-label="Audit summary"
      aria-live="polite"
    >
      <div className="flex items-baseline gap-2">
        <span className="bg-linear-to-r from-emerald-600 to-cyan-600 bg-clip-text text-4xl font-bold leading-none tracking-tight text-transparent tabular">
          <AnimatedNumber value={redacted} />
        </span>
        <span className="text-[15px] font-medium text-slate-800">
          {redacted === 1 ? 'item redacted' : 'items redacted'}
        </span>
      </div>

      {/* One column on phones, so each note reads as a single sentence instead of splitting across narrow columns. */}
      <ul className="flex flex-col gap-1.5 text-[13px] text-slate-700 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
        {unchanged > 0 && (
          <li>
            <strong className="tabular">{unchanged}</strong> found but left unchanged (type turned off)
          </li>
        )}
        <li
          className="flex items-start gap-1.5"
          title="Digit strings that looked like cards or Aadhaar numbers but failed their checksum. They are left unchanged; this is the filter working."
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span>
            Rejected false positives: <strong className="tabular">{rejected}</strong>{' '}
            <span className="text-slate-600">
              (non-Luhn {rejectedCounts.luhn} · Verhoeff {rejectedCounts.verhoeff})
            </span>
          </span>
        </li>
        {csv && (
          <li className={`flex items-start gap-1.5 ${csv.preserved ? 'text-slate-700' : 'font-semibold text-red-700'}`}>
            {csv.preserved ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>
              CSV {csv.rows} rows × {csv.columns} cols, delimiter{' '}
              <code className="font-mono">{csv.delimiter === '\t' ? '\\t' : csv.delimiter}</code>:{' '}
              {csv.preserved ? 'structure preserved' : 'STRUCTURE CHANGED. Do not share this file.'}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
