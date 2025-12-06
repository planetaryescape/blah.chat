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
          size="icon"
          variant={isActive ? "default" : "ghost"}
          disabled={isActive}
          title="Compare models"
          onClick={() => setOpen(true)}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
      }
    />
  );
}
