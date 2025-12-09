"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/convex/_generated/api";
import { useFavoriteModels } from "@/hooks/useFavoriteModels";
import { sortModels } from "@/lib/ai/sortModels";
import {
  getModelsByProvider,
  type ModelConfig,
} from "@/lib/ai/utils";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { Check, Sparkles, Star, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface QuickModelSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  mode?: "single" | "multiple";
  selectedModels?: string[];
  onSelectedModelsChange?: (models: string[]) => void;
  showTrigger?: boolean;
}

export function QuickModelSwitcher({
  open,
  onOpenChange,
  currentModel,
  onSelectModel,
  mode = "single",
  selectedModels = [],
  onSelectedModelsChange,
  showTrigger = false,
}: QuickModelSwitcherProps) {
  const modelsByProvider = getModelsByProvider();
  const { favorites, toggleFavorite, isFavorite } = useFavoriteModels();
  // @ts-ignore - Convex type instantiation depth issue
  const user = useQuery(api.users.getCurrentUser);

  // Multi-select state
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open && mode === "multiple") {
      setInternalSelected(selectedModels || []);
    }
  }, [open, mode, selectedModels]);

  const allModels = Object.values(modelsByProvider).flat();
  const { defaultModel, favorites: favModels, rest } = sortModels(
    allModels,
    user?.preferences?.defaultModel,
    favorites,
  );

  const restByProvider = rest.reduce(
    (acc, model) => {
      const provider = model.id.split(":")[0];
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, ModelConfig[]>,
  );

  const handleSelect = (modelId: string) => {
    if (mode === "multiple") {
      setInternalSelected((prev) => {
        if (prev.includes(modelId)) {
          return prev.filter((id) => id !== modelId);
        }
        if (prev.length >= 4) {
          toast.error("Maximum 4 models for comparison");
          return prev;
        }
        return [...prev, modelId];
      });
    } else {
      onSelectModel(modelId);
      onOpenChange(false);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("focus-chat-input"));
      }, 0);
    }
  };

  const handleConfirm = () => {
    onSelectedModelsChange?.(internalSelected);
    onOpenChange(false);
  };

  const renderModelItem = (model: ModelConfig, showDefaultBadge = false) => {
    const isSelected =
      mode === "single"
        ? currentModel === model.id
        : internalSelected.includes(model.id);

    return (
      <CommandItem
        key={model.id}
        value={model.id}
        onSelect={() => handleSelect(model.id)}
        className="flex items-center gap-3 px-3 py-2.5"
      >
        <Check
          className={cn("w-4 h-4", isSelected ? "opacity-100" : "opacity-0")}
        />
        <div className="flex-1 flex items-center gap-2">
          <span className="font-medium">{model.name}</span>
          <div className="flex gap-1">
            {showDefaultBadge && (
              <Badge className="bg-primary text-primary-foreground text-[10px] h-5">
                Default
              </Badge>
            )}
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
            {model.isExperimental && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 bg-orange-500/10 text-orange-400 border-orange-500/20"
              >
                Experimental
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {!model.isLocal && (
            <div className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
              ${model.pricing.input}/{model.pricing.output}
            </div>
          )}
          <Star
            className={cn(
              "h-4 w-4 cursor-pointer",
              isFavorite(model.id)
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground/40",
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(model.id);
            }}
          />
        </div>
      </CommandItem>
    );
  };

  return (
    <>
      {/* Trigger Button (optional) */}
      {showTrigger && (
        <Button
          variant="ghost"
          onClick={() => onOpenChange(true)}
          className="h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5"
        >
          <span className="max-w-[120px] truncate">
            {allModels.find((m) => m.id === currentModel)?.name || "Select model"}
          </span>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Search models..." />

      {/* Multi-select chips */}
      {mode === "multiple" && internalSelected.length > 0 && (
        <div className="flex gap-2 px-3 py-2 border-b flex-wrap">
          {internalSelected.map((id) => {
            const model = allModels.find((m) => m.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {model?.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setInternalSelected((prev) =>
                      prev.filter((i) => i !== id),
                    );
                  }}
                />
              </Badge>
            );
          })}
        </div>
      )}

      <CommandList className="max-h-[400px]">
        <CommandEmpty>No models found.</CommandEmpty>

        {/* Default Model */}
        {defaultModel && (
          <CommandGroup heading="Default">
            {renderModelItem(defaultModel, true)}
          </CommandGroup>
        )}

        {/* Favorites */}
        {favModels.length > 0 && (
          <CommandGroup heading="Favorites">
            {favModels.map((model) => renderModelItem(model))}
          </CommandGroup>
        )}

        {(defaultModel || favModels.length > 0) && <CommandSeparator />}

        {/* Rest by provider */}
        {Object.entries(restByProvider).map(([provider, models]) => (
          <CommandGroup
            key={provider}
            heading={provider.charAt(0).toUpperCase() + provider.slice(1)}
          >
            {models.map((model) => renderModelItem(model))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer for multi-select */}
      {mode === "multiple" && (
        <div className="border-t p-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {internalSelected.length}/4 selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={internalSelected.length === 0}
              size="sm"
            >
              Compare Models
            </Button>
          </div>
        </div>
      )}
    </CommandDialog>
    </>
  );
}
