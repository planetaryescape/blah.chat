# Phase 4: Gradual Feature Flag Rollout

**Estimated Time**: 1 week
**Prerequisites**: Phases 1-3 complete (schema, repository, admin UI)
**Depends On**: Feature flag `NEXT_PUBLIC_USE_DB_MODELS` in repository

## What This Phase Does

Gradually rolls out DB-backed models from 0% → 100% traffic with monitoring at each tier. Feature flag allows instant rollback if issues arise.

## Why This Is Needed

- Switching all traffic to DB at once is risky
- Need monitoring to catch cost calculation errors, missing models, performance issues
- Feature flag enables instant rollback without code deploy

## Architecture

```
.env (or Vercel env vars)
    ↓ NEXT_PUBLIC_USE_DB_MODELS=true
Repository (repository.ts)
    ↓ reads from DB (Convex reactive queries)
    ↓ falls back to static config if DB fails (during rollout only)
Monitoring
    ↓ error rates, query latency, cost accuracy
```

## Feature Flag

**Environment variable**: `NEXT_PUBLIC_USE_DB_MODELS`

```bash
# Enable DB models
NEXT_PUBLIC_USE_DB_MODELS=true

# Disable (rollback to static config)
NEXT_PUBLIC_USE_DB_MODELS=false
```

**Note**: Next.js `NEXT_PUBLIC_*` env vars require redeploy to take effect. Use Vercel dashboard for faster toggle.

## Rollout Schedule

### Day 1-2: Internal Testing (0% production)

**Goal**: Validate with internal users before any production traffic.

**Steps**:
1. Deploy to staging/preview with `NEXT_PUBLIC_USE_DB_MODELS=true`
2. Test all 40+ models manually
3. Verify cost calculations match expected values
4. Test admin UI (create, edit, deprecate, duplicate)

**Validation Tests**:
```typescript
// Test 1: Single model fetch
const gpt5 = await getModelConfig("openai:gpt-5");
assert(gpt5 !== null);
assert(gpt5.pricing.input === expectedInput);

// Test 2: All models (should match static count)
const all = await getAllModels();
assert(all.length >= 40); // Current model count

// Test 3: Provider filter
const anthropic = await getModelsByProvider("anthropic");
assert(anthropic.length > 0);

// Test 4: Reasoning config parsed correctly
const thinking = await getModelConfig("anthropic:claude-sonnet-4");
assert(thinking?.reasoning?.type === "anthropic-thinking-budget");

// Test 5: Mobile models exclude internal
const mobile = await getMobileModels();
assert(mobile.every(m => !m.isInternalOnly));
```

**Success Criteria**: All tests pass, no errors in 4 hours.

### Day 3-4: 1% Production Traffic

**Goal**: Validate with small production sample.

**Steps**:
1. Set `NEXT_PUBLIC_USE_DB_MODELS=true` in Vercel production
2. Monitor error logs
3. Compare cost calculations with static era

**Monitor**:
- [ ] Zero "Failed to fetch model" errors
- [ ] Zero "Model not found" errors
- [ ] Cost calculations within 1% of expected
- [ ] Query latency <100ms (p95)

**Success Criteria**: Zero critical errors for 24 hours.

**Rollback Trigger**: Any model lookup failure → set flag to `false` immediately.

### Day 5-6: 10% Traffic

**Goal**: Broader validation across more users/models.

**Steps**:
1. Keep flag enabled
2. Monitor across all model categories
3. Validate image generation, thinking models, comparison mode

**Monitor**:
- [ ] Image generation working (gpt-image-1, etc.)
- [ ] Thinking effort applied correctly
- [ ] Comparison mode works (fetches 2 models)
- [ ] No user complaints about missing models

**Success Criteria**: Zero errors for 48 hours.

### Day 7-8: 50% Traffic

**Goal**: Performance validation at scale.

**Steps**:
1. Keep flag enabled
2. Focus on performance metrics
3. Verify Convex reactive queries updating correctly

**Monitor**:
- [ ] Query latency <50ms (p50), <100ms (p95)
- [ ] No memory leaks (Convex dashboard)
- [ ] Model picker loads fast (<1s)
- [ ] Admin changes propagate immediately

**Success Criteria**: Zero errors, performance meets targets for 48 hours.

### Day 9-10: 100% Traffic

**Goal**: Full rollout, prepare for Phase 5 (remove static).

**Steps**:
1. Keep flag enabled (now effectively permanent)
2. Final validation across all features
3. Document any remaining issues

**Final Validation**:
- [ ] All 40+ models working in chat
- [ ] All models working in comparison mode
- [ ] Image generation working
- [ ] Cost tracking accurate
- [ ] Admin UI functional (CRUD + bulk)
- [ ] Version history tracking changes
- [ ] Mobile API returning correct models

**Success Criteria**: 72 hours with zero issues → proceed to Phase 5.

## Monitoring Dashboard

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Model lookup errors | 0% | >0.1% |
| Query latency (p50) | <50ms | >100ms |
| Query latency (p95) | <100ms | >200ms |
| Fallback to static | 0% | >1% |
| Cost calculation drift | 0% | >5% |

### Where to Monitor

1. **Convex Dashboard**: Query performance, error rates, function logs
2. **Vercel Logs**: API route errors, build errors
3. **Sentry** (if configured): Runtime exceptions
4. **PostHog** (if configured): User-reported issues

### Log Patterns to Watch

```bash
# Error patterns
"Failed to fetch model"
"Model not found"
"dbToModelConfig error"
"getModelConfig fallback"

# Warning patterns
"Missing field in DB model"
"Invalid reasoningConfig JSON"
```

## Rollback Procedure

### Immediate Rollback (< 5 minutes)

1. Go to Vercel dashboard → Settings → Environment Variables
2. Set `NEXT_PUBLIC_USE_DB_MODELS=false`
3. Redeploy (or wait for automatic propagation)
4. Verify: Models now served from static config

### Rollback Triggers

**Immediate rollback** (don't investigate first):
- Any production error rate >0.1%
- Cost calculation errors
- User complaints about missing models
- Generation failures

**Investigate first** (don't panic):
- Single model missing (might be admin error)
- Transient Convex connection issues (auto-recover)
- UI styling bugs (not related to data)

## Troubleshooting

### Model Not Found

```
Error: Model "openai:gpt-5" not found
```

**Check**:
1. Model exists in Convex dashboard → models table
2. Model status is "active" (not "deprecated")
3. Model ID matches exactly (case-sensitive)
4. Feature flag is enabled

**Fix**: Add model via admin UI or seed script.

### Slow Query Performance

```
Query latency: 250ms (target: <50ms)
```

**Check**:
1. Convex indexes exist (`by_id`, `by_provider`, `by_status`)
2. Convex deployment healthy (dashboard status)
3. No concurrent heavy operations

**Fix**: Verify indexes in schema, contact Convex support if persists.

### Reasoning Config Not Applied

```
Thinking budget not working for Claude
```

**Check**:
1. `reasoningConfig` field has valid JSON
2. `supportsThinking` or `supportsExtendedThinking` is true
3. JSON structure matches expected type

**Fix**: Edit model in admin UI, update reasoningConfig JSON.

### Cost Calculation Wrong

```
Expected cost: $0.025, Actual: $0.000
```

**Check**:
1. `inputCost` and `outputCost` populated (not zero)
2. Values are per-1M-tokens (not per-1K)
3. Compare DB values with static config

**Fix**: Update pricing in admin UI.

## Post-Rollout Validation

After 100% for 3+ days, verify:

- [ ] Zero model-related errors in logs
- [ ] Cost tracking dashboard shows consistent data
- [ ] All admin operations work (create, edit, delete, duplicate, import, export)
- [ ] Version history tracking all changes
- [ ] Mobile app receiving correct model list
- [ ] Comparison mode working
- [ ] Image generation working
- [ ] Thinking/reasoning models configured correctly

## What Comes Next

**Phase 5** removes the static config entirely:
- Delete `MODEL_CONFIG` object from models.ts
- Remove feature flag checks
- Update all imports to use repository only
- Safe to do after 100% rollout proven stable

---

**Phase 4 Complete!** Once 100% stable for 72 hours, proceed to **[phase-5-cleanup.md](./phase-5-cleanup.md)**.
