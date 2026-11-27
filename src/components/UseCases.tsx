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

export default function UseCases() {
  return (
    <aside className="grid gap-4 lg:grid-cols-[1.4fr_1fr]" aria-label="Use cases">
      <div>
        <h2 className="text-sm font-semibold">Scrub before you share</h2>
        <p className="mt-1 text-xs text-slate-600">
          Remove personal data from tickets, logs and exports before they reach an LLM, a vendor or a public thread.
          Review the result before sharing; detection is pattern-based.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {CASES.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              style={{ animationDelay: `${200 + i * 90}ms` }}
              className="group animate-fade-up rounded-lg border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-700 transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="text-xs font-semibold">{title}</h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="animate-fade-up" style={{ animationDelay: '350ms' }}>
        <h2 className="text-sm font-semibold">See it work</h2>
        <p className="mb-2 mt-1 text-xs text-slate-600">The same sentence in every mode. Click a tab to pause.</p>
        <RedactionDemo />
      </div>
    </aside>
  );
}
