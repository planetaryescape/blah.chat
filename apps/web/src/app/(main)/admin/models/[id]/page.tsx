"use client";

import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  History,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// Lazy load API to avoid type depth issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modelsApi: any = null;
function getModelsApi() {
  if (!_modelsApi) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { api } = require("@blah-chat/backend/convex/_generated/api");
    _modelsApi = api.models;
  }
  return _modelsApi;
}

const PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "perplexity",
  "groq",
  "cerebras",
  "minimax",
  "deepseek",
  "kimi",
  "zai",
  "meta",
  "mistral",
  "alibaba",
  "zhipu",
] as const;

const CAPABILITIES = [
  "vision",
  "function-calling",
  "thinking",
  "extended-thinking",
  "image-generation",
] as const;

const SPEED_TIERS = ["ultra-fast", "fast", "medium", "slow"] as const;

const GATEWAYS = ["vercel", "openrouter"] as const;

type ModelFormData = {
  modelId: string;
  provider: string;
  name: string;
  description: string;
  contextWindow: number;
  inputCost: number;
  outputCost: number;
  cachedInputCost?: number;
  reasoningCost?: number;
  capabilities: string[];
  status: "active" | "deprecated" | "beta";
  isPro: boolean;
  isInternalOnly: boolean;
  isExperimental: boolean;
  speedTier?: string;
  gateway?: string;
  hostOrder?: string[];
  actualModelId?: string;
  knowledgeCutoff?: string;
  userFriendlyDescription?: string;
  bestFor?: string;
  benchmarks?: string;
  reasoningConfig?: string;
};

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const modelId = unwrappedParams.id;
  const isNew = modelId === "new";
  const router = useRouter();

  // @ts-ignore - Type depth exceeded
  const model = useQuery(
    getModelsApi().queries.getByDbId,
    isNew ? "skip" : { id: modelId as Id<"models"> },
  ) as Doc<"models"> | null | undefined;

  // @ts-ignore - Type depth exceeded
  const history = useQuery(
    getModelsApi().queries.getHistory,
    isNew || !model ? "skip" : { modelId: model.modelId, limit: 10 },
  ) as Doc<"modelHistory">[] | undefined;

  // @ts-ignore - Type depth exceeded
  const updateMutation = useMutation(getModelsApi().mutations.update);
  // @ts-ignore - Type depth exceeded
  const createMutation = useMutation(getModelsApi().mutations.create);
  // @ts-ignore - Type depth exceeded
  const deprecateMutation = useMutation(getModelsApi().mutations.deprecate);
  // @ts-ignore - Type depth exceeded
  const reactivateMutation = useMutation(getModelsApi().mutations.reactivate);
  // @ts-ignore - Type depth exceeded
  const removeMutation = useMutation(getModelsApi().mutations.remove);

  const [formData, setFormData] = useState<ModelFormData>({
    modelId: "",
    provider: "openai",
    name: "",
    description: "",
    contextWindow: 128000,
    inputCost: 0,
    outputCost: 0,
    cachedInputCost: undefined,
    reasoningCost: undefined,
    capabilities: [],
    status: "active",
    isPro: false,
    isInternalOnly: false,
    isExperimental: false,
    speedTier: undefined,
    gateway: undefined,
    hostOrder: undefined,
    actualModelId: undefined,
    knowledgeCutoff: undefined,
    userFriendlyDescription: undefined,
    bestFor: undefined,
    benchmarks: undefined,
    reasoningConfig: undefined,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load model data into form
  useEffect(() => {
    if (model && !isNew) {
      setFormData({
        modelId: model.modelId,
        provider: model.provider,
        name: model.name,
        description: model.description || "",
        contextWindow: model.contextWindow,
        inputCost: model.inputCost,
        outputCost: model.outputCost,
        cachedInputCost: model.cachedInputCost,
        reasoningCost: model.reasoningCost,
        capabilities: model.capabilities || [],
        status: model.status,
        isPro: model.isPro || false,
        isInternalOnly: model.isInternalOnly || false,
        isExperimental: model.isExperimental || false,
        speedTier: model.speedTier,
        gateway: model.gateway,
        hostOrder: model.hostOrder,
        actualModelId: model.actualModelId,
        knowledgeCutoff: model.knowledgeCutoff,
        userFriendlyDescription: model.userFriendlyDescription,
        bestFor: model.bestFor,
        benchmarks: model.benchmarks,
        reasoningConfig: model.reasoningConfig,
      });
    }
  }, [model, isNew]);

  const updateField = useCallback(
    <K extends keyof ModelFormData>(key: K, value: ModelFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

  const toggleCapability = useCallback((cap: string) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap],
    }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (isNew) {
        await createMutation({
          modelId: formData.modelId,
          provider: formData.provider as any,
          name: formData.name,
          description: formData.description || undefined,
          contextWindow: formData.contextWindow,
          inputCost: formData.inputCost,
          outputCost: formData.outputCost,
          cachedInputCost: formData.cachedInputCost,
          reasoningCost: formData.reasoningCost,
          capabilities: formData.capabilities as any[],
          status: formData.status as any,
          isPro: formData.isPro,
          isInternalOnly: formData.isInternalOnly,
          isExperimental: formData.isExperimental,
          speedTier: (formData.speedTier as any) || undefined,
          gateway: (formData.gateway as any) || undefined,
          hostOrder: formData.hostOrder,
          actualModelId: formData.actualModelId,
          knowledgeCutoff: formData.knowledgeCutoff,
          userFriendlyDescription: formData.userFriendlyDescription,
          bestFor: formData.bestFor,
          benchmarks: formData.benchmarks,
          reasoningConfig: formData.reasoningConfig,
        });
        toast.success("Model created");
        router.push("/admin/models");
      } else {
        await updateMutation({
          id: modelId as Id<"models">,
          name: formData.name,
          description: formData.description || undefined,
          contextWindow: formData.contextWindow,
          inputCost: formData.inputCost,
          outputCost: formData.outputCost,
          cachedInputCost: formData.cachedInputCost,
          reasoningCost: formData.reasoningCost,
          capabilities: formData.capabilities as any[],
          status: formData.status as any,
          isPro: formData.isPro,
          isInternalOnly: formData.isInternalOnly,
          isExperimental: formData.isExperimental,
          speedTier: (formData.speedTier as any) || undefined,
          gateway: (formData.gateway as any) || undefined,
          hostOrder: formData.hostOrder,
          actualModelId: formData.actualModelId,
          knowledgeCutoff: formData.knowledgeCutoff,
          userFriendlyDescription: formData.userFriendlyDescription,
          bestFor: formData.bestFor,
          benchmarks: formData.benchmarks,
          reasoningConfig: formData.reasoningConfig,
        });
        toast.success("Model updated");
        setIsDirty(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save model");
    } finally {
      setIsSaving(false);
    }
  }, [isNew, formData, createMutation, updateMutation, modelId, router]);

  const handleDeprecate = useCallback(async () => {
    if (!model) return;
    try {
      await deprecateMutation({ id: model._id });
      toast.success("Model deprecated");
    } catch (error: any) {
      toast.error(error.message || "Failed to deprecate");
    }
  }, [model, deprecateMutation]);

  const handleReactivate = useCallback(async () => {
    if (!model) return;
    try {
      await reactivateMutation({ id: model._id });
      toast.success("Model reactivated");
    } catch (error: any) {
      toast.error(error.message || "Failed to reactivate");
    }
  }, [model, reactivateMutation]);

  const executeDelete = useCallback(async () => {
    if (!model) return;
    try {
      await removeMutation({ id: model._id });
      toast.success("Model deleted");
      router.push("/admin/models");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setShowDeleteConfirm(false);
    }
  }, [model, removeMutation, router]);

  if (!isNew && model === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isNew && model === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Model not found</h1>
        <Button onClick={() => router.push("/admin/models")}>
          Back to Models
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {isNew ? "New Model" : formData.name}
                </h1>
                {!isNew && (
                  <code className="text-sm text-muted-foreground">
                    {formData.modelId}
                  </code>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isNew && model?.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeprecate}
                  className="text-orange-600"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Deprecate
                </Button>
              )}
              {!isNew && model?.status === "deprecated" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivate}
                  className="text-green-600"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate
                </Button>
              )}
              {!isNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isNew ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>Basic model information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model ID</Label>
                  <Input
                    id="modelId"
                    value={formData.modelId}
                    onChange={(e) => updateField("modelId", e.target.value)}
                    placeholder="provider:model-name"
                    disabled={!isNew}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: provider:model-name (e.g., openai:gpt-5)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(v) => updateField("provider", v)}
                    disabled={!isNew}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="GPT-5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Brief description of the model"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userFriendlyDescription">
                  User-Friendly Description
                </Label>
                <Textarea
                  id="userFriendlyDescription"
                  value={formData.userFriendlyDescription || ""}
                  onChange={(e) =>
                    updateField("userFriendlyDescription", e.target.value)
                  }
                  placeholder="Description shown to users in the model picker"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bestFor">Best For</Label>
                <Input
                  id="bestFor"
                  value={formData.bestFor || ""}
                  onChange={(e) => updateField("bestFor", e.target.value)}
                  placeholder="e.g., Complex reasoning, creative writing"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Cost per 1 million tokens (USD)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inputCost">Input Cost</Label>
                  <Input
                    id="inputCost"
                    type="number"
                    step="0.01"
                    value={formData.inputCost}
                    onChange={(e) =>
                      updateField("inputCost", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputCost">Output Cost</Label>
                  <Input
                    id="outputCost"
                    type="number"
                    step="0.01"
                    value={formData.outputCost}
                    onChange={(e) =>
                      updateField("outputCost", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cachedInputCost">Cached Input Cost</Label>
                  <Input
                    id="cachedInputCost"
                    type="number"
                    step="0.01"
                    value={formData.cachedInputCost || ""}
                    onChange={(e) =>
                      updateField(
                        "cachedInputCost",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reasoningCost">Reasoning Cost</Label>
                  <Input
                    id="reasoningCost"
                    type="number"
                    step="0.01"
                    value={formData.reasoningCost || ""}
                    onChange={(e) =>
                      updateField(
                        "reasoningCost",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical */}
          <Card>
            <CardHeader>
              <CardTitle>Technical</CardTitle>
              <CardDescription>Model capabilities and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contextWindow">Context Window (tokens)</Label>
                  <Input
                    id="contextWindow"
                    type="number"
                    value={formData.contextWindow}
                    onChange={(e) =>
                      updateField(
                        "contextWindow",
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speedTier">Speed Tier</Label>
                  <Select
                    value={formData.speedTier || "none"}
                    onValueChange={(v) =>
                      updateField("speedTier", v === "none" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select speed tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {SPEED_TIERS.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Capabilities</Label>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITIES.map((cap) => (
                    <Badge
                      key={cap}
                      variant={
                        formData.capabilities.includes(cap)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleCapability(cap)}
                    >
                      {formData.capabilities.includes(cap) && (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gateway">Gateway</Label>
                  <Select
                    value={formData.gateway || "none"}
                    onValueChange={(v) =>
                      updateField("gateway", v === "none" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Direct)</SelectItem>
                      {GATEWAYS.map((g) => (
                        <SelectItem key={g} value={g} className="capitalize">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualModelId">Actual Model ID</Label>
                  <Input
                    id="actualModelId"
                    value={formData.actualModelId || ""}
                    onChange={(e) =>
                      updateField("actualModelId", e.target.value || undefined)
                    }
                    placeholder="Override model ID for API calls"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="knowledgeCutoff">Knowledge Cutoff</Label>
                <Input
                  id="knowledgeCutoff"
                  value={formData.knowledgeCutoff || ""}
                  onChange={(e) =>
                    updateField("knowledgeCutoff", e.target.value || undefined)
                  }
                  placeholder="e.g., April 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reasoningConfig">Reasoning Config (JSON)</Label>
                <Textarea
                  id="reasoningConfig"
                  value={formData.reasoningConfig || ""}
                  onChange={(e) =>
                    updateField("reasoningConfig", e.target.value || undefined)
                  }
                  placeholder='{"type": "enabled", "budgetTokens": 10000}'
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Flags & Status</CardTitle>
              <CardDescription>
                Access control and visibility settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    updateField("status", v as ModelFormData["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPro"
                    checked={formData.isPro}
                    onCheckedChange={(c) => updateField("isPro", !!c)}
                  />
                  <Label htmlFor="isPro" className="cursor-pointer">
                    Pro Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isInternalOnly"
                    checked={formData.isInternalOnly}
                    onCheckedChange={(c) => updateField("isInternalOnly", !!c)}
                  />
                  <Label htmlFor="isInternalOnly" className="cursor-pointer">
                    Internal Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isExperimental"
                    checked={formData.isExperimental}
                    onCheckedChange={(c) => updateField("isExperimental", !!c)}
                  />
                  <Label htmlFor="isExperimental" className="cursor-pointer">
                    Experimental
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History (only for existing models) */}
          {!isNew && history && history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Change History
                </CardTitle>
                <CardDescription>Recent changes to this model</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.map((h) => (
                    <div key={h._id} className="border-l-2 pl-4 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{h.changeType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          v{h.version}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(h.changedAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {h.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {h.reason}
                        </p>
                      )}
                      {h.changes && h.changes.length > 0 && (
                        <div className="mt-2 text-sm">
                          {h.changes.map((c, i) => (
                            <div key={i} className="text-muted-foreground">
                              <span className="font-mono">{c.field}</span>:{" "}
                              <span className="text-red-500 line-through">
                                {c.oldValue}
                              </span>{" "}
                              →{" "}
                              <span className="text-green-500">
                                {c.newValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this model? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
