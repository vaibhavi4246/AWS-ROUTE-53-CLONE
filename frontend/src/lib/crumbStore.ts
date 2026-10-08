/**
 * Tiny external store holding the dynamic breadcrumb label (e.g. the hosted zone name).
 * Pages publish it with `useCrumbLabel`; the breadcrumb bar subscribes via useSyncExternalStore.
 */
let label: string | undefined;
const listeners = new Set<() => void>();

export const crumbStore = {
  set(next: string | undefined) {
    if (label === next) return;
    label = next;
    listeners.forEach((listener) => listener());
  },
  get: () => label,
  getServerSnapshot: () => undefined as string | undefined,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
