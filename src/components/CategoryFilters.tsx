import { PII_TYPES, TYPE_LABELS, type PiiType } from '../utils/piiEngine';
import { CATEGORY_STYLES } from './categoryStyles';
import AnimatedNumber from './AnimatedNumber';

interface Props {
  enabled: Record<PiiType, boolean>;
  counts: Record<PiiType, number>;
  onToggle: (t: PiiType) => void;
}

export default function CategoryFilters({ enabled, counts, onToggle }: Props) {
  return (
    <div role="group" aria-labelledby="cats-label" aria-describedby="cats-help">
      <p id="cats-label" className="text-[13px] font-medium text-slate-800">
        Types to redact
      </p>
      <p id="cats-help" className="mt-0.5 text-[13px] text-slate-600">
        Each chip shows how many were found. Turn a type off to leave it unchanged.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {PII_TYPES.map((t) => {
          const on = enabled[t];
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(t)}
              className={`press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                on
                  ? CATEGORY_STYLES[t].chipOn
                  : 'border-slate-300 bg-white text-slate-600 line-through decoration-slate-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${on ? CATEGORY_STYLES[t].dot : 'bg-slate-300'}`} aria-hidden />
              {TYPE_LABELS[t]}
              <span className="font-semibold">
                <AnimatedNumber value={counts[t]} />
              </span>
              <span className="sr-only">{on ? ', redacting' : ', not redacting'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
