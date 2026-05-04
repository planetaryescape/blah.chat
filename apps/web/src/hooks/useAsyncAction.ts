import { useCallback, useEffect, useRef, useState } from "react";

export type UseAsyncActionOptions = {
  onError?: (err: unknown) => void;
  rethrow?: boolean;
};

export type UseAsyncActionReturn<TArgs extends unknown[], TResult> = {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
  error: unknown;
  reset: () => void;
};

export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts: UseAsyncActionOptions = {},
): UseAsyncActionReturn<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fnRef = useRef(fn);
  const optsRef = useRef(opts);
  useEffect(() => {
    fnRef.current = fn;
    optsRef.current = opts;
  });

  const run = useCallback((...args: TArgs): Promise<TResult | undefined> => {
    setIsPending(true);
    setError(null);
    return fnRef
      .current(...args)
      .catch((err: unknown) => {
        setError(err);
        optsRef.current.onError?.(err);
        if (optsRef.current.rethrow) throw err;
        return undefined as TResult | undefined;
      })
      .finally(() => setIsPending(false));
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsPending(false);
  }, []);

  return { run, isPending, error, reset };
}
