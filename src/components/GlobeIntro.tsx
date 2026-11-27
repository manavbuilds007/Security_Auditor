import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, FileWarning, Rocket, ShieldCheck, TriangleAlert } from 'lucide-react';
import { prefersReducedMotion } from '../hooks/motion';
import { SCENARIOS } from '../data/globeScenarios';
import InteractiveGlobe from './InteractiveGlobe';

const INTRO_STORAGE_KEY = 'pii-intro-dismissed';

/** Remembered across visits (localStorage); the header's Replay Intro button always brings it back. */
export function introAlreadySeen(): boolean {
  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    /* storage blocked: the intro will just show again next visit */
  }
}

const AUTO_MS = 5600;
const STEPS = [
  { Icon: FileWarning, title: 'Raw Document', sample: '4111 1111 1111 1111', tone: 'text-[#fda4af]' },
  { Icon: ShieldCheck, title: 'In-Browser Scrubbing', sample: 'Luhn ✓ → masked', tone: 'text-[#6ee7b7]' },
  { Icon: CheckCircle2, title: 'Safe to Share', sample: 'XXXX-XXXX-XXXX-1111', tone: 'text-[#7dd3fc]' },
];

export default function GlobeIntro({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(() => !prefersReducedMotion());
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, prefersReducedMotion() ? 0 : 450);
  }, [onClose]);

  // Esc closes; Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (!items.length) return;
        const first = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Focus the primary action, and hand focus back to whatever opened the intro when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    launchRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Auto-advance stops for good once the user picks something, and waits while they drag.
  useEffect(() => {
    if (!auto || dragging) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % SCENARIOS.length), AUTO_MS);
    return () => window.clearInterval(id);
  }, [auto, dragging]);

  const select = useCallback((i: number) => {
    setAuto(false);
    setActive(i);
  }, []);

  const scenario = SCENARIOS[active];
  const ink = 'text-[#e2e8f0]';
  const muted = 'text-[#94a3b8]';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#050b18] ${ink} ${leaving ? 'animate-intro-out' : 'animate-fade-in'}`}
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 75% 40%, rgba(14,116,144,0.28), transparent 70%), radial-gradient(45% 40% at 10% 90%, rgba(16,185,129,0.14), transparent 70%), radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 28px 28px',
      }}
    >
      <button
        type="button"
        onClick={close}
        className="press fixed right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#94a3b8] hover:bg-white/10 hover:text-[#f8fafc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]"
      >
        Skip to Sanitizer <ArrowRight className="h-4 w-4" aria-hidden />
        <kbd className="hidden rounded border border-[#334155] px-1.5 text-[10px] font-medium text-[#94a3b8] sm:inline">
          Esc
        </kbd>
      </button>

      {/* Phones: globe first (so the main visual is above the fold), then the pitch, then the scenario card.
          Desktop: pitch on the left, globe over scenario card on the right. */}
      <div className="mx-auto grid min-h-full max-w-7xl items-center gap-x-10 gap-y-6 px-5 pb-10 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-y-3 lg:py-10">
        {/* Value proposition */}
        <div className="order-2 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-[#065f46] bg-[#022c22]/70 px-3 py-1 text-xs font-medium text-[#6ee7b7]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 100% Client-Side • Zero Server Transmission
          </span>
          <h2
            id="intro-title"
            className="animate-fade-up mt-4 text-4xl font-bold leading-tight tracking-tight text-[#f8fafc] sm:text-5xl"
            style={{ animationDelay: '80ms' }}
          >
            Leaks happen at the paste.{' '}
            <span className="bg-linear-to-r from-[#34d399] to-[#38bdf8] bg-clip-text text-transparent">
              Sanitize before you share.
            </span>
          </h2>
          <p
            className={`animate-fade-up mt-4 max-w-xl text-base leading-relaxed ${muted}`}
            style={{ animationDelay: '160ms' }}
          >
            Tickets, logs and spreadsheets get pasted into AI tools and vendor portals every day. PII Sanitizer scrubs
            them in your browser first, so the raw data never leaves your machine.
          </p>

          <div className="animate-fade-up mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            <button
              ref={launchRef}
              type="button"
              onClick={close}
              className="press inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-base font-semibold text-[#022c22] shadow-lg shadow-[#10b981]/25 hover:bg-[#34d399] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a7f3d0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050b18]"
            >
              <Rocket className="h-5 w-5" aria-hidden /> Launch Sanitizer
            </button>
            <span className={`text-xs ${muted}`}>No sign-up. No uploads. Nothing stored.</span>
          </div>

          <ol
            className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch"
            aria-label="How it works"
          >
            {STEPS.flatMap(({ Icon, title, sample, tone }, i) => {
              const card = (
                <li
                  key={title}
                  style={{ animationDelay: `${i * 1500}ms` }}
                  className="animate-step-glow rounded-xl border border-white/10 bg-[#0b1426]/80 p-3"
                >
                  <Icon className={`h-5 w-5 ${tone}`} aria-hidden />
                  <p className="mt-2 text-sm font-semibold text-[#f1f5f9]">{title}</p>
                  <p className={`mt-1 font-mono text-[11px] ${tone}`}>{sample}</p>
                </li>
              );
              return i < STEPS.length - 1
                ? [
                    card,
                    <li key={`arrow-${i}`} aria-hidden className="hidden items-center text-[#475569] sm:flex">
                      <ArrowRight className="h-4 w-4" />
                    </li>,
                  ]
                : [card];
            })}
          </ol>
        </div>

        {/* Globe + region tabs */}
        <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:self-end">
          <InteractiveGlobe active={active} onSelect={select} onDragChange={setDragging} />

          <div role="tablist" aria-label="Leak scenarios" className="mt-2 flex flex-wrap justify-center gap-2">
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => select(i)}
                className={`press rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399] ${
                  i === active
                    ? 'border-[#fb7185] bg-[#4c0519]/70 text-[#ffe4e6]'
                    : 'border-[#334155] text-[#94a3b8] hover:border-[#64748b]'
                }`}
              >
                {s.region}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario card */}
        <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-2 lg:self-start">
          <div
            key={active}
            role="tabpanel"
            className="animate-fade-up relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b1426]/85 p-4 backdrop-blur"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#fda4af]">
              <TriangleAlert className="h-3.5 w-3.5 animate-pulse" aria-hidden />
              Leak risk · {scenario.cities.map((c) => c.city).join(' / ')}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#e2e8f0]">{scenario.leak}</p>
            <p
              className="animate-fade-up mt-3 flex items-start gap-2 text-sm font-semibold text-[#6ee7b7]"
              style={{ animationDelay: '1100ms' }}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {scenario.outcome}
            </p>
            {auto && !dragging && (
              <span
                aria-hidden
                className="animate-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#34d399]/70"
              />
            )}
          </div>
          <p className={`mt-2 text-center text-[11px] ${muted}`}>
            Illustrative scenarios. No real incidents or data are shown.
          </p>
        </div>
      </div>
    </div>
  );
}
