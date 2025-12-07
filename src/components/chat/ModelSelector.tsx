"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getModelConfig,
  getModelsByProvider,
  type ModelConfig,
} from "@/lib/ai/models";
import { getOllamaModelConfigs } from "@/lib/ai/ollama";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, ChevronDown, Search, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  selectedModels?: string[];
  onSelectedModelsChange?: (models: string[]) => void;
  mode?: "single" | "multiple";
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  title?: string;
  description?: string;
}

export function ModelSelector({
  value,
  onChange,
  selectedModels = [],
  onSelectedModelsChange,
  mode = "single",
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  className,
  title = "Select Model",
  description,
}: ModelSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [searchQuery, setSearchQuery] = useState("");
  const [modelsByProvider, setModelsByProvider] = useState(
    getModelsByProvider(),
  );

  // Internal state for multiple selection
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  // Reset internal state when opening/changing props
  useEffect(() => {
    if (open && mode === "multiple") {
      setInternalSelected(selectedModels);
    }
  }, [open, mode, selectedModels]);

  const currentModel = value ? getModelConfig(value) : null;

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
    if (mode === "single") {
      onChange?.(modelId);
      setOpen?.(false);
    } else {
      setInternalSelected((prev) => {
        if (prev.includes(modelId)) {
          return prev.filter((id) => id !== modelId);
        }
        if (prev.length >= 4) return prev; // Max 4 models
        return [...prev, modelId];
      });
    }
  };

  const handleConfirm = () => {
    onSelectedModelsChange?.(internalSelected);
    setOpen?.(false);
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

  const estimatedCost = internalSelected.length * 0.005; // Rough estimate

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                data-model-selector
                data-tour="model-selector"
                className={cn(
                  "h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5",
                  className,
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate hidden sm:inline">
                  {currentModel?.name || "Select model"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select model (⌘J)</p>
          </TooltipContent>
        </Tooltip>
      )}
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-background/80 backdrop-blur-xl border-white/10 p-0 gap-0 overflow-hidden shadow-2xl sm:rounded-2xl ring-1 ring-white/10">
        <DialogHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-white/5 flex-shrink-0 space-y-3 sm:space-y-4 bg-background/50">
          <div className="flex flex-col gap-1 sm:gap-1.5 pr-8 sm:pr-0">
            <DialogTitle
              id="model-selector-title"
              className="font-display text-lg sm:text-2xl font-semibold tracking-tight"
            >
              {title}
            </DialogTitle>
            {description && (
              <p
                id="model-selector-desc"
                className="text-xs sm:text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          <div className="relative group">
            <label htmlFor="model-search" className="sr-only">
              Search models by name or description
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-focus-within:text-primary transition-colors"
              aria-hidden="true"
            />
            <Input
              id="model-search"
              type="search"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search AI models"
              aria-controls="model-list"
              className="pl-9 h-9 sm:h-10 bg-secondary/50 border-transparent focus:bg-background text-sm sm:text-base focus:border-primary/20 transition-all duration-200"
            />
          </div>
        </DialogHeader>

        <div
          id="model-list"
          role="region"
          aria-labelledby="model-selector-title"
          className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-gradient-to-b from-background/50 to-background/80"
        >
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {Object.entries(filteredModelsByProvider).map(
              ([provider, models], pIdx) => {
                return (
                  <motion.div
                    key={provider}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pIdx * 0.05, duration: 0.3 }}
                    className="relative"
                  >
                    <h3 className="sticky top-0 z-10 bg-background/95 backdrop-blur-md py-2 -mt-2 mb-3 sm:mb-4 font-display text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-white/5">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      {provider}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {models.map((model: any, mIdx) => {
                        const isSelected =
                          mode === "single"
                            ? value === model.id
                            : internalSelected.includes(model.id);

                        return (
                          <ModelCard
                            key={model.id}
                            model={model}
                            isSelected={isSelected}
                            onSelect={() => handleSelect(model.id)}
                            disabled={
                              mode === "multiple" &&
                              !isSelected &&
                              internalSelected.length >= 4
                            }
                            index={mIdx}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                );
              },
            )}
            {Object.keys(filteredModelsByProvider).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground text-sm sm:text-base">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 opacity-20 mb-3 sm:mb-4" />
                <p>No models found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {mode === "multiple" && (
          <div className="p-3 sm:p-4 border-t border-white/5 bg-background/80 backdrop-blur-xl flex items-center justify-between flex-shrink-0 z-20 relative">
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              Estimated cost:{" "}
              <span className="font-mono text-foreground font-medium">
                ~${estimatedCost.toFixed(3)}
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => setOpen?.(false)}
                className="flex-1 sm:flex-none hover:bg-white/5 h-9 sm:h-10 text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={internalSelected.length < 2}
                className="flex-1 sm:flex-none shadow-lg shadow-primary/20 h-9 sm:h-10 text-xs sm:text-sm"
              >
                Compare {internalSelected.length} Models
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModelCard({
  model,
  isSelected,
  onSelect,
  disabled,
  index,
}: {
  model: ModelConfig;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative w-full flex flex-col items-start gap-3 p-4 rounded-xl text-left border transition-all duration-300",
        isSelected
          ? "bg-primary/5 border-primary/40 shadow-[0_0_20px_-10px_rgba(var(--primary),0.3)] ring-1 ring-primary/20 cursor-default"
          : "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-lg cursor-pointer",
        disabled && "opacity-40 cursor-not-allowed grayscale",
      )}
    >
      <div className="w-full flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "font-display text-base font-semibold tracking-tight transition-colors",
              isSelected
                ? "text-primary"
                : "text-foreground group-hover:text-primary/90",
            )}
          >
            {model.name}
          </span>

          <div className="flex gap-1">
            {model.reasoning && (
              <div
                className="flex items-center justify-center p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20"
                title="Supports Thinking"
              >
                <Zap className="w-2.5 h-2.5" />
              </div>
            )}
            {model.id.includes("pro") && (
              <div
                className="flex items-center justify-center p-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20"
                title="Pro Model"
              >
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          {model.id.includes("gpt-5") && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-wider border border-blue-500/20 shadow-[0_0_10px_-4px_rgba(59,130,246,0.5)]">
              New
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300",
            isSelected
              ? "bg-primary border-primary text-primary-foreground scale-100"
              : "border-white/10 bg-white/5 scale-90 opacity-0 group-hover:opacity-100",
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </div>
      </div>

      {model.description && (
        <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed group-hover:text-muted-foreground transition-colors">
          {model.description}
        </p>
      )}

      <div className="mt-auto pt-3 w-full flex items-center justify-between text-[10px] text-muted-foreground/60 font-medium border-t border-white/5 group-hover:border-white/10 transition-colors uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>{model.contextWindow.toLocaleString()} ctx</span>
          {model.isLocal && (
            <span className="text-emerald-400/80 flex items-center gap-1">
              • Local
            </span>
          )}
        </div>

        {!model.isLocal && (
          <div className="tabular-nums opacity-60 group-hover:opacity-100 transition-opacity">
            ${model.pricing.input}/{model.pricing.output}
          </div>
        )}
      </div>
    </motion.button>
  );
}
