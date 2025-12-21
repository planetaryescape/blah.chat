# Phase 4: Frontend Gating

> **Status: 📝 TODO**

## Overview

This phase adds frontend gating for pro models. We filter inaccessible pro models from the model selector, add a "Pro" badge, show disabled state when limits are reached, and display an upgrade modal.

## Context

### How Does Model Filtering Work?

The `QuickModelSwitcher` uses a `useMemo` to filter and organize models into categories (favorites, recents, by provider). We add a pro access check to this filtering logic.

### Why Filter in Frontend + Backend?

- **UX**: Frontend filtering hides inaccessible models for cleaner UI
- **Security**: Backend enforcement prevents bypassing via API
- **Feedback**: Frontend can show disabled state and upgrade prompts

## Prerequisites

- **[Phase 1](./phase-1-schema-foundation.md)**: Schema changes
- **[Phase 2](./phase-2-backend-enforcement.md)**: Backend enforcement
- **[Phase 3](./phase-3-admin-ui.md)**: Admin UI

## What Comes After

This is the final phase for the tier system. Future enhancements:
- Stripe integration for self-service upgrades
- Per-user tier overrides
- Usage analytics by tier

---

## Scope

### In Scope

1. Add proAccess query to QuickModelSwitcher
2. Filter pro models based on access
3. Add pro badge to ModelSelectorItem
4. Add disabled state for limit reached
5. Add inline upgrade Dialog

### Out of Scope

- Stripe integration
- Self-service tier upgrades
- Per-user limit overrides

---

## Implementation

### Step 1: Add Pro Access Query to QuickModelSwitcher

**File**: `src/components/chat/QuickModelSwitcher.tsx`

Add the pro access query near the other queries (around line 30):

```typescript
// @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
const proAccess = useQuery(api.adminSettings.getProModelAccess);
```

Add the import:

```typescript
import { api } from "@/convex/_generated/api";
```

### Step 2: Add Pro Model Detection Helper

**File**: `src/components/chat/QuickModelSwitcher.tsx`

Add this helper function inside the component (after the queries):

```typescript
// Check if a model is pro (explicit flag OR price threshold)
const isProModel = (model: ModelConfig) =>
  model.isPro === true ||
  (model.pricing?.input ?? 0) >= 5 ||
  (model.pricing?.output ?? 0) >= 15;
```

### Step 3: Filter Pro Models in useMemo

**File**: `src/components/chat/QuickModelSwitcher.tsx`

Find the useMemo that filters models and add pro access filtering. The exact location depends on the existing code structure, but look for where models are organized:

```typescript
// Add this filter function
const filterAccessibleModels = (models: ModelConfig[]) => {
  return models.filter((model) => {
    // Non-pro models always accessible
    if (!isProModel(model)) return true;

    // Admins see all models
    if (currentUser?.isAdmin) return true;

    // Pro models: check access
    // If access loading or no access, hide pro models entirely
    if (!proAccess?.canUse) return false;

    return true;
  });
};

// Apply filter to model lists
const filteredFavorites = filterAccessibleModels(favoriteModels);
const filteredRecents = filterAccessibleModels(recentModels);
const filteredByProvider = Object.fromEntries(
  Object.entries(modelsByProvider).map(([provider, models]) => [
    provider,
    filterAccessibleModels(models),
  ])
);
```

### Step 4: Add Pro Badge to ModelSelectorItem

**File**: `src/components/chat/ModelSelectorItem.tsx`

First, update the props interface to include pro info:

```typescript
interface ModelSelectorItemProps {
  model: ModelConfig;
  isSelected: boolean;
  isFavorite: boolean;
  mode: "single" | "multiple";
  showDefaultBadge?: boolean;
  activeCategory: string;
  onSelect: (modelId: string) => void;
  onToggleFavorite: (modelId: string) => void;
  // ADD THESE PROPS
  isPro?: boolean;
  proAccessRemaining?: number | null; // null = check not applicable
  isDisabled?: boolean;
  onDisabledClick?: () => void;
}
```

Add the Crown icon import:

```typescript
import { Check, ChevronRight, Crown, Star, Zap } from "lucide-react";
```

Add the Pro badge after the Reasoning badge (around line 98):

```typescript
{/* Essential Badges Only */}
{showDefaultBadge && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
    Default
  </span>
)}
{model.reasoning && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-0.5">
    <Zap className="w-2.5 h-2.5" />
    Reasoning
  </span>
)}
{/* ADD PRO BADGE */}
{isPro && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
    <Crown className="w-2.5 h-2.5" />
    Pro
  </span>
)}
```

Update the CommandItem to handle disabled state:

```typescript
<CommandItem
  key={model.id}
  value={model.id}
  keywords={[model.name, model.provider, model.description || ""]}
  onSelect={() => {
    if (isDisabled && onDisabledClick) {
      onDisabledClick();
    } else {
      onSelect(model.id);
    }
  }}
  className={cn(
    "group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer aria-selected:bg-muted/50 data-[selected=true]:bg-muted/50 transition-colors",
    isSelected ? "bg-primary/5" : "",
    isDisabled && "opacity-50 cursor-not-allowed", // ADD disabled styling
  )}
>
```

Add remaining count display for pro models (after the badges):

```typescript
{/* Pro model remaining count */}
{isPro && proAccessRemaining !== null && proAccessRemaining !== undefined && (
  <span className="text-[10px] text-muted-foreground">
    {proAccessRemaining === Infinity
      ? ""
      : proAccessRemaining === 0
        ? "Limit reached"
        : `${proAccessRemaining} left`}
  </span>
)}
```

### Step 5: Add Upgrade Dialog to QuickModelSwitcher

**File**: `src/components/chat/QuickModelSwitcher.tsx`

Add Dialog imports:

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown } from "lucide-react";
```

Add state for the dialog:

```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
```

Add the dialog component at the end of the component's return (inside the outer fragment or div):

```typescript
{/* Upgrade Modal */}
<Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-500" />
        Pro Model Access
      </DialogTitle>
      <DialogDescription>
        {proAccess?.reason || "Upgrade to access pro models"}
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <p className="text-sm">
        Pro models include advanced research and reasoning capabilities like
        Sonar Deep Research.
      </p>

      {proAccess?.reason === "Daily limit reached" && (
        <p className="text-sm text-muted-foreground">
          Your daily limit resets at midnight. Try again tomorrow!
        </p>
      )}

      {proAccess?.reason === "Monthly limit reached" && (
        <p className="text-sm text-muted-foreground">
          Your monthly limit resets on the 1st of next month.
        </p>
      )}

      {proAccess?.reason === "Upgrade to access pro models" && (
        <p className="text-sm text-muted-foreground">
          Contact an administrator to upgrade your account tier.
        </p>
      )}

      {proAccess?.reason === "Pro models disabled" && (
        <p className="text-sm text-muted-foreground">
          Pro models are currently disabled by the administrator.
        </p>
      )}
    </div>
  </DialogContent>
</Dialog>
```

### Step 6: Pass Props to ModelSelectorItem

**File**: `src/components/chat/QuickModelSwitcher.tsx`

When rendering ModelSelectorItem, pass the new props:

```typescript
<ModelSelectorItem
  model={model}
  isSelected={selectedModelId === model.id}
  isFavorite={favoriteModels.some((f) => f.id === model.id)}
  mode={mode}
  showDefaultBadge={/* existing logic */}
  activeCategory={activeCategory}
  onSelect={handleSelectModel}
  onToggleFavorite={handleToggleFavorite}
  // ADD THESE PROPS
  isPro={isProModel(model)}
  proAccessRemaining={
    isProModel(model) && proAccess
      ? (proAccess.remainingDaily ?? proAccess.remainingMonthly ?? null)
      : null
  }
  isDisabled={isProModel(model) && proAccess?.canUse === false}
  onDisabledClick={() => setShowUpgradeModal(true)}
/>
```

---

## File Structure

After this phase:

```
src/components/chat/
├── QuickModelSwitcher.tsx  # Updated with pro filtering + upgrade modal
└── ModelSelectorItem.tsx   # Updated with pro badge + disabled state
```

---

## Testing Checklist

- [ ] Free tier user: pro models not visible in selector
- [ ] Tier 1 user with remaining: pro models visible with badge + count
- [ ] Tier 1 user at limit: pro models visible but disabled, shows "Limit reached"
- [ ] Click disabled pro model: upgrade modal appears
- [ ] Tier 2 user: shows monthly remaining count
- [ ] Admin user: all models visible, no restrictions
- [ ] Pro models disabled globally: hidden for non-admins
- [ ] Pro badge (crown icon) appears on pro models
- [ ] Modal shows appropriate message for each restriction type

---

## Dependencies

No new npm dependencies - uses existing shadcn/ui Dialog component.

---

## Notes

- **Crown icon**: Amber/gold color to indicate premium
- **Disabled state**: 50% opacity + not-allowed cursor
- **Remaining count**: Shows "X left" for limited, empty for unlimited
- **Modal is inline**: No separate component file to avoid over-engineering
- **Fallback for loading**: While proAccess is loading, hide pro models (safe default)

---

## Badge Pattern Reference

The pro badge follows the existing Reasoning badge pattern:

```typescript
// Existing Reasoning badge
{model.reasoning && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-0.5">
    <Zap className="w-2.5 h-2.5" />
    Reasoning
  </span>
)}

// New Pro badge (same structure, amber color)
{isPro && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
    <Crown className="w-2.5 h-2.5" />
    Pro
  </span>
)}
```

---

## Dialog Pattern Reference

The upgrade dialog follows the existing shadcn/ui Dialog pattern:

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Content */}
    </div>
  </DialogContent>
</Dialog>
```

---

## Complete!

After completing all four phases, the tier system is fully implemented:

1. **Phase 1**: Schema foundation (tier field, pro tracking, isPro flag)
2. **Phase 2**: Backend enforcement (limit checks in chat.ts)
3. **Phase 3**: Admin UI (FeaturesSettings + user tier column)
4. **Phase 4**: Frontend gating (model filtering + badges + modal)

Users can now be assigned tiers via the admin users page, and their access to pro models is controlled both in the backend (authoritative) and frontend (UX).
