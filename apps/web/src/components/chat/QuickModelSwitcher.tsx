"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import commandScore from "command-score";
import { useQuery } from "convex/react";
import { ChevronRight, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useFavoriteModels } from "@/hooks/useFavoriteModels";
import { useRecentModels } from "@/hooks/useRecentModels";
import { useUserPreference } from "@/hooks/useUserPreference";
import { MODEL_CATEGORIES } from "@/lib/ai/categories";
import { sortModels } from "@/lib/ai/sortModels";
import { getModelsByProvider, type ModelConfig } from "@/lib/ai/utils";
import { analytics } from "@/lib/analytics";
import { useApiKeyValidation } from "@/lib/hooks/useApiKeyValidation";
import {
  DEFAULT_CONTEXT_WINDOW,
  formatTokens,
} from "@/lib/utils/formatMetrics";
import { CategorySidebar } from "./CategorySidebar";
import { ModelSelectorItem } from "./ModelSelectorItem";
import { SelectedModelsChips } from "./SelectedModelsChips";
import { UpgradeRequestDialog } from "./UpgradeRequestDialog";

interface QuickModelSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  mode?: "single" | "multiple";
  selectedModels?: string[];
  onSelectedModelsChange?: (models: string[]) => void;
  showTrigger?: boolean;
  /** Current token usage for context limit checking */
  currentTokenUsage?: number;
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
  currentTokenUsage,
}: QuickModelSwitcherProps) {
  const modelsByProvider = getModelsByProvider();
  const { favorites, toggleFavorite, isFavorite } = useFavoriteModels();
  const { recents, addRecent } = useRecentModels();
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const proAccess = useQuery(api.adminSettings.getProModelAccess);

  const prefDefaultModel = useUserPreference("defaultModel");

  // BYOK check for OpenRouter models
  const { isModelDisabledByByok, getByokModelDisabledMessage } =
    useApiKeyValidation();

  // Pro model detection (explicit flag OR price threshold)
  const isProModel = (model: ModelConfig) =>
    model.isPro === true ||
    (model.pricing?.input ?? 0) >= 5 ||
    (model.pricing?.output ?? 0) >= 15;

  // Check if model is disabled due to missing BYOK key
  const isDisabledDueToByok = (model: ModelConfig) =>
    isModelDisabledByByok(model.gateway || "");

  // Check if current context exceeds model's context window
  const isContextExceeded = (model: ModelConfig) =>
    currentTokenUsage !== undefined &&
    currentTokenUsage > (model.contextWindow ?? DEFAULT_CONTEXT_WINDOW);

  // Check if a pro model is disabled (user can't use it)
  const isModelDisabled = (model: ModelConfig) =>
    (isProModel(model) && proAccess && !proAccess.canUse) ||
    isDisabledDueToByok(model) ||
    isContextExceeded(model);

  // Multi-select state
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

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

  // Filter models by active category (pro models shown but may be disabled)
  const filteredModels = useMemo(() => {
    const category = MODEL_CATEGORIES.find((c) => c.id === activeCategory);

    // Apply category filter only
    if (category && category.id !== "all") {
      return {
        defaultModel:
          defaultModel && category.filter(defaultModel)
            ? defaultModel
            : undefined,
        favorites: favModels.filter(category.filter),
        recents: recentModels.filter(category.filter),
        rest: rest.filter(category.filter),
      };
    }

    return {
      defaultModel,
      favorites: favModels,
      recents: recentModels,
      rest,
    };
  }, [activeCategory, defaultModel, favModels, recentModels, rest]);

  const restByProvider = filteredModels.rest.reduce(
    (acc, model) => {
      // Use model.provider (actual vendor) instead of gateway prefix
      const provider = model.provider;
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

  // Handle click on disabled models (BYOK, pro restriction, or context exceeded)
  const handleDisabledClick = useCallback(
    (model: ModelConfig) => {
      if (isContextExceeded(model)) {
        toast.error(
          `Current context (${formatTokens(currentTokenUsage!)}) exceeds ${model.name}'s limit (${formatTokens(model.contextWindow)})`,
        );
      } else if (isDisabledDueToByok(model)) {
        const message = getByokModelDisabledMessage(model.gateway || "");
        toast.error(message || "This model requires an API key");
      } else {
        setUpgradeDialogOpen(true);
      }
    },
    [
      isContextExceeded,
      currentTokenUsage,
      isDisabledDueToByok,
      getByokModelDisabledMessage,
    ],
  );

  const renderModelItem = (model: ModelConfig, showDefaultBadge = false) => {
    const disabled = isModelDisabled(model);

    return (
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
        onSelect={disabled ? () => handleDisabledClick(model) : handleSelect}
        onToggleFavorite={toggleFavorite}
        isPro={isProModel(model)}
        proAccessRemaining={
          isProModel(model) && proAccess
            ? (proAccess.remainingDaily ?? proAccess.remainingMonthly ?? null)
            : null
        }
        isDisabled={disabled}
      />
    );
  };

  return (
    <>
      {/* Trigger Button (optional) */}
      {showTrigger && (
        <Button
          variant="ghost"
          onClick={() => onOpenChange(true)}
          className="h-8 px-2.5 text-sm font-medium bg-transparent hover:bg-muted/50 border-0 transition-all group gap-1.5 min-w-0"
        >
          <span className="truncate max-w-[120px] text-muted-foreground group-hover:text-foreground transition-colors">
            {mode === "single"
              ? allModels.find((m) => m.id === currentModel)?.name ||
                "Select model"
              : `${internalSelected.length} models`}
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground rotate-90 transition-all" />
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

            {proAccess && !proAccess.canUse && (
              <div className="p-3 border-t text-center">
                <button
                  type="button"
                  onClick={() => setUpgradeDialogOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Request pro model access →
                </button>
              </div>
            )}
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

      <UpgradeRequestDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentTier={proAccess?.tier || "free"}
      />
    </>
  );
}
