import { FileText, Table } from 'lucide-react';

type SampleKind = 'log' | 'csv';

export function SampleButtons({ onSample }: { onSample: (kind: SampleKind) => void }) {
  const btn =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
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
  children: React.ReactNode;
  onSample?: (kind: SampleKind) => void;
}

export default function EmptyState({ title, children, onSample }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-slate-500">{children}</p>
      {onSample && <SampleButtons onSample={onSample} />}
    </div>
  );
}
