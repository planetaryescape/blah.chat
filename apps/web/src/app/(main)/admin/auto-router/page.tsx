"use client";

import {
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  Sliders,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useRouterConfig } from "@/lib/models";

const DEFAULT_CONFIG = {
  contextBuffer: 1.2,
  longContextThreshold: 128000,
  classifierConfidenceThreshold: 0.82,
  classifierTopK: 5,
  classifierFallbackEnabled: true,
};

function AutoRouterSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={`router-skeleton-${i}`} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

function AutoRouterPageContent() {
  const config = useRouterConfig();

  // TODO: Phase G - needs /api/v1/admin/auto-router/config REST route
  const updateConfigMutation = {
    mutateAsync: async (data: any) => {
      const res = await fetch("/api/v1/admin/auto-router/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
    },
  };

  const [formData, setFormData] = useState(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load config into form
  useEffect(() => {
    if (config) {
      setFormData({
        contextBuffer: config.contextBuffer ?? DEFAULT_CONFIG.contextBuffer,
        longContextThreshold:
          config.longContextThreshold ?? DEFAULT_CONFIG.longContextThreshold,
        classifierConfidenceThreshold:
          config.classifierConfidenceThreshold ??
          DEFAULT_CONFIG.classifierConfidenceThreshold,
        classifierTopK: config.classifierTopK ?? DEFAULT_CONFIG.classifierTopK,
        classifierFallbackEnabled:
          config.classifierFallbackEnabled ??
          DEFAULT_CONFIG.classifierFallbackEnabled,
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateConfigMutation.mutateAsync({
        contextBuffer: formData.contextBuffer,
        longContextThreshold: formData.longContextThreshold,
        classifierConfidenceThreshold: formData.classifierConfidenceThreshold,
        classifierTopK: formData.classifierTopK,
        classifierFallbackEnabled: formData.classifierFallbackEnabled,
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

  if (config === undefined) {
    return <AutoRouterSkeleton />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sliders className="h-6 w-6" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">
                    Auto-Router Configuration
                  </h1>
                  <Badge variant="default">Classifier</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Embedding similarity + hard rules model selection
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
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Classifier Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Classifier Settings
                </CardTitle>
                <CardDescription>
                  Controls for embedding-based route classification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Confidence Threshold</Label>
                      <span className="text-sm font-mono">
                        {(formData.classifierConfidenceThreshold * 100).toFixed(
                          0,
                        )}
                        %
                      </span>
                    </div>
                    <Slider
                      value={[formData.classifierConfidenceThreshold * 100]}
                      onValueChange={([v]) =>
                        updateField("classifierConfidenceThreshold", v / 100)
                      }
                      min={50}
                      max={99}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum similarity confidence to skip LLM fallback
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classifierTopK">Top-K Examples</Label>
                    <Input
                      id="classifierTopK"
                      type="number"
                      value={formData.classifierTopK}
                      onChange={(e) =>
                        updateField(
                          "classifierTopK",
                          Number.parseInt(e.target.value, 10) || 3,
                        )
                      }
                      min={1}
                      max={20}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of similar examples to consider for voting
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>LLM Fallback</Label>
                    <p className="text-xs text-muted-foreground">
                      Use LLM to disambiguate when classifier confidence is low
                    </p>
                  </div>
                  <Switch
                    checked={formData.classifierFallbackEnabled}
                    onCheckedChange={(checked) =>
                      updateField("classifierFallbackEnabled", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Context Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Context Settings
                </CardTitle>
                <CardDescription>
                  Context window safety margins and thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      Safety margin multiplier for context window (e.g., 1.2 =
                      20% buffer)
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
