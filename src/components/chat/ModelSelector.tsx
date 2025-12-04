"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, ChevronDown, Zap } from "lucide-react";
import { getModelsByProvider, getModelConfig, type ModelConfig } from "@/lib/ai/models";
import { getOllamaModelConfigs } from "@/lib/ai/ollama";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [modelsByProvider, setModelsByProvider] = useState(getModelsByProvider());
  const currentModel = getModelConfig(value);

  // Load Ollama models dynamically
  useEffect(() => {
    async function loadOllamaModels() {
      const ollamaConfigs = await getOllamaModelConfigs();
      if (Object.keys(ollamaConfigs).length > 0) {
        setModelsByProvider((prev) => ({
          ...prev,
          ollama: Object.values(ollamaConfigs),
        }));
      }
    }
    loadOllamaModels();
  }, []);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          data-model-selector
          className={cn("justify-between min-w-[200px]", className)}
        >
          <span className="truncate">{currentModel?.name || "Select model"}</span>
          <ChevronDown className="w-4 h-4 ml-2 opacity-50 flex-shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Select Model</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 min-h-0">
          {Object.entries(modelsByProvider).map(([provider, models]) => {
            if (models.length === 0) return null;

            return (
              <div key={provider}>
                <h3 className="font-semibold mb-3 capitalize text-sm text-muted-foreground">
                  {provider}
                </h3>
                <div className="space-y-2">
                  {models.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isSelected={value === model.id}
                      onSelect={() => handleSelect(model.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelCard({
  model,
  isSelected,
  onSelect,
}: {
  model: ModelConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary transition-colors text-left",
        isSelected && "border-primary bg-accent"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{model.name}</span>

          {model.isLocal && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
              Local
            </Badge>
          )}

          {model.supportsThinkingEffort && (
            <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
              <Zap className="w-3 h-3 mr-1" />
              Thinking
            </Badge>
          )}

          {isSelected && <Check className="w-4 h-4 text-primary ml-auto" />}
        </div>

        {model.description && (
          <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
          <span>{model.contextWindow.toLocaleString()} tokens</span>
          {!model.isLocal && (
            <span>
              ${model.pricing.input} / ${model.pricing.output} per 1M
            </span>
          )}
          {model.isLocal && <span className="text-green-600 font-medium">Free</span>}
        </div>

        {model.capabilities.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {model.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
