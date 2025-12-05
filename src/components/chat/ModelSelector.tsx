"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getModelConfig,
  getModelsByProvider,
  type ModelConfig,
} from "@/lib/ai/models";
import { getOllamaModelConfigs } from "@/lib/ai/ollama";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ModelSelector({
  value,
  onChange,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modelsByProvider, setModelsByProvider] = useState(
    getModelsByProvider(),
  );
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

  // Filter models based on search
  const filteredModelsByProvider = Object.entries(modelsByProvider).reduce(
    (acc, [provider, models]) => {
      const filtered = models.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.provider.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (filtered.length > 0) {
        acc[provider] = filtered;
      }
      return acc;
    },
    {} as Record<string, ModelConfig[]>,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          data-model-selector
          className={cn(
            "h-6 text-[10px] border-none bg-transparent hover:bg-white/5 px-2 min-w-0 w-auto gap-1 text-muted-foreground/80 hover:text-foreground transition-colors",
            className,
          )}
        >
          <span className="truncate font-medium">
            {currentModel?.name || "Select model"}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-background/95 backdrop-blur-xl border-white/10 p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/5 flex-shrink-0 space-y-4">
          <DialogTitle className="font-display text-2xl">
            Select Model
          </DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-white/5 focus-visible:ring-primary/20"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="space-y-8">
            {Object.entries(filteredModelsByProvider).map(
              ([provider, models]) => {
                return (
                  <div key={provider} className="relative">
                    <h3 className="sticky top-0 z-10 bg-background/95 backdrop-blur-md py-2 -mt-2 mb-4 font-display text-lg font-medium capitalize text-foreground flex items-center gap-2 border-b border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {provider}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {models.map((model: any) => (
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
              },
            )}
            {Object.keys(filteredModelsByProvider).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No models found matching "{searchQuery}"
              </div>
            )}
          </div>
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
        "group relative w-full flex flex-col items-start gap-3 p-4 rounded-xl transition-all duration-300 text-left",
        "border border-white/5",
        isSelected
          ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)]"
          : "bg-surface-glass hover:bg-surface-glass-strong hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5",
      )}
    >
      <div className="w-full flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-display text-lg font-bold tracking-tight transition-colors",
              isSelected
                ? "text-primary"
                : "text-foreground group-hover:text-primary/90",
            )}
          >
            {model.name}
          </span>

          {model.supportsThinkingEffort && (
            <div
              className="p-1 rounded-full bg-purple-500/10 text-purple-400"
              title="Supports Thinking"
            >
              <Zap className="w-3 h-3" />
            </div>
          )}

          {/* New/Beta Badge Example - could be dynamic based on model props */}
          {model.id.includes("gpt-5") && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
              New
            </span>
          )}
        </div>

        {isSelected && (
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground shadow-glow animate-in zoom-in duration-200">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>

      {model.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-muted-foreground/80 transition-colors">
          {model.description}
        </p>
      )}

      <div className="mt-auto pt-3 w-full flex items-center justify-between text-xs text-muted-foreground/60 font-medium border-t border-white/5 group-hover:border-white/10 transition-colors">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-current opacity-50" />
            {model.contextWindow.toLocaleString()} ctx
          </span>
          {model.isLocal && (
            <span className="text-green-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-current" />
              Local
            </span>
          )}
        </div>

        {!model.isLocal && (
          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
            ${model.pricing.input}/{model.pricing.output}
          </div>
        )}
      </div>
    </button>
  );
}
