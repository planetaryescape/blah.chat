# Tool Optimisation

Improvements to search tools and AI tool calling safeguards for blah.chat.

## Overview

This project addresses two main areas:

1. **Search Improvements**: Unified search across all content types with intelligent prioritization
2. **Tool Call Safeguards**: Prevent runaway tool calls, manage context budget, improve UX

## Phases

| Phase | Focus | Issues | Timeline |
|-------|-------|--------|----------|
| [Phase 1](./phase-1-foundation.md) | Foundation | 1, 2, 3, 12 | Week 1 |
| [Phase 2](./phase-2-search-quality.md) | Search Quality | 4, 5, 6, 11 | Week 2 |
| [Phase 3](./phase-3-safeguards.md) | Safeguards | 7, 8, 9, 10 | Week 3 |
| [Phase 4](./phase-4-advanced.md) | Advanced | 13 | Week 4+ (optional) |

## Quick Reference

### Issue Summary

| # | Title | Priority | Effort | Dependencies |
|---|-------|----------|--------|--------------|
| 1 | Knowledge Bank in searchAll | P0 | 2-3h | None |
| 2 | Weighted RRF | P1 | 2h | None |
| 3 | Token Budget Tracking | P0 | 3-4h | None |
| 4 | Knowledge-First Strategy | P0 | 3h | Issue 1 |
| 5 | Quality Scoring | P1 | 2-3h | Issue 2 |
| 6 | Diminishing Returns | P1 | 3h | Issues 3, 5 |
| 7 | Per-Tool Rate Limiting | P1 | 2-3h | None |
| 8 | Budget Awareness in Prompt | P0 | 2h | Issue 3 |
| 9 | Context Budget Management | P1 | 3-4h | Issue 3 |
| 10 | Ask User Heuristic | P2 | 3h | Issues 6, 8 |
| 11 | LLM Reranking | P1 | 3-4h | Issue 5 |
| 12 | Search Caching | P1 | 2h | None |
| 13 | Query Expansion | P3 | 3h | Issue 11 |

### Dependency Graph

```
Phase 1 (Foundation)           Phase 2 (Quality)              Phase 3 (Safeguards)
─────────────────────         ─────────────────              ──────────────────────
Issue 1 ──────────────────────→ Issue 4
Issue 2 ──────────────────────→ Issue 5 ────────→ Issue 6 ───→ Issue 11
Issue 3 ────────┬─────────────────────────────────────────────→ Issue 8 ───→ Issue 10
                │                                              Issue 9
                └────────────────────────────────────────────→
Issue 12 (independent)
Issue 7 (independent)                                         Phase 4 (Advanced)
                                                              ────────────────────
                                                              Issue 13 ← Issue 11
```

## Key Decisions

1. **Knowledge bank weight**: Always 1.5x (not configurable)
2. **Budget thresholds**: 50% inject warnings, 30% suggest ask-user
3. **Rate limits**: searchAll 5/min, urlReader 3/min, codeExecution 2/min
4. **Summarization**: gpt-4o-mini for context compression
5. **Testing**: Unit tests only (no integration tests)

## How to Use

Each phase document is self-contained:

1. Read the phase document relevant to your assigned issue
2. Check "Prerequisites" section for required prior work
3. Follow implementation steps exactly
4. Run unit tests specified in "Acceptance Criteria"
5. Mark issue complete when all acceptance criteria pass

## Key Files

```
packages/backend/convex/
├── search/
│   └── hybrid.ts                 # Hybrid search (full-text + vector)
├── tools/search/
│   └── searchAll.ts              # Unified search action
├── ai/tools/search/
│   └── searchAll.ts              # Tool wrapper for AI
├── generation.ts                 # Main generation loop
├── generation/tools.ts           # Tool registration
└── lib/
    ├── budgetTracker.ts          # Token budget tracking (Phase 1)
    ├── toolRateLimiter.ts        # Per-tool rate limits (Phase 3)
    └── utils/
        ├── search.ts             # RRF implementation
        ├── searchQuality.ts      # Quality scoring (Phase 2)
        ├── rerank.ts             # LLM reranking (Phase 2)
        ├── summarize.ts          # Context summarization (Phase 3)
        └── queryExpansion.ts     # Query expansion (Phase 4)
```

## Success Metrics

After all phases complete:

- [ ] Knowledge bank always searched first
- [ ] AI stops searching when quality is high
- [ ] AI warns about diminishing returns
- [ ] Token budget visible to AI when low
- [ ] Rate limits prevent tool abuse
- [ ] Context never exceeds model limit
- [ ] AI asks user when stuck instead of infinite loops
