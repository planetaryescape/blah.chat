# Phase 4: Flatten User Preferences

**Timeline**: Week 5 (8-10 days)
**Impact**: Atomic preference updates, eliminates nested object merge issues, enables preference versioning
**Risk Level**: Medium - Touches critical user settings, system prompt generation

---

## Why This Migration?

### Current Problem

User preferences stored as 76-line nested object:

```typescript
// convex/schema.ts:14-90
preferences: v.object({
  theme: v.union(v.literal("light"), v.literal("dark")),
  defaultModel: v.string(),
  favoriteModels: v.optional(v.array(v.string())),
  recentModels: v.optional(v.array(v.string())),
  // ... 30+ more fields ...
  customInstructions: v.optional(v.object({
    aboutUser: v.string(),
    responseStyle: v.string(),
    // ... 7 nested fields
  })),
  reasoning: v.optional(v.object({
    showByDefault: v.optional(v.boolean()),
    autoExpand: v.optional(v.boolean()),
    // ... 3 nested fields
  })),
  // ... more nesting
})
```

**Issues**:

### 1. Custom Instructions Mutation Loses New Fields

**File**: `convex/users.ts:226-240`

```typescript
// ⚠️ DESTRUCTIVE: Reconstructs entire object
customInstructions: {
  aboutUser: args.aboutUser,
  responseStyle: args.responseStyle,
  enabled: args.enabled,
  baseStyleAndTone: args.baseStyleAndTone,
  nickname: args.nickname,
  occupation: args.occupation,
  moreAboutYou: args.moreAboutYou,
},
```

**Problem**: If Phase 5 adds new field `customInstructions.timezone`, this mutation **loses it** on save.

**Contrast with** `updatePreferences` (lines 169-175):
```typescript
// ✅ SAFE: Spread merge preserves unknown fields
preferences: {
  ...user.preferences,
  ...args.preferences,
},
```

### 2. Multiple Levels of Optional Chaining

**File**: `src/components/settings/UISettings.tsx:54-80`

```typescript
// Deeply nested reads with fallbacks
setAlwaysShowMessageActions(user.preferences.alwaysShowMessageActions ?? false);

if (user?.preferences?.reasoning) {
  setShowByDefault(user.preferences.reasoning.showByDefault ?? true);
  setAutoExpand(user.preferences.reasoning.autoExpand ?? false);
}
```

**Every preference access** = 2-3 levels of optional chaining + default values.

### 3. Settings Scattered Across Components

Preferences read in **8+ components**:
- `CustomInstructionsForm.tsx` (customInstructions)
- `UISettings.tsx` (UI prefs + reasoning)
- `DefaultModelSettings.tsx` (defaultModel, favoriteModels)
- `STTSettings.tsx` (sttEnabled, sttProvider)
- `TTSSettings.tsx` (ttsEnabled, ttsVoice, ttsSpeed)
- `generation.ts` (customInstructions for system prompt)

No centralized source of truth for "which settings exist".

### SQL-Readiness Benefits
- **Flat key-value table**: Easy to add new preferences (just insert row)
- **Atomic updates**: Change single preference without touching others
- **Audit trail**: Track when each preference changed
- **Queryability**: "Users with TTS enabled" becomes simple filter

---

## Database Schema Changes

### New Table

```typescript
// convex/schema.ts - Add after users table

userPreferences: defineTable({
  userId: v.id("users"),
  category: v.union(
    v.literal("appearance"),
    v.literal("models"),
    v.literal("chat"),
    v.literal("audio"),
    v.literal("advanced"),
    v.literal("customInstructions")
  ),
  key: v.string(),  // e.g., "theme", "defaultModel", "sttEnabled"
  value: v.any(),   // JSON value (string, number, boolean, object)
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_category", ["userId", "category"])
  .index("by_user_key", ["userId", "key"]),
```

### Category Breakdown

| Category | Keys | Type |
|----------|------|------|
| **appearance** | theme, fontSize, codeTheme, chatWidth | string |
| **models** | defaultModel, favoriteModels, recentModels, newChatModelSelection | string/array |
| **chat** | sendOnEnter, alwaysShowMessageActions, showMessageStatistics, showComparisonStatistics | boolean |
| **audio** | sttEnabled, sttProvider, ttsEnabled, ttsProvider, ttsVoice, ttsSpeed, ttsAutoRead | boolean/string/number |
| **advanced** | enableHybridSearch, showModelNamesDuringComparison | boolean |
| **customInstructions** | All customInstructions fields as nested object (OR break into individual keys) | object |

### Users Table Updates

```typescript
// convex/schema.ts:5-95
users: defineTable({
  // ... existing fields ...
  preferences: v.optional(v.object({...})),  // ⚠️ DEPRECATED
})
```

---

## Migration Steps

### Step 1: Deploy Schema (Day 1)

Add `userPreferences` table, keep old `preferences` field optional.

---

### Step 2: Backfill Data (Day 2-3)

```typescript
// convex/migrations/004_normalize_user_preferences.ts
"use node";

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Helper: Insert preference row
async function insertPref(
  ctx: any,
  userId: string,
  category: string,
  key: string,
  value: any
) {
  if (value === undefined || value === null) return;

  await ctx.db.insert("userPreferences", {
    userId,
    category,
    key,
    value,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export const backfillUserPreferences = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number()
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const users = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let prefsCreated = 0;

    for (const user of users.page) {
      if (!user.preferences) continue;

      const prefs = user.preferences;

      // Appearance
      await insertPref(ctx, user._id, "appearance", "theme", prefs.theme);
      await insertPref(ctx, user._id, "appearance", "fontSize", prefs.fontSize);
      await insertPref(ctx, user._id, "appearance", "codeTheme", prefs.codeTheme);
      await insertPref(ctx, user._id, "appearance", "chatWidth", prefs.chatWidth);
      prefsCreated += 4;

      // Models
      await insertPref(ctx, user._id, "models", "defaultModel", prefs.defaultModel);
      await insertPref(ctx, user._id, "models", "favoriteModels", prefs.favoriteModels);
      await insertPref(ctx, user._id, "models", "recentModels", prefs.recentModels);
      await insertPref(ctx, user._id, "models", "newChatModelSelection", prefs.newChatModelSelection);
      prefsCreated += 4;

      // Chat
      await insertPref(ctx, user._id, "chat", "sendOnEnter", prefs.sendOnEnter);
      await insertPref(ctx, user._id, "chat", "alwaysShowMessageActions", prefs.alwaysShowMessageActions);
      await insertPref(ctx, user._id, "chat", "showMessageStatistics", prefs.showMessageStatistics);
      await insertPref(ctx, user._id, "chat", "showComparisonStatistics", prefs.showComparisonStatistics);
      prefsCreated += 4;

      // Audio
      await insertPref(ctx, user._id, "audio", "sttEnabled", prefs.sttEnabled);
      await insertPref(ctx, user._id, "audio", "sttProvider", prefs.sttProvider);
      await insertPref(ctx, user._id, "audio", "ttsEnabled", prefs.ttsEnabled);
      await insertPref(ctx, user._id, "audio", "ttsProvider", prefs.ttsProvider);
      await insertPref(ctx, user._id, "audio", "ttsVoice", prefs.ttsVoice);
      await insertPref(ctx, user._id, "audio", "ttsSpeed", prefs.ttsSpeed);
      await insertPref(ctx, user._id, "audio", "ttsAutoRead", prefs.ttsAutoRead);
      prefsCreated += 7;

      // Advanced
      await insertPref(ctx, user._id, "advanced", "enableHybridSearch", prefs.enableHybridSearch);
      await insertPref(ctx, user._id, "advanced", "showModelNamesDuringComparison", prefs.showModelNamesDuringComparison);
      prefsCreated += 2;

      // Custom Instructions (store as nested object or break into individual keys)
      if (prefs.customInstructions) {
        await insertPref(ctx, user._id, "customInstructions", "all", prefs.customInstructions);
        // OR break into individual keys:
        // await insertPref(ctx, user._id, "customInstructions", "aboutUser", prefs.customInstructions.aboutUser);
        // await insertPref(ctx, user._id, "customInstructions", "responseStyle", prefs.customInstructions.responseStyle);
        // ...
        prefsCreated += 1;
      }

      // Reasoning (store as nested object or break into individual keys)
      if (prefs.reasoning) {
        await insertPref(ctx, user._id, "advanced", "reasoning", prefs.reasoning);
        // OR:
        // await insertPref(ctx, user._id, "advanced", "reasoningShowByDefault", prefs.reasoning.showByDefault);
        // ...
        prefsCreated += 1;
      }
    }

    return {
      done: users.isDone,
      nextCursor: users.continueCursor,
      processed: users.page.length,
      prefsCreated,
    };
  },
});

export const migrateUserPreferences = internalAction({
  handler: async (ctx) => {
    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalPrefs = 0;
    const startTime = Date.now();

    console.log("🚀 Starting user preferences migration...");

    do {
      const result = await ctx.runMutation(
        internal.migrations["004_normalize_user_preferences"].backfillUserPreferences,
        { cursor, batchSize: 100 }
      );

      cursor = result.nextCursor;
      totalProcessed += result.processed;
      totalPrefs += result.prefsCreated;

      console.log(`✅ Migrated ${totalProcessed} users (${totalPrefs} preferences)`);
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Users: ${totalProcessed}`);
    console.log(`   Preferences: ${totalPrefs}`);
    console.log(`   Avg per user: ${(totalPrefs / totalProcessed).toFixed(1)}`);
    console.log(`   Duration: ${duration}s`);
  },
});
```

---

### Step 3: Update Mutations (Day 4-5)

#### New Preference APIs

```typescript
// convex/users.ts - Add these helpers

export const getUserPreference = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await getCurrentUserId(ctx);
    const pref = await ctx.db
      .query("userPreferences")
      .withIndex("by_user_key", q => q.eq("userId", userId).eq("key", key))
      .unique();

    return pref?.value;
  },
});

export const getUserPreferencesByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const userId = await getCurrentUserId(ctx);
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user_category", q =>
        q.eq("userId", userId).eq("category", category as any)
      )
      .collect();

    return Object.fromEntries(prefs.map(p => [p.key, p.value]));
  },
});

export const getAllUserPreferences = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    // Return as nested object for backwards compatibility
    const result: any = {};
    for (const pref of prefs) {
      if (pref.category === "customInstructions" && pref.key === "all") {
        result.customInstructions = pref.value;
      } else if (pref.category === "advanced" && pref.key === "reasoning") {
        result.reasoning = pref.value;
      } else {
        result[pref.key] = pref.value;
      }
    }
    return result;
  },
});

export const updateUserPreference = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    category: v.optional(v.string()),  // Auto-inferred if not provided
  },
  handler: async (ctx, { key, value, category }) => {
    const userId = await getCurrentUserId(ctx);

    // Find existing preference
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user_key", q => q.eq("userId", userId).eq("key", key))
      .unique();

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: Date.now(),
      });
    } else {
      // Insert new
      const inferredCategory = category || inferCategoryFromKey(key);
      await ctx.db.insert("userPreferences", {
        userId,
        category: inferredCategory as any,
        key,
        value,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // ALSO update old preferences object during transition (dual-write)
    const user = await ctx.db.get(userId);
    if (user) {
      await ctx.db.patch(userId, {
        preferences: {
          ...user.preferences,
          [key]: value,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

// Helper: Infer category from key name
function inferCategoryFromKey(key: string): string {
  if (["theme", "fontSize", "codeTheme", "chatWidth"].includes(key)) {
    return "appearance";
  }
  if (["defaultModel", "favoriteModels", "recentModels", "newChatModelSelection"].includes(key)) {
    return "models";
  }
  if (["sendOnEnter", "alwaysShowMessageActions", "showMessageStatistics", "showComparisonStatistics"].includes(key)) {
    return "chat";
  }
  if (key.startsWith("stt") || key.startsWith("tts")) {
    return "audio";
  }
  return "advanced";
}
```

#### Fix Custom Instructions Mutation

**File**: `convex/users.ts:226-240`

**BEFORE** (loses new fields):
```typescript
customInstructions: {
  aboutUser: args.aboutUser,
  responseStyle: args.responseStyle,
  // ...explicit mapping
},
```

**AFTER** (spread merge):
```typescript
// If storing as nested object:
const existing = await getUserPreference({ key: "customInstructions.all" });
await updateUserPreference({
  key: "customInstructions.all",
  category: "customInstructions",
  value: {
    ...(existing || {}),  // Preserve existing fields
    aboutUser: args.aboutUser,
    responseStyle: args.responseStyle,
    enabled: args.enabled,
    baseStyleAndTone: args.baseStyleAndTone,
    nickname: args.nickname,
    occupation: args.occupation,
    moreAboutYou: args.moreAboutYou,
  },
});

// OR if storing as individual keys:
await Promise.all([
  updateUserPreference({ key: "aboutUser", category: "customInstructions", value: args.aboutUser }),
  updateUserPreference({ key: "responseStyle", category: "customInstructions", value: args.responseStyle }),
  // ...
]);
```

---

### Step 4: Update Frontend (Day 6-7)

#### Settings Components

**File**: `src/components/settings/UISettings.tsx`

**BEFORE** (direct object access):
```typescript
const [alwaysShowMessageActions, setAlwaysShowMessageActions] = useState(
  user?.preferences?.alwaysShowMessageActions ?? false
);
```

**AFTER** (use new query):
```typescript
const chatPrefs = useQuery(api.users.getUserPreferencesByCategory, {
  category: "chat"
}) || {};

const [alwaysShowMessageActions, setAlwaysShowMessageActions] = useState(
  chatPrefs.alwaysShowMessageActions ?? false
);
```

**Or create custom hook**:
```typescript
// src/hooks/useUserPreference.ts
export function useUserPreference<T>(key: string, defaultValue: T): T {
  const value = useQuery(api.users.getUserPreference, { key });
  return value !== undefined ? value : defaultValue;
}

// Usage in component:
const alwaysShowMessageActions = useUserPreference("alwaysShowMessageActions", false);
```

#### System Prompt Generation

**File**: `convex/generation.ts:119-183`

**BEFORE**:
```typescript
if (user?.preferences?.customInstructions?.enabled) {
  const ci = user.preferences.customInstructions;
  // ... build system prompt
}
```

**AFTER**:
```typescript
const customInstructions = await ctx.runQuery(
  api.users.getUserPreference,
  { key: "customInstructions.all" }
);

if (customInstructions?.enabled) {
  // ... build system prompt from customInstructions
}
```

---

### Step 5: Cleanup (Day 8)

1. Remove `preferences` object from users schema
2. Remove dual-write logic from mutations
3. Deploy and verify

---

## Critical Gotchas

### 1. Custom Instructions Mutation Was Destructive

**Old code** (users.ts:229):
```typescript
// ❌ Loses any new fields not explicitly mapped
customInstructions: {
  aboutUser: args.aboutUser,
  responseStyle: args.responseStyle,
  enabled: args.enabled,
  baseStyleAndTone: args.baseStyleAndTone,
  nickname: args.nickname,
  occupation: args.occupation,
  moreAboutYou: args.moreAboutYou,
},
```

**New approach**: Use spread merge or individual keys to preserve unknown fields.

### 2. Nested Object vs Individual Keys Trade-off

**Option A: Store customInstructions as nested object**
```typescript
// Single row with object value
{ key: "customInstructions.all", value: { aboutUser: "...", responseStyle: "..." } }
```
**Pros**: Backwards compatible, single query
**Cons**: Still nested, harder to query individual fields

**Option B: Store as individual keys**
```typescript
{ key: "aboutUser", category: "customInstructions", value: "..." }
{ key: "responseStyle", category: "customInstructions", value: "..." }
```
**Pros**: Fully flat, queryable, atomic updates
**Cons**: More rows, more queries

**Recommendation**: Start with Option A (nested object), can flatten in future phase.

### 3. Preference Defaults Scattered Everywhere

**Current**: Defaults in component state initialization
```typescript
// UISettings.tsx:54
setAlwaysShowMessageActions(user.preferences.alwaysShowMessageActions ?? false);  // default: false

// generation.ts:175
const showByDefault = user.preferences.reasoning?.showByDefault ?? true;  // default: true
```

**Problem**: No single source of truth for default values.

**Solution**: Centralize defaults
```typescript
// convex/users.ts
export const PREFERENCE_DEFAULTS = {
  theme: "dark",
  sendOnEnter: true,
  alwaysShowMessageActions: false,
  showMessageStatistics: true,
  // ...
};

export const getUserPreferenceWithDefault = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await getCurrentUserId(ctx);
    const pref = await ctx.db
      .query("userPreferences")
      .withIndex("by_user_key", q => q.eq("userId", userId).eq("key", key))
      .unique();

    return pref?.value ?? PREFERENCE_DEFAULTS[key];
  },
});
```

### 4. Validation Happens in Mutation, Not Schema

**Current**: Max length validation in mutation (users.ts:206-217)
```typescript
if (args.aboutUser.length > 3000) throw new Error("Max 3000 characters");
```

**Problem**: No schema enforcement means direct DB writes bypass validation.

**Solution**: Add validation layer
```typescript
function validatePreferenceValue(key: string, value: any) {
  if (key === "aboutUser" && typeof value === "string" && value.length > 3000) {
    throw new Error("aboutUser max 3000 characters");
  }
  if (key === "nickname" && typeof value === "string" && value.length > 100) {
    throw new Error("nickname max 100 characters");
  }
  // ... more validation
}

// Call in updateUserPreference before insert/patch
validatePreferenceValue(key, value);
```

---

## Testing Checklist

- [ ] **Change theme**: Single preference updates without touching others
- [ ] **Update custom instructions**: New fields preserved (add test field first)
- [ ] **Load settings page**: All preferences load correctly
- [ ] **Default values**: Missing preferences use correct defaults
- [ ] **System prompt**: customInstructions injected correctly
- [ ] **Migration stats**: All users have ~23 preference rows

---

## Success Metrics

- **Atomic updates**: Change 1 preference = 1 DB write (vs full object)
- **Code simplicity**: -30 lines of optional chaining
- **Extensibility**: Add new preference = insert row (no schema change)
- **Type safety**: Centralized defaults prevent inconsistent fallbacks

---

## Files Modified

| File | Change |
|------|--------|
| `convex/schema.ts` | Add userPreferences table |
| `convex/users.ts` | New preference APIs, fix custom instructions mutation |
| `convex/generation.ts` | Load customInstructions from new table |
| `src/components/settings/*.tsx` | Use new queries |
| `src/hooks/useUserPreference.ts` | New custom hook |

---

## Next Phase

After Phase 4 complete → **Phase 5: Centralized Tags System** (unified tags across bookmarks/snippets/notes/feedback)
