import type { Doc } from "../../_generated/dataModel";

/**
 * RRF (Reciprocal Rank Fusion) merge.
 * Combines rankings from multiple sources with boost for overlapping results.
 */
export function applyRRF<T extends { _id: { toString(): string } }>(
  textResults: T[],
  vectorResults: T[],
  k = 60,
): (T & { score: number })[] {
  const scores = new Map<string, { score: number; item: T }>();

  textResults.forEach((item, idx) => {
    const id = item._id.toString();
    scores.set(id, { score: 1 / (k + idx + 1), item });
  });

  vectorResults.forEach((item, idx) => {
    const id = item._id.toString();
    const score = 1 / (k + idx + 1);
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
