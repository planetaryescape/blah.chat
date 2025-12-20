"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserPreference } from "@/hooks/useUserPreference";
import { Info } from "lucide-react";

interface PresentationStatsProps {
  slides: Array<{
    generationCost?: number;
    inputTokens?: number;
    outputTokens?: number;
  }>;
  modelName: string;
}

export function PresentationStats({
  slides,
  modelName,
}: PresentationStatsProps) {
  const showStats = useUserPreference("showSlideStatistics");

  if (!showStats) return null;

  const totalCost = slides.reduce((sum, s) => sum + (s.generationCost || 0), 0);
  const totalInputTokens = slides.reduce(
    (sum, s) => sum + (s.inputTokens || 0),
    0,
  );
  const totalOutputTokens = slides.reduce(
    (sum, s) => sum + (s.outputTokens || 0),
    0,
  );

  // Don't show if no cost data yet
  if (totalCost === 0 && totalInputTokens === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-sm space-y-1.5 p-3">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Model</span>
            <span className="font-medium">{modelName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total Cost</span>
            <span className="font-mono">${totalCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tokens</span>
            <span className="font-mono text-xs">
              {totalInputTokens.toLocaleString()} in /{" "}
              {totalOutputTokens.toLocaleString()} out
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
