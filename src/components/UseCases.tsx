import { Bot, Bug, FileSpreadsheet, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import RedactionDemo from './RedactionDemo';

const CASES: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Bot,
    title: 'Ask an LLM',
    body: 'Strip customer emails, cards and IDs from tickets and logs before asking an AI to summarise or debug them.',
  },
  {
    Icon: Send,
    title: 'Send to a vendor',
    body: 'Share traces and exports with a third-party support team without leaking IPs, phones or government IDs.',
  },
  {
    Icon: FileSpreadsheet,
    title: 'Share a CSV',
    body: 'Rows, columns and delimiters stay intact. Pseudonyms keep duplicates and joins visible.',
  },
  {
    Icon: Bug,
    title: 'File a public bug',
    body: 'Paste real logs into an open issue after scrubbing, so the repro stays useful and the people stay private.',
  },
];

/** Supporting content, shown below the tool. Cards are informational, so they do not react to hover. */
export default function UseCases() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="usecases-heading">
      <div>
        <h2 id="usecases-heading" className="text-lg font-semibold tracking-tight">
          Scrub before you share
        </h2>
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-slate-700">
          Remove personal data from tickets, logs and exports before they reach an LLM, a vendor or a public thread.
          Review the result before sharing; detection is pattern-based.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {CASES.map(({ Icon, title, body }) => (
            <li key={title} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="text-sm font-semibold">{title}</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">See it work</h2>
        <p className="mb-3 mt-1 text-[13px] text-slate-700">The same sentence in every mode. Click a tab to compare.</p>
        <RedactionDemo />
      </div>
    </section>
  );
}
