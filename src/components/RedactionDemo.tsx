import { useState } from 'react';
import { sanitize, type RedactionMode } from '../utils/piiEngine';
import { HOW_IT_WORKS_EXAMPLE } from '../data/sampleData';
import { CATEGORY_STYLES } from './categoryStyles';

type Phase = 'original' | RedactionMode;

const PHASES: { id: Phase; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'full', label: 'Full mask' },
  { id: 'partial', label: 'Partial' },
  { id: 'pseudonym', label: 'Pseudonymize' },
];

// Built with the real engine so the demo always matches what the tool does.
const BASE = sanitize(HOW_IT_WORKS_EXAMPLE, { mode: 'full' }).sourceSegments;
const REPLACEMENTS: Record<RedactionMode, (string | undefined)[]> = {
  full: BASE.map((s) => s.replacement),
  partial: sanitize(HOW_IT_WORKS_EXAMPLE, { mode: 'partial' }).sourceSegments.map((s) => s.replacement),
  pseudonym: sanitize(HOW_IT_WORKS_EXAMPLE, { mode: 'pseudonym' }).sourceSegments.map((s) => s.replacement),
};

/** One sentence in every mode. Click a tab to switch; nothing plays on its own. */
export default function RedactionDemo() {
  const [phase, setPhase] = useState<Phase>('original');

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div role="tablist" aria-label="Redaction demo" className="flex flex-wrap gap-1">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={phase === p.id}
            onClick={() => setPhase(p.id)}
            className={`press rounded-full px-3 py-1 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              phase === p.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-20 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-800">
        {BASE.map((s, i) => {
          if (s.kind !== 'match' || !s.type) return <span key={i}>{s.text}</span>;
          const text = phase === 'original' ? s.text : (REPLACEMENTS[phase][i] ?? s.text);
          return (
            <mark key={`${i}-${phase}`} className={`animate-mark-in rounded-sm px-0.5 ${CATEGORY_STYLES[s.type].mark}`}>
              {text}
            </mark>
          );
        })}
      </p>
    </div>
  );
}
