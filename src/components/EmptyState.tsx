import { FileText, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SampleKind = 'log' | 'csv';

export function SampleButtons({ onSample }: { onSample: (kind: SampleKind) => void }) {
  const btn =
    'press inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button type="button" onClick={() => onSample('log')} className={`${btn} bg-slate-900 text-white hover:bg-slate-700`}>
        <FileText className="h-3.5 w-3.5" aria-hidden /> Try the sample log
      </button>
      <button
        type="button"
        onClick={() => onSample('csv')}
        className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
      >
        <Table className="h-3.5 w-3.5" aria-hidden /> Try the sample CSV
      </button>
    </div>
  );
}

interface Props {
  title: string;
  Icon?: LucideIcon;
  children: React.ReactNode;
  onSample?: (kind: SampleKind) => void;
}

export default function EmptyState({ title, Icon, children, onSample }: Props) {
  return (
    <div className="animate-fade-in flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      {Icon && <Icon className="h-8 w-8 animate-float text-emerald-500" aria-hidden />}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-slate-500">{children}</p>
      {onSample && <SampleButtons onSample={onSample} />}
    </div>
  );
}
