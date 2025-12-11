"use client";

import { useMemo } from "react";
import { Eye, FunctionSquare, Image, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProviderIcon } from "@/lib/ai/icons";
import { getModelMetrics, type ModelConfig } from "@/lib/ai/models";
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
  const config = getModelConfig(modelId);
  if (!config) return null;

  const ProviderIcon = getProviderIcon(config.provider);
  const contextDisplay = formatContextWindow(config.contextWindow);

  // Compute metrics for visual comparison
  const metrics = useMemo(
    () => getModelMetrics(config.id),
    [config.id],
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ProviderIcon className="w-5 h-5 text-muted-foreground" />
        <div>
          <h3 className="font-semibold text-sm">{config.name}</h3>
          <p className="text-xs text-muted-foreground capitalize">
            {config.provider}
          </p>
        </div>
      </div>

      {/* User-Friendly Description (PRIMARY - for all users) */}
      {config.userFriendlyDescription && (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">
            {config.userFriendlyDescription}
          </p>
          <p className="text-xs text-muted-foreground italic">
            💡 Match model to task: fast models for quick answers, reasoning
            models for complex work
          </p>
        </div>
      )}

      {/* Capability Badges (VISUAL - for quick scanning) */}
      {config.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {config.capabilities.map((cap) => (
            <CapabilityBadge key={cap} capability={cap} />
          ))}
        </div>
      )}

      {/* Technical Specs (COLLAPSED - for power users) */}
      <div className="pt-2 border-t space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Context</span>
          <span className="font-medium">{contextDisplay}</span>
        </div>
        {!config.isLocal && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-medium font-mono">
              ${config.pricing.input}/{config.pricing.output} /M
            </span>
          </div>
        )}
        {config.knowledgeCutoff && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Knowledge</span>
            <span>{config.knowledgeCutoff}</span>
          </div>
        )}
      </div>

      {/* Model Metrics (VISUAL - relative comparisons) */}
      {metrics && (
        <div className="pt-3 border-t">
          <ModelMetricsBadge model={config} metrics={metrics} />
        </div>
      )}

      {/* Technical Summary (for power users who want more) */}
      {config.bestFor && (
        <p className="text-xs text-muted-foreground pt-1 border-t italic">
          {config.bestFor}
        </p>
      )}
    </div>
  );
}

// Capability badge with icon
function CapabilityBadge({ capability }: { capability: string }) {
  const badgeConfig = {
    vision: {
      icon: Eye,
      label: "Vision",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    "function-calling": {
      icon: FunctionSquare,
      label: "Tools",
      color: "bg-green-500/10 text-green-400 border-green-500/20",
    },
    thinking: {
      icon: Sparkles,
      label: "Reasoning",
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    "extended-thinking": {
      icon: Zap,
      label: "Deep Think",
      color: "bg-purple-600/10 text-purple-500 border-purple-600/20",
    },
    "image-generation": {
      icon: Image,
      label: "Images",
      color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    },
  };

  const config = badgeConfig[capability as keyof typeof badgeConfig];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[10px] h-5 ${config.color}`}>
      <Icon className="w-2.5 h-2.5 mr-1" />
      {config.label}
    </Badge>
  );
}

// Helper
function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M tokens`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K tokens`;
  return `${tokens} tokens`;
}
