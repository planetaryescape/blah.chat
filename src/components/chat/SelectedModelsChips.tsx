"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelConfig } from "@/lib/ai/utils";
import { X } from "lucide-react";

interface SelectedModelsChipsProps {
  selectedIds: string[];
  allModels: ModelConfig[];
  onRemove: (modelId: string) => void;
}

/**
 * Chips showing selected models in multi-select mode.
 */
export function SelectedModelsChips({
  selectedIds,
  allModels,
  onRemove,
}: SelectedModelsChipsProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex gap-2 px-3 py-2 border-b flex-wrap bg-background/50 backdrop-blur-sm">
      {selectedIds.map((id) => {
        const model = allModels.find((m) => m.id === id);
        return (
          <Badge
            key={id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-1 h-7"
          >
            {model?.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
              onClick={() => onRemove(id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        );
      })}
    </div>
  );
}
