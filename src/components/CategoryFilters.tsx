import { PII_TYPES, TYPE_LABELS, type PiiType } from '../utils/piiEngine';
import { CATEGORY_STYLES } from './categoryStyles';

interface Props {
  enabled: Record<PiiType, boolean>;
  counts: Record<PiiType, number>;
  onToggle: (t: PiiType) => void;
}

export default function CategoryFilters({ enabled, counts, onToggle }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Categories to redact">
      <span className="text-xs font-medium text-slate-500">Redact:</span>
      {PII_TYPES.map((t) => {
        const on = enabled[t];
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(t)}
            title={on ? `Click to leave ${TYPE_LABELS[t]} unredacted` : `Click to redact ${TYPE_LABELS[t]}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              on ? CATEGORY_STYLES[t].chipOn : 'border-slate-200 bg-white text-slate-400 line-through'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${on ? CATEGORY_STYLES[t].dot : 'bg-slate-300'}`} aria-hidden />
            {TYPE_LABELS[t]}
            <span className="tabular-nums">{counts[t]}</span>
          </button>
        );
      })}
    </div>
  );
}
