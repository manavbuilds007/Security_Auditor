import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { SCENARIOS, type Scenario } from '../data/globeScenarios';

interface TabsProps {
  active: number;
  onSelect: (scenario: number) => void;
}

/** Region tabs under the globe. */
export function ScenarioTabs({ active, onSelect }: TabsProps) {
  return (
    <div role="tablist" aria-label="Leak scenarios" className="mt-2 flex flex-wrap justify-center gap-2">
      {SCENARIOS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={i === active}
          onClick={() => onSelect(i)}
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
  );
}

interface CardProps {
  scenario: Scenario;
  /** Show the auto-advance progress bar. */
  progress: boolean;
}

/** The leak description and the "scrubbed locally" outcome for the selected region. */
export function ScenarioCard({ scenario, progress }: CardProps) {
  return (
    <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-2 lg:self-start">
      <div
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
        {progress && (
          <span
            aria-hidden
            className="animate-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#34d399]/70"
          />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-[#94a3b8]">
        Illustrative scenarios. No real incidents or data are shown.
      </p>
    </div>
  );
}
