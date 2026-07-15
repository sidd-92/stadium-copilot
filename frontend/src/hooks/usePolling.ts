import { useEffect, useRef, useState } from "react";

// Generic polling hook: re-fetches on an interval, keeps last-known-good
// data on error (so a transient failure doesn't blank the screen), and
// stops cleanly on unmount. Used for order status and live match score.
//
// deps is intentionally caller-supplied (not a static literal), so the
// effect below re-runs whenever the caller's own dependency list changes —
// react-hooks/exhaustive-deps can't verify a dynamic array statically, so
// it's disabled for this file in .oxlintrc.json rather than suppressed
// per-line.
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function tick() {
      try {
        const result = await fetcherRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, deps);

  return { data, error, loading };
}
