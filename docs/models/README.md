# Database-Backed Model & Auto-Router Management

**Status**: Implementation Guide
**Last Updated**: 2026-01-26
**Complexity**: High (production migration)
**Estimated Time**: ~4 weeks

## Overview

Self-contained implementation guides for migrating from hardcoded model config and auto-router parameters to database-backed dynamic management.

### Current Problems

1. **Models**: 40+ models hardcoded in `packages/ai/src/models.ts` and `apps/web/src/lib/ai/models.ts`. Every model addition, pricing change, or capability update requires code deploy.

2. **Auto-Router**: Scoring bonuses, cost tier thresholds, model category scores, and other routing parameters are hardcoded in `packages/backend/convex/ai/autoRouter.ts` and `modelProfiles.ts`. Tuning the router requires code changes.

### Solution

- **Part 1**: Convex DB tables for models + admin UI + gradual Expand-Contract migration (zero downtime)
- **Part 2**: Convex DB tables for auto-router config + admin UI with dials/knobs for tuning

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Admin Dashboard                          │
├─────────────────────────────────┬───────────────────────────────┤
│     /admin/models               │     /admin/auto-router        │
│  - Add/Edit/Delete models       │  - Scoring bonuses (sliders)  │
│  - Pricing, capabilities        │  - Cost tier thresholds       │
│  - Bulk import/export           │  - Speed preferences          │
│  - Version history              │  - Model category scores      │
└─────────────────────────────────┴───────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Convex Database                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   models    │  │ modelHistory │  │   autoRouterConfig     │  │
│  │  (40+ rows) │  │  (versions)  │  │   (singleton row)      │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    modelProfiles                           │ │
│  │          (category scores per model: 21×8 = 168 scores)    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                              │
│  - Feature flag controls DB vs static source                     │
│  - Transforms DB records ↔ ModelConfig types                     │
│  - Convex reactive queries = automatic cache invalidation        │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application                                   │
│  - Model picker, generation, cost calculation                    │
│  - Auto-router uses DB config for scoring                        │
│  - Mobile app uses same repository                               │
└─────────────────────────────────────────────────────────────────┘
```

## Benefits

### Model Management
- **Add model**: DB insert via admin UI (no code deploy)
- **Update pricing**: DB update (live changes)
- **Version history**: Track who/when/why for all changes
- **Bulk ops**: Import/Export JSON, duplicate models
- **Rollback**: Feature flag = instant revert to static config

### Auto-Router Configuration
- **Tune scoring**: Adjust bonuses/penalties via sliders
- **Cost optimization**: Change tier boundaries on the fly
- **Model profiles**: Update category scores without deploys
- **Experimentation**: A/B test different routing strategies

## Database Schema Summary

| Table | Purpose | Rows |
|-------|---------|------|
| `models` | All ModelConfig properties | 40+ models |
| `modelHistory` | Version tracking (changes, author, timestamp) | Grows over time |
| `autoRouterConfig` | Scoring bonuses, thresholds, settings | 1 (singleton) |
| `modelProfiles` | Category scores per model (coding, reasoning, etc.) | 21+ models |

## Implementation Phases

Each phase file is **self-contained** with full context. Implement in order:

### Part 1: Model Management

| Phase | File | Duration | Description |
|-------|------|----------|-------------|
| 1 | [phase-1-schema.md](./phase-1-schema.md) | 1.5 days | Schema for all tables, seed scripts |
| 2 | [phase-2-repository.md](./phase-2-repository.md) | 2 days | Repository pattern, queries, feature flag |
| 3 | [phase-3-admin-ui.md](./phase-3-admin-ui.md) | 3 days | Models admin UI with CRUD + bulk ops |
| 4 | [phase-4-rollout.md](./phase-4-rollout.md) | 1 week | Gradual feature flag rollout (1%→100%) |
| 5 | [phase-5-cleanup.md](./phase-5-cleanup.md) | 2 days | Remove static MODEL_CONFIG, update imports |
| 6 | [phase-6-optimization.md](./phase-6-optimization.md) | 2 days | Search, analytics, performance tuning |

### Part 2: Auto-Router Configuration

| Phase | File | Duration | Description |
|-------|------|----------|-------------|
| 7 | [phase-7-autorouter-admin-ui.md](./phase-7-autorouter-admin-ui.md) | 2 days | Auto-router admin UI with dials/knobs |
| 8 | [phase-8-autorouter-integration.md](./phase-8-autorouter-integration.md) | 1 day | Wire autoRouter.ts to read from DB |

**Total: ~4 weeks**

## What's in Each Phase File?

Every phase file includes:
- Full context (what this is, why, what comes before/after)
- Prerequisites and dependencies
- Exact code to write (copy-paste ready)
- File paths with clear locations
- Validation checklist
- Rollback instructions
- Next steps

## Key Design Decisions

### AUTO_MODEL
- AUTO_MODEL is a meta-model that routes to real models
- It stays in code as a special case (not stored in DB)
- Its "configuration" IS the auto-router config tables
- The `/admin/auto-router` page IS the AUTO_MODEL configuration

### Mobile App
- Mobile uses the same repository as web
- `getMobileModels()` queries DB with `isInternalOnly: false` filter
- Single source of truth across all platforms

### Feature Flag Strategy
- `NEXT_PUBLIC_USE_DB_MODELS` controls model source
- `NEXT_PUBLIC_USE_DB_ROUTER_CONFIG` controls auto-router source
- Allows independent rollout and instant rollback

## Success Criteria

### Technical
- All 40+ models in DB with correct data
- Auto-router config in DB with current hardcoded values
- Model profiles with all 168 category scores
- Version history tracking all changes
- Feature flags working (instant rollback)

### Functional
- Add model via UI → appears in chat immediately
- Update pricing → cost recalculated
- Deprecate model → no longer selectable
- Adjust scoring bonus → auto-router behavior changes
- Edit category score → routing shifts accordingly

### Maintainability
- No code deploy for model changes
- No code deploy for router tuning
- Audit trail for compliance
- Bulk import/export working

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| DB migration breaks prod | High | Feature flag + gradual rollout (0%→100%) |
| Pricing calculation errors | High | Phase 4 validation (1% traffic first) |
| Auto-router regression | High | Parallel testing, gradual router rollout |
| Missing model properties | Medium | Seed script validates all fields |
| Admin authorization bypass | Medium | Convex auth checks in mutations |
| JSON import malformed | Low | Zod validation before insert |

**Overall**: MEDIUM - Gradual rollout with monitoring at each tier.

## Rollback Strategy

**Per-phase rollback** (if something breaks):
1. Revert commits from that phase
2. Delete created files (if any)
3. Back to working state in <5 minutes

**Full rollback** (nuclear option):
1. Set `NEXT_PUBLIC_USE_DB_MODELS=false` (instant)
2. Set `NEXT_PUBLIC_USE_DB_ROUTER_CONFIG=false` (instant)
3. All code paths revert to static config immediately

## Current State Reference

### Models (packages/ai/src/models.ts)
- 40+ models across 15 providers
- Fields: id, provider, name, description, contextWindow, pricing, capabilities, reasoning, gateway, hostOrder, knowledgeCutoff, userFriendlyDescription, bestFor, benchmarks, speedTier, isPro, isInternalOnly, isExperimental

### Auto-Router (packages/backend/convex/ai/autoRouter.ts)
- Task classification via GPT-OSS-120B
- 8 task categories: coding, reasoning, creative, factual, analysis, conversation, multimodal, research
- Scoring bonuses: stickiness (+25), reasoning (+15), research (+25)
- Complexity multipliers: simple (0.7x), complex (1.2x if quality≥85)
- Cost tiers: cheap (<$1), mid (<$5), premium (≥$5)
- Sticky routing with capability validation

### Model Profiles (packages/backend/convex/ai/modelProfiles.ts)
- 21+ models with quality scores
- 8 category scores per model (0-100)
- Categories: coding, reasoning, creative, factual, analysis, conversation, multimodal, research

---

Ready to begin? Start with **[phase-1-schema.md](./phase-1-schema.md)**.
