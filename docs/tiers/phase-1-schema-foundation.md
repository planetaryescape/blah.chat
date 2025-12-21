# Phase 1: Schema & Model Config Foundation

> **Status: 📝 TODO**

## Overview

This phase establishes the database schema and model configuration for the tier system. We add tier tracking fields to users, pro model settings to adminSettings, and an `isPro` flag to the ModelConfig interface.

## Context

### What is the Tier System?

The tier system controls access to expensive "pro" models:
- **Free users**: No access to pro models
- **Tier 1 users**: 1 pro model message per day
- **Tier 2 users**: 50 pro model messages per month
- **Admins**: Unlimited access

### Why Build This?

- **Cost control**: Expensive models ($5+ input, $15+ output) need gating
- **Revenue potential**: Tiered access enables future pricing plans
- **Flexibility**: Configurable limits per tier via admin settings

## Prerequisites

- Existing `users` table with `isAdmin` field
- Existing `adminSettings` table with limit patterns
- Existing `ModelConfig` interface in `src/lib/ai/models.ts`

## What Comes After

- **[Phase 2](./phase-2-backend-enforcement.md)**: Backend enforcement in chat.ts
- **[Phase 3](./phase-3-admin-ui.md)**: Admin UI for settings and user tiers
- **[Phase 4](./phase-4-frontend-gating.md)**: Frontend model filtering

---

## Scope

### In Scope

1. Add `tier` field to users table
2. Add pro model tracking fields to users table
3. Add pro model settings to adminSettings table
4. Add `isPro` field to ModelConfig interface
5. Mark `perplexity:sonar-deep-research` as pro model

### Out of Scope

- Enforcement logic (Phase 2)
- Admin UI (Phase 3)
- Frontend filtering (Phase 4)

---

## Implementation

### Step 1: Update Users Schema

**File**: `convex/schema.ts`

Find the `users` table definition (around line 5) and add the tier and pro model tracking fields after line 16 (after `lastPresentationDate`):

```typescript
users: defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  isAdmin: v.optional(v.boolean()),
  // Daily message tracking
  dailyMessageCount: v.optional(v.number()),
  lastMessageDate: v.optional(v.string()),
  // Daily presentation tracking
  dailyPresentationCount: v.optional(v.number()),
  lastPresentationDate: v.optional(v.string()),

  // === ADD THESE FIELDS (Pro Model Tier System) ===
  // User tier for pro model access
  tier: v.optional(v.union(
    v.literal("free"),
    v.literal("tier1"),
    v.literal("tier2")
  )),
  // Daily pro model tracking (for tier1)
  dailyProModelCount: v.optional(v.number()),
  lastProModelDate: v.optional(v.string()),
  // Monthly pro model tracking (for tier2)
  monthlyProModelCount: v.optional(v.number()),
  lastProModelMonth: v.optional(v.string()), // YYYY-MM format
  // === END NEW FIELDS ===

  // Preferences
  disabledBuiltInTemplateIds: v.optional(v.array(v.id("templates"))),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]),
```

### Step 2: Update AdminSettings Schema

**File**: `convex/schema.ts`

Find the `adminSettings` table definition (around line 1051) and add pro model settings after `defaultDailyPresentationLimit`:

```typescript
adminSettings: defineTable({
  // Memory extraction
  autoMemoryExtractEnabled: v.boolean(),
  autoMemoryExtractInterval: v.number(),

  // Search settings
  enableHybridSearch: v.boolean(),

  // Budget settings
  defaultMonthlyBudget: v.number(),
  defaultBudgetAlertThreshold: v.number(),
  budgetHardLimitEnabled: v.boolean(),

  // Message limits
  defaultDailyMessageLimit: v.number(),

  // Presentation limits
  defaultDailyPresentationLimit: v.optional(v.number()),

  // === ADD THESE FIELDS (Pro Model Tier System) ===
  // Pro model access settings
  proModelsEnabled: v.optional(v.boolean()), // Global toggle, default: false
  tier1DailyProModelLimit: v.optional(v.number()), // Default: 1
  tier2MonthlyProModelLimit: v.optional(v.number()), // Default: 50
  // === END NEW FIELDS ===

  // Email alerts
  alertEmail: v.string(),

  // Telemetry
  instanceId: v.optional(v.string()),

  // Integrations
  transcriptProvider: v.optional(v.string()),
  transcriptCostPerMinute: v.optional(v.number()),

  // Audit
  updatedBy: v.id("users"),
  updatedAt: v.number(),
}),
```

### Step 3: Update ModelConfig Interface

**File**: `src/lib/ai/models.ts`

Add `isPro` field to the ModelConfig interface after `speedTier` (around line 58):

```typescript
export interface ModelConfig {
  id: string;
  provider:
    | "openai"
    | "anthropic"
    | "google"
    | "xai"
    | "perplexity"
    | "groq"
    | "cerebras"
    | "minimax"
    | "deepseek"
    | "kimi"
    | "zai"
    | "meta"
    | "mistral"
    | "alibaba"
    | "zhipu";
  name: string;
  description?: string;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: (
    | "vision"
    | "function-calling"
    | "thinking"
    | "extended-thinking"
    | "image-generation"
  )[];
  isLocal?: boolean;
  actualModelId?: string;
  reasoning?: ReasoningConfig;
  providerOrder?: string[];
  isExperimental?: boolean;
  knowledgeCutoff?: string;
  preferredProvider?: ProviderName;
  userFriendlyDescription?: string;
  bestFor?: string;
  benchmarks?: BenchmarkScores;
  speedTier?: SpeedTier;

  // === ADD THIS FIELD ===
  /** Mark as pro/premium model requiring tier access */
  isPro?: boolean;
  // === END NEW FIELD ===
}
```

### Step 4: Add sonar-deep-research Model

**File**: `src/lib/ai/models.ts`

Add the Sonar Deep Research model to MODEL_CONFIG. Insert after the existing Perplexity models (after `perplexity:sonar` around line 596):

```typescript
"perplexity:sonar-deep-research": {
  id: "perplexity:sonar-deep-research",
  provider: "perplexity",
  name: "Sonar Deep Research",
  description: "Extended deep research with comprehensive web analysis",
  contextWindow: 127000,
  pricing: { input: 5.0, output: 20.0 },
  capabilities: ["thinking"],
  isPro: true, // PRO MODEL - requires tier access
  knowledgeCutoff: "Real-time search",
  userFriendlyDescription:
    "Deep research assistant. Comprehensive web research with extensive analysis, multiple source synthesis, and detailed citations.",
  bestFor: "In-depth research, comprehensive analysis, detailed reports, academic research",
},
```

**Note**: This model is explicitly marked as `isPro: true`. Other models will be detected as pro based on price threshold ($5+ input OR $15+ output).

---

## File Structure

After this phase:

```
convex/
└── schema.ts           # Updated with tier + pro model fields

src/lib/ai/
└── models.ts           # Updated with isPro field + sonar-deep-research
```

---

## Testing Checklist

- [ ] Run `bunx convex dev` - schema deploys without errors
- [ ] Check Convex dashboard - `users` table shows new tier fields
- [ ] Check Convex dashboard - `adminSettings` table shows new pro fields
- [ ] Run `bun run build` - TypeScript compiles with new ModelConfig field
- [ ] Verify `perplexity:sonar-deep-research` appears in MODEL_CONFIG
- [ ] Verify no runtime errors on app load

---

## Dependencies

No new npm dependencies in this phase.

---

## Notes

- **Tier field is optional**: Existing users default to `undefined` which is treated as "free"
- **Count fields are optional**: Start at `undefined`, treated as 0 when checking limits
- **Date fields use ISO strings**: `lastProModelDate` is "YYYY-MM-DD", `lastProModelMonth` is "YYYY-MM"
- **isPro is optional**: Models without `isPro` are checked against price threshold
- **Schema is additive**: No data migration needed - all new fields are optional

---

## Pattern Reference

The new user fields follow the existing pattern for `dailyPresentationCount` / `lastPresentationDate`:

```typescript
// Existing pattern (presentations)
dailyPresentationCount: v.optional(v.number()),
lastPresentationDate: v.optional(v.string()),

// New pattern (pro models - daily for tier1)
dailyProModelCount: v.optional(v.number()),
lastProModelDate: v.optional(v.string()),

// New pattern (pro models - monthly for tier2)
monthlyProModelCount: v.optional(v.number()),
lastProModelMonth: v.optional(v.string()),
```

---

## Next Phase

After completing this phase, proceed to **[Phase 2: Backend Enforcement](./phase-2-backend-enforcement.md)** to add the limit checking logic in `chat.ts`.
