# Phase 4: Advanced (Optional)

**Timeline**: Week 4+
**Issues**: 13
**Dependencies**: Phase 2 Issue 11 (LLM Reranking)
**Priority**: P3 (Nice to have)

---

## Context

### Prerequisites
Required:
- [x] Issue 11: LLM Reranking implemented (Phase 2)

Recommended:
- All Phase 1-3 issues complete for production stability

### Current State After Phase 1-3
The search system now has:
- Unified search with knowledge bank prioritized (1.5x weight)
- Quality scoring and early return for high-confidence results
- Diminishing returns detection
- LLM reranking for low-quality results
- Budget tracking and awareness
- Rate limiting per tool
- Context management with summarization
- Ask-user heuristic when stuck

### Remaining Optimization
Single query may miss relevant results due to vocabulary mismatch. Query expansion can help find results that use different terminology.

### Key Files
| File | Purpose |
|------|---------|
| `packages/backend/convex/lib/utils/rerank.ts` | LLM reranking (Phase 2) |
| `packages/backend/convex/tools/search/searchAll.ts` | Unified search |
| `packages/backend/convex/lib/utils/searchQuality.ts` | Quality assessment |

---

## Issues in This Phase

### Issue 13: Query Expansion

**Priority**: P3 (Nice to have)
**Effort**: 3 hours
**Dependencies**: Issue 11 (LLM Reranking)

#### Problem
Single query may miss relevant results due to vocabulary mismatch. User says "authentication" but documents use "login" or "sign-in".

#### When to Use
Only expand queries when:
1. Initial search returns low-quality results
2. Result count is below threshold
3. Not already an expanded query (prevent infinite expansion)

#### Implementation

**Step 1**: Create `convex/lib/utils/queryExpansion.ts`

```typescript
/**
 * Query expansion using LLM to generate alternative phrasings.
 * Only used when initial search quality is low.
 */

import { generateText } from "ai";

const EXPANSION_MODEL = "openai:gpt-4o-mini";

export interface ExpandedQuery {
  original: string;
  variations: string[];
  merged: boolean;
}

export async function expandQuery(
  query: string,
  options: {
    maxVariations?: number;
    context?: string; // Optional context about the search domain
  } = {}
): Promise<ExpandedQuery> {
  const { maxVariations = 3, context } = options;

  const prompt = buildExpansionPrompt(query, context, maxVariations);

  try {
    const { text } = await generateText({
      model: EXPANSION_MODEL,
      prompt,
      maxTokens: 200,
    });

    const variations = parseExpansionResponse(text, query);

    return {
      original: query,
      variations: variations.slice(0, maxVariations),
      merged: false,
    };
  } catch (error) {
    console.error("Query expansion failed:", error);
    return {
      original: query,
      variations: [],
      merged: false,
    };
  }
}

function buildExpansionPrompt(
  query: string,
  context: string | undefined,
  maxVariations: number
): string {
  const contextLine = context ? `\nDomain context: ${context}` : "";

  return `Generate ${maxVariations} alternative search queries for: "${query}"
${contextLine}
Requirements:
- Use synonyms and related terms
- Keep the same intent
- Each variation should be different enough to find new results
- Output one query per line, no numbering or bullets

Variations:`;
}

function parseExpansionResponse(text: string, originalQuery: string): string[] {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length < 200)
    .filter(line => line.toLowerCase() !== originalQuery.toLowerCase());

  // Remove duplicates
  return [...new Set(lines)];
}

/**
 * Merge results from multiple queries using RRF
 */
export function mergeExpandedResults<T extends { _id: { toString(): string }; score?: number }>(
  originalResults: T[],
  expandedResults: T[][]
): T[] {
  const scores = new Map<string, { score: number; item: T }>();
  const k = 60;

  // Score original results (higher weight)
  originalResults.forEach((item, idx) => {
    const id = item._id.toString();
    const score = 1.5 / (k + idx + 1); // 1.5x weight for original query
    scores.set(id, { score, item });
  });

  // Score expanded results
  expandedResults.forEach(results => {
    results.forEach((item, idx) => {
      const id = item._id.toString();
      const score = 1 / (k + idx + 1);
      const existing = scores.get(id);
      if (existing) {
        existing.score += score; // Boost if found in multiple queries
      } else {
        scores.set(id, { score, item });
      }
    });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, score }));
}
```

**Step 2**: Integrate into searchAll

```typescript
// In convex/tools/search/searchAll.ts

import { expandQuery, mergeExpandedResults } from "../lib/utils/queryExpansion";
import { calculateResultQuality } from "../lib/utils/searchQuality";

export const searchAll = internalAction({
  args: {
    // ... existing args
    enableExpansion: v.optional(v.boolean()), // NEW
    isExpanded: v.optional(v.boolean()), // Prevent infinite expansion
  },
  handler: async (ctx, args) => {
    const enableExpansion = args.enableExpansion ?? true;

    // Initial search
    const initialResults = await performSearch(ctx, args);
    const quality = calculateResultQuality(initialResults);

    // Only expand if:
    // 1. Quality is low
    // 2. Expansion is enabled
    // 3. Not already an expanded query
    if (
      quality.level === "low" &&
      enableExpansion &&
      !args.isExpanded &&
      initialResults.length < 3
    ) {
      // Expand query
      const expanded = await expandQuery(args.query, {
        maxVariations: 2,
        context: args.projectId ? "project-specific search" : undefined,
      });

      if (expanded.variations.length > 0) {
        // Search with expanded queries
        const expandedSearches = expanded.variations.map(variation =>
          performSearch(ctx, { ...args, query: variation, isExpanded: true })
        );
        const expandedResults = await Promise.all(expandedSearches);

        // Merge results
        const merged = mergeExpandedResults(initialResults, expandedResults);

        return {
          results: merged.slice(0, args.limit ?? 5),
          quality: calculateResultQuality(merged),
          expanded: true,
          originalQuery: args.query,
          expandedQueries: expanded.variations,
        };
      }
    }

    return {
      results: initialResults.slice(0, args.limit ?? 5),
      quality,
      expanded: false,
    };
  },
});
```

**Step 3**: Update tool description

```typescript
// In ai/tools/search/searchAll.ts

description: `Search across all your saved information with smart query expansion.

If initial results are low quality, automatically tries alternative phrasings to find more relevant content.

Example: Searching "authentication" may also search "login", "sign-in", "user access".

Returns:
- results: The search results
- quality: "high", "medium", or "low"
- expanded: Whether query expansion was used
- expandedQueries: Alternative queries tried (if expanded)`,
```

#### Files to Create/Modify
- `packages/backend/convex/lib/utils/queryExpansion.ts` (new)
- `packages/backend/convex/tools/search/searchAll.ts`
- `packages/backend/convex/ai/tools/search/searchAll.ts`

#### Acceptance Criteria
- [ ] Query expansion generates 2-3 variations
- [ ] Only expands when initial quality is low
- [ ] Prevents infinite expansion (isExpanded flag)
- [ ] Results merged with RRF, original query weighted higher
- [ ] Response indicates if expansion was used

#### Unit Tests
```typescript
describe("expandQuery", () => {
  it("generates variations for simple query", async () => {
    const result = await expandQuery("authentication");
    expect(result.variations.length).toBeGreaterThan(0);
    expect(result.variations.every(v => v !== "authentication")).toBe(true);
  });

  it("returns empty variations on error", async () => {
    // Mock API failure
    const result = await expandQuery("test");
    expect(result.original).toBe("test");
    expect(Array.isArray(result.variations)).toBe(true);
  });
});

describe("mergeExpandedResults", () => {
  it("weights original results higher", () => {
    const original = [{ _id: "1", score: 0.5 }];
    const expanded = [[{ _id: "2", score: 0.5 }]];
    const merged = mergeExpandedResults(original, expanded);
    expect(merged[0]._id).toBe("1"); // Original should rank higher
  });

  it("boosts results found in multiple queries", () => {
    const original = [{ _id: "1", score: 0.5 }];
    const expanded = [
      [{ _id: "1", score: 0.5 }, { _id: "2", score: 0.5 }],
      [{ _id: "1", score: 0.5 }],
    ];
    const merged = mergeExpandedResults(original, expanded);
    // Item "1" found in original + 2 expanded = highest score
    expect(merged[0]._id).toBe("1");
  });
});
```

#### Cost Considerations
- Query expansion adds ~100-200 tokens per expansion (gpt-4o-mini)
- Each variation runs a full search
- Only triggered on low-quality results, so cost is bounded
- Can be disabled via `enableExpansion: false`

---

## What Comes Before

All previous phases should be complete:

**Phase 1: Foundation**
- Issue 1: Knowledge bank in searchAll
- Issue 2: Weighted RRF
- Issue 3: Budget tracker
- Issue 12: Search caching

**Phase 2: Search Quality**
- Issue 4: Knowledge-first strategy
- Issue 5: Quality scoring
- Issue 6: Diminishing returns
- Issue 11: LLM reranking

**Phase 3: Safeguards**
- Issue 7: Rate limiting
- Issue 8: Budget awareness
- Issue 9: Context management
- Issue 10: Ask-user heuristic

---

## What Comes Next

With Phase 4 complete, the search system is fully optimized:

**Capabilities**:
- Unified search with intelligent prioritization
- Automatic quality assessment
- Query expansion for vocabulary mismatch
- LLM reranking for relevance
- Budget and rate controls
- User interaction when stuck

**Future Considerations** (not planned):
- Personalized ranking based on user history
- Search analytics and feedback loop
- Custom embedding models for domain-specific search
- Multi-modal search (images, audio)

---

## Testing Strategy

Unit tests:
- Query expansion prompt parsing
- Merge algorithm correctness
- Expansion trigger conditions

Manual QA:
- Verify expansion improves results for synonym-heavy queries
- Verify expansion doesn't trigger unnecessarily
- Verify cost is bounded (check token usage in logs)

---

## Summary

Phase 4 is optional and can be implemented when:
1. Core search + safeguards are stable (Phases 1-3)
2. Users report vocabulary mismatch issues
3. Search quality metrics show room for improvement

The feature adds ~100-400 tokens per low-quality search, which is acceptable given the improved results.
