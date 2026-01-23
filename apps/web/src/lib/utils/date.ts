// Re-export from shared package
export * from "@blah-chat/shared/utils";

import { formatDateToISO, getLastNDays } from "@blah-chat/shared/utils";

/** Get validated date range from localStorage, reset if stale (browser-only) */
export function getValidatedDateRange(
  storageKey: string,
  defaultDays = 30,
): { startDate: string; endDate: string } {
  const freshRange = getLastNDays(defaultDays);
  if (typeof window === "undefined") return freshRange;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return freshRange;

    const parsed = JSON.parse(stored) as { startDate: string; endDate: string };
    if (parsed.endDate < formatDateToISO(new Date())) {
      localStorage.removeItem(storageKey);
      return freshRange;
    }
    return parsed;
  } catch {
    return freshRange;
  }
}
