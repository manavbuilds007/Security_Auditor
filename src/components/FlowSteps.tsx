import { ArrowRight, CheckCircle2, FileWarning, ShieldCheck } from 'lucide-react';

const STEPS = [
  { Icon: FileWarning, title: 'Raw Document', sample: '4111 1111 1111 1111', tone: 'text-[#fda4af]' },
  { Icon: ShieldCheck, title: 'In-Browser Scrubbing', sample: 'Luhn ✓ → masked', tone: 'text-[#6ee7b7]' },
  { Icon: CheckCircle2, title: 'Safe to Share', sample: 'XXXX-XXXX-XXXX-1111', tone: 'text-[#7dd3fc]' },
];

/** The three-step raw -> scrubbed -> safe flow shown in the intro. */
export default function FlowSteps() {
  return (
    <ol className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch" aria-label="How it works">
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
        if (i === STEPS.length - 1) return [card];
        return [
          card,
          <li key={`arrow-${title}`} aria-hidden className="hidden items-center text-[#475569] sm:flex">
            <ArrowRight className="h-4 w-4" />
          </li>,
        ];
      })}
    </ol>
  );
}
