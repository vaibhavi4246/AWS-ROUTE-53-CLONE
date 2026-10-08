import { useEffect } from 'react';
import { crumbStore } from '@/lib/crumbStore';

/** Publishes the dynamic last breadcrumb (e.g. the hosted zone name) while the calling page is mounted. */
export function useCrumbLabel(label: string | undefined) {
  useEffect(() => {
    crumbStore.set(label);
    return () => crumbStore.set(undefined);
  }, [label]);
}
