import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../hooks/motion';

/** Counts smoothly from the previous value to the new one. */
export default function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || current.current === value) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    const duration = 500;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      current.current = Math.round(from + (value - from) * eased);
      setShown(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="tabular-nums">{shown}</span>;
}
