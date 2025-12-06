"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { ModelSelector } from "./ModelSelector";

interface ComparisonTriggerProps {
  onStartComparison: (models: string[]) => void;
  isActive: boolean;
}

export function ComparisonTrigger({
  onStartComparison,
  isActive,
}: ComparisonTriggerProps) {
  const [open, setOpen] = useState(false);

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
        <Button
          variant="ghost"
          disabled={isActive}
          title="Compare models"
          onClick={() => setOpen(true)}
          className="h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compare</span>
        </Button>
      }
    />
  );
}
