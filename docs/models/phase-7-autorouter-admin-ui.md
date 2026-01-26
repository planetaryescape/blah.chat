# Phase 7: Auto-Router Admin UI

**Estimated Time**: 2 days
**Prerequisites**: Phase 6 complete (model management working)
**Depends On**: `autoRouterConfig` and `modelProfiles` tables from Phase 1

## What This Phase Does

Creates admin UI at `/admin/auto-router` with "dials and knobs" to tune auto-router behavior without code deploys. Admins can adjust scoring bonuses, cost tier thresholds, speed preferences, and model category scores.

## Why This Is Needed

- Auto-router parameters are hardcoded in `autoRouter.ts` and `modelProfiles.ts`
- Tuning requires code changes and deploys
- Need ability to experiment with routing strategies
- Model category scores should be editable without code

## Current Hardcoded Parameters

From `packages/backend/convex/ai/autoRouter.ts`:

### Scoring Bonuses
| Parameter | Current Value | Purpose |
|-----------|---------------|---------|
| Stickiness bonus | +25 | Keep same model in conversation |
| Reasoning bonus | +15 | Prefer thinking-capable models |
| Research bonus | +25 | Perplexity for research tasks |

### Complexity Multipliers
| Parameter | Current Value | Purpose |
|-----------|---------------|---------|
| Simple task penalty | 0.7x | Disfavor expensive for simple |
| Complex boost threshold | 85 (quality) | When to apply boost |
| Complex boost multiplier | 1.2x | Boost capable models |

### Cost Tier Config
| Tier | Boundary | Simple | Moderate | Complex |
|------|----------|--------|----------|---------|
| Cheap | avgCost < $1 | 0.6 | 0.5 | 0.3 |
| Mid | avgCost < $5 | 0.25 | 0.3 | 0.4 |
| Premium | avgCost ≥ $5 | 0.15 | 0.2 | 0.3 |

### Speed Bonuses
| Pattern | Bonus |
|---------|-------|
| Cerebras | +12 |
| Groq | +10 |
| "flash"/"fast" | +8 |
| "nano"/"lite" | +10 |
| "lightning" | +12 |
| thinking | -5 |
| extended-thinking | -8 |

### Router Settings
| Setting | Current | Purpose |
|---------|---------|---------|
| Router model | openai:gpt-oss-120b | Task classification |
| Max retries | 3 | Auto-retry attempts |
| Context buffer | 1.2x (20%) | Safety margin |
| Long context threshold | 128,000 | Tokens for "long context" |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/app/(main)/admin/auto-router/page.tsx` | Main config page |
| `apps/web/src/app/(main)/admin/auto-router/profiles/page.tsx` | Model profiles editor |
| `apps/web/src/components/admin/AutoRouterConfig.tsx` | Config form with sliders |
| `apps/web/src/components/admin/ModelProfilesEditor.tsx` | Category scores editor |
| `packages/backend/convex/autoRouter/queries.ts` | Read config |
| `packages/backend/convex/autoRouter/mutations.ts` | Update config |

## Architecture

```
/admin/auto-router
    ↓ Tabs: Config | Profiles

Config Tab:
    ↓ Scoring Bonuses (sliders)
    ↓ Complexity Multipliers (inputs)
    ↓ Cost Tier Config (matrix)
    ↓ Speed Bonuses (list)
    ↓ Router Settings (dropdowns)

Profiles Tab:
    ↓ DataTable: model | quality | coding | reasoning | ...
    ↓ Edit modal for each model's scores
```

## Implementation

### Step 1: Queries and Mutations

**File**: `packages/backend/convex/autoRouter/queries.ts`

```typescript
import { query } from "../_generated/server";
import { getCurrentUser } from "../users";

/**
 * Get auto-router configuration (singleton)
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    // Public read - no auth required (config affects all users)
    const config = await ctx.db.query("autoRouterConfig").first();

    if (!config) {
      // Return defaults if no config exists
      return getDefaultConfig();
    }

    return config;
  },
});

/**
 * Get all model profiles
 */
export const getProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("modelProfiles").collect();
  },
});

/**
 * Get single model profile
 */
export const getProfile = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modelProfiles")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();
  },
});

function getDefaultConfig() {
  return {
    // Scoring bonuses
    stickinessBonus: 25,
    reasoningBonus: 15,
    researchBonus: 25,

    // Complexity multipliers
    simplePenalty: 0.7,
    complexBoostThreshold: 85,
    complexBoostMultiplier: 1.2,

    // Cost tier boundaries
    cheapThreshold: 1.0,
    midThreshold: 5.0,

    // Tier weights
    tierWeights: JSON.stringify({
      simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
      moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
      complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
    }),

    // Speed bonuses
    speedBonuses: JSON.stringify({
      cerebras: 12,
      groq: 10,
      flash: 8,
      fast: 8,
      nano: 10,
      lite: 10,
      lightning: 12,
      thinking: -5,
      "extended-thinking": -8,
    }),

    // Router settings
    routerModelId: "openai:gpt-oss-120b",
    maxRetries: 3,
    contextBuffer: 1.2,
    longContextThreshold: 128000,
  };
}
```

**File**: `packages/backend/convex/autoRouter/mutations.ts`

```typescript
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../users";

/**
 * Update auto-router configuration (admin only)
 */
export const updateConfig = mutation({
  args: {
    // Scoring bonuses
    stickinessBonus: v.optional(v.number()),
    reasoningBonus: v.optional(v.number()),
    researchBonus: v.optional(v.number()),

    // Complexity multipliers
    simplePenalty: v.optional(v.number()),
    complexBoostThreshold: v.optional(v.number()),
    complexBoostMultiplier: v.optional(v.number()),

    // Cost tier boundaries
    cheapThreshold: v.optional(v.number()),
    midThreshold: v.optional(v.number()),

    // Tier weights (JSON string)
    tierWeights: v.optional(v.string()),

    // Speed bonuses (JSON string)
    speedBonuses: v.optional(v.string()),

    // Router settings
    routerModelId: v.optional(v.string()),
    maxRetries: v.optional(v.number()),
    contextBuffer: v.optional(v.number()),
    longContextThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Admin check
    const user = await getCurrentUser(ctx);
    if (user.isAdmin !== true) {
      throw new Error("Admin access required");
    }

    // Get existing config
    const existing = await ctx.db.query("autoRouterConfig").first();

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(args).filter(([_, v]) => v !== undefined)
    );

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      // Create new with defaults + updates
      await ctx.db.insert("autoRouterConfig", {
        stickinessBonus: 25,
        reasoningBonus: 15,
        researchBonus: 25,
        simplePenalty: 0.7,
        complexBoostThreshold: 85,
        complexBoostMultiplier: 1.2,
        cheapThreshold: 1.0,
        midThreshold: 5.0,
        tierWeights: JSON.stringify({
          simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
          moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
          complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
        }),
        speedBonuses: JSON.stringify({
          cerebras: 12,
          groq: 10,
          flash: 8,
          fast: 8,
          nano: 10,
          lite: 10,
          lightning: 12,
          thinking: -5,
          "extended-thinking": -8,
        }),
        routerModelId: "openai:gpt-oss-120b",
        maxRetries: 3,
        contextBuffer: 1.2,
        longContextThreshold: 128000,
        ...updates,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

/**
 * Update model profile scores (admin only)
 */
export const updateProfile = mutation({
  args: {
    modelId: v.string(),
    qualityScore: v.optional(v.number()),
    categoryScores: v.optional(v.string()), // JSON string
  },
  handler: async (ctx, args) => {
    // Admin check
    const user = await getCurrentUser(ctx);
    if (user.isAdmin !== true) {
      throw new Error("Admin access required");
    }

    // Get existing profile
    const existing = await ctx.db
      .query("modelProfiles")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();

    const updates = {
      ...(args.qualityScore !== undefined && { qualityScore: args.qualityScore }),
      ...(args.categoryScores !== undefined && { categoryScores: args.categoryScores }),
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("modelProfiles", {
        modelId: args.modelId,
        qualityScore: args.qualityScore ?? 70,
        categoryScores: args.categoryScores ?? JSON.stringify({
          coding: 70,
          reasoning: 70,
          creative: 70,
          factual: 70,
          analysis: 70,
          conversation: 70,
          multimodal: 50,
          research: 70,
        }),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

/**
 * Bulk update profiles (admin only)
 */
export const bulkUpdateProfiles = mutation({
  args: {
    profiles: v.array(v.object({
      modelId: v.string(),
      qualityScore: v.number(),
      categoryScores: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.isAdmin !== true) {
      throw new Error("Admin access required");
    }

    let updated = 0;
    let created = 0;

    for (const profile of args.profiles) {
      const existing = await ctx.db
        .query("modelProfiles")
        .withIndex("by_model", (q) => q.eq("modelId", profile.modelId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          qualityScore: profile.qualityScore,
          categoryScores: profile.categoryScores,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
        updated++;
      } else {
        await ctx.db.insert("modelProfiles", {
          ...profile,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
        created++;
      }
    }

    return { updated, created };
  },
});
```

### Step 2: Admin Page

**File**: `apps/web/src/app/(main)/admin/auto-router/page.tsx`

```typescript
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutoRouterConfig } from "@/components/admin/AutoRouterConfig";
import { ModelProfilesEditor } from "@/components/admin/ModelProfilesEditor";

export default function AutoRouterAdminPage() {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Auto-Router Configuration</h1>
        <p className="text-muted-foreground">
          Tune how AUTO mode selects models for different tasks
        </p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Routing Config</TabsTrigger>
          <TabsTrigger value="profiles">Model Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="pt-4">
          <AutoRouterConfig />
        </TabsContent>

        <TabsContent value="profiles" className="pt-4">
          <ModelProfilesEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Step 3: Config Form Component

**File**: `apps/web/src/components/admin/AutoRouterConfig.tsx`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function AutoRouterConfig() {
  const config = useQuery(api.autoRouter.queries.getConfig, {});
  const updateConfig = useMutation(api.autoRouter.mutations.updateConfig);
  const models = useQuery(api.models.queries.list, {});

  const [localConfig, setLocalConfig] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  if (!localConfig) return <div>Loading config...</div>;

  const handleChange = (key: string, value: any) => {
    setLocalConfig((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig(localConfig);
      toast.success("Config saved");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save: " + (error as Error).message);
    }
  };

  const tierWeights = JSON.parse(localConfig.tierWeights || "{}");
  const speedBonuses = JSON.parse(localConfig.speedBonuses || "{}");

  return (
    <div className="space-y-6">
      {/* Scoring Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Bonuses</CardTitle>
          <CardDescription>
            Points added to model scores based on context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Stickiness Bonus</Label>
              <span className="text-sm text-muted-foreground">+{localConfig.stickinessBonus}</span>
            </div>
            <Slider
              value={[localConfig.stickinessBonus]}
              onValueChange={([v]) => handleChange("stickinessBonus", v)}
              min={0}
              max={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Bonus for continuing with same model in conversation
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Reasoning Bonus</Label>
              <span className="text-sm text-muted-foreground">+{localConfig.reasoningBonus}</span>
            </div>
            <Slider
              value={[localConfig.reasoningBonus]}
              onValueChange={([v]) => handleChange("reasoningBonus", v)}
              min={0}
              max={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Bonus for models with thinking capabilities
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Research Bonus</Label>
              <span className="text-sm text-muted-foreground">+{localConfig.researchBonus}</span>
            </div>
            <Slider
              value={[localConfig.researchBonus]}
              onValueChange={([v]) => handleChange("researchBonus", v)}
              min={0}
              max={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Bonus for Perplexity on research tasks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Complexity Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Complexity Multipliers</CardTitle>
          <CardDescription>
            Adjust scoring based on task complexity
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Simple Task Penalty</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="1.0"
              value={localConfig.simplePenalty}
              onChange={(e) => handleChange("simplePenalty", parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Multiplier for simple tasks (lower = cheaper models)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Complex Boost Threshold</Label>
            <Input
              type="number"
              min="50"
              max="100"
              value={localConfig.complexBoostThreshold}
              onChange={(e) => handleChange("complexBoostThreshold", parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Minimum quality score to receive complex boost
            </p>
          </div>

          <div className="space-y-2">
            <Label>Complex Boost Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              min="1.0"
              max="2.0"
              value={localConfig.complexBoostMultiplier}
              onChange={(e) => handleChange("complexBoostMultiplier", parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Multiplier for capable models on complex tasks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cost Tier Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Tier Boundaries</CardTitle>
          <CardDescription>
            Define price thresholds for cheap/mid/premium tiers (avg cost per 1M tokens)
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cheap Threshold ($)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={localConfig.cheapThreshold}
              onChange={(e) => handleChange("cheapThreshold", parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Models below this are "cheap"
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mid Threshold ($)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={localConfig.midThreshold}
              onChange={(e) => handleChange("midThreshold", parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Models below this are "mid", above are "premium"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Router Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Router Settings</CardTitle>
          <CardDescription>
            Configure the task classification model and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Router Model</Label>
            <Select
              value={localConfig.routerModelId}
              onValueChange={(v) => handleChange("routerModelId", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models?.filter(m => m.status === "active").map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Model used for task classification
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max Retries</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={localConfig.maxRetries}
              onChange={(e) => handleChange("maxRetries", parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Context Buffer</Label>
            <Input
              type="number"
              step="0.1"
              min="1.0"
              max="2.0"
              value={localConfig.contextBuffer}
              onChange={(e) => handleChange("contextBuffer", parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Safety margin for context window (1.2 = 20% buffer)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Long Context Threshold</Label>
            <Input
              type="number"
              step="1000"
              min="1000"
              value={localConfig.longContextThreshold}
              onChange={(e) => handleChange("longContextThreshold", parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Tokens to trigger "long context" routing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
```

### Step 4: Model Profiles Editor

**File**: `apps/web/src/components/admin/ModelProfilesEditor.tsx`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "coding", label: "Coding" },
  { key: "reasoning", label: "Reasoning" },
  { key: "creative", label: "Creative" },
  { key: "factual", label: "Factual" },
  { key: "analysis", label: "Analysis" },
  { key: "conversation", label: "Conversation" },
  { key: "multimodal", label: "Multimodal" },
  { key: "research", label: "Research" },
];

export function ModelProfilesEditor() {
  const models = useQuery(api.models.queries.list, {});
  const profiles = useQuery(api.autoRouter.queries.getProfiles, {});
  const updateProfile = useMutation(api.autoRouter.mutations.updateProfile);

  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editingScores, setEditingScores] = useState<any>(null);

  // Merge models with their profiles
  const data = (models ?? []).map(model => {
    const profile = profiles?.find(p => p.modelId === model.id);
    const scores = profile?.categoryScores ? JSON.parse(profile.categoryScores) : null;
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      qualityScore: profile?.qualityScore ?? 70,
      ...scores,
    };
  });

  const columns = [
    { accessorKey: "id", header: "Model ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "qualityScore", header: "Quality", cell: ({ row }) => row.original.qualityScore },
    ...CATEGORIES.map(cat => ({
      accessorKey: cat.key,
      header: cat.label,
      cell: ({ row }) => row.original[cat.key] ?? "-",
    })),
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const profile = profiles?.find(p => p.modelId === row.original.id);
            const scores = profile?.categoryScores ? JSON.parse(profile.categoryScores) : {
              coding: 70, reasoning: 70, creative: 70, factual: 70,
              analysis: 70, conversation: 70, multimodal: 50, research: 70,
            };
            setEditingModel(row.original.id);
            setEditingScores({
              qualityScore: profile?.qualityScore ?? 70,
              ...scores,
            });
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const handleSave = async () => {
    if (!editingModel || !editingScores) return;

    const { qualityScore, ...categoryScores } = editingScores;

    try {
      await updateProfile({
        modelId: editingModel,
        qualityScore,
        categoryScores: JSON.stringify(categoryScores),
      });
      toast.success("Profile updated");
      setEditingModel(null);
    } catch (error) {
      toast.error("Failed to save: " + (error as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Category scores (0-100) determine model selection for different task types.
          Higher scores = more likely to be selected for that category.
        </p>
      </div>

      <DataTable columns={columns} data={data} />

      <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile: {editingModel}</DialogTitle>
          </DialogHeader>

          {editingScores && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Overall Quality Score</Label>
                  <span>{editingScores.qualityScore}</span>
                </div>
                <Slider
                  value={[editingScores.qualityScore]}
                  onValueChange={([v]) => setEditingScores((s: any) => ({ ...s, qualityScore: v }))}
                  min={0}
                  max={100}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Category Scores</Label>
                <div className="grid grid-cols-2 gap-4">
                  {CATEGORIES.map(cat => (
                    <div key={cat.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{cat.label}</span>
                        <span>{editingScores[cat.key]}</span>
                      </div>
                      <Slider
                        value={[editingScores[cat.key]]}
                        onValueChange={([v]) => setEditingScores((s: any) => ({ ...s, [cat.key]: v }))}
                        min={0}
                        max={100}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingModel(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## Validation Checklist

- [ ] `/admin/auto-router` loads with current config values
- [ ] Scoring bonus sliders update and save
- [ ] Complexity multiplier inputs validate ranges
- [ ] Cost tier boundaries can be adjusted
- [ ] Router model dropdown shows active models
- [ ] Model profiles tab shows all models with scores
- [ ] Edit profile dialog allows score adjustments
- [ ] Changes save without errors
- [ ] Config persists across page reloads
- [ ] Non-admins cannot access page

## Troubleshooting

### Config Not Loading

**Check**:
1. `autoRouterConfig` table exists in schema
2. Query doesn't require auth (public read)
3. Defaults returned when no row exists

### Save Failing

**Check**:
1. User is admin
2. Mutation args match schema validators
3. JSON strings valid for tierWeights/speedBonuses

### Profile Scores Not Showing

**Check**:
1. `modelProfiles` table exists
2. Profiles seeded from modelProfiles.ts
3. JSON parsing not failing

## What Comes Next

**Phase 8** wires the auto-router to read from DB instead of hardcoded values:
- Modify `autoRouter.ts` to query `autoRouterConfig`
- Modify scoring to use DB `modelProfiles`
- Add feature flag for gradual rollout

---

**Phase 7 Complete!** Auto-router admin UI ready. Proceed to **[phase-8-autorouter-integration.md](./phase-8-autorouter-integration.md)**.
