import { useCallback, useRef, useState } from "react";
import { runTrackedAction } from "@/lib/utils/asyncAction";

/** Run a user action with handled failures; undefined denotes an unsuccessful run. */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  { onError }: { onError?: () => void } = {},
) {
  const [isPending, setIsPending] = useState(false);
  const activeRuns = useRef(0);
  const run = useCallback(
    (...args: TArgs) =>
      runTrackedAction(activeRuns, setIsPending, () => fn(...args), onError),
    [fn, onError],
  );
  return { run, isPending };
}
