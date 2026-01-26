# Phase 3: Models Admin UI

**Estimated Time**: 3 days
**Prerequisites**: Phases 1-2 complete (schema + repository)
**Depends On**: `packages/backend/convex/schema/models.ts`, `packages/backend/convex/models/queries.ts`, `apps/web/src/lib/models/repository.ts`

## What This Phase Does

Creates dedicated admin page at `/admin/models` for managing AI models. Admin-only access with CRUD operations, bulk import/export, and version history viewing.

## Why This Is Needed

- No UI exists to manage models without code changes
- Need admin interface for adding/editing/deprecating models
- Need bulk operations (import/export JSON) for efficiency
- Need version history for audit trail

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/app/(main)/admin/models/page.tsx` | Models list page with DataTable |
| `apps/web/src/app/(main)/admin/models/[id]/page.tsx` | Model detail/edit page |
| `apps/web/src/app/(main)/admin/models/new/page.tsx` | Create new model page |
| `apps/web/src/components/admin/ModelForm.tsx` | Create/edit form component |
| `apps/web/src/components/admin/ModelBulkActions.tsx` | Import/export/duplicate actions |
| `apps/web/src/components/admin/ModelHistoryDialog.tsx` | Version history viewer |

## Architecture

```
/admin/models (list page)
    ↓ DataTable with all models
    ↓ Actions: create, edit, deprecate, duplicate, export

/admin/models/new (create page)
    ↓ ModelForm component
    ↓ Calls create mutation

/admin/models/[id] (edit page)
    ↓ ModelForm component (populated)
    ↓ Calls update mutation
    ↓ Shows version history
```

## Admin Authorization

**Existing pattern** in codebase (use this):
```typescript
// apps/web/src/app/(main)/admin/layout.tsx already exists
// Uses isCurrentUserAdmin() from Convex

// In mutations, use this pattern from users.ts:
const user = await getCurrentUser(ctx);
if (user.isAdmin !== true) {
  throw new Error("Admin access required");
}
```

**Do NOT** create new auth patterns - use existing admin layout and `getCurrentUser(ctx)` pattern.

## Implementation

### Step 1: Models List Page

**File**: `apps/web/src/app/(main)/admin/models/page.tsx`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ModelBulkActions } from "@/components/admin/ModelBulkActions";
import { ModelHistoryDialog } from "@/components/admin/ModelHistoryDialog";
import { toast } from "sonner";

export default function ModelsAdminPage() {
  const models = useQuery(api.models.queries.list, {});
  const deprecateModel = useMutation(api.models.mutations.deprecate);
  const duplicateModel = useMutation(api.models.mutations.duplicate);

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!models) return <div>Loading models...</div>;

  const columns = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <Link href={`/admin/models/${row.original.id}`} className="font-mono text-sm hover:underline">
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => <Badge variant="outline">{row.original.provider}</Badge>,
    },
    {
      accessorKey: "inputCost",
      header: "Input $/1M",
      cell: ({ row }) => `$${row.original.inputCost.toFixed(2)}`,
    },
    {
      accessorKey: "outputCost",
      header: "Output $/1M",
      cell: ({ row }) => `$${row.original.outputCost.toFixed(2)}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "capabilities",
      header: "Capabilities",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.supportsVision && <Badge variant="outline" className="text-xs">Vision</Badge>}
          {row.original.supportsThinking && <Badge variant="outline" className="text-xs">Thinking</Badge>}
          {row.original.supportsImageGeneration && <Badge variant="outline" className="text-xs">Image</Badge>}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/models/${row.original.id}`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedModelId(row.original.id);
              setHistoryOpen(true);
            }}>
              View History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              const newId = `${row.original.id}-copy`;
              await duplicateModel({
                sourceId: row.original.id,
                newId,
                newName: `${row.original.name} (Copy)`,
              });
              toast.success("Model duplicated");
            }}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                await deprecateModel({ id: row.original.id });
                toast.success("Model deprecated");
              }}
            >
              Deprecate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Models</h1>
          <p className="text-muted-foreground">
            {models.length} models ({models.filter(m => m.status === "active").length} active)
          </p>
        </div>
        <div className="flex gap-2">
          <ModelBulkActions models={models} />
          <Button asChild>
            <Link href="/admin/models/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Link>
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={models} />

      <ModelHistoryDialog
        modelId={selectedModelId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
```

### Step 2: Model Form Component

**File**: `apps/web/src/components/admin/ModelForm.tsx`

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PROVIDERS = [
  "openai", "anthropic", "google", "xai", "perplexity",
  "groq", "cerebras", "minimax", "deepseek", "kimi",
  "zai", "meta", "mistral", "alibaba", "zhipu"
] as const;

const SPEED_TIERS = ["instant", "fast", "moderate", "slow", "deliberate"] as const;

const modelSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-:]+$/, "ID must be lowercase alphanumeric with dashes and colons"),
  provider: z.enum(PROVIDERS),
  name: z.string().min(1),
  description: z.string().optional(),
  contextWindow: z.number().min(1),
  actualModelId: z.string().optional(),
  isLocal: z.boolean().default(false),

  // Pricing
  inputCost: z.number().min(0),
  outputCost: z.number().min(0),
  cachedInputCost: z.number().optional(),
  reasoningCost: z.number().optional(),

  // Capabilities
  supportsVision: z.boolean().default(false),
  supportsFunctionCalling: z.boolean().default(false),
  supportsThinking: z.boolean().default(false),
  supportsExtendedThinking: z.boolean().default(false),
  supportsImageGeneration: z.boolean().default(false),

  // Reasoning
  reasoningConfig: z.string().optional(), // JSON string

  // NEW fields
  gateway: z.enum(["vercel", "openrouter"]).optional(),
  hostOrder: z.string().optional(), // JSON array string
  knowledgeCutoff: z.string().optional(),
  userFriendlyDescription: z.string().optional(),
  bestFor: z.string().optional(),
  benchmarks: z.string().optional(), // JSON string
  speedTier: z.enum(SPEED_TIERS).optional(),

  // Access control
  isPro: z.boolean().default(false),
  isInternalOnly: z.boolean().default(false),
  isExperimental: z.boolean().default(false),

  // Status
  status: z.enum(["active", "deprecated", "beta"]).default("active"),
});

type ModelFormValues = z.infer<typeof modelSchema>;

interface ModelFormProps {
  initialValues?: Partial<ModelFormValues>;
  onSubmit: (values: ModelFormValues) => Promise<void>;
  isEdit?: boolean;
}

export function ModelForm({ initialValues, onSubmit, isEdit }: ModelFormProps) {
  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      isLocal: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      supportsThinking: false,
      supportsExtendedThinking: false,
      supportsImageGeneration: false,
      isPro: false,
      isInternalOnly: false,
      isExperimental: false,
      status: "active",
      ...initialValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="openai:gpt-5"
                          {...field}
                          disabled={isEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        Format: provider:model-name (e.g., openai:gpt-5)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDERS.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="GPT-5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Model description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contextWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context Window (tokens)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="beta">Beta</SelectItem>
                          <SelectItem value="deprecated">Deprecated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing (per 1M tokens)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inputCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outputCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Output Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cachedInputCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cached Input Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>Leave empty if not supported</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasoningCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reasoning Token Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>For thinking/reasoning tokens</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "supportsVision", label: "Vision", desc: "Can process images" },
                  { name: "supportsFunctionCalling", label: "Function Calling", desc: "Can use tools" },
                  { name: "supportsThinking", label: "Thinking", desc: "Basic reasoning mode" },
                  { name: "supportsExtendedThinking", label: "Extended Thinking", desc: "Deep reasoning with budget" },
                  { name: "supportsImageGeneration", label: "Image Generation", desc: "Can generate images" },
                ].map(cap => (
                  <FormField
                    key={cap.name}
                    control={form.control}
                    name={cap.name as any}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>{cap.label}</FormLabel>
                          <FormDescription>{cap.desc}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="reasoningConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reasoning Config (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"type": "anthropic-thinking-budget", "budgetTokens": 10000}'
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        JSON config for thinking models. Types: openai-reasoning-effort, anthropic-thinking-budget, google-thinking-level
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "isPro", label: "Pro Only", desc: "Requires Pro subscription" },
                  { name: "isInternalOnly", label: "Internal Only", desc: "Hidden from mobile/external apps" },
                  { name: "isExperimental", label: "Experimental", desc: "Show experimental badge" },
                ].map(cap => (
                  <FormField
                    key={cap.name}
                    control={form.control}
                    name={cap.name as any}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>{cap.label}</FormLabel>
                          <FormDescription>{cap.desc}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="actualModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Model ID</FormLabel>
                      <FormControl>
                        <Input placeholder="gpt-5-turbo-latest" {...field} />
                      </FormControl>
                      <FormDescription>Provider's model ID if different from display ID</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gateway"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Default (direct)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vercel">Vercel AI Gateway</SelectItem>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hostOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host Order (JSON array)</FormLabel>
                      <FormControl>
                        <Input placeholder='["anthropic", "aws-bedrock"]' {...field} />
                      </FormControl>
                      <FormDescription>Fallback host order for gateway routing</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="speedTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Speed Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select speed tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SPEED_TIERS.map(tier => (
                            <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="knowledgeCutoff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Knowledge Cutoff</FormLabel>
                      <FormControl>
                        <Input placeholder="April 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userFriendlyDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User-Friendly Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Best for complex reasoning tasks..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bestFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Best For</FormLabel>
                      <FormControl>
                        <Input placeholder="Coding, Analysis, Complex Tasks" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="benchmarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benchmarks (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"mmlu": 92.3, "humanEval": 88.1}'
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isLocal"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Local Model</FormLabel>
                        <FormDescription>Runs locally via Ollama</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit">{isEdit ? "Save Changes" : "Create Model"}</Button>
        </div>
      </form>
    </Form>
  );
}
```

### Step 3: Bulk Actions Component

**File**: `apps/web/src/components/admin/ModelBulkActions.tsx`

```typescript
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Upload, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface ModelBulkActionsProps {
  models: any[];
}

export function ModelBulkActions({ models }: ModelBulkActionsProps) {
  const importModels = useMutation(api.models.mutations.bulkImport);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Strip internal fields for export
    const exportData = models.map(({ _id, _creationTime, createdBy, updatedBy, ...rest }) => rest);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `models-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Models exported");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importModels({ json: text, mode: "merge" });
      toast.success(`Imported: ${result.created} created, ${result.updated} updated`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} errors occurred`);
        console.error("Import errors:", result.errors);
      }
    } catch (error) {
      toast.error("Import failed: " + (error as Error).message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export All (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import (JSON)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
```

### Step 4: History Dialog Component

**File**: `apps/web/src/components/admin/ModelHistoryDialog.tsx`

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ModelHistoryDialogProps {
  modelId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModelHistoryDialog({ modelId, open, onOpenChange }: ModelHistoryDialogProps) {
  const history = useQuery(
    api.models.queries.getHistory,
    modelId ? { modelId } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History: {modelId}</DialogTitle>
        </DialogHeader>

        {!history ? (
          <div>Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-muted-foreground">No history found</div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      entry.changeType === "created" ? "default" :
                      entry.changeType === "deprecated" ? "destructive" : "secondary"
                    }>
                      v{entry.version} - {entry.changeType}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(entry.changedAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {entry.reason && (
                  <p className="text-sm mb-2">{entry.reason}</p>
                )}

                {entry.changes.length > 0 && (
                  <div className="text-sm space-y-1">
                    {entry.changes.map((change, j) => (
                      <div key={j} className="font-mono text-xs bg-muted p-2 rounded">
                        <span className="text-muted-foreground">{change.field}:</span>{" "}
                        <span className="text-red-500 line-through">{JSON.stringify(change.oldValue)}</span>{" "}
                        → <span className="text-green-500">{JSON.stringify(change.newValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Step 5: Create/Edit Pages

**File**: `apps/web/src/app/(main)/admin/models/new/page.tsx`

```typescript
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ModelForm } from "@/components/admin/ModelForm";
import { toast } from "sonner";

export default function NewModelPage() {
  const router = useRouter();
  const createModel = useMutation(api.models.mutations.create);

  const handleSubmit = async (values: any) => {
    try {
      await createModel(values);
      toast.success("Model created");
      router.push("/admin/models");
    } catch (error) {
      toast.error("Failed to create: " + (error as Error).message);
    }
  };

  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Add New Model</h1>
      <ModelForm onSubmit={handleSubmit} />
    </div>
  );
}
```

**File**: `apps/web/src/app/(main)/admin/models/[id]/page.tsx`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { ModelForm } from "@/components/admin/ModelForm";
import { toast } from "sonner";

export default function EditModelPage() {
  const params = useParams();
  const modelId = decodeURIComponent(params.id as string);
  const router = useRouter();

  const model = useQuery(api.models.queries.getById, { id: modelId });
  const updateModel = useMutation(api.models.mutations.update);

  if (model === undefined) return <div>Loading...</div>;
  if (model === null) return <div>Model not found</div>;

  const handleSubmit = async (values: any) => {
    try {
      const { id, ...updates } = values;
      await updateModel({ id: modelId, updates, reason: "Updated via admin UI" });
      toast.success("Model updated");
      router.push("/admin/models");
    } catch (error) {
      toast.error("Failed to update: " + (error as Error).message);
    }
  };

  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Edit Model: {model.name}</h1>
      <ModelForm initialValues={model} onSubmit={handleSubmit} isEdit />
    </div>
  );
}
```

## Validation Checklist

- [ ] `/admin/models` shows DataTable with all models
- [ ] Can filter/sort by provider, status, capabilities
- [ ] `/admin/models/new` creates model with all fields
- [ ] `/admin/models/[id]` edits existing model
- [ ] Version history shows in dialog
- [ ] Duplicate creates copy with "-copy" suffix
- [ ] Deprecate sets status and records history
- [ ] Export downloads valid JSON
- [ ] Import validates and upserts models
- [ ] Non-admins cannot access /admin/models

## Rollback

```bash
rm -rf apps/web/src/app/\(main\)/admin/models/
rm -rf apps/web/src/components/admin/Model*.tsx
```

---

**Phase 3 Complete!** Proceed to **[phase-4-rollout.md](./phase-4-rollout.md)**.
