import { Lock, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Header() {
  const { dark, toggle } = useTheme();
  const icon = 'absolute inset-0 m-auto h-4 w-4 transition-all duration-500';
  return (
    <header className="animate-fade-down border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 animate-float text-emerald-600" aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight">PII Sanitizer</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Lock className="h-3.5 w-3.5" aria-hidden />
            100% Client-Side • Zero Server Transmission
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="press relative h-9 w-9 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Sun className={`${icon} ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} aria-hidden />
            <Moon className={`${icon} ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
