import { Eraser, EyeOff, HelpCircle, Shuffle } from 'lucide-react';
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

const MODES: { id: RedactionMode; label: string; tip: string; summary: string; Icon: LucideIcon }[] = [
  {
    id: 'full',
    label: 'Full mask',
    tip: 'Replace every match with [REDACTED]. The safest option: no part of the original value survives.',
    summary: 'Every match becomes [REDACTED]. Nothing of the original survives.',
    Icon: EyeOff,
  },
  {
    id: 'partial',
    label: 'Partial mask',
    tip: 'Keep a little harmless context, e.g. j***@domain.com or XXXX-XXXX-XXXX-1234. Handy for support work where you must recognise the item.',
    summary: 'Keeps minimal context, e.g. j***@domain.com or XXXX-XXXX-XXXX-1234, so items stay recognisable.',
    Icon: Eraser,
  },
  {
    id: 'pseudonym',
    label: 'Pseudonymize',
    tip: 'Replace each distinct value with a stable token such as USER_01 or CARD_01. The same email or card always gets the same token, so you can still follow one customer through a log. Tokens restart every run and no mapping is saved.',
    summary: 'Each distinct value gets a stable token (USER_01, CARD_01). Repeats match, so you can still follow one customer through a log.',
    Icon: Shuffle,
  },
];

const TYPED_TAGS_TIP =
  'Label what was removed: [REDACTED_EMAIL] or [REDACTED_CARD] instead of a plain [REDACTED]. Only applies to Full mask.';
const VERHOEFF_TIP =
  'Aadhaar numbers end in a checksum digit (Verhoeff). When on, 12-digit numbers that fail it are treated as false positives and left unchanged. Off by default, so typos and test numbers are still redacted (the safer choice).';

export default function ControlsBar({ mode, typedTags, aadhaarVerhoeff, onMode, onTypedTags, onAadhaarVerhoeff }: Props) {
  const index = MODES.findIndex((m) => m.id === mode);
  const current = MODES[index];
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-3 py-2.5" aria-label="Redaction settings">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 className="text-sm font-semibold">2. Choose how to redact</h2>
        <div
          role="radiogroup"
          aria-label="Redaction mode"
          className="relative inline-grid overflow-hidden rounded-md border border-slate-300 [grid-template-columns:repeat(3,1fr)]"
        >
          {/* Sliding highlight behind the active option. */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3 bg-slate-900 transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{ transform: `translateX(${index * 100}%)` }}
          />
          {MODES.map(({ id, label, tip, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              title={tip}
              onClick={() => onMode(id)}
              className={`relative z-10 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                mode === id ? 'text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
            </button>
          ))}
        </div>

        <label
          className={`flex items-center gap-2 text-xs ${mode === 'full' ? 'text-slate-700' : 'text-slate-400'}`}
          title={mode === 'full' ? TYPED_TAGS_TIP : `${TYPED_TAGS_TIP} (Switch to Full mask to use it.)`}
        >
          <input type="checkbox" checked={typedTags} disabled={mode !== 'full'} onChange={(e) => onTypedTags(e.target.checked)} />
          Label what was removed
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700" title={VERHOEFF_TIP}>
          <input type="checkbox" checked={aadhaarVerhoeff} onChange={(e) => onAadhaarVerhoeff(e.target.checked)} />
          Aadhaar Verhoeff check
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </label>
      </div>
      <p key={mode} className="animate-fade-in mt-2 text-xs text-slate-600" aria-live="polite">
        {current.summary}
        {mode === 'full' && typedTags && ' Tags show the type, e.g. [REDACTED_EMAIL].'}
        {aadhaarVerhoeff && ' Aadhaar numbers failing the Verhoeff checksum are left unchanged.'}
      </p>
    </section>
  );
}
