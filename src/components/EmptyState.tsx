import { FileText, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SampleKind = 'log' | 'csv';

export function SampleButtons({ onSample }: { onSample: (kind: SampleKind) => void }) {
  const btn =
    'press inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  return (
    <div className="flex shrink-0 flex-wrap justify-center gap-2">
      <button type="button" onClick={() => onSample('log')} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
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
  /** Extra classes for the root, e.g. a minimum height. Nothing inside is allowed to shrink below its size. */
  className?: string;
}

export default function EmptyState({ title, Icon, children, onSample, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-8 text-center ${className}`}>
      {Icon && <Icon className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden />}
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-slate-600">{children}</p>
      {onSample && <SampleButtons onSample={onSample} />}
    </div>
  );
}
