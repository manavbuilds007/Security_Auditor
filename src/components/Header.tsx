import { Globe2, Lock, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import BrandMark from './BrandMark';

const BADGE = '100% Client-Side • Zero Server Transmission';

export default function Header({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { dark, toggle } = useTheme();
  const icon = 'absolute inset-0 m-auto h-4 w-4 transition-all duration-300';
  const round =
    'press h-9 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div aria-hidden className="h-0.5 bg-linear-to-r from-emerald-500 via-cyan-500 to-emerald-500" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <h1 className="bg-linear-to-r from-emerald-600 to-cyan-600 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            PII Sanitizer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:inline-flex">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            {BADGE}
          </span>
          <button type="button" onClick={onReplayIntro} aria-label="Replay intro" title="Replay the intro" className={`${round} inline-flex items-center gap-1.5 px-2.5 text-[13px] font-medium`}>
            <Globe2 className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">Replay Intro</span>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`${round} relative w-9`}
          >
            <Sun className={`${icon} ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} aria-hidden />
            <Moon className={`${icon} ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} aria-hidden />
          </button>
        </div>
      </div>
      {/* On phones the badge gets its own full-width line instead of wrapping inside the header. */}
      <p className="flex items-center justify-center gap-1.5 border-t border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-800 sm:hidden">
        <Lock className="h-3 w-3" aria-hidden />
        {BADGE}
      </p>
    </header>
  );
}
