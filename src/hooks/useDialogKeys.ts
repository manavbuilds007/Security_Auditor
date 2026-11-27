import { useEffect, type RefObject } from 'react';

/** Esc calls `onEscape`; Tab and Shift+Tab wrap focus between the dialog's enabled buttons. */
export function useDialogKeys(dialogRef: RefObject<HTMLElement | null>, onEscape: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const wrapTo =
        e.shiftKey && document.activeElement === first
          ? last
          : !e.shiftKey && document.activeElement === last
            ? first
            : null;
      if (wrapTo) {
        e.preventDefault();
        wrapTo.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogRef, onEscape]);
}
