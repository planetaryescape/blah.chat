import type { ModelConfig } from "@/lib/ai/utils";

export function sortModels(
  models: ModelConfig[],
  defaultModelId: string | undefined,
  favoriteIds: string[],
) {
  const defaultModel = models.find((m) => m.id === defaultModelId);
  const favorites = models
    .filter((m) => favoriteIds.includes(m.id) && m.id !== defaultModelId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rest = models.filter(
    (m) => m.id !== defaultModelId && !favoriteIds.includes(m.id),
  );

  return { defaultModel, favorites, rest };
}
