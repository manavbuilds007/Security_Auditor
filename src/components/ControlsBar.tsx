import { Eraser, EyeOff, Shuffle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PiiType, RedactionMode } from '../utils/piiEngine';
import CategoryFilters from './CategoryFilters';
import StepHeading from './StepHeading';
import Switch from './Switch';

interface Props {
  mode: RedactionMode;
  typedTags: boolean;
  aadhaarVerhoeff: boolean;
  typeLabels: boolean;
  enabled: Record<PiiType, boolean>;
  counts: Record<PiiType, number>;
  onMode: (m: RedactionMode) => void;
  onTypedTags: (v: boolean) => void;
  onAadhaarVerhoeff: (v: boolean) => void;
  onTypeLabels: (v: boolean) => void;
  onToggleType: (t: PiiType) => void;
}

const MODES: { id: RedactionMode; label: string; summary: string; Icon: LucideIcon }[] = [
  {
    id: 'full',
    label: 'Full mask',
    summary: 'Every match becomes [REDACTED]. Nothing of the original survives. The safest option.',
    Icon: EyeOff,
  },
  {
    id: 'partial',
    label: 'Partial mask',
    summary: 'Keeps just enough to recognise the item, e.g. j***@domain.com or XXXX-XXXX-XXXX-1234.',
    Icon: Eraser,
  },
  {
    id: 'pseudonym',
    label: 'Pseudonymize',
    summary:
      'Each distinct value gets a stable token (USER_01, CARD_01). The same email or card always gets the same token, so you can still follow one customer through a log. Tokens restart every run and nothing is saved.',
    Icon: Shuffle,
  },
];

export default function ControlsBar(p: Props) {
  const index = MODES.findIndex((m) => m.id === p.mode);
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-100/60 p-4" aria-label="Redaction settings">
      <StepHeading n={2} title="Choose how to redact" />

      <div
        role="radiogroup"
        aria-label="Redaction mode"
        className="relative mt-3 grid w-full overflow-hidden rounded-lg border border-slate-300 bg-white [grid-template-columns:repeat(3,1fr)] sm:inline-grid sm:w-auto"
      >
        {/* Sliding highlight behind the active option. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3 bg-slate-900 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={p.mode === id}
            onClick={() => p.onMode(id)}
            className={`relative z-10 flex flex-col items-center justify-center gap-1 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:flex-row sm:gap-2 sm:px-5 ${
              p.mode === id ? 'text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <p key={p.mode} className="animate-fade-in mt-3 max-w-3xl text-[13px] leading-relaxed text-slate-700" aria-live="polite">
        {MODES[index].summary}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Switch
          checked={p.typedTags}
          disabled={p.mode !== 'full'}
          onChange={p.onTypedTags}
          label="Label what was removed"
          description={
            p.mode === 'full'
              ? 'Full mask writes [REDACTED_EMAIL] instead of a plain [REDACTED].'
              : 'Full mask only: switch to Full mask to use it.'
          }
        />
        <Switch
          checked={p.aadhaarVerhoeff}
          onChange={p.onAadhaarVerhoeff}
          label="Aadhaar Verhoeff check"
          description="Leave 12-digit numbers that fail the Aadhaar checksum unchanged. Off by default, so typos are still redacted."
        />
        <Switch
          checked={p.typeLabels}
          onChange={p.onTypeLabels}
          label="Type labels on highlights"
          description="Print the type (EMAIL, CARD…) on each highlight in the Sanitized pane, so colour is not the only cue."
        />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <CategoryFilters enabled={p.enabled} counts={p.counts} onToggle={p.onToggleType} />
      </div>
    </section>
  );
}
