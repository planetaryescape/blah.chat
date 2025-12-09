"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getModelIcon } from "@/lib/ai/icons";
import { getModelConfig } from "@/lib/ai/utils";
import { cn } from "@/lib/utils";
import { Grid } from "lucide-react";

interface ModelBadgeProps {
  modelId?: string;
  isComparison?: boolean;
  comparisonCount?: number;
  onClick?: () => void;
  className?: string;
}

export function ModelBadge({
  modelId,
  isComparison = false,
  comparisonCount = 0,
  onClick,
  className,
}: ModelBadgeProps) {
  if (isComparison) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onClick}
              className={cn(
                "gap-2 h-7 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 rounded-full transition-colors min-w-0 w-auto font-medium",
                className,
              )}
            >
              <Grid className="w-3 h-3" />
              <span className="hidden sm:inline">
                Comparing {comparisonCount} models
              </span>
              <span className="sm:hidden">{comparisonCount}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Manage comparison models</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!modelId) return null;

  const config = getModelConfig(modelId);
  if (!config) return null;

  const Icon = getModelIcon(modelId as string);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className={cn(
              "gap-2 h-7 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 rounded-full transition-colors min-w-0 w-auto font-medium",
              className,
            )}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline truncate max-w-[200px]">
              {config.name}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Change AI model (⌘J)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
