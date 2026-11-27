import { useId } from 'react';

/** Gradient shield + check, the same emerald→cyan identity as the intro. Colours follow the theme tokens. */
export default function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--color-emerald-500)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-cyan-500)' }} />
        </linearGradient>
      </defs>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        fill={`url(#${id})`}
        fillOpacity="0.16"
        stroke={`url(#${id})`}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="m8.6 12.2 2.4 2.4 4.4-4.8" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
