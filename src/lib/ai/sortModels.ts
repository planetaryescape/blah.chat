import type { ModelConfig } from "@/lib/ai/utils";

export function sortModels(
  models: ModelConfig[],
  defaultModelId: string | undefined,
  favoriteIds: string[],
  recentIds: string[] = [],
) {
  const defaultModel = models.find((m) => m.id === defaultModelId);

  const favorites = models
    .filter((m) => favoriteIds.includes(m.id) && m.id !== defaultModelId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const recents = models.filter(
    (m) =>
      recentIds.includes(m.id) &&
      m.id !== defaultModelId &&
      !favoriteIds.includes(m.id)
  ).sort((a, b) => {
    // Sort by index in recentIds to maintain recency order
    return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
  });

  const rest = models.filter(
    (m) =>
      m.id !== defaultModelId &&
      !favoriteIds.includes(m.id) &&
      !recentIds.includes(m.id),
  );

  return { defaultModel, favorites, recents, rest };
}
