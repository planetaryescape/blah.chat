"use client";

import { ModelIcon } from "@/components/brand/ModelIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { Check, Info, Sparkles, Zap } from "lucide-react";
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
  const availableModels = Object.values(MODEL_CONFIG).filter(
    (m) => !m.isLocal,
  );

  return (
    <div className="flex flex-col h-[60vh] md:h-auto">
      <div className="px-6 py-4 bg-muted/20 border-b border-white/5 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Selected: <span className="text-foreground font-medium">{selected.length}/4</span>
          </span>
          <span className="text-muted-foreground">
            Est. Cost: <span className="font-mono text-foreground">~${estimatedCost.toFixed(3)}</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground/60">
          Pick at least 2 models to compare.
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableModels.map((model) => {
            const isSelected = selected.includes(model.id);
            const isDisabled = !isSelected && selected.length >= 4;

            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                disabled={isDisabled}
                className={cn(
                  "relative group flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-200",
                  isSelected
                    ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20"
                    : "bg-card border-border hover:border-primary/30 hover:bg-muted/50",
                  isDisabled && "opacity-50 cursor-not-allowed grayscale",
                )}
              >
                <div className="w-full flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ModelIcon modelId={model.id} className="w-5 h-5 flex-shrink-0 opacity-80" />
                    <div className="font-medium text-sm leading-tight">
                      {model.name}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mt-1">
                  {model.capabilities.includes("vision") && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] gap-1 font-normal bg-blue-500/10 text-blue-400 border-blue-500/20">
                      <Info className="w-3 h-3" />
                      Vision
                    </Badge>
                  )}
                  {model.capabilities.includes("thinking") && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] gap-1 font-normal bg-purple-500/10 text-purple-400 border-purple-500/20">
                      <Zap className="w-3 h-3" />
                      Think
                    </Badge>
                  )}
                  {model.id.includes("gpt-5") && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] gap-1 font-normal bg-amber-500/10 text-amber-400 border-amber-500/20">
                      <Sparkles className="w-3 h-3" />
                      New
                    </Badge>
                  )}
                </div>

                <div className="w-full pt-2 mt-auto border-t border-dashed border-border/50 text-[10px] text-muted-foreground flex justify-between items-center">
                   <span>{model.contextWindow.toLocaleString()} ctx</span>
                   <span className="font-mono">${model.pricing.input}/{model.pricing.output}</span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/5 bg-background/50 backdrop-blur flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(selected)}
          disabled={!canConfirm}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          Compare Models
        </Button>
      </div>
    </div>
  );
}
