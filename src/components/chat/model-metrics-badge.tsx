"use client";

import { Progress } from "@/components/ui/progress";
import {
    getBenchmarkScores,
    getCostText,
    getIntelligenceText,
    getSpeedText,
} from "@/lib/ai/benchmarks";
import type { ModelConfig } from "@/lib/ai/models";
import type { ComputedMetrics } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface MetricBarProps {
  label: string;
  value: number; // 0-100
  comparative: string;
  inverted?: boolean;
}

function MetricBar({
  label,
  value,
  comparative,
  inverted = false,
}: MetricBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{comparative}</span>
      </div>
      <Progress
        value={inverted ? 100 - value : value}
        className="h-1.5 bg-muted/40"
        indicatorClassName="bg-foreground/80"
      />
    </div>
  );
}

interface ModelMetricsBadgeProps {
  model: ModelConfig;
  metrics: ComputedMetrics;
  compact?: boolean;
}

export function ModelMetricsBadge({
  model,
  metrics,
  compact = false,
}: ModelMetricsBadgeProps) {
  const scores = getBenchmarkScores(model);

  // Speed tier to visual value (0-100)
  const speedTierToValue = (tier: string): number => {
    switch (tier) {
      case "ultra-fast": return 100;
      case "fast": return 75;
      case "medium": return 50;
      case "slow": return 25;
      default: return 50;
    }
  };

  // Cost tier to value (inverted - lower cost = higher bar)
  const costTierToValue = (tier: string): number => {
    switch (tier) {
      case "budget": return 25; // Will be inverted to 75
      case "balanced": return 50; // Will be inverted to 50
      case "premium": return 75; // Will be inverted to 25
      default: return 50;
    }
  };

  return (
    <div className={cn("grid gap-4 pt-1", compact && "gap-3")}>
      {/* Speed bar */}
      <MetricBar
        label="Speed"
        value={speedTierToValue(metrics.speedTier)}
        comparative={getSpeedText(metrics)}
      />

      {/* Cost bar (inverted - lower is better) */}
      <MetricBar
        label="Cost Efficiency"
        value={costTierToValue(metrics.costTier)}
        comparative={getCostText(metrics)}
        inverted
      />

      {/* Intelligence bar */}
      <MetricBar
        label="Intelligence"
        value={metrics.intelligencePercentile ?? scores.intelligence ?? 50}
        comparative={getIntelligenceText(metrics.intelligencePercentile)}
      />

      {/* Disclaimer if estimated */}
      {!metrics.hasPublicBenchmarks && (
        <div className="text-[10px] text-muted-foreground/50 pt-1 flex items-center gap-1.5">
          <Info className="w-2.5 h-2.5" />
          <span>Estimated metrics based on provider data</span>
        </div>
      )}
    </div>
  );
}
