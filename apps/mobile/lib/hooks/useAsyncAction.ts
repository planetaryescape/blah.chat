import { useCallback, useState } from "react";

/** Run a user action with handled failures; undefined denotes an unsuccessful run. */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  { onError }: { onError?: () => void } = {},
) {
  const [isPending, setIsPending] = useState(false);
  const run = useCallback(
    async (...args: TArgs) => {
      setIsPending(true);
      try {
        return await fn(...args);
      } catch {
        onError?.();
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [fn, onError],
  );
  return { run, isPending };
}
