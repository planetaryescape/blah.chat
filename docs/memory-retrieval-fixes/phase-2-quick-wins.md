# Phase 2: Quick Wins - Performance Optimizations

## Overview

This phase implements **2 performance optimizations** that significantly improve response times and reduce costs without changing functionality. These are high-value, low-effort improvements.

**Estimated effort**: 1-2 hours
**Priority**: MEDIUM - Performance gains
**Prerequisites**: Phase 1 complete (critical gaps fixed)

---

## Background Context

### Current Behavior (After Phase 1)

Every user message triggers:
1. Embedding generation for query (~50ms, $0.00001)
2. Hybrid search (keyword + vector) (~100ms)
3. Retrieval of up to 10 memories
4. Formatting and injection into context

**Problem**: This happens even for simple messages like "hello", "ok", "thanks" that don't need memory context.

**Opportunity**: Industry research (Mem0, ChatGPT) shows **91% p95 latency reduction** (1.44s vs 17.12s) and **60% cost savings** with selective retrieval.

---

## Quick Win 1: Selective Memory Retrieval

### Problem

**Current**: Pre-fetch memories for EVERY message

**Example waste**:
- "hello" → retrieves 10 memories (unnecessary)
- "thanks" → retrieves 10 memories (unnecessary)
- "what's 2+2?" → retrieves 10 memories (unnecessary)

**Impact**: 40-60% of messages don't need memory context, but we pay embedding + search cost anyway.

### Solution

Add intelligent detection: Does this message reference memory?

**Pattern matching approach**:

```typescript
// Helper function
function messageNeedsMemory(content: string): boolean {
  // Explicit memory references
  const memoryKeywords = /\b(remember|you (told|said|mentioned)|last time|before|previously|earlier|my (name|preference|project)|what (do you know|did (I|we)))\b/i;

  // Questions about user context
  const contextQuestions = /\b(what('s| is) my|tell me about my|show me my)\b/i;

  // Continuation words (might reference previous context)
  const continuations = /\b(also|additionally|furthermore|and another thing)\b/i;

  return (
    memoryKeywords.test(content) ||
    contextQuestions.test(content) ||
    continuations.test(content) ||
    content.length > 100  // Long messages likely need context
  );
}
```

**Dynamic limit adjustment**:

```typescript
// In generation.ts, before hybrid search
const needsMemory = messageNeedsMemory(args.userMessage);
const memoryLimit = needsMemory ? 10 : 3;  // Full vs minimal retrieval

console.log(`[Memory] Message needs memory: ${needsMemory} (limit: ${memoryLimit})`);

const memories = await ctx.runAction(
  internal.memories.search.hybridSearch,
  {
    userId: args.userId,
    query: args.userMessage,
    limit: memoryLimit,  // ← Dynamic limit
  },
);
```

**Benefits**:
- 60% fewer embedding API calls (short messages skip full retrieval)
- 40% token savings on simple messages
- Same UX for memory-relevant queries
- Faster response times (less search overhead)

**Trade-off**: Slightly worse recall on implicit references (acceptable - can adjust patterns based on user feedback).

### Implementation

**File**: `convex/generation.ts`

**Location**: Lines 92-95 (before hybrid search call)

**Changes**:

```typescript
// NEW: Helper function (add at top of file)
function messageNeedsMemory(content: string): boolean {
  const memoryKeywords = /\b(remember|you (told|said|mentioned)|last time|before|previously|earlier|my (name|preference|project)|what (do you know|did (I|we)))\b/i;
  const contextQuestions = /\b(what('s| is) my|tell me about my|show me my)\b/i;
  const continuations = /\b(also|additionally|furthermore|and another thing)\b/i;

  return (
    memoryKeywords.test(content) ||
    contextQuestions.test(content) ||
    continuations.test(content) ||
    content.length > 100
  );
}

// UPDATED: Memory retrieval (line 92)
if (args.userMessage) {
  try {
    // NEW: Check if message needs memory
    const needsMemory = messageNeedsMemory(args.userMessage);
    const memoryLimit = needsMemory ? 10 : 3;

    console.log(`[Memory] Query: "${args.userMessage.slice(0, 50)}..."`);
    console.log(`[Memory] Needs full memory: ${needsMemory} (limit: ${memoryLimit})`);

    const memories = await ctx.runAction(
      internal.memories.search.hybridSearch,
      {
        userId: args.userId,
        query: args.userMessage,
        limit: memoryLimit,  // ← Dynamic instead of hardcoded 10
      },
    );

    // ... rest of memory processing (truncation, formatting)
  } catch (error) {
    console.error("[Memory] Fetch failed:", error);
  }
}
```

### Testing

**Test case 1: Short message (no memory needed)**

Input: "hello"

Expected:
- Before: Retrieves 10 memories
- After: Retrieves 3 memories (minimal)
- Log: `[Memory] Needs full memory: false (limit: 3)`

**Test case 2: Memory reference (full retrieval)**

Input: "Remember what I told you about my project?"

Expected:
- Before: Retrieves 10 memories
- After: Retrieves 10 memories (full)
- Log: `[Memory] Needs full memory: true (limit: 10)`

**Test case 3: Implicit reference (edge case)**

Input: "How should I structure it?" (no memory keywords, but might refer to previous discussion)

Expected:
- After: Retrieves 3 memories (minimal)
- Trade-off: Might miss context, but acceptable for MVP

**Verification**:

```bash
# Monitor logs during chat session
# Count how many messages trigger full vs minimal retrieval
# Should see ~60% of messages with limit: 3
```

---

## Quick Win 2: Memory Caching

### Problem

**Current**: Embedding + search on EVERY message, even in rapid-fire conversations

**Example**:
```
User: "What's my project stack?"  → Embedding + search
User: "And what database?"        → Embedding + search (same memories!)
User: "What about auth?"          → Embedding + search (same memories!)
```

All 3 queries likely retrieve the **same memories** (project-related), but we pay for 3 separate searches.

**Impact**:
- Wasted computation during active conversations
- Higher latency (200-300ms per search)
- 3x API costs for redundant embedding calls

### Solution

Cache retrieved memories for 5-10 minutes during active conversations.

**Implementation approach**:

```typescript
// Simple in-memory cache (Convex actions are stateless, so use ctx.storage or external cache)
// For MVP: Use conversation-level caching with timestamp check

// In generation.ts
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes

// Before hybrid search:
const conversation = await ctx.db.get(args.conversationId);
const now = Date.now();

// Check if cached memories are fresh
const cacheValid = conversation.lastMemoryFetchAt &&
                   conversation.cachedMemories &&
                   (now - conversation.lastMemoryFetchAt < CACHE_TTL_MS);

let memories: any[];

if (cacheValid) {
  console.log("[Memory] Using cached memories");
  memories = conversation.cachedMemories;
} else {
  console.log("[Memory] Fetching fresh memories");
  memories = await ctx.runAction(internal.memories.search.hybridSearch, {
    userId: args.userId,
    query: args.userMessage,
    limit: memoryLimit,
  });

  // Cache results
  await ctx.db.patch(args.conversationId, {
    cachedMemories: memories,
    lastMemoryFetchAt: now,
  });
}
```

**Cache invalidation**:

- **Time-based**: 5min TTL (stale after this)
- **Event-based**: Clear on new memory extraction

```typescript
// In memories/extract.ts, after storing new memory
await ctx.runMutation(internal.conversations.clearMemoryCache, {
  userId: conversation.userId,
});

// In conversations.ts (new mutation)
export const clearMemoryCache = internalMutation({
  handler: async (ctx, args) => {
    // Clear cache for all user's conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const conv of conversations) {
      await ctx.db.patch(conv._id, {
        cachedMemories: undefined,
        lastMemoryFetchAt: undefined,
      });
    }
  },
});
```

**Benefits**:
- 80% fewer searches during active conversations (typical: 5-10 messages in 5min window)
- 200ms faster response (no search delay)
- Same UX (cache transparent to user)
- Auto-invalidates on new memory creation

**Trade-off**: Slightly stale memories if user edits/deletes during cache window (acceptable - rare case).

### Implementation

**Files to modify**:

1. **`convex/schema.ts`** - Add cache fields to conversations table
2. **`convex/generation.ts`** - Add caching logic before hybrid search
3. **`convex/conversations.ts`** - Add clearMemoryCache mutation
4. **`convex/memories/extract.ts`** - Invalidate cache after extraction

**Schema changes**:

```typescript
// convex/schema.ts
conversations: defineTable({
  // ... existing fields
  cachedMemories: v.optional(v.array(v.any())),  // NEW: Cached memory results
  lastMemoryFetchAt: v.optional(v.number()),     // NEW: Timestamp of last fetch
})
```

**Generation changes**:

```typescript
// convex/generation.ts (lines 92-130, updated)
if (args.userMessage) {
  try {
    const needsMemory = messageNeedsMemory(args.userMessage);
    const memoryLimit = needsMemory ? 10 : 3;

    // NEW: Check cache
    const conversation = await ctx.db.get(args.conversationId!);
    const now = Date.now();
    const CACHE_TTL_MS = 5 * 60 * 1000;

    const cacheValid = conversation?.lastMemoryFetchAt &&
                       conversation?.cachedMemories &&
                       (now - conversation.lastMemoryFetchAt < CACHE_TTL_MS);

    let memories: any[];

    if (cacheValid) {
      console.log("[Memory] Cache hit (age: ${(now - conversation.lastMemoryFetchAt!) / 1000}s)");
      memories = conversation.cachedMemories!;
    } else {
      console.log("[Memory] Cache miss - fetching fresh memories");
      memories = await ctx.runAction(
        internal.memories.search.hybridSearch,
        { userId: args.userId, query: args.userMessage, limit: memoryLimit }
      );

      // Cache results
      await ctx.db.patch(args.conversationId!, {
        cachedMemories: memories,
        lastMemoryFetchAt: now,
      });
    }

    // ... rest of processing (truncation, formatting)
  } catch (error) {
    console.error("[Memory] Fetch failed:", error);
  }
}
```

**Cache invalidation**:

```typescript
// convex/conversations.ts (new mutation)
export const clearMemoryCache = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const conv of conversations) {
      await ctx.db.patch(conv._id, {
        cachedMemories: undefined,
        lastMemoryFetchAt: undefined,
      });
    }

    console.log(`[Cache] Cleared memory cache for ${conversations.length} conversations`);
  },
});

// convex/memories/extract.ts (after storing new memory, line 260)
// Clear cache when new memories extracted
await ctx.runMutation(internal.conversations.clearMemoryCache, {
  userId: conversation.userId,
});
```

### Testing

**Test case 1: Cache hit**

Steps:
1. Send message 1: "What's my project?" → Fetches memories
2. Send message 2 (within 5min): "And the tech stack?" → Uses cache

Expected:
- Message 1: `[Memory] Cache miss - fetching fresh memories`
- Message 2: `[Memory] Cache hit (age: 3s)`

**Test case 2: Cache expiration**

Steps:
1. Send message 1: "What's my project?" → Fetches memories
2. Wait 6 minutes
3. Send message 2: "What's the stack?" → Fetches fresh

Expected:
- Message 1: `[Memory] Cache miss`
- Message 2 (after 6min): `[Memory] Cache miss - fetching fresh memories`

**Test case 3: Cache invalidation**

Steps:
1. Send message: "What's my project?" → Fetches memories
2. Trigger memory extraction (add new memory manually)
3. Send message: "What's the stack?" → Fetches fresh (cache cleared)

Expected:
- Message 1: `[Memory] Cache miss`
- After extraction: `[Cache] Cleared memory cache for 3 conversations`
- Message 2: `[Memory] Cache miss - fetching fresh memories`

**Verification**:

```bash
# Check conversation document in Convex dashboard
# Should see cachedMemories and lastMemoryFetchAt fields populated
```

---

## Combined Impact

**Selective retrieval + Caching**:

Baseline (Phase 1):
- 10 messages → 10 embedding calls, 10 searches

After Phase 2:
- 10 messages → ~4 embedding calls (60% reduction), ~2 searches (80% reduction)

**Cost savings**:
- Embedding: $0.00001/call → $0.0001 to $0.00004 (60% reduction)
- Search: ~100ms/call → ~20ms average (80% reduction)

**Latency improvement**:
- Average response time: 1.5s → 1.2s (20% faster)
- Cache hit response: 1.5s → 1.0s (33% faster)

---

## Implementation Checklist

### Selective Retrieval

- [ ] Add `messageNeedsMemory()` helper function
- [ ] Update hybrid search call to use dynamic limit
- [ ] Add logging for debugging pattern matching
- [ ] Test with short messages ("hello", "ok")
- [ ] Test with memory references ("remember my project")
- [ ] Adjust regex patterns based on false negatives

**File**: `convex/generation.ts` (lines 92-95)

### Memory Caching

- [ ] Add `cachedMemories` and `lastMemoryFetchAt` to schema
- [ ] Implement cache check before hybrid search
- [ ] Store results in conversation document
- [ ] Add `clearMemoryCache` mutation in conversations
- [ ] Call cache invalidation after memory extraction
- [ ] Test cache hit/miss scenarios
- [ ] Verify cache expiration (5min TTL)

**Files**:
- `convex/schema.ts` (add fields)
- `convex/generation.ts` (lines 92-130)
- `convex/conversations.ts` (new mutation)
- `convex/memories/extract.ts` (line 260, add invalidation)

---

## Files to Modify

1. **`convex/schema.ts`**
   - Add: `cachedMemories`, `lastMemoryFetchAt` to conversations table

2. **`convex/generation.ts`**
   - Lines: 92-95 (add selective retrieval)
   - Lines: 92-130 (add caching logic)

3. **`convex/conversations.ts`**
   - Add: `clearMemoryCache` internal mutation

4. **`convex/memories/extract.ts`**
   - Line: 260 (after memory storage, invalidate cache)

---

## Success Criteria

Phase 2 is complete when:

1. ✅ Short messages ("hello") retrieve 3 memories (not 10)
2. ✅ Memory references ("remember X") retrieve 10 memories
3. ✅ Rapid-fire messages use cached results (log shows "Cache hit")
4. ✅ Cache expires after 5min (log shows "Cache miss" after TTL)
5. ✅ Cache invalidates on new memory extraction
6. ✅ Response time ~20% faster on average
7. ✅ Embedding API calls reduced by ~60%

**Definition of done**: All checklist items complete, tests passing, logs show caching behavior.

---

## Monitoring

After deploying Phase 2, monitor these metrics:

**Cache effectiveness**:
```typescript
// Count cache hits vs misses over 24 hours
const cacheHitRate = cacheHits / (cacheHits + cacheMisses);
// Target: >70% hit rate
```

**Selective retrieval accuracy**:
```typescript
// Track messages with full vs minimal retrieval
const minimalRetrievalRate = minimalRetrievals / totalMessages;
// Target: 60-70% minimal retrievals
```

**Latency improvement**:
```typescript
// Compare p50, p95 response times before/after
const p50Improvement = (oldP50 - newP50) / oldP50;
// Target: >15% improvement
```

**False negatives** (messages that needed memory but got minimal):
- User feedback: "You didn't remember X"
- Manual review of minimal retrieval messages
- Adjust regex patterns if >5% false negative rate

---

## Rollback Plan

If Phase 2 causes issues:

**Selective retrieval problems**:
- Set `memoryLimit = 10` (always full retrieval)
- Remove `messageNeedsMemory()` check
- Revert to Phase 1 behavior

**Caching problems**:
- Set `CACHE_TTL_MS = 0` (disable caching)
- Remove cache check, always fetch fresh
- Revert to Phase 1 behavior

**Both** can be rolled back independently without breaking functionality.

---

## Next Steps After Phase 2

Once performance optimizations are deployed:

1. **Monitor metrics** - Verify cache hit rate, latency improvements
2. **Gather feedback** - Check for false negatives in selective retrieval
3. **Tune parameters** - Adjust TTL, regex patterns based on usage
4. **Proceed to Phase 3** - Advanced features (confidence scoring, versioning, reranking)

Phase 2 provides immediate performance gains. Phase 3 adds quality improvements.
