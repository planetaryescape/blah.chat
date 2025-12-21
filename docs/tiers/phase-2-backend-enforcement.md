# Phase 2: Backend Enforcement

> **Status: 📝 TODO**

## Overview

This phase adds backend enforcement for pro model limits. We update adminSettings with defaults and a new query, then add limit checking in chat.ts following the presentations.ts pattern.

## Context

### How Does Limit Enforcement Work?

The codebase uses a consistent pattern for daily limits (see `presentations.ts:87-115`):

1. Check if user is admin (admins exempt)
2. Get limit from adminSettings
3. Check if limit is enabled (> 0)
4. Get current date, reset count if new day
5. Compare current count to limit
6. Throw error if exceeded
7. Increment count if allowed

### Why Enforce in Backend?

- **Security**: Frontend can be bypassed; backend is authoritative
- **Consistency**: Same logic for web, mobile, and API access
- **Atomic**: Count increment and validation in same transaction

## Prerequisites

- **[Phase 1](./phase-1-schema-foundation.md)**: Schema changes (tier fields, pro model settings)

## What Comes After

- **[Phase 3](./phase-3-admin-ui.md)**: Admin UI for settings and user tiers
- **[Phase 4](./phase-4-frontend-gating.md)**: Frontend model filtering

---

## Scope

### In Scope

1. Update adminSettings.ts `get` query defaults
2. Update adminSettings.ts `update` mutation args
3. Update adminSettings.ts `getWithEnvOverrides` defaults
4. Add `getProModelAccess` query to adminSettings.ts
5. Add pro model limit enforcement in chat.ts

### Out of Scope

- Admin UI to configure limits (Phase 3)
- Frontend filtering (Phase 4)

---

## Implementation

### Step 1: Update AdminSettings Get Query Defaults

**File**: `convex/adminSettings.ts`

Update the `get` query to include pro model defaults. Find the return statement (around line 27) and add the new fields:

```typescript
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const settings = await ctx.db.query("adminSettings").first();
    return (
      settings || {
        autoMemoryExtractEnabled: true,
        autoMemoryExtractInterval: 5,
        enableHybridSearch: false,
        defaultMonthlyBudget: 10,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 50,
        defaultDailyPresentationLimit: 1,
        alertEmail: "blah.chat@bhekani.com",
        transcriptProvider: "groq",
        transcriptCostPerMinute: 0.0067,
        // === ADD THESE DEFAULTS ===
        proModelsEnabled: false,
        tier1DailyProModelLimit: 1,
        tier2MonthlyProModelLimit: 50,
        // === END NEW DEFAULTS ===
      }
    );
  },
});
```

### Step 2: Update AdminSettings Update Mutation Args

**File**: `convex/adminSettings.ts`

Add pro model args to the `update` mutation (around line 48):

```typescript
export const update = mutation({
  args: {
    autoMemoryExtractEnabled: v.optional(v.boolean()),
    autoMemoryExtractInterval: v.optional(v.number()),
    enableHybridSearch: v.optional(v.boolean()),
    defaultMonthlyBudget: v.optional(v.number()),
    defaultBudgetAlertThreshold: v.optional(v.number()),
    budgetHardLimitEnabled: v.optional(v.boolean()),
    defaultDailyMessageLimit: v.optional(v.number()),
    defaultDailyPresentationLimit: v.optional(v.number()),
    alertEmail: v.optional(v.string()),
    transcriptProvider: v.optional(v.string()),
    transcriptCostPerMinute: v.optional(v.number()),
    // === ADD THESE ARGS ===
    proModelsEnabled: v.optional(v.boolean()),
    tier1DailyProModelLimit: v.optional(v.number()),
    tier2MonthlyProModelLimit: v.optional(v.number()),
    // === END NEW ARGS ===
  },
  handler: async (ctx, args) => {
    // ... existing handler logic (no changes needed)
  },
});
```

Also update the insert defaults in the handler (around line 102):

```typescript
// Create initial settings
await ctx.db.insert("adminSettings", {
  autoMemoryExtractEnabled: args.autoMemoryExtractEnabled ?? true,
  autoMemoryExtractInterval: args.autoMemoryExtractInterval ?? 5,
  enableHybridSearch: args.enableHybridSearch ?? false,
  defaultMonthlyBudget: args.defaultMonthlyBudget ?? 10,
  defaultBudgetAlertThreshold: args.defaultBudgetAlertThreshold ?? 0.8,
  budgetHardLimitEnabled: args.budgetHardLimitEnabled ?? true,
  defaultDailyMessageLimit: args.defaultDailyMessageLimit ?? 50,
  defaultDailyPresentationLimit: args.defaultDailyPresentationLimit ?? 1,
  alertEmail: args.alertEmail ?? "blah.chat@bhekani.com",
  transcriptProvider: args.transcriptProvider ?? "groq",
  transcriptCostPerMinute: args.transcriptCostPerMinute ?? 0.0067,
  // === ADD THESE DEFAULTS ===
  proModelsEnabled: args.proModelsEnabled ?? false,
  tier1DailyProModelLimit: args.tier1DailyProModelLimit ?? 1,
  tier2MonthlyProModelLimit: args.tier2MonthlyProModelLimit ?? 50,
  // === END NEW DEFAULTS ===
  updatedBy: userId,
  updatedAt: Date.now(),
});
```

### Step 3: Update GetWithEnvOverrides Defaults

**File**: `convex/adminSettings.ts`

Update the `getWithEnvOverrides` internal query (around line 144):

```typescript
export const getWithEnvOverrides = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dbSettings = await ctx.db.query("adminSettings").first();

    const defaults = {
      autoMemoryExtractEnabled: true,
      autoMemoryExtractInterval: 5,
      enableHybridSearch: false,
      defaultMonthlyBudget: 10,
      defaultBudgetAlertThreshold: 0.8,
      budgetHardLimitEnabled: true,
      defaultDailyMessageLimit: 50,
      defaultDailyPresentationLimit: 1,
      alertEmail: "blah.chat@bhekani.com",
      transcriptProvider: "groq",
      transcriptCostPerMinute: 0.0067,
      // === ADD THESE DEFAULTS ===
      proModelsEnabled: false,
      tier1DailyProModelLimit: 1,
      tier2MonthlyProModelLimit: 50,
      // === END NEW DEFAULTS ===
    };

    const settings = dbSettings || defaults;

    return {
      ...settings,
      // Environment variable overrides
      defaultDailyMessageLimit: process.env.DEFAULT_DAILY_MESSAGE_LIMIT
        ? Number.parseInt(process.env.DEFAULT_DAILY_MESSAGE_LIMIT, 10)
        : settings.defaultDailyMessageLimit,
      // ... existing env overrides ...
    };
  },
});
```

### Step 4: Add GetProModelAccess Query

**File**: `convex/adminSettings.ts`

Add this new query at the end of the file. This query is used by the frontend to determine if the user can use pro models:

```typescript
import { getCurrentUser } from "./lib/userSync";

/**
 * Check if current user can use pro models
 * Used by frontend to filter/disable pro models
 */
export const getProModelAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Not authenticated
    if (!user) {
      return { canUse: false, reason: "Not authenticated" };
    }

    // Admins always have access
    if (user.isAdmin) {
      return { canUse: true, remainingDaily: Infinity, remainingMonthly: Infinity };
    }

    // Check global toggle
    const settings = await ctx.db.query("adminSettings").first();
    if (!settings?.proModelsEnabled) {
      return { canUse: false, reason: "Pro models disabled" };
    }

    const tier = user.tier || "free";
    const today = new Date().toISOString().split("T")[0];

    // Free tier: no pro access
    if (tier === "free") {
      return { canUse: false, reason: "Upgrade to access pro models" };
    }

    // Tier 1: daily limit
    if (tier === "tier1") {
      const limit = settings.tier1DailyProModelLimit ?? 1;
      const currentCount = user.lastProModelDate === today
        ? (user.dailyProModelCount ?? 0)
        : 0;
      const remaining = Math.max(0, limit - currentCount);

      return {
        canUse: remaining > 0,
        reason: remaining === 0 ? "Daily limit reached" : undefined,
        remainingDaily: remaining,
      };
    }

    // Tier 2: monthly limit
    if (tier === "tier2") {
      const thisMonth = today.substring(0, 7); // YYYY-MM
      const limit = settings.tier2MonthlyProModelLimit ?? 50;
      const currentCount = user.lastProModelMonth === thisMonth
        ? (user.monthlyProModelCount ?? 0)
        : 0;
      const remaining = Math.max(0, limit - currentCount);

      return {
        canUse: remaining > 0,
        reason: remaining === 0 ? "Monthly limit reached" : undefined,
        remainingMonthly: remaining,
      };
    }

    return { canUse: false, reason: "Unknown tier" };
  },
});
```

### Step 5: Add Pro Model Enforcement in chat.ts

**File**: `convex/chat.ts`

Add this enforcement logic at the beginning of the `sendMessage` mutation handler, after getting the user but before creating the message. This follows the exact pattern from `presentations.ts:87-115`:

```typescript
import { MODEL_CONFIG } from "../src/lib/ai/models";

// Inside sendMessage mutation handler, after getting user:

// Check pro model limits (follows presentations.ts:87-115 pattern)
const modelId = args.modelId || "openai:gpt-oss-20b";
const modelConfig = MODEL_CONFIG[modelId];

// Determine if model is pro (explicit flag OR price threshold)
const isProModel = modelConfig?.isPro === true ||
  (modelConfig?.pricing?.input ?? 0) >= 5 ||
  (modelConfig?.pricing?.output ?? 0) >= 15;

if (isProModel && !user.isAdmin) {
  const adminSettings = await ctx.db.query("adminSettings").first();

  // Check if pro models are enabled globally
  if (!adminSettings?.proModelsEnabled) {
    throw new Error("Pro models are currently disabled");
  }

  const tier = user.tier || "free";

  // Free tier: no pro access
  if (tier === "free") {
    throw new Error("Upgrade your account to access pro models");
  }

  const today = new Date().toISOString().split("T")[0];

  // Tier 1: daily limit
  if (tier === "tier1") {
    const dailyLimit = adminSettings.tier1DailyProModelLimit ?? 1;

    if (dailyLimit > 0) {
      // Reset count if new day
      let currentCount = user.dailyProModelCount ?? 0;
      if (user.lastProModelDate !== today) {
        currentCount = 0;
      }

      // Check limit
      if (currentCount >= dailyLimit) {
        throw new Error(
          `Daily pro model limit reached (${dailyLimit} per day). Try again tomorrow.`
        );
      }

      // Increment count
      await ctx.db.patch(user._id, {
        dailyProModelCount: currentCount + 1,
        lastProModelDate: today,
      });
    }
  }

  // Tier 2: monthly limit
  if (tier === "tier2") {
    const thisMonth = today.substring(0, 7); // YYYY-MM
    const monthlyLimit = adminSettings.tier2MonthlyProModelLimit ?? 50;

    if (monthlyLimit > 0) {
      // Reset count if new month
      let currentCount = user.monthlyProModelCount ?? 0;
      if (user.lastProModelMonth !== thisMonth) {
        currentCount = 0;
      }

      // Check limit
      if (currentCount >= monthlyLimit) {
        throw new Error(
          `Monthly pro model limit reached (${monthlyLimit} per month). Try again next month.`
        );
      }

      // Increment count
      await ctx.db.patch(user._id, {
        monthlyProModelCount: currentCount + 1,
        lastProModelMonth: thisMonth,
      });
    }
  }
}

// ... rest of sendMessage logic continues ...
```

---

## Pattern Reference

The implementation follows the exact pattern from `convex/presentations.ts` lines 87-115:

```typescript
// REFERENCE: presentations.ts daily limit pattern
if (!user.isAdmin) {
  const adminSettings = await ctx.db.query("adminSettings").first();
  const dailyLimit = adminSettings?.defaultDailyPresentationLimit ?? 1;

  // Only enforce if limit > 0 (0 = unlimited)
  if (dailyLimit > 0) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Reset count if new day
    let currentCount = user.dailyPresentationCount ?? 0;
    if (user.lastPresentationDate !== today) {
      currentCount = 0;
    }

    // Check limit
    if (currentCount >= dailyLimit) {
      throw new Error(
        `Daily presentation limit reached (${dailyLimit} per day). Try again tomorrow.`,
      );
    }

    // Increment count
    await ctx.db.patch(user._id, {
      dailyPresentationCount: currentCount + 1,
      lastPresentationDate: today,
    });
  }
}
```

---

## File Structure

After this phase:

```
convex/
├── adminSettings.ts    # Updated with pro model defaults + getProModelAccess
└── chat.ts             # Updated with pro model enforcement
```

---

## Testing Checklist

- [ ] Create test user with `tier: undefined` (free) - using pro model throws error
- [ ] Create test user with `tier: "tier1"` - can use 1 pro model per day
- [ ] Same tier1 user on second pro message - throws error
- [ ] Create test user with `tier: "tier2"` - can use pro models
- [ ] Check tier2 monthly limit works (use Convex dashboard to set count to 49)
- [ ] Verify admin user is exempt from all limits
- [ ] Set `proModelsEnabled: false` in admin settings - all pro models blocked
- [ ] Verify non-pro models work normally for all tiers

---

## Dependencies

No new npm dependencies in this phase.

---

## Notes

- **Model detection is inline**: No helper function - check `isPro || price threshold` directly
- **Count increment is atomic**: Happens in same mutation as validation
- **Daily reset uses calendar day**: Based on server time, not user timezone
- **Monthly format is YYYY-MM**: e.g., "2025-01" for January 2025
- **Limit of 0 means unlimited**: Follows existing pattern from presentations

---

## Next Phase

After completing this phase, proceed to **[Phase 3: Admin UI](./phase-3-admin-ui.md)** to add the FeaturesSettings component and user tier management.
