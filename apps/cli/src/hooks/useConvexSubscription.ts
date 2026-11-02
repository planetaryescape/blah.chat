import { createEffect, createSignal, onCleanup } from "solid-js";
import { useConvex } from "../providers/ConvexProvider.js";

interface SubscriptionResult<T> {
  data: () => T | undefined;
  error: () => Error | null;
  isLoading: () => boolean;
}

export function useConvexSubscription<T>(
  query: unknown,
  args: () => Record<string, unknown>,
): SubscriptionResult<T> {
  const { client, apiKey } = useConvex();
  const [data, setData] = createSignal<T | undefined>(undefined);
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(() => {
    const currentArgs = args();
    setError(null);

    const unsubscribe = client.onUpdate(
      query as Parameters<typeof client.onUpdate>[0],
      { ...currentArgs, apiKey },
      (result: T) => {
        setData(() => result);
        setError(null);
      },
      (err: Error) => {
        setError(err);
      },
    );

    onCleanup(() => {
      unsubscribe();
    });
  });

  return {
    data,
    error,
    isLoading: () => data() === undefined && error() === null,
  };
}
