"use client";

import { Eye, FunctionSquare, Image, Sparkles, Zap } from "lucide-react";
import { useMemo } from "react";
import { useUserPreference } from "@/hooks/useUserPreference";
import { getProviderIcon } from "@/lib/ai/icons";
import { getModelMetrics } from "@/lib/ai/models";
import { getModelConfig } from "@/lib/ai/utils";
import { ModelMetricsBadge } from "./model-metrics-badge";

interface ModelDetailCardProps {
  modelId: string;
  variant?: "popover" | "sidebar";
}

export function ModelDetailCard({
  modelId,
  variant = "popover",
}: ModelDetailCardProps) {
  // All hooks must be called before any conditional returns
  const showModelProvider = useUserPreference("showModelProvider");
  const config = getModelConfig(modelId);
  const metrics = useMemo(
    () => (config ? getModelMetrics(config.id) : null),
    [config],
  );

  if (!config) return null;

  const ProviderIcon = getProviderIcon(config.provider);
  const contextDisplay = formatContextWindow(config.contextWindow);

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-muted p-1.5 rounded-md mt-0.5">
          <ProviderIcon className="w-5 h-5 text-foreground/80" />
        </div>
        <div>
          <h3 className="font-semibold text-base leading-none mb-1">
            {config.name}
          </h3>
          <p className="text-xs text-muted-foreground capitalize">
            {config.provider} • {config.isLocal ? "Local" : "Cloud"}
          </p>
          {showModelProvider && !config.isLocal && (
            <span className="text-[10px] text-muted-foreground/60 block">
              via{" "}
              {config.gateway === "openrouter"
                ? "OpenRouter"
                : "Vercel AI Gateway"}
            </span>
          )}
        </div>
      </div>

      {/* User-Friendly Description (PRIMARY - for all users) */}
      {config.userFriendlyDescription && (
        <div className="text-muted-foreground leading-relaxed">
          {config.userFriendlyDescription}
        </div>
      )}

      {/* Capability Badges (Minimal) */}
      {config.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/80">
          {config.capabilities.map((cap) => (
            <span
              key={cap}
              className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md border border-border/50"
            >
              {getCapabilityIcon(cap)}
              <span className="capitalize">{cap.replace("-", " ")}</span>
            </span>
          ))}
        </div>
      )}

      {/* Technical Specs (Grid) */}
      <div className="pt-3 border-t grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
        <div>
          <span className="text-muted-foreground block mb-0.5 font-medium">
            Context Window
          </span>
          <span className="font-medium text-foreground">{contextDisplay}</span>
        </div>

        {config.knowledgeCutoff && (
          <div>
            <span className="text-muted-foreground block mb-0.5 font-medium">
              Knowledge Access
            </span>
            <span>{config.knowledgeCutoff}</span>
          </div>
        )}

        {!config.isLocal && (
          <div className="col-span-2">
            <span className="text-muted-foreground block mb-0.5 font-medium">
              Pricing (Input / Output)
            </span>
            <div className="font-mono text-muted-foreground">
              <span className="text-foreground">${config.pricing.input}</span> /
              <span className="text-foreground"> ${config.pricing.output}</span>
              <span className="opacity-50 ml-1">per million tokens</span>
            </div>
          </div>
        )}
      </div>

      {/* Model Metrics (VISUAL - relative comparisons) */}
      {metrics && (
        <div className="pt-3 border-t">
          <ModelMetricsBadge model={config} metrics={metrics} compact />
        </div>
      )}

      {/* Technical Summary (for power users who want more) */}
      {config.bestFor && (
        <div className="pt-3 border-t bg-muted/20 -mx-4 px-4 pb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
            Best Used For
          </span>
          <p className="text-xs text-foreground/80 italic">{config.bestFor}</p>
        </div>
      )}
    </div>
  );
}

function getCapabilityIcon(capability: string) {
  switch (capability) {
    case "vision":
      return <Eye className="w-3.5 h-3.5" />;
    case "function-calling":
      return <FunctionSquare className="w-3.5 h-3.5" />;
    case "thinking":
      return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
    case "extended-thinking":
      return <Zap className="w-3.5 h-3.5 text-purple-600" />;
    case "image-generation":
      return <Image className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

// Helper
function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M tokens`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K tokens`;
  return `${tokens} tokens`;
}
