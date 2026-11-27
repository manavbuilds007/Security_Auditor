import { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** Stagger in ms. */
  delay?: number;
  className?: string;
}

/** Fades and slides its children in the first time they scroll into view. */
export default function Reveal({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: seen ? `${delay}ms` : '0ms' }}
      className={`transition duration-700 ease-out ${seen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}
