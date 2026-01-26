# Phase 8: Auto-Router DB Integration

**Estimated Time**: 1 day
**Prerequisites**: Phase 7 complete (admin UI working)
**Depends On**: `autoRouterConfig` and `modelProfiles` data in DB

## What This Phase Does

Modifies `autoRouter.ts` and `modelProfiles.ts` to read configuration from DB instead of hardcoded values. Adds feature flag for gradual rollout with instant rollback capability.

## Why This Is Needed

- Admin UI (Phase 7) writes to DB, but router still reads hardcoded values
- Need to wire the two together for changes to take effect
- Feature flag allows safe rollout and instant rollback

## Architecture Change

```
BEFORE:
autoRouter.ts
    ↓ hardcoded bonuses, thresholds
scoreModels()
    ↓ hardcoded MODEL_PROFILES
selectBestModel()

AFTER:
autoRouter.ts
    ↓ getAutoRouterConfig() from DB
scoreModels()
    ↓ getModelProfiles() from DB
selectBestModel()
    ↓ feature flag controls source
```

## Files to Modify

| File | Changes |
|------|---------|
| `packages/backend/convex/ai/autoRouter.ts` | Read config from DB |
| `packages/backend/convex/ai/modelProfiles.ts` | Read profiles from DB |
| `packages/backend/convex/autoRouter/helpers.ts` | New: shared config helpers |

## Implementation

### Step 1: Create Config Helpers

**File**: `packages/backend/convex/autoRouter/helpers.ts`

```typescript
import { QueryCtx, ActionCtx } from "../_generated/server";

// Feature flag
const USE_DB_ROUTER_CONFIG = process.env.NEXT_PUBLIC_USE_DB_ROUTER_CONFIG === "true";

// ============================================================
// Default values (fallback when DB not used)
// ============================================================

export const DEFAULT_CONFIG = {
  stickinessBonus: 25,
  reasoningBonus: 15,
  researchBonus: 25,
  simplePenalty: 0.7,
  complexBoostThreshold: 85,
  complexBoostMultiplier: 1.2,
  cheapThreshold: 1.0,
  midThreshold: 5.0,
  tierWeights: {
    simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
    moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
    complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
  },
  speedBonuses: {
    cerebras: 12,
    groq: 10,
    flash: 8,
    fast: 8,
    nano: 10,
    lite: 10,
    lightning: 12,
    thinking: -5,
    "extended-thinking": -8,
  },
  routerModelId: "openai:gpt-oss-120b",
  maxRetries: 3,
  contextBuffer: 1.2,
  longContextThreshold: 128000,
};

// Cached config (refreshed on each action)
let cachedConfig: typeof DEFAULT_CONFIG | null = null;
let cachedConfigTime = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Get auto-router configuration
 * Uses DB if feature flag enabled, otherwise defaults
 */
export async function getAutoRouterConfig(ctx: QueryCtx | ActionCtx): Promise<typeof DEFAULT_CONFIG> {
  if (!USE_DB_ROUTER_CONFIG) {
    return DEFAULT_CONFIG;
  }

  // Check cache
  if (cachedConfig && Date.now() - cachedConfigTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    // Query DB
    const dbConfig = await ctx.runQuery(internal.autoRouter.queries.getConfig, {});

    if (!dbConfig) {
      console.warn("No auto-router config in DB, using defaults");
      return DEFAULT_CONFIG;
    }

    // Parse JSON fields
    const config = {
      ...dbConfig,
      tierWeights: JSON.parse(dbConfig.tierWeights || "{}"),
      speedBonuses: JSON.parse(dbConfig.speedBonuses || "{}"),
    };

    // Merge with defaults (in case DB missing some fields)
    cachedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      tierWeights: { ...DEFAULT_CONFIG.tierWeights, ...config.tierWeights },
      speedBonuses: { ...DEFAULT_CONFIG.speedBonuses, ...config.speedBonuses },
    };
    cachedConfigTime = Date.now();

    return cachedConfig;
  } catch (error) {
    console.error("Failed to load auto-router config from DB:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Invalidate config cache (call after admin updates)
 */
export function invalidateConfigCache() {
  cachedConfig = null;
  cachedConfigTime = 0;
}

// ============================================================
// Model Profiles
// ============================================================

// Default profiles from current hardcoded values
import { MODEL_PROFILES as STATIC_PROFILES } from "./modelProfiles.static";

let cachedProfiles: Map<string, any> | null = null;
let cachedProfilesTime = 0;
const PROFILES_CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Get model profiles
 * Uses DB if feature flag enabled, otherwise static
 */
export async function getModelProfiles(ctx: QueryCtx | ActionCtx): Promise<Map<string, any>> {
  if (!USE_DB_ROUTER_CONFIG) {
    return STATIC_PROFILES;
  }

  // Check cache
  if (cachedProfiles && Date.now() - cachedProfilesTime < PROFILES_CACHE_TTL) {
    return cachedProfiles;
  }

  try {
    const dbProfiles = await ctx.runQuery(internal.autoRouter.queries.getProfiles, {});

    if (!dbProfiles || dbProfiles.length === 0) {
      console.warn("No model profiles in DB, using static");
      return STATIC_PROFILES;
    }

    // Convert to Map
    const profileMap = new Map<string, any>();
    for (const profile of dbProfiles) {
      const categoryScores = JSON.parse(profile.categoryScores || "{}");
      profileMap.set(profile.modelId, {
        qualityScore: profile.qualityScore,
        ...categoryScores,
      });
    }

    // Merge with static (in case DB missing some models)
    for (const [modelId, scores] of STATIC_PROFILES) {
      if (!profileMap.has(modelId)) {
        profileMap.set(modelId, scores);
      }
    }

    cachedProfiles = profileMap;
    cachedProfilesTime = Date.now();

    return cachedProfiles;
  } catch (error) {
    console.error("Failed to load model profiles from DB:", error);
    return STATIC_PROFILES;
  }
}

/**
 * Get single model profile
 */
export async function getModelProfile(ctx: QueryCtx | ActionCtx, modelId: string): Promise<any | null> {
  const profiles = await getModelProfiles(ctx);
  return profiles.get(modelId) || null;
}

/**
 * Invalidate profiles cache
 */
export function invalidateProfilesCache() {
  cachedProfiles = null;
  cachedProfilesTime = 0;
}
```

### Step 2: Create Static Profiles Backup

**File**: `packages/backend/convex/autoRouter/modelProfiles.static.ts`

Copy current `MODEL_PROFILES` from `modelProfiles.ts`:

```typescript
/**
 * Static model profiles (backup/fallback)
 * These are the original hardcoded values from modelProfiles.ts
 * Used when DB not available or feature flag disabled
 */

export const MODEL_PROFILES = new Map<string, {
  qualityScore: number;
  coding: number;
  reasoning: number;
  creative: number;
  factual: number;
  analysis: number;
  conversation: number;
  multimodal: number;
  research: number;
}>([
  // Copy all entries from current modelProfiles.ts
  ["openai:gpt-5", {
    qualityScore: 95,
    coding: 95,
    reasoning: 95,
    creative: 90,
    factual: 92,
    analysis: 94,
    conversation: 88,
    multimodal: 85,
    research: 90,
  }],
  ["anthropic:claude-sonnet-4", {
    qualityScore: 92,
    coding: 94,
    reasoning: 93,
    creative: 95,
    factual: 90,
    analysis: 92,
    conversation: 94,
    multimodal: 88,
    research: 88,
  }],
  // ... all other models
]);
```

### Step 3: Update autoRouter.ts

**File**: `packages/backend/convex/ai/autoRouter.ts`

Replace hardcoded values with config lookups:

```typescript
import { getAutoRouterConfig, getModelProfiles, getModelProfile } from "../autoRouter/helpers";

// BEFORE (hardcoded):
const STICKINESS_BONUS = 25;
const REASONING_BONUS = 15;
const RESEARCH_BONUS = 25;

// AFTER (from config):
export async function routeMessage(ctx: ActionCtx, args: RouteArgs) {
  const config = await getAutoRouterConfig(ctx);

  // Use config values instead of constants
  const stickinessBonus = config.stickinessBonus;
  const reasoningBonus = config.reasoningBonus;
  const researchBonus = config.researchBonus;

  // ... rest of routing logic
}

// BEFORE (hardcoded cost tiers):
function getCostTier(avgCost: number): "cheap" | "mid" | "premium" {
  if (avgCost < 1.0) return "cheap";
  if (avgCost < 5.0) return "mid";
  return "premium";
}

// AFTER (from config):
function getCostTier(avgCost: number, config: typeof DEFAULT_CONFIG): "cheap" | "mid" | "premium" {
  if (avgCost < config.cheapThreshold) return "cheap";
  if (avgCost < config.midThreshold) return "mid";
  return "premium";
}

// BEFORE (hardcoded tier weights):
const TIER_WEIGHTS = {
  simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
  // ...
};

// AFTER (from config):
function getTierWeight(
  complexity: "simple" | "moderate" | "complex",
  tier: "cheap" | "mid" | "premium",
  config: typeof DEFAULT_CONFIG
): number {
  return config.tierWeights[complexity]?.[tier] ?? 0.33;
}

// BEFORE (hardcoded speed bonuses):
function getSpeedBonus(modelId: string): number {
  if (modelId.includes("cerebras")) return 12;
  if (modelId.includes("groq")) return 10;
  // ...
}

// AFTER (from config):
function getSpeedBonus(modelId: string, config: typeof DEFAULT_CONFIG): number {
  const lower = modelId.toLowerCase();
  let bonus = 0;

  for (const [pattern, value] of Object.entries(config.speedBonuses)) {
    if (lower.includes(pattern.toLowerCase())) {
      bonus += value;
    }
  }

  return bonus;
}

// BEFORE (hardcoded model profiles):
import { MODEL_PROFILES } from "./modelProfiles";

function getModelScore(modelId: string, category: string): number {
  const profile = MODEL_PROFILES.get(modelId);
  return profile?.[category] ?? 70;
}

// AFTER (from DB):
async function getModelScore(ctx: ActionCtx, modelId: string, category: string): Promise<number> {
  const profile = await getModelProfile(ctx, modelId);
  return profile?.[category] ?? 70;
}
```

### Step 4: Update Scoring Function

**File**: `packages/backend/convex/ai/autoRouter.ts`

Full updated `scoreModels` function:

```typescript
async function scoreModels(
  ctx: ActionCtx,
  task: ClassifiedTask,
  candidates: ModelCandidate[],
  previousModelId?: string
): Promise<ScoredModel[]> {
  const config = await getAutoRouterConfig(ctx);
  const profiles = await getModelProfiles(ctx);

  const scored: ScoredModel[] = [];

  for (const candidate of candidates) {
    let score = 0;

    // 1. Category score from profile
    const profile = profiles.get(candidate.id);
    const categoryScore = profile?.[task.category] ?? 70;
    score += categoryScore;

    // 2. Stickiness bonus
    if (previousModelId && candidate.id === previousModelId) {
      score += config.stickinessBonus;
    }

    // 3. Reasoning bonus (for complex tasks)
    if (task.complexity === "complex" && candidate.supportsThinking) {
      score += config.reasoningBonus;
    }

    // 4. Research bonus (for Perplexity on research)
    if (task.category === "research" && candidate.provider === "perplexity") {
      score += config.researchBonus;
    }

    // 5. Complexity multiplier
    const qualityScore = profile?.qualityScore ?? 70;
    if (task.complexity === "simple") {
      score *= config.simplePenalty;
    } else if (task.complexity === "complex" && qualityScore >= config.complexBoostThreshold) {
      score *= config.complexBoostMultiplier;
    }

    // 6. Cost tier weight
    const avgCost = (candidate.inputCost + candidate.outputCost) / 2;
    const tier = getCostTier(avgCost, config);
    const tierWeight = getTierWeight(task.complexity, tier, config);
    score *= tierWeight;

    // 7. Speed bonus
    score += getSpeedBonus(candidate.id, config);

    scored.push({
      ...candidate,
      score,
      reasoning: `Category: ${categoryScore}, Tier: ${tier}, Speed: ${getSpeedBonus(candidate.id, config)}`,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}
```

### Step 5: Add Cache Invalidation to Mutations

**File**: `packages/backend/convex/autoRouter/mutations.ts`

Add cache invalidation after updates:

```typescript
import { invalidateConfigCache, invalidateProfilesCache } from "./helpers";

export const updateConfig = mutation({
  // ... existing args and handler
  handler: async (ctx, args) => {
    // ... existing update logic

    // Invalidate cache so next routing uses new values
    invalidateConfigCache();

    return { success: true };
  },
});

export const updateProfile = mutation({
  // ... existing args and handler
  handler: async (ctx, args) => {
    // ... existing update logic

    // Invalidate cache
    invalidateProfilesCache();

    return { success: true };
  },
});
```

### Step 6: Feature Flag Rollout

**Environment variable**: `NEXT_PUBLIC_USE_DB_ROUTER_CONFIG`

```bash
# Enable DB router config
NEXT_PUBLIC_USE_DB_ROUTER_CONFIG=true

# Disable (use hardcoded values)
NEXT_PUBLIC_USE_DB_ROUTER_CONFIG=false
```

### Rollout Schedule

1. **Day 1**: Enable on staging, test all task categories
2. **Day 2**: Enable on production (1% traffic if possible)
3. **Day 3-4**: Monitor routing decisions, compare to baseline
4. **Day 5**: 100% traffic if no issues

### Rollback

Set `NEXT_PUBLIC_USE_DB_ROUTER_CONFIG=false` in Vercel dashboard → instant revert to hardcoded values.

## Validation Checklist

- [ ] Feature flag controls config source
- [ ] Config values read from DB when flag enabled
- [ ] Profile scores read from DB when flag enabled
- [ ] Fallback to static when DB unavailable
- [ ] Cache refreshes every 60 seconds
- [ ] Admin UI changes reflected in routing (after cache expires)
- [ ] Adjust stickiness bonus → routing prefers same model more/less
- [ ] Adjust cost thresholds → different model selection for same task
- [ ] Edit model profile → category routing shifts
- [ ] Rollback works (flag off → hardcoded values)

## Verification Tests

```typescript
// Test 1: Config loading
const config = await getAutoRouterConfig(ctx);
assert(config.stickinessBonus > 0);

// Test 2: Profile loading
const profiles = await getModelProfiles(ctx);
assert(profiles.size > 20);

// Test 3: Scoring uses config
// Set stickiness bonus to 0 in admin UI
// Verify same-model preference disappears
// Set back to 25, verify preference returns

// Test 4: Cost tier boundaries
// Set cheapThreshold to 0.5 (more restrictive)
// Verify models $0.50-$1.00 now in "mid" tier
```

## Troubleshooting

### Config Not Updating

**Check**:
1. Feature flag enabled
2. Cache TTL expired (60s)
3. Admin mutation succeeded
4. No errors in Convex logs

### Routing Unchanged After Edit

**Check**:
1. Wait for cache TTL (60s)
2. Verify value saved in DB (Convex dashboard)
3. Check feature flag is `true`
4. Check for fallback log messages

### Performance Issues

**Check**:
1. Cache working (not querying DB every request)
2. Profile query efficient (indexed)
3. Config query efficient (singleton)

## What Comes Next

**Implementation Complete!** Full system operational:

### Part 1: Model Management
- ✅ Phase 1: Schema + seed
- ✅ Phase 2: Repository + queries
- ✅ Phase 3: Admin UI
- ✅ Phase 4: Gradual rollout
- ✅ Phase 5: Remove static config
- ✅ Phase 6: Optimization + analytics

### Part 2: Auto-Router Configuration
- ✅ Phase 7: Admin UI with dials/knobs
- ✅ Phase 8: Wire to DB

## Summary

The system now supports:

1. **Model Management** (`/admin/models`)
   - Add/edit/deprecate models without code
   - Bulk import/export
   - Version history

2. **Auto-Router Configuration** (`/admin/auto-router`)
   - Scoring bonuses (sliders)
   - Complexity multipliers
   - Cost tier boundaries
   - Speed preferences
   - Model category scores

3. **Instant Rollback**
   - `NEXT_PUBLIC_USE_DB_MODELS=false` for models
   - `NEXT_PUBLIC_USE_DB_ROUTER_CONFIG=false` for router

4. **Gradual Rollout**
   - Feature flags control percentage
   - Fallback to static config if DB fails

---

**Phase 8 Complete!** 🎉 Database-backed model and auto-router management fully operational.
