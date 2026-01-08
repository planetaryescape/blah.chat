"use client";

import { Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModelIcon } from "@/lib/ai/icons";
import { getModelConfig } from "@/lib/ai/utils";
import { cn } from "@/lib/utils";

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
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        title="Manage comparison models"
        className={cn(
          "gap-2 h-7 text-xs border-primary/20 bg-primary/2 hover:bg-primary/10 px-3 rounded-md transition-colors min-w-0 w-auto font-medium text-primary/80 hover:text-primary/80 cursor-pointer",
          className
        )}
      >
        <Grid className="w-3 h-3" />
        <span className="hidden sm:inline">
          Comparing {comparisonCount} models
        </span>
        <span className="sm:hidden">{comparisonCount}</span>
      </Button>
    );
  }

  if (!modelId) return null;

  const config = getModelConfig(modelId);
  if (!config) return null;

  const Icon = getModelIcon(modelId as string);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      title="Change AI model (⌘J)"
      className={cn(
        "gap-2 h-7 text-xs border-primary/20 bg-primary/2 hover:bg-primary/10 px-3 rounded-md transition-colors min-w-0 w-auto font-medium text-primary/80 hover:text-primary/80 cursor-pointer",
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline truncate max-w-[200px]">
        {config.name}
      </span>
    </Button>
  );
}
