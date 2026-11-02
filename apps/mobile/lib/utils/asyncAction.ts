/** A shared count keeps controls pending until all overlapping runs settle. */
export async function runTrackedAction<TResult>(
  activeRuns: { current: number },
  setPending: (pending: boolean) => void,
  action: () => Promise<TResult>,
  onError?: () => void,
): Promise<TResult | undefined> {
  activeRuns.current++;
  setPending(true);
  try {
    return await action();
  } catch {
    onError?.();
    return undefined;
  } finally {
    activeRuns.current--;
    setPending(activeRuns.current > 0);
  }
}
