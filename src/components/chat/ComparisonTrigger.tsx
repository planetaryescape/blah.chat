"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { ModelSelector } from "./ModelSelector";

interface ComparisonTriggerProps {
  onStartComparison: (models: string[]) => void;
  isActive: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ComparisonTrigger({
  onStartComparison,
  isActive,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ComparisonTriggerProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  return (
    <ModelSelector
      open={open}
      onOpenChange={setOpen}
      mode="multiple"
      title="Select Models"
      description="Choose 2 to 4 models to compare side-by-side."
      onSelectedModelsChange={(models) => {
        onStartComparison(models);
        setOpen(false);
      }}
      trigger={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              disabled={isActive}
              title="Compare models"
              onClick={() => setOpen(true)}
              className="h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5"
              data-tour="comparison"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Compare models</p>
          </TooltipContent>
        </Tooltip>
      }
    />
  );
}
