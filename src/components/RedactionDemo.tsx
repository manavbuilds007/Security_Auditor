import { useEffect, useRef, useState } from 'react';
import { sanitize, type RedactionMode } from '../utils/piiEngine';
import { HOW_IT_WORKS_EXAMPLE } from '../data/sampleData';
import { prefersReducedMotion } from '../hooks/motion';
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

/** Auto-plays original → full → partial → pseudonym; clicking a tab takes over. */
export default function RedactionDemo() {
  const [phase, setPhase] = useState<Phase>('original');
  const manual = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (manual.current) return;
      setPhase((p) => PHASES[(PHASES.findIndex((x) => x.id === p) + 1) % PHASES.length].id);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div role="tablist" aria-label="Redaction demo" className="flex flex-wrap gap-1">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={phase === p.id}
            onClick={() => {
              manual.current = true;
              setPhase(p.id);
            }}
            className={`press rounded-full px-2.5 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              phase === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-16 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-800" aria-live="off">
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
