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
  const { rejectedCounts } = result;
  const detected = result.matches.length;
  const unchanged = detected - redacted;
  const rejected = rejectedCounts.luhn + rejectedCounts.verhoeff;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3" aria-label="Audit summary" aria-live="polite">
      <div className="flex items-baseline gap-2">
        {hasText ? (
          <>
            <span className="bg-linear-to-r from-emerald-600 to-cyan-600 bg-clip-text text-4xl font-bold leading-none tracking-tight text-transparent tabular">
              <AnimatedNumber value={redacted} />
            </span>
            <span className="text-[15px] font-medium text-slate-800">{redacted === 1 ? 'item redacted' : 'items redacted'}</span>
          </>
        ) : (
          <span className="text-[15px] font-medium text-slate-600">Waiting for text…</span>
        )}
      </div>

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-slate-700">
        {unchanged > 0 && (
          <li>
            <strong className="tabular">{unchanged}</strong> found but left unchanged (type turned off)
          </li>
        )}
        <li
          className="inline-flex items-center gap-1.5"
          title="Digit strings that looked like cards or Aadhaar numbers but failed their checksum. They are left unchanged; this is the filter working."
        >
          <Info className="h-4 w-4 text-slate-500" aria-hidden />
          Rejected false positives: <strong className="tabular">{rejected}</strong>
          <span className="text-slate-600">
            (non-Luhn {rejectedCounts.luhn} · Verhoeff {rejectedCounts.verhoeff})
          </span>
        </li>
        {csv && (
          <li className={`inline-flex items-center gap-1.5 ${csv.preserved ? 'text-slate-700' : 'font-semibold text-red-700'}`}>
            {csv.preserved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden />
            )}
            CSV {csv.rows} rows × {csv.columns} cols, delimiter <code className="font-mono">{csv.delimiter === '\t' ? '\\t' : csv.delimiter}</code>:{' '}
            {csv.preserved ? 'structure preserved' : 'STRUCTURE CHANGED. Do not share this file.'}
          </li>
        )}
      </ul>
    </div>
  );
}
