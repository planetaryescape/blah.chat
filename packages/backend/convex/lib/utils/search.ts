import type { Doc } from "../../_generated/dataModel";

/**
 * Default source weights for RRF merging.
 * Knowledge bank gets highest weight, conversations lowest.
 */
export const DEFAULT_SOURCE_WEIGHTS: Record<string, number> = {
  knowledgeBank: 1.5,
  files: 1.2,
  notes: 1.0,
  tasks: 1.0,
  conversations: 0.8,
};

/**
 * RRF (Reciprocal Rank Fusion) merge.
 * Combines rankings from multiple sources with boost for overlapping results.
 * Optionally applies source-based weights when items have a `source` field.
 */
export function applyRRF<
  T extends { _id: { toString(): string }; source?: string },
>(
  textResults: T[],
  vectorResults: T[],
  k = 60,
  sourceWeights?: Record<string, number>,
): (T & { score: number })[] {
  const scores = new Map<string, { score: number; item: T }>();

  const getWeight = (item: T): number => {
    if (!sourceWeights || !item.source) return 1.0;
    return sourceWeights[item.source] ?? 1.0;
  };

  textResults.forEach((item, idx) => {
    const id = item._id.toString();
    const weight = getWeight(item);
    scores.set(id, { score: weight * (1 / (k + idx + 1)), item });
  });

  vectorResults.forEach((item, idx) => {
    const id = item._id.toString();
    const weight = getWeight(item);
    const score = weight * (1 / (k + idx + 1));
    const existing = scores.get(id);
    if (existing) {
      existing.score += score; // Boost overlapping results
    } else {
      scores.set(id, { score, item });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, score }));
}

/**
 * RRF merge for messages (typed version).
 */
export function mergeMessagesWithRRF(
  textResults: Doc<"messages">[],
  vectorResults: Doc<"messages">[],
  limit: number,
  k = 60,
): Doc<"messages">[] {
  const merged = applyRRF(textResults, vectorResults, k);
  return merged
    .slice(0, limit)
    .map(({ score, ...item }) => item as Doc<"messages">);
}
