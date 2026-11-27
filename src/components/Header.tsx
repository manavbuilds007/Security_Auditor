import { ShieldCheck, Lock } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight">PII Sanitizer</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          100% Client-Side • Zero Server Transmission
        </span>
      </div>
    </header>
  );
}
