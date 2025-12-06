# Phase 1: Critical Gaps - Memory Retrieval Implementation

## Overview

This phase fixes **3 critical bugs** in the memory retrieval system that prevent core functionality from working as documented. These are high-priority blockers that break semantic search, risk context bloat, and produce inaccurate metrics.

**Estimated effort**: 2-3 hours
**Priority**: HIGH - Fixes broken functionality
**Status**: Ready for implementation

---

## Background Context

### What We're Fixing

The memory retrieval system was audited against `docs/memory-retrieval-implementation.md`. While the architecture is sound (pre-fetch approach, hybrid search, graceful degradation), **3 critical implementation gaps** were discovered:

1. **Vector search uses placeholder logic** - Semantic search completely broken
2. **Memory truncation not applied** - Risk of context overflow
3. **Token tracking inconsistent** - Metrics always show 0 for memories

### How Memory Retrieval Works (High-Level)

```
User sends message
  ↓
Generation system extracts user message text
  ↓
Hybrid search: keyword + vector search → merge with RRF
  ↓
Format memories by category (identity, preference, project, context, relationship)
  ↓
Inject as system message before LLM call
  ↓
Track token usage
```

**Pre-fetch approach**: Memories loaded BEFORE generation starts (not during streaming).

**Hybrid search**: Combines full-text (BM25) + semantic (vector embeddings) using Reciprocal Rank Fusion (RRF) merging algorithm.

**RRF formula**: `score = 1 / (k + rank + 1)` where k=60

---

## Critical Gap 1: Vector Search Using Placeholder Logic

### Problem

**File**: `convex/memories/search.ts` (lines 66-88)

The vector search component returns **fake 0.5 similarity scores** for all memories instead of using real vector similarity. This breaks semantic search entirely.

**Current broken code**:

```typescript
export const vectorSearch = internalQuery({
  handler: async (ctx, args) => {
    // Loads ALL user memories (inefficient)
    const allMemories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Manual scoring with PLACEHOLDER 0.5 - NOT using real vector similarity!
    const scoredResults = allMemories.map((memory) => {
      const score = 0.5; // ← FAKE SCORE
      return { ...memory, score };
    });

    // Returns ALL memories with fake scores, then slices
    return scoredResults.slice(0, args.limit);
  },
});
```

**Why this is broken**:

- Doesn't use Convex `vectorSearch()` API at all
- All memories get identical 0.5 scores
- Defeats purpose of hybrid search (keyword results have real scores, vector results all equal)
- Loads entire user memory database into memory (wasteful)
- Semantic similarity completely non-functional

**Impact**: Hybrid search currently works ONLY via keyword component. Queries like "What languages do I like?" (semantic match) won't retrieve "User prefers TypeScript over JavaScript" (keyword mismatch).

### Solution

Replace with native Convex vector search API.

**Expected implementation**:

```typescript
export const vectorSearch = internalAction({
  handler: async (ctx, args) => {
    // Use native Convex vector search API
    const results = await ctx.vectorSearch("memories", "by_embedding", {
      vector: args.embedding,
      limit: args.limit,
      filter: (q) => q.eq("userId", args.userId),
    });

    // Map to standard format with REAL similarity scores
    return results.map(r => ({
      ...r,
      score: r._score  // Actual cosine similarity from vector index
    }));
  }
});
```

**Key changes**:

1. Change from `internalQuery` to `internalAction` (vector search requires action context)
2. Use `ctx.vectorSearch("memories", "by_embedding", {...})` instead of manual query
3. Pass `args.embedding` (query vector) to search API
4. Use `r._score` from results (real cosine similarity score)
5. Filter by userId at search time (not after loading all memories)

### Testing

**Test case**:

1. Add memory: "User prefers TypeScript over JavaScript"
2. Query: "What languages do I like?" (semantic match, no keyword overlap)
3. Before fix: Memory NOT retrieved (fake 0.5 scores don't help)
4. After fix: Memory retrieved with real similarity score (e.g., 0.87)

**Verification**:

```bash
# Check logs for real similarity scores
# Should see: Found memories with scores: [0.89, 0.76, 0.65]
# NOT: Found memories with scores: [0.5, 0.5, 0.5]
```

---

## Critical Gap 2: Memory Truncation Not Applied

### Problem

**File**: `convex/generation.ts` (lines 115-120)

The `truncateMemories()` function exists in `convex/lib/prompts/formatting.ts` but is **never called** during generation. All retrieved memories are injected without token budget enforcement.

**Current flow** (missing truncation):

```typescript
// convex/generation.ts:92-130
const memories = await ctx.runAction(
  internal.memories.search.hybridSearch,
  { userId: args.userId, query: args.userMessage, limit: 10 }
);

if (memories.length > 0) {
  const memoryContent = formatMemoriesByCategory(memories);  // ← Formats ALL 10

  if (memoryContent) {
    systemMessages.push({
      role: "system",
      content: memoryContent,  // ← Injects ALL without truncation
    });
  }
}
```

**Why this is a problem**:

- Can exceed token budget if memories are verbose
- No priority ordering (important memories might get cut off by less important ones)
- Wastes context on lower-priority memories when space limited
- Documentation claims truncation is used, but it's not

**Impact**: Risk of context overflow, inefficient context usage, no priority-based selection.

### Solution

Add truncation step before formatting.

**Expected implementation**:

```typescript
// convex/generation.ts:115-120 (updated)
const memories = await ctx.runAction(
  internal.memories.search.hybridSearch,
  { userId: args.userId, query: args.userMessage, limit: 10 }
);

if (memories.length > 0) {
  // NEW: Truncate to token budget before formatting
  const maxMemoryTokens = Math.floor(modelConfig.contextWindow * 0.15); // 15% of context for memories
  const truncatedMemories = truncateMemories(memories, maxMemoryTokens);

  const memoryContent = formatMemoriesByCategory(truncatedMemories);

  if (memoryContent) {
    systemMessages.push({
      role: "system",
      content: memoryContent,
    });
  }
}
```

**Token budget allocation**:

- System prompts: ~10-20% of context
- Memories: ~15% of context (NEW)
- Conversation history: Remaining ~65-75%

**Priority ordering** (from `truncateMemories` implementation):

1. Relationship memories (highest priority)
2. Project memories
3. Identity memories
4. Context memories
5. Preference memories (lowest priority)

### Implementation Details

The `truncateMemories` function already exists and is fully implemented:

**Location**: `convex/lib/prompts/formatting.ts`

**Signature**:
```typescript
export function truncateMemories(
  memories: any[],
  maxTokens: number
): any[]
```

**Logic**:
1. Sort by category priority (relationship → project → identity → context → preference)
2. Accumulate memories while tracking token count
3. Stop when budget exceeded
4. Return truncated list

**No changes needed to truncateMemories** - just call it in generation flow.

### Testing

**Test case**:

1. Add 20 verbose memories (200+ chars each, total ~8000 tokens)
2. Set model with small context (e.g., 8k tokens)
3. Send message triggering retrieval
4. Before fix: All 20 memories injected (~8000 tokens), little room for conversation
5. After fix: Only top ~6-8 memories included (~1200 tokens max), respecting budget

**Verification**:

```typescript
// Check logs
console.log(`[Memory] Retrieved ${memories.length} memories`);
console.log(`[Memory] After truncation: ${truncatedMemories.length} memories`);
console.log(`[Memory] Token usage: ${estimatedTokens}/${maxMemoryTokens}`);
```

---

## Critical Gap 3: Token Tracking Inconsistent

### Problem

**File**: `convex/generation.ts` (line 417)

Memory content is passed as **empty array** to the token counting function, even though memories are already in `systemPrompts`. This causes `memoriesTokens` to always report 0.

**Current code**:

```typescript
// convex/generation.ts:417
const tokenUsage = await calculateConversationTokensAsync(
  systemPromptStrings,
  [],  // ← EMPTY! Memories already embedded in systemPrompts
  allMessagesForCounting,
  modelConfig.contextWindow,
  args.modelId,
);
```

**Function signature** (expects separate memory tracking):

```typescript
// convex/tokens/counting.ts
export async function calculateConversationTokensAsync(
  systemPrompts: string[],
  memories: string[],  // ← Designed to receive memory content separately
  messages: Doc<"messages">[],
  contextLimit: number,
  modelId: string,
): Promise<TokenUsage>
```

**Why this is a problem**:

- `tokenUsage.memoriesTokens` always 0 in database
- Can't track memory efficiency over time
- Can't dynamically adjust memory limit based on available context
- Misleading metrics for debugging

**Impact**: Inaccurate metrics, can't optimize memory usage, can't detect context bloat.

### Solution

Pass memory content separately for accurate tracking.

**Option A: Pass memories separately** (recommended):

```typescript
// convex/generation.ts:115-125 (track memory content)
let memoryContent: string | null = null;

if (memories.length > 0) {
  const maxMemoryTokens = Math.floor(modelConfig.contextWindow * 0.15);
  const truncatedMemories = truncateMemories(memories, maxMemoryTokens);

  memoryContent = formatMemoriesByCategory(truncatedMemories);

  if (memoryContent) {
    systemMessages.push({
      role: "system",
      content: memoryContent,
    });
  }
}

// Later in token counting (line 417)
const tokenUsage = await calculateConversationTokensAsync(
  systemPromptStrings,
  memoryContent ? [memoryContent] : [],  // ← Pass actual memory content
  allMessagesForCounting,
  modelConfig.contextWindow,
  args.modelId,
);
```

**Option B: Extract from systemPrompts** (alternative):

```typescript
// Extract memory content from systemPrompts by detecting memory marker
const memoryPrompt = systemPromptStrings.find(p => p.includes("## What You Remember"));
const memoryStrings = memoryPrompt ? [memoryPrompt] : [];

const tokenUsage = await calculateConversationTokensAsync(
  systemPromptStrings.filter(p => p !== memoryPrompt),  // Exclude memory from system prompts
  memoryStrings,  // Pass separately
  allMessagesForCounting,
  modelConfig.contextWindow,
  args.modelId,
);
```

**Recommendation**: Use Option A (cleaner, more explicit).

### Testing

**Test case**:

1. Send message with memory retrieval
2. Check `tokenUsage` in database
3. Before fix: `memoriesTokens: 0`
4. After fix: `memoriesTokens: 347` (actual count)

**Verification**:

```typescript
// In generation.ts, log token breakdown
console.log("Token usage breakdown:", {
  system: tokenUsage.systemTokens,
  memories: tokenUsage.memoriesTokens,  // Should be > 0
  messages: tokenUsage.messagesTokens,
  total: tokenUsage.totalTokens,
});
```

---

## Implementation Checklist

### Gap 1: Vector Search

- [ ] Change `vectorSearch` from `internalQuery` to `internalAction`
- [ ] Replace manual query with `ctx.vectorSearch("memories", "by_embedding", {...})`
- [ ] Pass `args.embedding` to search API
- [ ] Use `r._score` instead of fake 0.5
- [ ] Test semantic query retrieval
- [ ] Verify real similarity scores in logs

**File**: `convex/memories/search.ts` (lines 66-88)

### Gap 2: Memory Truncation

- [ ] Import `truncateMemories` from formatting utils
- [ ] Calculate max memory tokens (15% of context window)
- [ ] Call `truncateMemories(memories, maxMemoryTokens)` after hybrid search
- [ ] Pass truncated memories to `formatMemoriesByCategory`
- [ ] Test with 20 verbose memories
- [ ] Verify truncation in logs

**File**: `convex/generation.ts` (lines 115-120)

### Gap 3: Token Tracking

- [ ] Store `memoryContent` in variable before injecting
- [ ] Pass `[memoryContent]` to `calculateConversationTokensAsync`
- [ ] Verify `memoriesTokens > 0` in database
- [ ] Log token breakdown for verification
- [ ] Test across multiple messages

**File**: `convex/generation.ts` (lines 115-125, 417)

---

## Files to Modify

1. **`convex/memories/search.ts`**
   - Lines: 66-88
   - Change: Replace vectorSearch implementation

2. **`convex/generation.ts`**
   - Lines: 115-120 (add truncation)
   - Lines: 115-125 (track memory content)
   - Line: 417 (pass memory to token counter)

3. **`convex/lib/prompts/formatting.ts`**
   - No changes needed (truncateMemories already implemented)
   - Just need to import and use it

---

## Important Context

### Convex Vector Search API

**Schema requirement**: Table must have vector index defined

```typescript
// convex/schema.ts (already exists)
memories: defineTable({
  userId: v.string(),
  content: v.string(),
  embedding: v.array(v.float64()),  // 1536 dimensions
  // ...
}).vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 1536,
  filterFields: ["userId"],
})
```

**API usage**:

```typescript
// In internalAction context only (not query)
const results = await ctx.vectorSearch(
  "tableName",     // "memories"
  "indexName",     // "by_embedding"
  {
    vector: embedding,   // Query vector (1536 dimensions)
    limit: 10,           // Max results
    filter: (q) => q.eq("userId", userId),  // Filter before search
  }
);

// Results include _score (cosine similarity 0.0-1.0)
results.forEach(r => console.log(r._score));
```

### Token Budget Allocation

**Total context window**: Varies by model (e.g., 8k, 16k, 128k)

**Recommended allocation**:
- System prompts: 10-20% (fixed overhead)
- Memories: 15% (NEW - enforced by truncation)
- Conversation history: 65-75% (flexible, truncated if needed)

**Example** (16k context window):
- System: ~2k tokens
- Memories: ~2.4k tokens (15% of 16k)
- Messages: ~11.6k tokens

### Graceful Degradation

All fixes preserve 3-level error handling:

1. **Hybrid search level**: Returns `[]` on error (keyword OR vector can fail)
2. **Memory fetch level**: Continues without memories if search fails
3. **Generation level**: Never blocks on memory failures

Example:
```typescript
try {
  const memories = await hybridSearch(...);
  // ... truncate, format, inject
} catch (error) {
  console.error("[Memory] Fetch failed:", error);
  // Continue generation without memories
}
```

---

## Testing Strategy

### Test 1: Vector Search Fix

**Objective**: Verify semantic search works with real similarity scores

**Steps**:
1. Add memory: "User prefers TypeScript over JavaScript"
2. Query: "What languages do I like?" (semantic match, no keyword overlap)
3. Check logs for similarity score

**Expected**:
- Before: Memory NOT retrieved (or retrieved with 0.5 score)
- After: Memory retrieved with real score (e.g., 0.87)

**Log output**:
```
[Memory] Vector search results: [
  { content: "User prefers TypeScript...", score: 0.87 },
  { content: "User is building with React...", score: 0.65 }
]
```

### Test 2: Truncation

**Objective**: Verify truncation limits memory token usage

**Steps**:
1. Add 20 verbose memories (200+ chars each)
2. Send message triggering retrieval
3. Check logs for truncation count

**Expected**:
- Before: All 20 memories injected (~8k tokens)
- After: Only top ~6-8 memories (~1.2k tokens)

**Log output**:
```
[Memory] Retrieved 20 memories
[Memory] After truncation: 7 memories (1147/1200 tokens)
```

### Test 3: Token Tracking

**Objective**: Verify memory tokens tracked separately

**Steps**:
1. Send message with memory retrieval
2. Query `usageRecords` table for token breakdown

**Expected**:
- Before: `memoriesTokens: 0`
- After: `memoriesTokens: 347` (or actual count)

**Database check**:
```typescript
// In usageRecords table
{
  systemTokens: 423,
  memoriesTokens: 347,  // ← Should be > 0
  messagesTokens: 1234,
  totalTokens: 2004
}
```

---

## Success Criteria

Phase 1 is complete when:

1. ✅ Vector search returns real similarity scores (not 0.5)
2. ✅ Semantic queries retrieve relevant memories
3. ✅ Memory truncation limits token usage to 15% of context
4. ✅ Priority ordering works (relationship > project > identity > context > preference)
5. ✅ Token tracking shows accurate `memoriesTokens` count
6. ✅ All 3 tests pass
7. ✅ No regressions in existing functionality

**Definition of done**: All checklist items complete, tests passing, logs show correct behavior.

---

## Common Issues

### Issue 1: "vectorSearch is not a function"

**Cause**: Using `internalQuery` instead of `internalAction`

**Fix**: Change to `internalAction` - vector search requires action context

### Issue 2: Embedding dimension mismatch

**Cause**: Query embedding dimensions don't match index (1536)

**Fix**: Verify embedding model is `text-embedding-3-small` (1536 dimensions)

### Issue 3: Truncation cuts off all memories

**Cause**: `maxMemoryTokens` too low or all memories too long

**Fix**: Adjust allocation percentage (15% → 20%) or reduce memory verbosity

### Issue 4: Token count inaccurate

**Cause**: Memory content includes markdown formatting, not just raw text

**Fix**: This is expected - token counter accounts for markdown syntax

---

## Next Steps After Phase 1

Once all 3 critical gaps are fixed:

1. **Verify baseline functionality** - Confirm memory retrieval working correctly
2. **Run full test suite** - Ensure no regressions
3. **Monitor production metrics** - Check `memoriesTokens` tracking over time
4. **Proceed to Phase 2** - Quick wins (selective retrieval, caching)

Phase 1 establishes a working foundation. Phases 2-3 add optimizations on top of this base.
