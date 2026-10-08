import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';

interface Snapshot<T> {
  key: string;
  data?: T;
  error?: string;
}

export interface Resource<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
}

/**
 * Loads one resource (a record, a zone, or one page of a list).
 *
 * `key` must change whenever the query changes (id, filters, page, sort). While a new key is loading
 * the previous data stays available, so tables dim instead of flashing empty.
 */
export function useResource<T>(load: () => Promise<T>, key: string): Resource<T> {
  const { dataVersion } = useApp();
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<T>>();
  const loadRef = useRef(load);
  // dataVersion changes when the demo data is reset, which refetches every mounted resource.
  const requestKey = `${key}#${version}#${dataVersion}`;

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;
    loadRef
      .current()
      .then((data) => active && setSnapshot({ key: requestKey, data }))
      .catch((error: Error) => active && setSnapshot((previous) => ({ key: requestKey, data: previous?.data, error: error.message })));
    return () => {
      active = false;
    };
  }, [requestKey]);

  return {
    data: snapshot?.data,
    loading: snapshot?.key !== requestKey,
    error: snapshot?.key === requestKey ? snapshot.error : undefined,
    reload: () => setVersion((current) => current + 1),
  };
}
