import { useCallback, useState } from 'react';

/** Dark mode is a `dark` class on <html>; theme-init.js applies the saved choice before first paint. */
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = !root.classList.contains('dark');
    root.classList.add('theme-fade');
    root.classList.toggle('dark', next);
    window.setTimeout(() => root.classList.remove('theme-fade'), 400);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* storage blocked: the choice just won't persist */
    }
    setDark(next);
  }, []);

  return { dark, toggle };
}
