import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { subscribeDbChanges } from './events';

/**
 * Runs an async Drizzle query and re-runs it when `key` changes, when the screen regains
 * focus, or after any write through the data layer (see events.ts). `data` stays at the
 * previous result while a refetch is in flight and is undefined only before the first load.
 */
export function useDbQuery<T>(query: () => Promise<T>, key: string = '') {
  const [state, setState] = useState<{ data?: T; error?: Error }>({});
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => subscribeDbChanges(refresh), [refresh]);
  useFocusEffect(refresh);

  useEffect(() => {
    let cancelled = false;
    query()
      .then((data) => {
        if (!cancelled) setState({ data });
      })
      .catch((e: unknown) => {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('[useDbQuery]', error);
        if (!cancelled) setState((s) => ({ ...s, error }));
      });
    return () => {
      cancelled = true;
    };
    // `query` is intentionally excluded: callers encode its inputs in `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return { data: state.data, error: state.error, refresh };
}
