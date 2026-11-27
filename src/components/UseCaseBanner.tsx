import { Info } from 'lucide-react';

export default function UseCaseBanner() {
  return (
    <aside className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <strong>Typical use:</strong> scrub support tickets, logs or CSV exports before pasting them into an LLM or
        sending them to a vendor. Pseudonym mode keeps the same person or card as the same token throughout, so
        the data stays useful for debugging. Review the result before sharing; detection is pattern-based.
      </p>
    </aside>
  );
}
