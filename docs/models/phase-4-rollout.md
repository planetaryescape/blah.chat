# Phase 4: Gradual Feature Flag Rollout

**Estimated Time**: 1 week
**Prerequisites**: Phases 1-3 complete (schema, repository, admin UI)

## Context

**Problem**: Switching all traffic to DB at once = risky. Need gradual rollout with monitoring.

**Solution**: Feature flag + percentage-based rollout. 0% → 1% → 10% → 50% → 100%.

## Architecture Overview

```
.env.local
    ↓ NEXT_PUBLIC_USE_DB_MODELS=true
Repository (repository.ts)
    ↓ reads from DB (fallback to static on error)
Monitoring
    ↓ watch logs, costs, errors
```

## Rollout Plan

### Day 1-2: 1% Traffic (Monitoring Phase)

**File**: `.env.local`

```bash
NEXT_PUBLIC_USE_DB_MODELS=true
```

**Redeploy**:
```bash
git add .env.local
git commit -m "feat: enable DB models for 1% traffic"
git push
# Deploy to production
```

**Monitor**:
- [ ] Check logs for "Failed to fetch model" errors
- [ ] Verify cost calculations match expected values
- [ ] Test chat generation with different models
- [ ] Check reasoning configs applied correctly

**Success Criteria**: Zero errors for 2 hours.

**Rollback** (if issues):
```bash
NEXT_PUBLIC_USE_DB_MODELS=false
# Redeploy immediately
```

### Day 3-4: 10% Traffic

**Keep**: `NEXT_PUBLIC_USE_DB_MODELS=true`

**Monitor**:
- [ ] Cost calculations accurate (compare with static config era)
- [ ] Image generation working
- [ ] Thinking effort applied correctly
- [ ] No missing models errors

**Success Criteria**: Zero critical errors for 1 day.

### Day 5-6: 50% Traffic

**Keep**: `NEXT_PUBLIC_USE_DB_MODELS=true`

**Monitor**:
- [ ] DB query performance (< 50ms)
- [ ] Fallback triggered? (check logs)
- [ ] User-reported issues
- [ ] Model selector loads fast

**Success Criteria**: Zero errors for 2 days.

### Day 7: 100% Traffic

**Keep**: `NEXT_PUBLIC_USE_DB_MODELS=true`

**Final Validation**:
- [ ] All 58 models working
- [ ] Chat generation successful
- [ ] Image generation successful
- [ ] Cost tracking accurate
- [ ] Admin UI functional

**Success Criteria**: 100% traffic on DB models with zero issues.

## Validation Tests

**Test Suite** (run at each rollout tier):

```typescript
// Test 1: Single model fetch
const gpt4o = await getModelConfig("openai:gpt-4o");
assert(gpt4o !== null);
assert(gpt4o.pricing.input === 2.5);

// Test 2: All models
const all = await getAllModels();
assert(all.length === 58);

// Test 3: Provider filter
const anthropic = await getModelsByProvider("anthropic");
assert(anthropic.length > 0);

// Test 4: Reasoning config
const thinking = await getModelConfig("openai:gpt-5");
assert(thinking?.reasoning?.type === "openai-reasoning-effort");

// Test 5: Pricing calculation
const cost = calculateCost("openai:gpt-4o", 1000, 500);
assert(cost > 0);
```

## Monitoring Dashboard

**Key Metrics**:

1. **Error Rate**:
   - Target: 0% "Failed to fetch model" errors
   - Alert: > 0.1% error rate

2. **Query Performance**:
   - Target: < 50ms for `getModelConfig()`
   - Alert: > 100ms average

3. **Fallback Rate**:
   - Target: 0% fallback to static config
   - Alert: > 1% fallback rate

4. **Cost Accuracy**:
   - Spot-check: Compare cost calculations with static era
   - Alert: > 5% deviation

## Rollback Triggers

**Immediate Rollback** (set flag to `false`):
- Any critical error (models not found, pricing errors)
- > 1% error rate
- User complaints about missing models
- Performance degradation (> 200ms queries)

**Investigate First** (don't rollback immediately):
- Single model missing (might be admin error)
- Transient DB connection issues (Convex should auto-recover)
- UI bugs (not related to data source)

## Troubleshooting

**Issue**: "Model not found" errors
- Check: Model exists in DB (Convex dashboard)
- Check: Model status is "active"
- Check: Feature flag is set correctly

**Issue**: Slow query performance
- Check: Convex indexes exist (`by_id`, `by_provider`, `by_status`)
- Check: Convex deployment healthy (dashboard)
- Consider: Add caching (Phase 6)

**Issue**: Reasoning configs not applied
- Check: `reasoningConfig` field has valid JSON
- Check: `reasoningType` matches config type
- Test: Parse JSON in browser console

**Issue**: Cost calculations wrong
- Check: Pricing fields populated correctly
- Compare: DB values vs static config values
- Test: `calculateCost()` with known values

## Post-Rollout Validation

After 100% traffic for 3 days:

- [ ] Zero model-related errors in logs
- [ ] Cost tracking dashboard shows consistent data
- [ ] Admin UI tested (create, edit, delete, duplicate)
- [ ] Bulk import/export working
- [ ] Version history tracking changes
- [ ] All 58 models functional

## Next Steps

**Phase 5** removes static config entirely (safe to do after 100% rollout proven stable).

---

**Phase 4 Complete!** ✅ 100% traffic on DB models. Move to **[phase-5-cleanup.md](./phase-5-cleanup.md)** next.
