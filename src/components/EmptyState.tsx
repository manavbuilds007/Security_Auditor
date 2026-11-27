import { FileText, Table, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SampleKind = 'log' | 'csv';

/** `quiet` outlines both buttons, for places where another action is the primary one. */
export function SampleButtons({ onSample, quiet = false }: { onSample: (kind: SampleKind) => void; quiet?: boolean }) {
  const btn =
    'press inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  return (
    <div className="flex shrink-0 flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => onSample('log')}
        className={`${btn} ${quiet ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
      >
        <FileText className="h-4 w-4" aria-hidden /> Try the sample log
      </button>
      <button
        type="button"
        onClick={() => onSample('csv')}
        className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`}
      >
        <Table className="h-4 w-4" aria-hidden /> Try the sample CSV
      </button>
    </div>
  );
}

interface Props {
  title: string;
  Icon?: LucideIcon;
  children: React.ReactNode;
  onSample?: (kind: SampleKind) => void;
  /** A primary call to action shown above the samples, which then become quiet. */
  primary?: { label: string; onClick: () => void };
  /** Extra classes for the root, e.g. a minimum height. Nothing inside is allowed to shrink below its size. */
  className?: string;
}

export default function EmptyState({ title, Icon, children, onSample, primary, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-8 text-center ${className}`}>
      {Icon && <Icon className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden />}
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-slate-600">{children}</p>
      {primary && (
        <button
          type="button"
          onClick={primary.onClick}
          className="press inline-flex shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Upload className="h-4 w-4" aria-hidden /> {primary.label}
        </button>
      )}
      {onSample && (
        <>
          {primary && <p className="shrink-0 text-xs text-slate-600">or try a sample</p>}
          <SampleButtons onSample={onSample} quiet={!!primary} />
        </>
      )}
    </div>
  );
}
