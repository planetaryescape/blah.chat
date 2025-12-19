"use client";

import commandScore from "command-score";
import { useQuery } from "convex/react";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/convex/_generated/api";
import { useFavoriteModels } from "@/hooks/useFavoriteModels";
import { useRecentModels } from "@/hooks/useRecentModels";
import { useUserPreference } from "@/hooks/useUserPreference";
import { MODEL_CATEGORIES } from "@/lib/ai/categories";
import { sortModels } from "@/lib/ai/sortModels";
import { getModelsByProvider, type ModelConfig } from "@/lib/ai/utils";
import { analytics } from "@/lib/analytics";
import { CategorySidebar } from "./CategorySidebar";
import { ModelSelectorItem } from "./ModelSelectorItem";
import { SelectedModelsChips } from "./SelectedModelsChips";

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
  const { recents, addRecent } = useRecentModels();
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const _user = useQuery(api.users.getCurrentUser);

  const prefDefaultModel = useUserPreference("defaultModel");

  // Multi-select state
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Track previous open state
  const prevOpenRef = useRef(open);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened && mode === "multiple") {
      setInternalSelected(selectedModels || []);
    }

    if (justOpened) {
      analytics.track("quick_switcher_opened", { mode, currentModel });
    }
  }, [open, mode, selectedModels, currentModel]);

  const allModels = Object.values(modelsByProvider).flat();
  const {
    defaultModel,
    favorites: favModels,
    recents: recentModels,
    rest,
  } = sortModels(allModels, prefDefaultModel, favorites, recents);

  // Filter models by active category
  const filteredModels = useMemo(() => {
    const category = MODEL_CATEGORIES.find((c) => c.id === activeCategory);
    if (!category || category.id === "all") {
      return {
        defaultModel,
        favorites: favModels,
        recents: recentModels,
        rest,
      };
    }

    return {
      defaultModel:
        defaultModel && category.filter(defaultModel)
          ? defaultModel
          : undefined,
      favorites: favModels.filter(category.filter),
      recents: recentModels.filter(category.filter),
      rest: rest.filter(category.filter),
    };
  }, [activeCategory, defaultModel, favModels, recentModels, rest]);

  const restByProvider = filteredModels.rest.reduce(
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
      addRecent(modelId);
      onSelectModel(modelId);
      onOpenChange(false);

      analytics.track("model_selected", {
        model: modelId,
        previousModel: currentModel,
        source: "quick_switcher",
      });

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("focus-chat-input"));
      }, 0);
    }
  };

  const handleConfirm = () => {
    if (internalSelected.length < 2) {
      toast.error("Select at least 2 models to compare");
      return;
    }
    onSelectedModelsChange?.(internalSelected);
    onOpenChange(false);

    analytics.track("comparison_models_selected", {
      modelCount: internalSelected.length,
      models: internalSelected.join(","),
    });
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    analytics.track("category_filter_changed", { category, mode });
  };

  const renderModelItem = (model: ModelConfig, showDefaultBadge = false) => (
    <ModelSelectorItem
      key={model.id}
      model={model}
      isSelected={
        mode === "single"
          ? currentModel === model.id
          : internalSelected.includes(model.id)
      }
      isFavorite={isFavorite(model.id)}
      mode={mode}
      showDefaultBadge={showDefaultBadge}
      activeCategory={activeCategory}
      onSelect={handleSelect}
      onToggleFavorite={toggleFavorite}
    />
  );

  return (
    <>
      {/* Trigger Button (optional) */}
      {showTrigger && (
        <Button
          variant="outline"
          onClick={() => onOpenChange(true)}
          className="h-9 px-3 text-sm font-medium bg-background/50 backdrop-blur-sm border-border/50 hover:bg-accent/50 hover:border-accent transition-all group gap-2 min-w-0"
        >
          <span className="truncate max-w-[140px] text-foreground/90 group-hover:text-foreground">
            {mode === "single"
              ? allModels.find((m) => m.id === currentModel)?.name ||
                "Select model"
              : `${internalSelected.length} models selected`}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground rotate-90 transition-transform" />
        </Button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        commandProps={{
          filter: (value, search, keywords) => {
            const extendValue = `${value} ${keywords?.join(" ") || ""}`;
            return commandScore(extendValue, search);
          },
        }}
        className="max-w-[95vw] md:max-w-4xl h-[85vh] md:h-[600px] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl"
      >
        <div className="flex items-center border-b px-4 py-3 shrink-0">
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <CommandInput
            placeholder={`Search ${activeCategory === "all" ? "" : `${activeCategory} `}models...`}
            className="flex-1 h-9 bg-transparent border-0 ring-0 focus:ring-0 text-sm"
          />
        </div>

        <div className="flex h-[500px] overflow-hidden">
          <CategorySidebar
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            allModels={allModels}
          />

          <div className="flex-1 flex flex-col min-w-0 bg-background/50">
            {mode === "multiple" && (
              <SelectedModelsChips
                selectedIds={internalSelected}
                allModels={allModels}
                onRemove={(id) =>
                  setInternalSelected((prev) => prev.filter((i) => i !== id))
                }
              />
            )}

            <CommandList className="max-h-[600px] overflow-y-auto p-2">
              <CommandEmpty>No models found.</CommandEmpty>

              {filteredModels.defaultModel && (
                <CommandGroup heading="Default">
                  {renderModelItem(filteredModels.defaultModel, true)}
                </CommandGroup>
              )}

              {filteredModels.favorites.length > 0 && (
                <CommandGroup heading="Favorites">
                  {filteredModels.favorites.map((model) =>
                    renderModelItem(model),
                  )}
                </CommandGroup>
              )}

              {filteredModels.recents.length > 0 && (
                <CommandGroup heading="Recent">
                  {filteredModels.recents.map((model) =>
                    renderModelItem(model),
                  )}
                </CommandGroup>
              )}

              {(filteredModels.defaultModel ||
                filteredModels.favorites.length > 0 ||
                filteredModels.recents.length > 0) && <CommandSeparator />}

              {Object.entries(restByProvider).map(([provider, models]) => (
                <CommandGroup
                  key={provider}
                  heading={provider.charAt(0).toUpperCase() + provider.slice(1)}
                  className="px-2"
                >
                  {models.map((model) => renderModelItem(model))}
                </CommandGroup>
              ))}
            </CommandList>
          </div>
        </div>

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
                disabled={internalSelected.length < 2}
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
