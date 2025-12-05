"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { useState } from "react";

interface ComparisonModelSelectorProps {
  onConfirm: (models: string[]) => void;
  onCancel: () => void;
}

export function ComparisonModelSelector({
  onConfirm,
  onCancel,
}: ComparisonModelSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleModel = (modelId: string) => {
    setSelected((prev) =>
      prev.includes(modelId)
        ? prev.filter((m) => m !== modelId)
        : [...prev, modelId],
    );
  };

  const estimatedCost = selected.length * 0.005; // Rough estimate

  const canConfirm = selected.length >= 2 && selected.length <= 4;

  // Get available models from config
  const availableModels = Object.values(MODEL_CONFIG).filter((m) => !m.isLocal);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-medium mb-2">Select 2-4 models to compare</h3>
        <p className="text-sm text-muted-foreground">
          Estimated cost: ~${estimatedCost.toFixed(3)}
        </p>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {availableModels.map((model) => (
          <div
            key={model.id}
            className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
          >
            <Checkbox
              id={model.id}
              checked={selected.includes(model.id)}
              onCheckedChange={() => toggleModel(model.id)}
              disabled={!selected.includes(model.id) && selected.length >= 4}
            />
            <Label
              htmlFor={model.id}
              className="flex-1 cursor-pointer flex items-center justify-between"
            >
              <span>{model.name}</span>
              <div className="flex gap-1">
                {model.capabilities.includes("vision") && (
                  <Badge variant="secondary">Vision</Badge>
                )}
                {model.capabilities.includes("thinking") && (
                  <Badge variant="secondary">Thinking</Badge>
                )}
              </div>
            </Label>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(selected)}
          disabled={!canConfirm}
          className="flex-1"
        >
          Compare {selected.length} models
        </Button>
      </div>
    </div>
  );
}
