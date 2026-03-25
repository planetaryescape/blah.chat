export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let i = 0; i < left.length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    dot += l * r;
    leftNorm += l * l;
    rightNorm += r * r;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function mergeByRrf<T extends { id: string }>(
  textResults: Array<T>,
  vectorResults: Array<T>,
  limit: number,
): Array<T> {
  const k = 60;
  const scores = new Map<string, { item: T; score: number }>();

  textResults.forEach((item, index) => {
    scores.set(item.id, {
      item,
      score: 1 / (k + index + 1),
    });
  });

  vectorResults.forEach((item, index) => {
    const existing = scores.get(item.id);
    const score = 1 / (k + index + 1);
    if (existing) {
      existing.score += score;
      return;
    }
    scores.set(item.id, { item, score });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
