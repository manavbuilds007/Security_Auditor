import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SanitizeResult } from '../utils/piiEngine';
import type { CsvInfo } from '../utils/csv';

interface Props {
  result: SanitizeResult;
  redacted: number;
  csv: (CsvInfo & { preserved: boolean }) | null;
}

export default function SummaryBar({ result, redacted, csv }: Props) {
  const { rejectedCounts } = result;
  const detected = result.matches.length;
  const rejected = rejectedCounts.luhn + rejectedCounts.verhoeff;
  return (
    <section
      className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
      aria-label="Audit summary"
      aria-live="polite"
    >
      <span>
        <strong className="tabular-nums">{detected}</strong> detected
      </span>
      <span>
        <strong className="tabular-nums">{redacted}</strong> redacted
      </span>
      <span
        className={`inline-flex items-center gap-1 ${rejected ? 'text-amber-700' : ''}`}
        title="Digit strings that looked like cards/Aadhaar but failed the checksum, so were left unchanged"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Rejected false positives: <strong className="tabular-nums">{rejected}</strong>
        <span className="text-slate-500">
          (non-Luhn {rejectedCounts.luhn} · Verhoeff {rejectedCounts.verhoeff})
        </span>
      </span>
      {csv && (
        <span className="inline-flex items-center gap-1 text-slate-600">
          <CheckCircle2 className={`h-3.5 w-3.5 ${csv.preserved ? 'text-emerald-600' : 'text-rose-600'}`} aria-hidden />
          CSV {csv.rows} rows × {csv.columns} cols, delimiter{' '}
          <code>{csv.delimiter === '\t' ? '\\t' : csv.delimiter}</code>, {csv.preserved ? 'structure preserved' : 'STRUCTURE CHANGED'}
        </span>
      )}
    </section>
  );
}
