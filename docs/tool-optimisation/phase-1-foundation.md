# Phase 1: Foundation

**Timeline**: Week 1
**Issues**: 1, 2, 3, 12 (elevated)
**Dependencies**: None - this phase has no prerequisites
**Enables**: Phase 2 (Search Quality), Phase 3 (Safeguards)

---

## Context

### What is blah.chat?
Personal AI chat assistant with multi-model support (OpenAI, Gemini, Claude), conversation branching, and cost tracking. Uses Convex for real-time DB with 10-minute action timeout for LLM generation.

### Current Search Architecture
The app has multiple search tools exposed to the AI:
- `searchFiles` - Vector search on file chunks
- `searchNotes` - Vector search on notes
- `searchTasks` - Vector search on tasks
- `queryHistory` - Vector search on conversation messages
- `searchKnowledgeBank` - Vector search on user-saved knowledge
- `searchAll` - Unified search across files/notes/tasks/conversations (NOT knowledge bank)

**Problem**: Knowledge bank is separate from `searchAll`, so AI may search files/notes/tasks first and miss the most relevant knowledge bank content.

### Current Tool Calling
- Vercel AI SDK v5 with `streamText`
- `stopWhen: stepCountIs(5)` - max 5 consecutive tool calls
- No per-tool rate limiting
- No token budget awareness
- No diminishing returns detection

### Key Files
| File | Purpose |
|------|---------|
| `packages/backend/convex/search/hybrid.ts` | Hybrid search (full-text + vector) |
| `packages/backend/convex/tools/search/searchAll.ts` | Unified search action |
| `packages/backend/convex/ai/tools/search/searchAll.ts` | Tool wrapper for AI |
| `packages/backend/convex/generation.ts` | Main generation loop |
| `packages/backend/convex/lib/utils/search.ts` | RRF implementation |

---

## Issues in This Phase

### Issue 1: Add Knowledge Bank to searchAll

**Priority**: P0 (Critical)
**Effort**: 2-3 hours

#### Problem
`searchAll` searches files/notes/tasks/conversations but NOT knowledge bank. User's curated knowledge is missed unless AI specifically calls `searchKnowledgeBank`.

#### Implementation

**Step 1**: Update `resourceTypes` enum in `convex/tools/search/searchAll.ts`

```typescript
// Current
const resourceTypes = z.enum(["files", "notes", "tasks", "conversations"]);

// New
const resourceTypes = z.enum(["files", "notes", "tasks", "conversations", "knowledgeBank"]);
```

**Step 2**: Add knowledge bank search to `searchAll` action

```typescript
// In searchAll action handler, add parallel search:
const searches: Promise<any>[] = [];

if (args.resourceTypes.includes("knowledgeBank")) {
  searches.push(
    ctx.runAction(internal.knowledgeBank.search.searchInternal, {
      userId: args.userId,
      query: args.query,
      projectId: args.projectId,
      limit: args.limit,
    })
  );
}
// ... other searches

const results = await Promise.all(searches);
```

**Step 3**: Merge knowledge bank results with RRF

```typescript
// After getting all results, merge with RRF
const merged = applyRRF(
  [...fileResults, ...noteResults, ...taskResults],
  [...knowledgeBankResults, ...conversationResults],
  60 // k parameter
);
```

**Step 4**: Update tool description in `convex/ai/tools/search/searchAll.ts`

```typescript
description: `Search across ALL resource types including your saved knowledge base.
Searches: files, notes, tasks, conversations, and knowledge bank.
Use this when you need to find information across multiple sources.`
```

#### Files to Modify
- `packages/backend/convex/tools/search/searchAll.ts`
- `packages/backend/convex/ai/tools/search/searchAll.ts`

#### Acceptance Criteria
- [ ] searchAll returns knowledge bank results when resourceTypes includes it
- [ ] Default resourceTypes includes `"knowledgeBank"`
- [ ] Results properly merged with existing RRF
- [ ] Tool description updated

#### Unit Tests
```typescript
describe("searchAll with knowledgeBank", () => {
  it("includes knowledge bank results when specified", async () => {
    const result = await searchAll({
      query: "test",
      resourceTypes: ["knowledgeBank"],
      limit: 5,
    });
    expect(result.some(r => r.source === "knowledgeBank")).toBe(true);
  });

  it("includes knowledge bank by default", async () => {
    const result = await searchAll({ query: "test", limit: 5 });
    expect(result.some(r => r.source === "knowledgeBank")).toBe(true);
  });
});
```

---

### Issue 2: Implement Weighted RRF

**Priority**: P1
**Effort**: 2 hours

#### Problem
Current RRF gives equal weight to all sources. Knowledge bank should be weighted higher (1.5x) than conversation history for factual queries.

#### Implementation

**Step 1**: Update `applyRRF` signature in `convex/lib/utils/search.ts`

```typescript
interface RRFWeights {
  [source: string]: number; // e.g., { knowledgeBank: 1.5, files: 1.2, conversations: 0.8 }
}

export function applyRRF<T extends { _id: { toString(): string }; source?: string }>(
  textResults: T[],
  vectorResults: T[],
  k = 60,
  weights?: RRFWeights // NEW: optional weights
): (T & { score: number })[] {
```

**Step 2**: Apply weights in scoring

```typescript
export function applyRRF<T>(
  textResults: T[],
  vectorResults: T[],
  k = 60,
  weights?: RRFWeights
): (T & { score: number })[] {
  const scores = new Map<string, { score: number; item: T }>();

  const getWeight = (item: T): number => {
    if (!weights) return 1.0;
    const source = (item as any).source;
    return weights[source] ?? 1.0;
  };

  // Score text results with weight
  textResults.forEach((item, idx) => {
    const id = item._id.toString();
    const weight = getWeight(item);
    const baseScore = 1 / (k + idx + 1);
    scores.set(id, { score: weight * baseScore, item });
  });

  // Score vector results with weight
  vectorResults.forEach((item, idx) => {
    const id = item._id.toString();
    const weight = getWeight(item);
    const baseScore = 1 / (k + idx + 1);
    const existing = scores.get(id);
    if (existing) {
      existing.score += weight * baseScore; // Boost overlap
    } else {
      scores.set(id, { score: weight * baseScore, item });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, score }));
}
```

**Step 3**: Define default weights

```typescript
// In searchAll.ts or constants file
export const DEFAULT_RRF_WEIGHTS: RRFWeights = {
  knowledgeBank: 1.5,
  files: 1.2,
  notes: 1.0,
  tasks: 1.0,
  conversations: 0.8,
};
```

**Step 4**: Use weights in searchAll

```typescript
const merged = applyRRF(textResults, vectorResults, 60, DEFAULT_RRF_WEIGHTS);
```

#### Files to Modify
- `packages/backend/convex/lib/utils/search.ts`

#### Acceptance Criteria
- [ ] `applyRRF` accepts optional weights map
- [ ] Backward compatible (no weights = equal weight)
- [ ] Knowledge bank weighted 1.5x by default
- [ ] Unit tests pass

#### Unit Tests
```typescript
describe("applyRRF with weights", () => {
  it("applies equal weight when no weights provided", () => {
    const result = applyRRF(textResults, vectorResults, 60);
    // Verify equal treatment
  });

  it("boosts knowledge bank results with 1.5x weight", () => {
    const kbResult = { _id: "1", source: "knowledgeBank" };
    const fileResult = { _id: "2", source: "files" };
    const result = applyRRF(
      [kbResult, fileResult],
      [],
      60,
      { knowledgeBank: 1.5, files: 1.0 }
    );
    expect(result[0]._id).toBe("1"); // KB should rank higher
  });
});
```

---

### Issue 3: Add Token Budget Tracking Infrastructure

**Priority**: P0 (Critical)
**Effort**: 3-4 hours

#### Problem
No visibility into token consumption during generation. Agent can burn through tokens without awareness, leading to runaway tool calls.

#### Implementation

**Step 1**: Create `convex/lib/budgetTracker.ts`

```typescript
/**
 * Token budget tracker for AI generation.
 * Tracks consumption and provides signals for when to stop.
 */

// Average token costs per tool (empirically determined)
const TOOL_TOKEN_ESTIMATES: Record<string, number> = {
  searchAll: 800,
  searchFiles: 400,
  searchNotes: 300,
  searchTasks: 300,
  searchKnowledgeBank: 500,
  queryHistory: 400,
  urlReader: 1500,
  codeExecution: 600,
  calculator: 100,
  datetime: 50,
  weather: 200,
  default: 300,
};

export interface BudgetState {
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
  toolCallCount: number;
  maxToolCalls: number;
  percentUsed: number;
}

export class BudgetTracker {
  private maxTokens: number;
  private usedTokens: number = 0;
  private toolCallCount: number = 0;
  private maxToolCalls: number;

  constructor(maxTokens: number, maxToolCalls: number = 5) {
    this.maxTokens = maxTokens;
    this.maxToolCalls = maxToolCalls;
  }

  /**
   * Estimate token cost before executing a tool
   */
  estimateToolCost(toolName: string): number {
    return TOOL_TOKEN_ESTIMATES[toolName] ?? TOOL_TOKEN_ESTIMATES.default;
  }

  /**
   * Record actual token usage after tool execution
   */
  recordUsage(tokens: number): void {
    this.usedTokens += tokens;
    this.toolCallCount++;
  }

  /**
   * Get current budget state
   */
  getState(): BudgetState {
    return {
      maxTokens: this.maxTokens,
      usedTokens: this.usedTokens,
      remainingTokens: this.maxTokens - this.usedTokens,
      toolCallCount: this.toolCallCount,
      maxToolCalls: this.maxToolCalls,
      percentUsed: (this.usedTokens / this.maxTokens) * 100,
    };
  }

  /**
   * Check if we should continue making tool calls
   */
  shouldContinue(): boolean {
    const state = this.getState();
    // Stop if <10% budget remaining or max tool calls reached
    return state.percentUsed < 90 && this.toolCallCount < this.maxToolCalls;
  }

  /**
   * Check if budget is getting low (for warnings)
   */
  isLow(): boolean {
    return this.getState().percentUsed >= 50;
  }

  /**
   * Check if we should suggest asking user
   */
  shouldAskUser(): boolean {
    return this.getState().percentUsed >= 70;
  }

  /**
   * Format budget status for injection into prompt
   */
  formatStatus(): string {
    const state = this.getState();
    return `[System: Budget Status]
- Tools used: ${state.toolCallCount}/${state.maxToolCalls}
- Tokens used: ~${Math.round(state.usedTokens).toLocaleString()}
- Remaining capacity: ~${Math.round(100 - state.percentUsed)}%
- Recommendation: ${this.getRecommendation()}`;
  }

  private getRecommendation(): string {
    const state = this.getState();
    if (state.percentUsed >= 70) {
      return "Consider answering now or asking user for clarification";
    }
    if (state.percentUsed >= 50) {
      return "Getting low on budget - prioritize essential searches only";
    }
    return "Budget healthy - continue as needed";
  }
}
```

**Step 2**: Initialize in `generation.ts`

```typescript
// Near the top of generate action
import { BudgetTracker } from "./lib/budgetTracker";

// Inside action handler
const modelConfig = MODEL_CONFIG[args.modelId];
const contextWindow = modelConfig?.contextWindow ?? 128000;
const budgetTracker = new BudgetTracker(contextWindow, 5);
```

**Step 3**: Update tracker after tool results

```typescript
// In the streaming loop, after tool-result chunk:
if (chunk.type === "tool-result") {
  const resultStr = JSON.stringify(chunk.result ?? chunk.output ?? "");
  const estimatedTokens = resultStr.length / 4; // rough estimate
  budgetTracker.recordUsage(estimatedTokens);
}
```

#### Files to Create/Modify
- `packages/backend/convex/lib/budgetTracker.ts` (new)
- `packages/backend/convex/generation.ts`

#### Acceptance Criteria
- [ ] BudgetTracker class created with all methods
- [ ] Initialized per generation with model's context window
- [ ] Token estimates within 50% of actual
- [ ] `shouldContinue()` returns false when <10% remaining
- [ ] `formatStatus()` produces readable output

#### Unit Tests
```typescript
describe("BudgetTracker", () => {
  it("tracks token usage", () => {
    const tracker = new BudgetTracker(10000, 5);
    tracker.recordUsage(1000);
    expect(tracker.getState().usedTokens).toBe(1000);
    expect(tracker.getState().percentUsed).toBe(10);
  });

  it("shouldContinue returns false when budget exhausted", () => {
    const tracker = new BudgetTracker(1000, 5);
    tracker.recordUsage(950);
    expect(tracker.shouldContinue()).toBe(false);
  });

  it("estimates tool costs", () => {
    const tracker = new BudgetTracker(10000, 5);
    expect(tracker.estimateToolCost("searchAll")).toBe(800);
    expect(tracker.estimateToolCost("unknown")).toBe(300);
  });
});
```

---

### Issue 12: Search Result Caching (Elevated)

**Priority**: P1 (Elevated from P3)
**Effort**: 2 hours

#### Problem
Same search query within a conversation may hit backend multiple times. This wastes tokens and latency.

#### Implementation

**Step 1**: Create in-memory cache in generation context

```typescript
// In generation.ts, near top of action
interface SearchCacheEntry {
  results: any[];
  timestamp: number;
}

const searchCache = new Map<string, SearchCacheEntry>();

function getCacheKey(query: string, resourceTypes: string[], projectId?: string): string {
  return `${query}:${resourceTypes.sort().join(",")}:${projectId ?? "global"}`;
}
```

**Step 2**: Check cache before search

```typescript
// In searchAll tool execute function, wrap with cache check
const cacheKey = getCacheKey(args.query, args.resourceTypes, args.projectId);
const cached = searchCache.get(cacheKey);

if (cached) {
  // Return cached results
  return cached.results;
}

// Execute actual search
const results = await executeSearch(args);

// Cache results
searchCache.set(cacheKey, {
  results,
  timestamp: Date.now(),
});

return results;
```

**Step 3**: Pass cache to tool via closure

```typescript
// In buildTools(), pass cache reference
export function buildTools(config: BuildToolsConfig & { searchCache?: Map<string, any> }) {
  // ...
  tools.searchAll = createSearchAllTool(ctx, userId, conversationId, config.searchCache);
}
```

#### Files to Modify
- `packages/backend/convex/generation.ts`
- `packages/backend/convex/tools/search/searchAll.ts`
- `packages/backend/convex/generation/tools.ts`

#### Acceptance Criteria
- [ ] Cache created per generation (not persistent)
- [ ] Identical queries return cached results
- [ ] Cache cleared after generation completes
- [ ] Different queries hit backend

#### Unit Tests
```typescript
describe("Search caching", () => {
  it("returns cached results for identical queries", async () => {
    const cache = new Map();
    await searchAll({ query: "test", cache });
    const spy = vi.spyOn(ctx, "runAction");
    await searchAll({ query: "test", cache });
    expect(spy).not.toHaveBeenCalled(); // Should use cache
  });
});
```

---

## What Comes Next

After Phase 1 is complete, Phase 2 (Search Quality) can begin:
- **Issue 4**: Knowledge-First Search Strategy (depends on Issue 1)
- **Issue 5**: Search Result Quality Scoring (depends on Issue 2)
- **Issue 6**: Diminishing Returns Detection (depends on Issues 3, 5)
- **Issue 11**: LLM Reranking (depends on Issue 5)

Phase 3 (Safeguards) can also begin in parallel:
- **Issue 7**: Per-Tool Rate Limiting (independent)
- **Issue 8**: Budget Awareness in Prompt (depends on Issue 3)
- **Issue 9**: Context Budget Management (depends on Issue 3)

---

## Testing Strategy

Unit tests only for this phase:
- RRF weighting logic
- Budget tracker state transitions
- Cache key generation and lookup

No integration tests required - behavior verified via unit tests and manual QA.
