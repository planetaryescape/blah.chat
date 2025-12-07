# Database-Backed Model Management

**Status**: Implementation Guide
**Last Updated**: 2025-12-07
**Complexity**: High (production migration)
**Estimated Time**: ~6 weeks

## Overview

Self-contained implementation guides for migrating from hardcoded model config to database-backed dynamic management.

**Current Problem**: 58 models hardcoded in `src/lib/ai/models.ts`. Every model addition, pricing change, or capability update requires code deploy.

**Solution**: Convex DB tables + admin UI + gradual Expand-Contract migration (zero downtime).

## Architecture

```
Convex DB (models, modelHistory)
    ↓ stores all model configs
Repository Pattern (repository.ts)
    ↓ abstracts DB access, maintains stable API
Feature Flag (NEXT_PUBLIC_USE_DB_MODELS)
    ↓ controls gradual rollout
Admin UI (ModelsSettings.tsx)
    ↓ CRUD + bulk operations
```

## Benefits

- **Add model**: DB insert (no code deploy)
- **Update pricing**: DB update (live changes)
- **Version history**: Track who/when/why for all changes
- **Bulk ops**: Import/Export JSON, duplicate models
- **Rollback**: Feature flag = instant revert

## Database Schema

| Table | Purpose |
|-------|---------|
| `models` | All ModelConfig properties (58 models) |
| `modelHistory` | Version tracking (changes, author, timestamp) |
| `users` | Add `role` field (admin authorization) |

**Total**: 3 tables, 2 new + 1 modified

## Implementation Phases

Each phase file is **self-contained** - implement in order:

1. **[phase-1-schema.md](./phase-1-schema.md)** - Foundation
   ~1 day | Add schema, create seed script, populate DB

2. **[phase-2-repository.md](./phase-2-repository.md)** - Dual Read
   ~2 days | Repository pattern, queries, feature flag, dual-read logic

3. **[phase-3-admin-ui.md](./phase-3-admin-ui.md)** - Admin UI
   ~3 days | Settings tab, CRUD forms, bulk import/export/duplicate

4. **[phase-4-rollout.md](./phase-4-rollout.md)** - Gradual Rollout
   ~1 week | Feature flag 0% → 1% → 10% → 50% → 100%, monitoring

5. **[phase-5-cleanup.md](./phase-5-cleanup.md)** - Remove Static Config
   ~2 days | Delete MODEL_CONFIG, update 15 files, remove flag

6. **[phase-6-optimization.md](./phase-6-optimization.md)** - Performance
   ~2 days | Indexes, caching, search, analytics

## Quick Start

```bash
# 1. Start with Phase 1 (must be first)
cd docs/models

# 2. Follow phase-1-schema.md step-by-step
# Creates schema, seeds DB

# 3. Continue through phases 2-6 in order
# Each file has complete context + copy-paste code

# 4. Validate using checklist in each phase

# 5. Rollback if issues (per-phase instructions)
```

## What's in Each Phase File?

Every phase file includes:
- ✅ Estimated time + prerequisites
- ✅ Problem/solution context
- ✅ Exact code to write (copy-paste ready)
- ✅ File paths + line numbers
- ✅ Validation checklist
- ✅ Rollback instructions
- ✅ Next steps

## Code Changes Summary

**Created** (14 new files):
- `docs/models/` - This directory (7 files)
- `convex/models/` - Queries, mutations, seed, bulk, analytics (5 files)
- `src/lib/models/` - Repository, transforms, validators (3 files)
- `src/components/settings/ModelsSettings.tsx` - Admin UI
- `src/components/settings/ModelDialog.tsx` - Create/edit form

**Modified** (3 files):
- `convex/schema.ts` - Add `models`, `modelHistory` tables, `users.role`
- `src/lib/ai/models.ts` - Deprecate static config (Phase 5)
- 15 files using `MODEL_CONFIG` - Update imports (Phase 5)

**Total**: ~850 lines added, ~581 lines removed (static config) = net +269 lines
**Result**: Dynamic, versioned, admin-manageable

## Success Criteria

**Technical**:
- ✅ All 58 models in DB
- ✅ Version history tracking all changes
- ✅ Feature flag working (instant rollback)

**Functional**:
- ✅ Add model via UI → appears in chat
- ✅ Update pricing → cost recalculated
- ✅ Deprecate model → no longer selectable

**Maintainability**:
- ✅ No code deploy for model changes
- ✅ Audit trail for compliance
- ✅ Bulk import/export working

## Rollback Strategy

**Per-phase rollback** (if something breaks):
1. Revert commits from that phase
2. Delete created files (if any)
3. Back to working state in <5 minutes

**Full rollback** (nuclear option):
1. Set `NEXT_PUBLIC_USE_DB_MODELS=false` (instant)
2. `git revert <phase-5-commit>` (restore static config)
3. Drop `models`, `modelHistory` tables (optional)
4. Remove `src/lib/models/`, `convex/models/` directories

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| DB migration breaks prod | High | Feature flag + gradual rollout (0% → 100%) |
| Pricing calculation errors | High | Phase 4 validation (1% traffic first) |
| Missing model properties | Medium | Seed script validates all fields |
| Admin authorization bypass | Medium | Convex auth checks in mutations |
| JSON import malformed | Low | Zod validation before insert |

**Overall**: MEDIUM - Gradual rollout with monitoring at each tier.

## Support

**Questions?** Check individual phase files - detailed explanations + examples.

**Issues?** Use rollback instructions in each phase to revert changes.

## Future Additions

**Adding a new model** (after migration):

```typescript
// Via Admin UI:
// 1. Click "Add Model" button
// 2. Fill form (ID, provider, name, pricing, capabilities)
// 3. Save → appears in chat immediately

// Or via API:
await createModel({
  id: "anthropic:claude-opus-5",
  provider: "anthropic",
  name: "Claude Opus 5",
  contextWindow: 200000,
  pricing: { input: 15, output: 75 },
  capabilities: ["vision", "thinking"],
  status: "active",
});
```

**Updating pricing** (no code deploy):

```typescript
// Via Admin UI:
// 1. Find model in list
// 2. Click "Edit"
// 3. Update pricing fields
// 4. Add reason: "Official price drop"
// 5. Save → version history created, cost recalculated

// Or via API:
await updateModel({
  id: "openai:gpt-4o",
  updates: {
    pricing: { input: 2.5, output: 10 }, // Updated prices
  },
  reason: "OpenAI announced price reduction",
});
```

**Viewing change history**:

```typescript
// Via Admin UI:
// 1. Click model row
// 2. "History" tab shows all versions
// 3. See who changed what, when, why

// Or via API:
const history = await getModelHistory({ modelId: "openai:gpt-4o" });
// Returns: [{ version: 2, changes: [{ field: "pricing.input", oldValue: 5, newValue: 2.5 }], changedBy: "user_...", ... }]
```

---

Ready to begin? Start with **[phase-1-schema.md](./phase-1-schema.md)** (must be first, creates foundation).
