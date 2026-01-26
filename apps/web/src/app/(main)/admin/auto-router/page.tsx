"use client";

import { useMutation } from "convex/react";
import {
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  Sliders,
  Zap,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { USE_DB_MODELS, useRouterConfig } from "@/lib/models";

// Safe JSON parse with fallback for malformed data
function safeJsonParse<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.error("Failed to parse JSON, using fallback:", json);
    return fallback;
  }
}

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

type TierWeights = {
  simple: { cheap: number; mid: number; premium: number };
  moderate: { cheap: number; mid: number; premium: number };
  complex: { cheap: number; mid: number; premium: number };
};

type SpeedBonuses = Record<string, number>;

const DEFAULT_CONFIG = {
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
  } as TierWeights,
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
  } as SpeedBonuses,
  routerModelId: "openai:gpt-oss-120b",
  maxRetries: 3,
  contextBuffer: 1.2,
  longContextThreshold: 128000,
};

function AutoRouterSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

function AutoRouterPageContent() {
  const config = useRouterConfig();
  // @ts-ignore - Type depth exceeded
  const updateConfigMutation = useMutation(
    getModelsApi().mutations.updateRouterConfig,
  );

  const [formData, setFormData] = useState(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load config into form
  useEffect(() => {
    if (config) {
      setFormData({
        stickinessBonus:
          config.stickinessBonus ?? DEFAULT_CONFIG.stickinessBonus,
        reasoningBonus: config.reasoningBonus ?? DEFAULT_CONFIG.reasoningBonus,
        researchBonus: config.researchBonus ?? DEFAULT_CONFIG.researchBonus,
        simplePenalty: config.simplePenalty ?? DEFAULT_CONFIG.simplePenalty,
        complexBoostThreshold:
          config.complexBoostThreshold ?? DEFAULT_CONFIG.complexBoostThreshold,
        complexBoostMultiplier:
          config.complexBoostMultiplier ??
          DEFAULT_CONFIG.complexBoostMultiplier,
        cheapThreshold: config.cheapThreshold ?? DEFAULT_CONFIG.cheapThreshold,
        midThreshold: config.midThreshold ?? DEFAULT_CONFIG.midThreshold,
        tierWeights: safeJsonParse(
          config.tierWeights,
          DEFAULT_CONFIG.tierWeights,
        ),
        speedBonuses: safeJsonParse(
          config.speedBonuses,
          DEFAULT_CONFIG.speedBonuses,
        ),
        routerModelId: config.routerModelId ?? DEFAULT_CONFIG.routerModelId,
        maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
        contextBuffer: config.contextBuffer ?? DEFAULT_CONFIG.contextBuffer,
        longContextThreshold:
          config.longContextThreshold ?? DEFAULT_CONFIG.longContextThreshold,
      });
    }
  }, [config]);

  const updateField = useCallback(
    <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

  const updateTierWeight = useCallback(
    (
      complexity: keyof TierWeights,
      tier: keyof TierWeights["simple"],
      value: number,
    ) => {
      setFormData((prev) => ({
        ...prev,
        tierWeights: {
          ...prev.tierWeights,
          [complexity]: {
            ...prev.tierWeights[complexity],
            [tier]: value,
          },
        },
      }));
      setIsDirty(true);
    },
    [],
  );

  const updateSpeedBonus = useCallback((pattern: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      speedBonuses: {
        ...prev.speedBonuses,
        [pattern]: value,
      },
    }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateConfigMutation({
        stickinessBonus: formData.stickinessBonus,
        reasoningBonus: formData.reasoningBonus,
        researchBonus: formData.researchBonus,
        simplePenalty: formData.simplePenalty,
        complexBoostThreshold: formData.complexBoostThreshold,
        complexBoostMultiplier: formData.complexBoostMultiplier,
        cheapThreshold: formData.cheapThreshold,
        midThreshold: formData.midThreshold,
        tierWeights: JSON.stringify(formData.tierWeights),
        speedBonuses: JSON.stringify(formData.speedBonuses),
        routerModelId: formData.routerModelId,
        maxRetries: formData.maxRetries,
        contextBuffer: formData.contextBuffer,
        longContextThreshold: formData.longContextThreshold,
      });
      toast.success("Auto-router configuration saved");
      setIsDirty(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }, [formData, updateConfigMutation]);

  const handleReset = useCallback(() => {
    setFormData(DEFAULT_CONFIG);
    setIsDirty(true);
  }, []);

  if (!USE_DB_MODELS) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <h2 className="text-lg font-semibold text-yellow-600">
            DB Models Disabled
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set <code>NEXT_PUBLIC_USE_DB_MODELS=true</code> to enable
            database-backed auto-router configuration.
          </p>
        </div>
      </div>
    );
  }

  if (config === undefined) {
    return <AutoRouterSkeleton />;
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sliders className="h-6 w-6" />
              <div>
                <h1 className="text-2xl font-semibold">
                  Auto-Router Configuration
                </h1>
                <p className="text-sm text-muted-foreground">
                  Tune model selection scoring and behavior
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!config && <Badge variant="secondary">Using defaults</Badge>}
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Scoring Bonuses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Scoring Bonuses
              </CardTitle>
              <CardDescription>
                Points added to model scores based on context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Stickiness Bonus</Label>
                    <span className="text-sm font-mono">
                      +{formData.stickinessBonus}
                    </span>
                  </div>
                  <Slider
                    value={[formData.stickinessBonus]}
                    onValueChange={([v]) => updateField("stickinessBonus", v)}
                    min={0}
                    max={50}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus for keeping the same model within a conversation
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Reasoning Bonus</Label>
                    <span className="text-sm font-mono">
                      +{formData.reasoningBonus}
                    </span>
                  </div>
                  <Slider
                    value={[formData.reasoningBonus]}
                    onValueChange={([v]) => updateField("reasoningBonus", v)}
                    min={0}
                    max={50}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus for models with thinking capability on complex tasks
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Research Bonus</Label>
                    <span className="text-sm font-mono">
                      +{formData.researchBonus}
                    </span>
                  </div>
                  <Slider
                    value={[formData.researchBonus]}
                    onValueChange={([v]) => updateField("researchBonus", v)}
                    min={0}
                    max={50}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus for Perplexity on research-type tasks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complexity Tuning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Complexity Tuning
              </CardTitle>
              <CardDescription>
                How task complexity affects model selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Simple Task Penalty</Label>
                    <span className="text-sm font-mono">
                      ×{formData.simplePenalty.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[formData.simplePenalty * 100]}
                    onValueChange={([v]) =>
                      updateField("simplePenalty", v / 100)
                    }
                    min={50}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplier applied to expensive models for simple tasks
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Complex Boost Multiplier</Label>
                    <span className="text-sm font-mono">
                      ×{formData.complexBoostMultiplier.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[formData.complexBoostMultiplier * 100]}
                    onValueChange={([v]) =>
                      updateField("complexBoostMultiplier", v / 100)
                    }
                    min={100}
                    max={200}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Boost applied to high-quality models for complex tasks
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complexBoostThreshold">
                    Complex Boost Threshold
                  </Label>
                  <Input
                    id="complexBoostThreshold"
                    type="number"
                    value={formData.complexBoostThreshold}
                    onChange={(e) =>
                      updateField(
                        "complexBoostThreshold",
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quality score threshold to receive complex boost (0-100)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Tier Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Tier Configuration</CardTitle>
              <CardDescription>
                Define cost boundaries and weights per task complexity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cheapThreshold">Cheap Threshold ($/1M)</Label>
                  <Input
                    id="cheapThreshold"
                    type="number"
                    step="0.1"
                    value={formData.cheapThreshold}
                    onChange={(e) =>
                      updateField(
                        "cheapThreshold",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Models below this cost are "cheap" tier
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="midThreshold">Mid Threshold ($/1M)</Label>
                  <Input
                    id="midThreshold"
                    type="number"
                    step="0.1"
                    value={formData.midThreshold}
                    onChange={(e) =>
                      updateField(
                        "midThreshold",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Models below this (but above cheap) are "mid" tier
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base">Tier Weights by Complexity</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Probability weights for each cost tier based on task
                  complexity
                </p>

                <div className="space-y-4">
                  {(["simple", "moderate", "complex"] as const).map(
                    (complexity) => (
                      <div key={complexity} className="space-y-2">
                        <Label className="capitalize">{complexity} Tasks</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {(["cheap", "mid", "premium"] as const).map(
                            (tier) => (
                              <div key={tier} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs capitalize text-muted-foreground">
                                    {tier}
                                  </span>
                                  <span className="text-xs font-mono">
                                    {(
                                      formData.tierWeights[complexity][tier] *
                                      100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                                <Slider
                                  value={[
                                    formData.tierWeights[complexity][tier] *
                                      100,
                                  ]}
                                  onValueChange={([v]) =>
                                    updateTierWeight(complexity, tier, v / 100)
                                  }
                                  min={0}
                                  max={100}
                                  step={5}
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Speed Bonuses */}
          <Card>
            <CardHeader>
              <CardTitle>Speed Bonuses</CardTitle>
              <CardDescription>
                Score adjustments based on model speed characteristics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(formData.speedBonuses).map(
                  ([pattern, bonus]) => (
                    <div key={pattern} className="space-y-2">
                      <Label htmlFor={`speed-${pattern}`} className="font-mono">
                        {pattern}
                      </Label>
                      <Input
                        id={`speed-${pattern}`}
                        type="number"
                        value={bonus}
                        onChange={(e) =>
                          updateSpeedBonus(
                            pattern,
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                      />
                    </div>
                  ),
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Positive values boost fast models, negative values penalize slow
                models
              </p>
            </CardContent>
          </Card>

          {/* Router Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Router Settings</CardTitle>
              <CardDescription>Core router behavior and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routerModelId">Router Model</Label>
                  <Input
                    id="routerModelId"
                    value={formData.routerModelId}
                    onChange={(e) =>
                      updateField("routerModelId", e.target.value)
                    }
                    placeholder="openai:gpt-oss-120b"
                  />
                  <p className="text-xs text-muted-foreground">
                    Model used for task classification
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    value={formData.maxRetries}
                    onChange={(e) =>
                      updateField(
                        "maxRetries",
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    min={1}
                    max={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-retry attempts on model failure
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contextBuffer">Context Buffer</Label>
                  <Input
                    id="contextBuffer"
                    type="number"
                    step="0.1"
                    value={formData.contextBuffer}
                    onChange={(e) =>
                      updateField(
                        "contextBuffer",
                        parseFloat(e.target.value) || 1.0,
                      )
                    }
                    min={1}
                    max={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Safety margin multiplier for context window (e.g., 1.2 = 20%
                    buffer)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longContextThreshold">
                    Long Context Threshold
                  </Label>
                  <Input
                    id="longContextThreshold"
                    type="number"
                    step="1000"
                    value={formData.longContextThreshold}
                    onChange={(e) =>
                      updateField(
                        "longContextThreshold",
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Token count that triggers "long context" mode
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Note */}
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-600">
                  Changes take effect immediately
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-router configuration changes apply to all new requests.
                  Test thoroughly before making significant adjustments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function AutoRouterPage() {
  return (
    <Suspense fallback={<AutoRouterSkeleton />}>
      <AutoRouterPageContent />
    </Suspense>
  );
}
