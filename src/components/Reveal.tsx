import { useEffect, useRef, useState } from 'react';
import { shouldReveal } from '../utils/reveal';

interface Props {
  children: React.ReactNode;
  /** Stagger in ms. */
  delay?: number;
  className?: string;
}

/**
 * Fades and slides its children in once they reach the viewport. It checks on every scroll rather than using an
 * IntersectionObserver, because an observer never fires for a block you jump past (End key, scrollbar drag)
 * and would leave it invisible. Anything at or above the viewport is revealed.
 */
export default function Reveal({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const check = () => {
      const el = ref.current;
      if (el && shouldReveal(el.getBoundingClientRect().top, window.innerHeight)) setSeen(true);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [seen]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: seen ? `${delay}ms` : '0ms' }}
      className={`transition duration-500 ease-out ${seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}
