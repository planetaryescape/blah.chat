# Phase 2: Search Quality ✅ Complete

**Status**: ✅ Complete (December 2024)
**Issues**: 4, 5, 6, 11 (elevated)
**Dependencies**: Phase 1 (Issues 1, 2, 3 must be complete)
**Enables**: Phase 3 Issue 10 (Ask User Heuristic)

---

## Context

### Prerequisites from Phase 1
Before starting this phase, ensure:
- [x] Issue 1: Knowledge bank added to `searchAll`
- [x] Issue 2: Weighted RRF implemented with 1.5x weight for knowledge bank
- [x] Issue 3: `BudgetTracker` class created and integrated into generation
- [x] Issue 12: Search caching implemented

### Current State After Phase 1
- `searchAll` now searches knowledge bank alongside files/notes/tasks/conversations
- RRF merges results with knowledge bank weighted 1.5x
- Token budget tracked per generation
- Repeated searches return cached results

### Remaining Problems
1. AI still arbitrarily decides search order - knowledge bank may not be searched first
2. No way to assess if results are "good enough" to stop
3. Agent may keep searching even when results overlap significantly
4. Only memory search uses LLM reranking

### Key Files (from Phase 1)
| File | Purpose |
|------|---------|
| `packages/backend/convex/tools/search/searchAll.ts` | Unified search (modified in Phase 1) |
| `packages/backend/convex/lib/utils/search.ts` | RRF with weights (modified in Phase 1) |
| `packages/backend/convex/lib/budgetTracker.ts` | Budget tracking (created in Phase 1) |
| `packages/backend/convex/generation.ts` | Main generation loop |

---

## Issues in This Phase

### Issue 4: Knowledge-First Search Strategy

**Priority**: P0 (Critical)
**Effort**: 3 hours
**Dependencies**: Issue 1 (Knowledge bank in searchAll)

#### Problem
AI arbitrarily picks which search tool first. User's curated knowledge should always be checked first - if it has high-quality results, we can skip searching other sources.

#### Implementation

**Step 1**: Restructure searchAll to search knowledge bank first

```typescript
// In convex/tools/search/searchAll.ts

export const searchAll = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    resourceTypes: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    confidenceThreshold: v.optional(v.number()), // NEW
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const threshold = args.confidenceThreshold ?? 0.8;
    const types = args.resourceTypes ?? ["knowledgeBank", "files", "notes", "tasks", "conversations"];

    // STEP 1: Always search knowledge bank first
    if (types.includes("knowledgeBank")) {
      const kbResults = await ctx.runAction(internal.knowledgeBank.search.searchInternal, {
        userId: args.userId,
        query: args.query,
        projectId: args.projectId,
        limit: limit * 2, // Fetch more for scoring
      });

      // Calculate quality score
      const quality = calculateResultQuality(kbResults);

      // If high confidence, return early
      if (quality.level === "high" && kbResults.length >= limit) {
        return {
          results: kbResults.slice(0, limit).map(r => ({ ...r, source: "knowledgeBank" })),
          quality,
          searchedSources: ["knowledgeBank"],
          earlyReturn: true,
          message: "Found high-quality results in knowledge base",
        };
      }
    }

    // STEP 2: Search remaining sources in parallel
    const remainingTypes = types.filter(t => t !== "knowledgeBank");
    const parallelSearches = remainingTypes.map(type => searchByType(ctx, type, args));
    const allResults = await Promise.all(parallelSearches);

    // STEP 3: Merge with RRF (knowledge bank weighted higher)
    const merged = mergeWithRRF(kbResults, allResults, DEFAULT_RRF_WEIGHTS);

    return {
      results: merged.slice(0, limit),
      quality: calculateResultQuality(merged),
      searchedSources: types,
      earlyReturn: false,
    };
  },
});
```

**Step 2**: Update tool description

```typescript
// In convex/ai/tools/search/searchAll.ts

export function createSearchAllTool(ctx, userId, conversationId, cache) {
  return tool({
    description: `Search across all your saved information.
IMPORTANT: This tool searches your knowledge base FIRST. If high-quality matches are found there,
it returns immediately without searching other sources. Use this for any factual questions.

Search priority:
1. Knowledge base (your saved documents, websites, notes) - always searched first
2. Files (uploaded documents)
3. Notes (your written notes)
4. Tasks (your tasks and todos)
5. Conversations (past chat history)

Returns a quality indicator: "high", "medium", or "low" to help you decide if you need more searching.`,
    // ...
  });
}
```

#### Files to Modify
- `packages/backend/convex/tools/search/searchAll.ts`
- `packages/backend/convex/ai/tools/search/searchAll.ts`

#### Acceptance Criteria
- [ ] Knowledge bank always queried first
- [ ] Early return when KB results score > 0.8
- [ ] Response includes `earlyReturn: boolean` and `searchedSources`
- [ ] Falls back to full search when KB quality is low

#### Unit Tests
```typescript
describe("Knowledge-first search", () => {
  it("returns early when knowledge bank has high-quality results", async () => {
    // Mock KB returning high-quality results
    const result = await searchAll({ query: "documented topic", limit: 5 });
    expect(result.earlyReturn).toBe(true);
    expect(result.searchedSources).toEqual(["knowledgeBank"]);
  });

  it("searches all sources when KB results are low quality", async () => {
    const result = await searchAll({ query: "obscure topic", limit: 5 });
    expect(result.earlyReturn).toBe(false);
    expect(result.searchedSources.length).toBeGreaterThan(1);
  });
});
```

---

### Issue 5: Search Result Quality Scoring

**Priority**: P1
**Effort**: 2-3 hours
**Dependencies**: Issue 2 (Weighted RRF)

#### Problem
No systematic way to assess if search results are "good enough" to stop searching. AI makes subjective decisions.

#### Implementation

**Step 1**: Create `convex/lib/utils/searchQuality.ts`

```typescript
/**
 * Search result quality assessment.
 * Provides objective metrics for AI to decide if more searching is needed.
 */

export type QualityLevel = "high" | "medium" | "low";

export interface QualityAssessment {
  level: QualityLevel;
  score: number; // 0-1
  confidence: number; // 0-1
  factors: {
    avgScore: number;
    scoreVariance: number;
    resultCount: number;
    hasRecentResults: boolean;
    topScoreAboveThreshold: boolean;
  };
  suggestion: string;
}

interface ScoredResult {
  score?: number;
  _creationTime?: number;
  createdAt?: number;
}

export function calculateResultQuality(
  results: ScoredResult[],
  options: { recencyDays?: number; highScoreThreshold?: number } = {}
): QualityAssessment {
  const { recencyDays = 30, highScoreThreshold = 0.75 } = options;

  if (results.length === 0) {
    return {
      level: "low",
      score: 0,
      confidence: 1, // We're confident there's nothing
      factors: {
        avgScore: 0,
        scoreVariance: 0,
        resultCount: 0,
        hasRecentResults: false,
        topScoreAboveThreshold: false,
      },
      suggestion: "No results found. Try different search terms or check other sources.",
    };
  }

  // Extract scores
  const scores = results.map(r => r.score ?? 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const topScore = Math.max(...scores);

  // Calculate variance
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
  const scoreVariance = Math.sqrt(variance);

  // Check recency
  const now = Date.now();
  const recencyCutoff = now - recencyDays * 24 * 60 * 60 * 1000;
  const hasRecentResults = results.some(r => {
    const timestamp = r._creationTime ?? r.createdAt ?? 0;
    return timestamp > recencyCutoff;
  });

  const topScoreAboveThreshold = topScore >= highScoreThreshold;

  // Calculate overall quality score
  const qualityScore = calculateQualityScore({
    avgScore,
    topScore,
    resultCount: results.length,
    hasRecentResults,
    scoreVariance,
  });

  // Determine level
  let level: QualityLevel;
  if (qualityScore >= 0.8) {
    level = "high";
  } else if (qualityScore >= 0.5) {
    level = "medium";
  } else {
    level = "low";
  }

  // Generate suggestion
  const suggestion = generateSuggestion(level, {
    avgScore,
    resultCount: results.length,
    topScoreAboveThreshold,
  });

  return {
    level,
    score: qualityScore,
    confidence: calculateConfidence(results.length, scoreVariance),
    factors: {
      avgScore,
      scoreVariance,
      resultCount: results.length,
      hasRecentResults,
      topScoreAboveThreshold,
    },
    suggestion,
  };
}

function calculateQualityScore(factors: {
  avgScore: number;
  topScore: number;
  resultCount: number;
  hasRecentResults: boolean;
  scoreVariance: number;
}): number {
  // Weighted combination
  let score = 0;

  // Top score matters most (40%)
  score += factors.topScore * 0.4;

  // Average score (25%)
  score += factors.avgScore * 0.25;

  // Result count (20%) - more is better up to a point
  const countScore = Math.min(factors.resultCount / 5, 1);
  score += countScore * 0.2;

  // Recency bonus (10%)
  if (factors.hasRecentResults) {
    score += 0.1;
  }

  // Low variance bonus (5%) - consistent results are better
  const varianceBonus = Math.max(0, 0.05 - factors.scoreVariance * 0.1);
  score += varianceBonus;

  return Math.min(score, 1);
}

function calculateConfidence(resultCount: number, variance: number): number {
  // More results and lower variance = higher confidence
  const countConfidence = Math.min(resultCount / 10, 1);
  const varianceConfidence = Math.max(0, 1 - variance * 2);
  return (countConfidence + varianceConfidence) / 2;
}

function generateSuggestion(
  level: QualityLevel,
  factors: { avgScore: number; resultCount: number; topScoreAboveThreshold: boolean }
): string {
  if (level === "high") {
    return "Results are comprehensive. You likely have enough information to answer.";
  }

  if (level === "medium") {
    if (!factors.topScoreAboveThreshold) {
      return "Results are moderately relevant. Consider refining your search query.";
    }
    if (factors.resultCount < 3) {
      return "Found some relevant results but coverage is limited. May want to search other sources.";
    }
    return "Decent results found. Proceed with caution or search more if critical.";
  }

  // Low quality
  if (factors.resultCount === 0) {
    return "No results found. Try different search terms.";
  }
  return "Results have low relevance. Try different keywords or ask user for clarification.";
}
```

**Step 2**: Integrate into searchAll response

```typescript
// In searchAll.ts, include quality in response
return {
  results: merged.slice(0, limit),
  quality: calculateResultQuality(merged),
  // ...
};
```

#### Files to Create/Modify
- `packages/backend/convex/lib/utils/searchQuality.ts` (new)
- `packages/backend/convex/tools/search/searchAll.ts`

#### Acceptance Criteria
- [ ] `calculateResultQuality` function created
- [ ] Returns level (high/medium/low), score (0-1), and suggestion
- [ ] Quality included in searchAll response
- [ ] AI can use quality to decide next action

#### Unit Tests
```typescript
describe("calculateResultQuality", () => {
  it("returns high quality for good results", () => {
    const results = [
      { score: 0.9 },
      { score: 0.85 },
      { score: 0.8 },
    ];
    const quality = calculateResultQuality(results);
    expect(quality.level).toBe("high");
    expect(quality.score).toBeGreaterThan(0.8);
  });

  it("returns low quality for poor results", () => {
    const results = [{ score: 0.2 }];
    const quality = calculateResultQuality(results);
    expect(quality.level).toBe("low");
  });

  it("returns low quality for empty results", () => {
    const quality = calculateResultQuality([]);
    expect(quality.level).toBe("low");
    expect(quality.confidence).toBe(1);
  });
});
```

---

### Issue 6: Diminishing Returns Detection

**Priority**: P1
**Effort**: 3 hours
**Dependencies**: Issues 3 (Budget Tracker), 5 (Quality Scoring)

#### Problem
Agent may keep searching even when new results add no value - same queries repeated, overlapping results, decreasing scores.

#### Implementation

**Step 1**: Add search history tracking to generation context

```typescript
// In generation.ts, add to context
interface SearchHistoryEntry {
  query: string;
  resultIds: Set<string>;
  topScore: number;
  timestamp: number;
}

const searchHistory: SearchHistoryEntry[] = [];
```

**Step 2**: Update `createOnStepFinish` to detect patterns

```typescript
// In generation/tools.ts

export function createOnStepFinish(context: {
  searchHistory: SearchHistoryEntry[];
  budgetTracker: BudgetTracker;
}) {
  return async (step: any) => {
    // Check for search tool calls
    for (const toolCall of step.toolCalls ?? []) {
      if (toolCall.toolName.includes("search")) {
        const result = toolCall.result;
        const query = toolCall.args?.query;

        if (result && query) {
          const entry: SearchHistoryEntry = {
            query,
            resultIds: new Set(result.results?.map((r: any) => r._id?.toString()) ?? []),
            topScore: result.results?.[0]?.score ?? 0,
            timestamp: Date.now(),
          };

          // Detect patterns
          const warning = detectDiminishingReturns(context.searchHistory, entry);

          if (warning) {
            // Store warning to inject into next prompt
            context.diminishingReturnWarning = warning;
          }

          context.searchHistory.push(entry);
        }
      }
    }
  };
}

function detectDiminishingReturns(
  history: SearchHistoryEntry[],
  current: SearchHistoryEntry
): string | null {
  // Pattern 1: Same query repeated
  const sameQuery = history.find(h =>
    h.query.toLowerCase() === current.query.toLowerCase()
  );
  if (sameQuery) {
    return `You already searched for "${current.query}". Consider using different terms or answering with current information.`;
  }

  // Pattern 2: High overlap with previous results
  if (history.length > 0) {
    const lastEntry = history[history.length - 1];
    const overlap = [...current.resultIds].filter(id => lastEntry.resultIds.has(id)).length;
    const overlapPercent = overlap / Math.max(current.resultIds.size, 1);

    if (overlapPercent > 0.8 && current.resultIds.size > 0) {
      return `Search results overlap ${Math.round(overlapPercent * 100)}% with previous search. You may have enough information.`;
    }
  }

  // Pattern 3: Scores decreasing
  if (history.length >= 2) {
    const recentScores = history.slice(-2).map(h => h.topScore);
    if (recentScores[0] > recentScores[1] && recentScores[1] > current.topScore) {
      return "Search result quality is decreasing. Consider stopping and using current information or asking the user for clarification.";
    }
  }

  // Pattern 4: Many searches already
  if (history.length >= 3) {
    return "You've performed multiple searches. Consider answering with current information or asking the user what specifically they're looking for.";
  }

  return null;
}
```

**Step 3**: Inject warning into prompt before next tool call

```typescript
// In generation.ts, before calling AI
if (context.diminishingReturnWarning) {
  allMessages.push({
    role: "system",
    content: `[Search Advisory] ${context.diminishingReturnWarning}`,
  });
  context.diminishingReturnWarning = null; // Clear after use
}
```

#### Files to Modify
- `packages/backend/convex/generation.ts`
- `packages/backend/convex/generation/tools.ts`

#### Acceptance Criteria
- [ ] Search history tracked per generation
- [ ] Repeated queries detected and warned
- [ ] Result overlap (>80%) detected and warned
- [ ] Decreasing scores detected and warned
- [ ] Warning injected into AI context

#### Unit Tests
```typescript
describe("detectDiminishingReturns", () => {
  it("detects repeated queries", () => {
    const history = [{ query: "test query", resultIds: new Set(["1"]), topScore: 0.8 }];
    const current = { query: "test query", resultIds: new Set(["2"]), topScore: 0.7 };
    const warning = detectDiminishingReturns(history, current);
    expect(warning).toContain("already searched");
  });

  it("detects high overlap", () => {
    const history = [{ query: "query1", resultIds: new Set(["1", "2", "3"]), topScore: 0.8 }];
    const current = { query: "query2", resultIds: new Set(["1", "2", "3"]), topScore: 0.7 };
    const warning = detectDiminishingReturns(history, current);
    expect(warning).toContain("overlap");
  });
});
```

---

### Issue 11: LLM Reranking for All Searches (Elevated)

**Priority**: P1 (Elevated from P2)
**Effort**: 3-4 hours
**Dependencies**: Issue 5 (Quality Scoring)

#### Problem
Only memory search uses LLM reranking. Other searches could benefit from semantic reranking to improve result quality.

#### Implementation

**Step 1**: Extract reranking to shared utility

```typescript
// Create convex/lib/utils/rerank.ts

import { generateText } from "ai";
import { MODEL_CONFIG } from "@/lib/ai/models";

const RERANK_MODEL = "openai:gpt-4o-mini";

interface RerankableResult {
  _id: { toString(): string };
  content?: string;
  title?: string;
  text?: string;
  score?: number;
}

export async function rerankResults<T extends RerankableResult>(
  query: string,
  results: T[],
  options: {
    topK?: number;
    minScoreThreshold?: number;
  } = {}
): Promise<T[]> {
  const { topK = 10, minScoreThreshold = 0.3 } = options;

  if (results.length === 0) return [];
  if (results.length <= 3) return results; // Not worth reranking

  // Prepare candidates
  const candidates = results.slice(0, 20).map((r, idx) => ({
    idx,
    text: extractText(r),
    original: r,
  }));

  // Build prompt
  const prompt = buildRerankPrompt(query, candidates);

  try {
    const { text } = await generateText({
      model: MODEL_CONFIG[RERANK_MODEL].id,
      prompt,
      maxTokens: 500,
    });

    // Parse response
    const rankings = parseRerankResponse(text, candidates.length);

    // Reorder results
    const reranked = rankings
      .map(idx => candidates[idx]?.original)
      .filter(Boolean) as T[];

    // Filter by score threshold if original scores exist
    return reranked.filter(r => (r.score ?? 1) >= minScoreThreshold).slice(0, topK);
  } catch (error) {
    console.error("Reranking failed, returning original order:", error);
    return results.slice(0, topK);
  }
}

function extractText(result: RerankableResult): string {
  return result.content ?? result.text ?? result.title ?? "";
}

function buildRerankPrompt(query: string, candidates: { idx: number; text: string }[]): string {
  const candidateList = candidates
    .map((c, i) => `[${i}] ${c.text.slice(0, 200)}`)
    .join("\n");

  return `Given the query: "${query}"

Rank the following search results by relevance. Return ONLY a comma-separated list of indices, most relevant first.

Results:
${candidateList}

Output (comma-separated indices, e.g., "3,1,0,2"):`;
}

function parseRerankResponse(text: string, maxIdx: number): number[] {
  const indices = text
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 0 && n < maxIdx);

  // Deduplicate while preserving order
  return [...new Set(indices)];
}
```

**Step 2**: Integrate into searchAll

```typescript
// In searchAll.ts

import { rerankResults } from "../lib/utils/rerank";
import { calculateResultQuality } from "../lib/utils/searchQuality";

// After merging results with RRF
const quality = calculateResultQuality(merged);

// Only rerank if quality is not high (save cost)
let finalResults = merged;
if (quality.level !== "high" && merged.length > 3) {
  finalResults = await rerankResults(args.query, merged, { topK: args.limit });
}

return {
  results: finalResults,
  quality: calculateResultQuality(finalResults),
  reranked: quality.level !== "high",
};
```

#### Files to Create/Modify
- `packages/backend/convex/lib/utils/rerank.ts` (new)
- `packages/backend/convex/tools/search/searchAll.ts`

#### Acceptance Criteria
- [ ] `rerankResults` function created in shared util
- [ ] Uses gpt-4o-mini for cost efficiency
- [ ] Only reranks when quality < high (saves cost)
- [ ] Gracefully falls back on error
- [ ] Response indicates if reranking was applied

#### Unit Tests
```typescript
describe("rerankResults", () => {
  it("returns original order for small result sets", async () => {
    const results = [{ _id: "1", content: "a" }, { _id: "2", content: "b" }];
    const reranked = await rerankResults("query", results);
    expect(reranked).toEqual(results);
  });

  it("parses rerank response correctly", () => {
    const indices = parseRerankResponse("2, 0, 1", 3);
    expect(indices).toEqual([2, 0, 1]);
  });
});
```

---

## What Comes Before

Phase 1 must be complete:
- Issue 1: Knowledge bank in searchAll
- Issue 2: Weighted RRF with 1.5x for KB
- Issue 3: Budget tracker infrastructure
- Issue 12: Search caching

---

## What Comes Next

Phase 3 (Safeguards) can proceed in parallel or after:
- **Issue 7**: Per-Tool Rate Limiting (independent)
- **Issue 8**: Budget Awareness in Prompt (uses Issue 3)
- **Issue 9**: Context Budget Management (uses Issue 3)
- **Issue 10**: Ask User Heuristic (uses Issues 6, 8)

Phase 4 (Advanced):
- **Issue 13**: Query Expansion (uses Issue 11)

---

## Testing Strategy

Unit tests for this phase:
- Quality scoring algorithm edge cases
- Diminishing returns detection patterns
- Reranking prompt parsing
- Early return logic in knowledge-first search

Manual QA:
- Verify AI respects quality suggestions
- Verify AI stops when warned about diminishing returns
