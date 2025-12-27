"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuickModelSwitcher } from "./QuickModelSwitcher";

interface ComparisonTriggerProps {
  onStartComparison: (models: string[]) => void;
  isActive: boolean;
  selectedModels?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ComparisonTrigger({
  onStartComparison,
  isActive,
  selectedModels = [],
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ComparisonTriggerProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            disabled={isActive}
            title="Compare models"
            onClick={() => setOpen(true)}
            className="h-7 text-xs border border-primary/20 bg-primary/2 hover:bg-primary/10 text-primary/80 hover:text-primary/80 cursor-pointer px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5"
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
      <QuickModelSwitcher
        currentModel=""
        onSelectModel={() => {}}
        open={open}
        onOpenChange={setOpen}
        mode="multiple"
        selectedModels={selectedModels}
        onSelectedModelsChange={(models) => {
          onStartComparison(models);
          setOpen(false);
        }}
      />
    </>
  );
}
