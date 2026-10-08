import { useEffect, useRef } from 'react';

type Handler = (event: KeyboardEvent) => void;

/** Keys are written as 'c', '?', '/', or 'alt+s'. Plain keys are ignored while typing in a field. */
export function useHotkeys(bindings: Record<string, Handler>, enabled = true) {
  const bindingsRef = useRef(bindings);

  useEffect(() => {
    bindingsRef.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const combo = `${event.altKey ? 'alt+' : ''}${event.key.toLowerCase()}`;
      const handler = bindingsRef.current[combo];
      if (!handler) return;

      const target = event.target as HTMLElement | null;
      const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (typing && !event.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;

      event.preventDefault();
      handler(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
