export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 250;

  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === retries - 1) break;
      const delay = Math.min(2000, baseDelayMs * 2 ** i);
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
