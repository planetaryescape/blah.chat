# Tool Optimisation: Search & Safeguards

Architecture and design decisions for AI tool calling in blah.chat.

---

## Overview

This system addresses two problems:
1. **Search quality** - Finding the right content across files, notes, tasks, conversations, and knowledge bank
2. **Tool call safeguards** - Preventing runaway tool calls that waste tokens and frustrate users

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Generation Loop                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ BudgetTracker │   │ RateLimiter  │   │ SearchCache  │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│           │                  │                  │           │
│           ▼                  ▼                  ▼           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    Tool Execution                      │ │
│  │  searchAll → KB first → RRF merge → Quality score     │ │
│  │  urlReader, codeExecution, weather, etc.              │ │
│  └───────────────────────────────────────────────────────┘ │
│           │                                                 │
│           ▼                                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Diminishing Returns Detection             │ │
│  │  Repeated queries? High overlap? Decreasing scores?   │ │
│  └───────────────────────────────────────────────────────┘ │
│           │                                                 │
│           ▼                                                 │
│  Budget warning injection if low                            │
│  Ask-user suggestion if stuck                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Response (or clarification request)
```

---

## Key Design Decisions

### 1. Knowledge Bank First

**Decision**: Always search knowledge bank before other sources. If results score "high", skip searching files/notes/tasks.

**Why**: User's curated knowledge is their most valuable data. Searching files first often returns noise that buries the good stuff.

**Implementation**: `searchAll` searches KB first, checks quality, returns early if high confidence.

### 2. Weighted RRF (Reciprocal Rank Fusion)

**Decision**: Weight sources differently when merging results:
- Knowledge bank: 1.5x
- Files: 1.2x
- Notes/Tasks: 1.0x
- Conversations: 0.8x

**Why**: Not all sources are equal. User-curated knowledge > raw files > chat history for most queries.

**Location**: `convex/lib/utils/search.ts` - `applyRRF()` with weights parameter.

### 3. Token Budget Tracking

**Decision**: Track estimated token usage per generation, inject warnings at 50%/70% thresholds.

**Why**: Without visibility, AI keeps searching blindly. Budget awareness lets it make informed decisions.

**Key thresholds**:
- 50% used → inject status message
- 70% used → suggest answering or asking user
- 90% used → stop tool calls

**Location**: `convex/lib/budgetTracker.ts`

### 4. Per-Tool Rate Limits

**Decision**: Limit individual tools within a generation window:
- searchAll: 5/minute
- urlReader: 3/minute
- codeExecution: 2/minute

**Why**: Prevents AI from hammering expensive tools. Some queries triggered 10+ URL reads.

**Location**: `convex/lib/toolRateLimiter.ts` (not yet implemented as standalone, logic embedded in generation)

### 5. Search Result Caching

**Decision**: Cache search results within a single generation by query+resourceTypes+projectId key.

**Why**: AI often repeats similar searches. Caching saves latency and reduces embeddings cost.

**Scope**: Per-generation only, not persistent.

### 6. Quality Scoring

**Decision**: Score results as high/medium/low based on:
- Top score (40% weight)
- Average score (25%)
- Result count (20%)
- Recency (10%)
- Score variance (5%)

**Why**: Objective metric for "good enough" - AI was making inconsistent subjective decisions.

**Location**: `convex/lib/utils/searchQuality.ts`

### 7. Diminishing Returns Detection

**Decision**: Track search history, warn AI when:
- Same query repeated
- >80% result overlap with previous search
- Scores decreasing across searches
- 3+ searches performed

**Why**: AI kept searching hoping for better results. Warnings help it know when to stop.

### 8. LLM Reranking

**Decision**: Use gpt-4o-mini to rerank results only when quality < "high".

**Why**: Vector search isn't perfect. LLM understands context better. But it costs tokens, so only use when needed.

### 9. Query Expansion

**Decision**: Generate 2-3 alternative phrasings only when initial search returns low-quality results.

**Why**: Vocabulary mismatch is real ("authentication" vs "login"). But expansion costs tokens, so gate it on quality.

---

## Configuration Values

| Setting | Value | Rationale |
|---------|-------|-----------|
| KB weight in RRF | 1.5x | Curated content > raw content |
| Budget warning threshold | 50% | Early enough to change behavior |
| Budget critical threshold | 70% | Time to wrap up |
| Max tool calls | 5 | Vercel AI SDK default, works well |
| Search cache scope | Per-generation | Avoid stale results across conversations |
| Quality "high" threshold | 0.8 | Empirically determined |
| Overlap warning threshold | 80% | Below this, results are different enough |
| Reranking model | gpt-4o-mini | Cost-effective, sufficient quality |
| Max query variations | 3 | Diminishing returns beyond this |

---

## Key Files

| File | Purpose |
|------|---------|
| `convex/search/hybrid.ts` | Hybrid full-text + vector search |
| `convex/tools/search/searchAll.ts` | Unified search action |
| `convex/ai/tools/search/searchAll.ts` | Tool wrapper exposed to AI |
| `convex/generation.ts` | Main generation loop with all safeguards |
| `convex/lib/budgetTracker.ts` | Token budget tracking and injection |
| `convex/lib/utils/search.ts` | RRF implementation with weights |

---

## How It Works Together

1. **Generation starts** - BudgetTracker initialized with model's context window, search cache created

2. **AI calls searchAll** -
   - Check cache for identical query
   - Search knowledge bank first
   - If quality "high" and enough results, return early
   - Otherwise search remaining sources in parallel
   - Merge with weighted RRF
   - Calculate quality score
   - If quality "low", try LLM reranking
   - Cache results

3. **After each tool call** -
   - Record token usage in BudgetTracker
   - Add to search history
   - Check for diminishing returns patterns
   - If budget low, inject warning message
   - If stuck pattern detected, suggest ask-user tool

4. **AI decides next action** -
   - Sees budget status if low
   - Sees diminishing returns warning if applicable
   - Can choose to answer, search more, or ask user

---

## Future Enhancements

When extending this system:

1. **Adding new search sources** - Add to `resourceTypes` enum, implement search function, add to parallel search array, assign RRF weight

2. **Tuning quality thresholds** - Adjust in `calculateResultQuality()`. Monitor user feedback on "insufficient results" complaints

3. **Adjusting rate limits** - Modify `DEFAULT_LIMITS` in rate limiter. Watch for "rate limited" errors in logs

4. **Adding new safeguards** - Follow the pattern: detect pattern → inject message → let AI decide

5. **Personalized ranking** - Could weight sources based on user's historical clicks. Not implemented.

6. **Search analytics** - Could log quality scores, expansion usage, early returns. Useful for tuning.

---

## What We Avoided

- **Over-engineering**: No separate "search orchestrator" service. Logic stays in generation loop.
- **Persistent caching**: Risk of stale results. Per-generation caching is simpler.
- **Automatic tool blocking**: AI gets warnings, but ultimately decides. Blocking felt too aggressive.
- **Complex ML ranking**: Simple weighted RRF works well enough. LLM reranking only when needed.
- **User-configurable weights**: Complexity not justified. Hardcoded defaults work for most cases.

---

## Testing Notes

Unit tests exist for:
- RRF weighting logic
- Budget tracker state transitions
- Quality score calculation
- Cache key generation

Manual testing recommended for:
- Budget warnings appearing in AI reasoning
- Diminishing returns affecting AI behavior
- Rate limits triggering gracefully
