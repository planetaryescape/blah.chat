# Phase 3: Admin UI

> **Status: 📝 TODO**

## Overview

This phase adds admin UI for managing pro model settings and user tiers. We replace the FeaturesSettings placeholder with pro model controls and add a tier column to the admin users table.

## Context

### How Do Admin Settings Components Work?

All admin settings components follow the same pattern from `AdminLimitsSettings.tsx`:

1. Query settings with `useQuery(api.adminSettings.get)`
2. Mutation with `useMutation(api.adminSettings.update)`
3. Local state for each field
4. `useEffect` to sync from query on load
5. `handleSave` function with toast notifications
6. Card layout with CardHeader/CardContent

### Why Separate Settings from Enforcement?

- **Configuration**: Admin UI configures limits stored in adminSettings
- **Enforcement**: Backend reads settings and enforces limits
- **Decoupled**: Can change limits without code changes

## Prerequisites

- **[Phase 1](./phase-1-schema-foundation.md)**: Schema changes
- **[Phase 2](./phase-2-backend-enforcement.md)**: Backend enforcement

## What Comes After

- **[Phase 4](./phase-4-frontend-gating.md)**: Frontend model filtering

---

## Scope

### In Scope

1. Add `updateUserTier` mutation to admin.ts
2. Update `listUsers` query to include tier field
3. Replace FeaturesSettings.tsx with pro model controls
4. Add tier column to admin users table

### Out of Scope

- Frontend model filtering (Phase 4)

---

## Implementation

### Step 1: Add UpdateUserTier Mutation

**File**: `convex/admin.ts`

Add this mutation after `updateUserRole` (around line 106):

```typescript
/**
 * Update a user's tier (admin only)
 */
export const updateUserTier = mutation({
  args: {
    userId: v.id("users"),
    tier: v.union(
      v.literal("free"),
      v.literal("tier1"),
      v.literal("tier2")
    ),
  },
  handler: async (ctx, { userId, tier }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(userId, {
      tier,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
```

### Step 2: Update ListUsers Query

**File**: `convex/admin.ts`

Update the `listUsers` query to include the tier field (around line 25):

```typescript
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      imageUrl: u.imageUrl,
      isAdmin: u.isAdmin ?? false,
      tier: u.tier, // ADD THIS LINE
      createdAt: u.createdAt,
    }));
  },
});
```

### Step 3: Replace FeaturesSettings Component

**File**: `src/components/settings/admin/FeaturesSettings.tsx`

Replace the entire file with the pro model settings component. This follows the exact pattern from `AdminLimitsSettings.tsx`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";
import { Crown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";

export function FeaturesSettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const settings = useQuery(api.adminSettings.get);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateSettings = useMutation(api.adminSettings.update);

  const [proModelsEnabled, setProModelsEnabled] = useState(false);
  const [tier1DailyLimit, setTier1DailyLimit] = useState(1);
  const [tier2MonthlyLimit, setTier2MonthlyLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from query
  useEffect(() => {
    if (settings) {
      setProModelsEnabled(settings.proModelsEnabled ?? false);
      setTier1DailyLimit(settings.tier1DailyProModelLimit ?? 1);
      setTier2MonthlyLimit(settings.tier2MonthlyProModelLimit ?? 50);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSettings({
        proModelsEnabled,
        tier1DailyProModelLimit: tier1DailyLimit,
        tier2MonthlyProModelLimit: tier2MonthlyLimit,
      });
      toast.success("Pro model settings saved!");
    } catch (_error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pro Models Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Pro Models
          </CardTitle>
          <CardDescription>
            Control access to premium AI models (e.g., Sonar Deep Research)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pro-enabled">Enable pro models</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, pro models are hidden from all non-admin users
              </p>
            </div>
            <Switch
              id="pro-enabled"
              checked={proModelsEnabled}
              onCheckedChange={setProModelsEnabled}
            />
          </div>

          {/* Tier Limits (only show when enabled) */}
          {proModelsEnabled && (
            <div className="space-y-4 pt-4 border-t">
              {/* Tier 1 Daily Limit */}
              <div className="space-y-2">
                <Label htmlFor="tier1-limit">
                  Tier 1: Daily limit
                </Label>
                <Input
                  id="tier1-limit"
                  type="number"
                  value={tier1DailyLimit}
                  onChange={(e) => setTier1DailyLimit(Number(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-sm text-muted-foreground">
                  Pro model messages per day for Tier 1 users (0 = unlimited)
                </p>
              </div>

              {/* Tier 2 Monthly Limit */}
              <div className="space-y-2">
                <Label htmlFor="tier2-limit">
                  Tier 2: Monthly limit
                </Label>
                <Input
                  id="tier2-limit"
                  type="number"
                  value={tier2MonthlyLimit}
                  onChange={(e) => setTier2MonthlyLimit(Number(e.target.value))}
                  min={0}
                  max={1000}
                />
                <p className="text-sm text-muted-foreground">
                  Pro model messages per month for Tier 2 users (0 = unlimited)
                </p>
              </div>
            </div>
          )}

          {/* Tier Summary */}
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Tier Summary</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                <span className="font-medium">Free:</span> No pro model access
              </li>
              <li>
                <span className="font-medium">Tier 1:</span>{" "}
                {tier1DailyLimit === 0
                  ? "Unlimited"
                  : `${tier1DailyLimit} pro message(s) per day`}
              </li>
              <li>
                <span className="font-medium">Tier 2:</span>{" "}
                {tier2MonthlyLimit === 0
                  ? "Unlimited"
                  : `${tier2MonthlyLimit} pro messages per month`}
              </li>
              <li>
                <span className="font-medium">Admin:</span> Unlimited pro model access
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
```

### Step 4: Add Tier Column to Admin Users Table

**File**: `src/app/(main)/admin/users/page.tsx`

First, update the `UserWithUsage` type (around line 48):

```typescript
type UserWithUsage = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl: string | undefined;
  isAdmin: boolean;
  tier?: "free" | "tier1" | "tier2"; // ADD THIS LINE
  createdAt: number;
  usage: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
  };
};
```

Add the mutation hook (after line 78):

```typescript
// @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
const updateTier = useMutation(api.admin.updateUserTier);
```

Add the callback (after `handleToggleAdmin`, around line 114):

```typescript
// Update user tier
const handleUpdateTier = useCallback(
  async (userId: Id<"users">, tier: "free" | "tier1" | "tier2") => {
    try {
      await updateTier({ userId, tier });
      toast.success(`User tier updated to ${tier}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update tier");
    }
  },
  [updateTier],
);
```

Update the `usersWithUsage` merge (around line 124) to include tier:

```typescript
return users.map((user: any) => ({
  ...user,
  tier: user.tier, // ADD THIS LINE
  usage: usageByUserId.get(user._id) || {
    totalCost: 0,
    totalTokens: 0,
    totalRequests: 0,
  },
}));
```

Add the tier column definition to `columns` array (after the admin column, around line 229):

```typescript
{
  id: "tier",
  header: () => <div className="text-right">Tier</div>,
  cell: ({ row }) => (
    <div
      className="flex items-center justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <Select
        value={row.original.tier || "free"}
        onValueChange={(value: "free" | "tier1" | "tier2") =>
          handleUpdateTier(row.original._id, value)
        }
      >
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="tier1">Tier 1</SelectItem>
          <SelectItem value="tier2">Tier 2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
},
```

Add the Select import at the top of the file:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

Update the columns dependency array to include `handleUpdateTier`:

```typescript
[handleToggleAdmin, handleUpdateTier],
```

---

## File Structure

After this phase:

```
convex/
└── admin.ts                  # Updated with updateUserTier + listUsers tier field

src/
├── components/settings/admin/
│   └── FeaturesSettings.tsx  # Replaced with pro model controls
└── app/(main)/admin/users/
    └── page.tsx              # Updated with tier column
```

---

## Testing Checklist

- [ ] Navigate to Admin > Settings > Features tab
- [ ] Toggle "Enable pro models" - switch works
- [ ] Tier limits appear when pro models enabled
- [ ] Set Tier 1 daily limit to 5, save - toast shows success
- [ ] Set Tier 2 monthly limit to 100, save - toast shows success
- [ ] Navigate to Admin > Users
- [ ] Tier column appears with dropdown
- [ ] Change user tier from Free to Tier 1 - toast shows success
- [ ] Refresh page - tier persists
- [ ] Verify admin users table still works with pagination/sorting

---

## Dependencies

No new npm dependencies - uses existing shadcn/ui Select component.

---

## Notes

- **Crown icon**: Uses lucide-react Crown icon for pro models header
- **Conditional rendering**: Tier limits only shown when pro models enabled
- **0 = unlimited**: Following existing pattern for limits
- **Select component**: Already exists in shadcn/ui, no installation needed
- **handleUpdateTier**: Follows handleToggleAdmin pattern exactly

---

## Pattern Reference

The FeaturesSettings component follows the exact pattern from `AdminLimitsSettings.tsx`:

```typescript
// Pattern: Load settings → local state → useEffect sync → handleSave
const settings = useQuery(api.adminSettings.get);
const updateSettings = useMutation(api.adminSettings.update);

const [field, setField] = useState(defaultValue);

useEffect(() => {
  if (settings) {
    setField(settings.field ?? defaultValue);
  }
}, [settings]);

const handleSave = async () => {
  setIsLoading(true);
  try {
    await updateSettings({ field });
    toast.success("Settings saved!");
  } catch (_error) {
    toast.error("Failed to save settings");
  } finally {
    setIsLoading(false);
  }
};
```

The tier column follows the admin column pattern from `admin/users/page.tsx`:

```typescript
// Pattern: Column with interactive control that stops event propagation
{
  id: "columnName",
  header: () => <div className="text-right">Header</div>,
  cell: ({ row }) => (
    <div
      className="flex items-center justify-end"
      onClick={(e) => e.stopPropagation()} // Prevent row click
    >
      <InteractiveControl
        value={row.original.field}
        onChange={(value) => handleUpdate(row.original._id, value)}
      />
    </div>
  ),
},
```

---

## Next Phase

After completing this phase, proceed to **[Phase 4: Frontend Gating](./phase-4-frontend-gating.md)** to add model filtering and pro badges.
