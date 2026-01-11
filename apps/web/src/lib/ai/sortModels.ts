import type { ModelConfig } from "@/lib/ai/utils";

export function sortModels(
  models: ModelConfig[],
  defaultModelId: string | undefined,
  favoriteIds: string[],
  recentIds: string[] = [],
) {
  // Ensure arrays are never null/undefined
  const safeFavoriteIds = favoriteIds || [];
  const safeRecentIds = recentIds || [];

  const defaultModel = models.find((m) => m.id === defaultModelId);

  const favorites = models
    .filter((m) => safeFavoriteIds.includes(m.id) && m.id !== defaultModelId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const recents = models
    .filter(
      (m) =>
        safeRecentIds.includes(m.id) &&
        m.id !== defaultModelId &&
        !safeFavoriteIds.includes(m.id),
    )
    .sort((a, b) => {
      // Sort by index in recentIds to maintain recency order
      return safeRecentIds.indexOf(a.id) - safeRecentIds.indexOf(b.id);
    });

  const rest = models.filter(
    (m) =>
      m.id !== defaultModelId &&
      !safeFavoriteIds.includes(m.id) &&
      !safeRecentIds.includes(m.id),
  );

  return { defaultModel, favorites, recents, rest };
}
