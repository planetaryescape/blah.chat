"use client";

import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ModelConfig } from "@/lib/ai/models";
import type { ComputedMetrics } from "@/lib/ai/types";
import {
  getBenchmarkScores,
  getCostText,
  getIntelligenceText,
  getSpeedText,
} from "@/lib/ai/benchmarks";

interface MetricBarProps {
  label: string;
  value: number; // 0-100
  color: "blue" | "green" | "emerald" | "yellow" | "red" | "amber";
  comparative: string;
  inverted?: boolean;
}

function MetricBar({
  label,
  value,
  color,
  comparative,
  inverted = false,
}: MetricBarProps) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-foreground">{comparative}</span>
      </div>
      <Progress
        value={inverted ? 100 - value : value}
        className="h-2"
        indicatorClassName={colorClasses[color]}
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
      case "ultra-fast":
        return 100;
      case "fast":
        return 75;
      case "medium":
        return 50;
      case "slow":
        return 25;
      default:
        return 50;
    }
  };

  // Speed tier to color
  const speedTierToColor = (
    tier: string,
  ): "green" | "emerald" | "yellow" | "red" => {
    switch (tier) {
      case "ultra-fast":
        return "green";
      case "fast":
        return "emerald";
      case "medium":
        return "yellow";
      case "slow":
        return "red";
      default:
        return "yellow";
    }
  };

  // Cost tier to value (inverted - lower cost = higher bar)
  const costTierToValue = (tier: string): number => {
    switch (tier) {
      case "budget":
        return 25; // Will be inverted to 75
      case "balanced":
        return 50; // Will be inverted to 50
      case "premium":
        return 75; // Will be inverted to 25
      default:
        return 50;
    }
  };

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* Speed bar - encourage fast models for simple tasks */}
      <MetricBar
        label="Speed"
        value={speedTierToValue(metrics.speedTier)}
        color={speedTierToColor(metrics.speedTier)}
        comparative={getSpeedText(metrics)}
      />

      {/* Cost bar (inverted - lower is better) - keep users cost-conscious */}
      <MetricBar
        label="Cost"
        value={costTierToValue(metrics.costTier)}
        color="amber"
        comparative={getCostText(metrics)}
        inverted
      />

      {/* Intelligence bar - capability indicator, not priority metric */}
      <MetricBar
        label="Intelligence"
        value={metrics.intelligencePercentile ?? scores.intelligence ?? 50}
        color="blue"
        comparative={getIntelligenceText(metrics.intelligencePercentile)}
      />

      {/* Disclaimer if estimated */}
      {!metrics.hasPublicBenchmarks && (
        <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <div>Estimates based on provider data</div>
            <div>Benchmark data not available</div>
          </div>
        </div>
      )}
    </div>
  );
}
