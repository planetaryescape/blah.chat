import { createMemo, createSignal } from "solid-js";

interface FuzzyMatch<T> {
  item: T;
  score: number;
  indices: number[];
}

interface UseFuzzySearchOptions<T> {
  items: () => T[];
  getSearchText: (item: T) => string;
  minScore?: number;
}

interface UseFuzzySearchResult<T> {
  query: () => string;
  setQuery: (query: string) => void;
  results: () => T[];
  matches: () => FuzzyMatch<T>[];
  isSearching: () => boolean;
}

function fuzzyMatch(
  needle: string,
  haystack: string,
): { score: number; indices: number[] } | null {
  const needleLower = needle.toLowerCase();
  const haystackLower = haystack.toLowerCase();

  if (needleLower.length === 0) return { score: 1, indices: [] };
  if (needleLower.length > haystackLower.length) return null;

  const indices: number[] = [];
  let score = 0;
  let haystackIdx = 0;
  let prevMatchIdx = -1;

  for (let needleIdx = 0; needleIdx < needleLower.length; needleIdx++) {
    const needleChar = needleLower[needleIdx];
    let found = false;

    while (haystackIdx < haystackLower.length) {
      if (haystackLower[haystackIdx] === needleChar) {
        indices.push(haystackIdx);

        if (prevMatchIdx !== -1 && haystackIdx === prevMatchIdx + 1) {
          score += 2;
        } else {
          score += 1;
        }

        if (haystackIdx === 0 || /[\s\-_./]/.test(haystack[haystackIdx - 1])) {
          score += 1;
        }

        if (haystack[haystackIdx] === needle[needleIdx]) {
          score += 0.5;
        }

        prevMatchIdx = haystackIdx;
        haystackIdx++;
        found = true;
        break;
      }
      haystackIdx++;
    }

    if (!found) return null;
  }

  const normalizedScore =
    score / (needleLower.length + haystackLower.length * 0.1);
  return { score: normalizedScore, indices };
}

export function useFuzzySearch<T>({
  items,
  getSearchText,
  minScore = 0,
}: UseFuzzySearchOptions<T>): UseFuzzySearchResult<T> {
  const [query, setQuery] = createSignal("");

  const computed = createMemo(() => {
    const trimmedQuery = query().trim();

    if (trimmedQuery.length === 0) {
      return {
        results: items(),
        matches: items().map((item) => ({
          item,
          score: 1,
          indices: [] as number[],
        })),
        isSearching: false,
      };
    }

    const matchResults: FuzzyMatch<T>[] = [];

    for (const item of items()) {
      const text = getSearchText(item);
      const match = fuzzyMatch(trimmedQuery, text);

      if (match && match.score >= minScore) {
        matchResults.push({ item, score: match.score, indices: match.indices });
      }
    }

    matchResults.sort((a, b) => b.score - a.score);

    return {
      results: matchResults.map((m) => m.item),
      matches: matchResults,
      isSearching: true,
    };
  });

  return {
    query,
    setQuery,
    results: () => computed().results,
    matches: () => computed().matches,
    isSearching: () => computed().isSearching,
  };
}
