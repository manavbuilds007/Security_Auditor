import { Eraser, EyeOff, Shuffle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RedactionMode } from '../utils/piiEngine';

interface Props {
  mode: RedactionMode;
  typedTags: boolean;
  aadhaarVerhoeff: boolean;
  onMode: (m: RedactionMode) => void;
  onTypedTags: (v: boolean) => void;
  onAadhaarVerhoeff: (v: boolean) => void;
}

const MODES: { id: RedactionMode; label: string; hint: string; Icon: LucideIcon }[] = [
  { id: 'full', label: 'Full mask', hint: '[REDACTED]', Icon: EyeOff },
  { id: 'partial', label: 'Partial mask', hint: 'j***@domain.com, XXXX-XXXX-1234', Icon: Eraser },
  { id: 'pseudonym', label: 'Pseudonymize', hint: 'USER_01, CARD_01 (consistent per value)', Icon: Shuffle },
];

export default function ControlsBar({ mode, typedTags, aadhaarVerhoeff, onMode, onTypedTags, onAadhaarVerhoeff }: Props) {
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5" aria-label="Redaction settings">
      <div role="radiogroup" aria-label="Redaction mode" className="inline-flex overflow-hidden rounded-md border border-slate-300">
        {MODES.map(({ id, label, hint, Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            title={hint}
            onClick={() => onMode(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
              mode === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <label className={`flex items-center gap-2 text-xs ${mode === 'full' ? 'text-slate-700' : 'text-slate-400'}`}>
        <input type="checkbox" checked={typedTags} disabled={mode !== 'full'} onChange={(e) => onTypedTags(e.target.checked)} />
        Typed tags (<code>[REDACTED_EMAIL]</code>)
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-700" title="Reject 12-digit numbers that fail the Verhoeff checksum">
        <input type="checkbox" checked={aadhaarVerhoeff} onChange={(e) => onAadhaarVerhoeff(e.target.checked)} />
        Aadhaar Verhoeff check
      </label>
    </section>
  );
}
