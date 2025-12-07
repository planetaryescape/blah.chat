"use client";

import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getModelConfig,
  getModelsByProvider,
  type ModelConfig,
} from "@/lib/ai/models";
import { getOllamaModelConfigs } from "@/lib/ai/ollama";
import { cn } from "@/lib/utils";
import { Check, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface QuickModelSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

export function QuickModelSwitcher({
  open,
  onOpenChange,
  currentModel,
  onSelectModel,
}: QuickModelSwitcherProps) {
  const [modelsByProvider, setModelsByProvider] = useState(
    getModelsByProvider(),
  );

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
    onSelectModel(modelId);
    onOpenChange(false);

    // Return focus to chat input after selection
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("focus-chat-input"));
    }, 0);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search models..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No models found.</CommandEmpty>
        {Object.entries(modelsByProvider).map(([provider, models]) => (
          <CommandGroup
            key={provider}
            heading={provider.charAt(0).toUpperCase() + provider.slice(1)}
          >
            {models.map((model: ModelConfig) => {
              const isSelected = currentModel === model.id;
              return (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => handleSelect(model.id)}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <Check
                    className={cn(
                      "w-4 h-4",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    <div className="flex gap-1">
                      {model.reasoning && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 bg-purple-500/10 text-purple-400 border-purple-500/20"
                        >
                          <Zap className="w-2.5 h-2.5 mr-1" />
                          Reasoning
                        </Badge>
                      )}
                      {model.id.includes("pro") && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 bg-amber-500/10 text-amber-500 border-amber-500/20"
                        >
                          <Sparkles className="w-2.5 h-2.5 mr-1" />
                          Pro
                        </Badge>
                      )}
                      {model.capabilities?.includes("vision") && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 bg-blue-500/10 text-blue-400 border-blue-500/20"
                        >
                          Vision
                        </Badge>
                      )}
                      {model.isLocal && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        >
                          Local
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!model.isLocal && (
                    <div className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
                      ${model.pricing.input}/{model.pricing.output}
                    </div>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
