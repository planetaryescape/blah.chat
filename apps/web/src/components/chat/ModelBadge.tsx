"use client";

import { getModelConfig } from "@blah-chat/ai/utils";
import { Grid } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getModelIcon } from "@/lib/ai/icons";
import { cn } from "@/lib/utils";

interface ModelBadgeProps {
  modelId?: string;
  isComparison?: boolean;
  comparisonCount?: number;
  onClick?: () => void;
  className?: string;
}

const BADGE_CLASSES =
  "gap-2 h-7 text-xs border-primary/20 bg-primary/2 hover:bg-primary/10 px-3 rounded-md transition-colors min-w-0 w-auto font-medium text-primary/80 hover:text-primary/80 cursor-pointer";

function ComparisonBadge({
  comparisonCount,
  onClick,
  className,
}: Pick<ModelBadgeProps, "comparisonCount" | "onClick" | "className">) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      title="Manage comparison models"
      className={cn(BADGE_CLASSES, className)}
    >
      <Grid className="w-3 h-3" />
      <span className="hidden sm:inline">
        Comparing {comparisonCount} models
      </span>
      <span className="sm:hidden">{comparisonCount}</span>
    </Button>
  );
}

function ModelBadgeImpl({
  modelId,
  onClick,
  className,
}: Required<Pick<ModelBadgeProps, "modelId">> &
  Pick<ModelBadgeProps, "onClick" | "className">) {
  const config = getModelConfig(modelId);
  const Icon = useMemo(() => getModelIcon(modelId), [modelId]);

  if (!config) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      title="Change AI model (⌘J)"
      className={cn(BADGE_CLASSES, className)}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline truncate max-w-[200px]">
        {config.name}
      </span>
    </Button>
  );
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
      <ComparisonBadge
        comparisonCount={comparisonCount}
        onClick={onClick}
        className={className}
      />
    );
  }
  if (!modelId) return null;
  return (
    <ModelBadgeImpl modelId={modelId} onClick={onClick} className={className} />
  );
}
