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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { api } from "@/convex/_generated/api";
import { useFavoriteModels } from "@/hooks/useFavoriteModels";
import { useRecentModels } from "@/hooks/useRecentModels";
import { useUserPreference } from "@/hooks/useUserPreference";
import {
  MODEL_CATEGORIES,
  countModelsInCategory,
  getModelCategories,
} from "@/lib/ai/categories";
import { sortModels } from "@/lib/ai/sortModels";
import { getModelsByProvider, type ModelConfig } from "@/lib/ai/utils";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import commandScore from "command-score";
import { useQuery } from "convex/react";
import { Check, ChevronRight, Search, Star, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ModelDetailCard } from "./ModelDetailCard";

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
  const user = useQuery(api.users.getCurrentUser);

  // Phase 4: Use new preference hook
  const prefDefaultModel = useUserPreference("defaultModel");

  // Multi-select state
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  // Category filtering state
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Track previous open state to detect when dialog is opened
  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Only sync internal state when dialog is first opened (not on every render)
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened && mode === "multiple") {
      setInternalSelected(selectedModels || []);
    }

    // Track quick switcher opened
    if (justOpened) {
      analytics.track("quick_switcher_opened", {
        mode,
        currentModel,
      });
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

      // Track model selection
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
    onSelectedModelsChange?.(internalSelected);
    onOpenChange(false);

    // Track comparison models selection
    analytics.track("comparison_models_selected", {
      modelCount: internalSelected.length,
      models: internalSelected.join(","),
    });
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);

    // Track category selection
    analytics.track("category_filter_changed", {
      category,
      mode,
    });
  };

  const renderModelItem = (model: ModelConfig, showDefaultBadge = false) => {
    const isSelected =
      mode === "single"
        ? currentModel === model.id
        : internalSelected.includes(model.id);

    // Get model categories (only for "All" view)
    const categories =
      activeCategory === "all" ? getModelCategories(model) : [];

    const itemContent = (
      <CommandItem
        key={model.id}
        value={model.id}
        keywords={[model.name, model.provider, model.description || ""]}
        onSelect={() => handleSelect(model.id)}
        className={cn(
          "group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer aria-selected:bg-muted/50 data-[selected=true]:bg-muted/50 transition-colors",
          isSelected ? "bg-primary/5" : "",
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Selection Indicator */}
          <div
            className={cn(
              "flex items-center justify-center w-4 h-4 rounded-full border transition-all",
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 group-hover:border-primary/50",
            )}
          >
            {isSelected && <Check className="w-2.5 h-2.5" />}
          </div>

          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-medium text-sm truncate",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {model.name}
              </span>
              {/* Essential Badges Only */}
              {showDefaultBadge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Default
                </span>
              )}
              {model.reasoning && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  Reasoning
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{model.provider}</span>

              {/* Separator */}
              <span className="text-muted-foreground/30">•</span>

              <span>{formatContextWindow(model.contextWindow)}</span>

              {/* Subtle capabilities */}
              {model.capabilities?.includes("vision") && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span>Vision</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Cost & Actions */}
        <div className="flex items-center gap-3 pl-2">
          {!model.isLocal && (
            <div className="hidden sm:flex flex-col items-end text-[10px] text-muted-foreground/50 tabular-nums leading-tight">
              <span>In: ${model.pricing.input}</span>
              <span>Out: ${model.pricing.output}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-transparent -mr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(model.id);
            }}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                isFavorite(model.id)
                  ? "fill-amber-400 text-amber-400 opacity-100"
                  : "text-muted-foreground hover:text-amber-400",
              )}
            />
          </Button>

          {mode === "single" && (
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          )}
        </div>
      </CommandItem>
    );

    // Only show HoverCard in single selection mode
    if (mode === "single") {
      return (
        <HoverCard key={model.id} openDelay={200}>
          <HoverCardTrigger asChild>{itemContent}</HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            className="w-80 p-4"
            sideOffset={10}
          >
            <ModelDetailCard modelId={model.id} variant="sidebar" />
          </HoverCardContent>
        </HoverCard>
      );
    }

    return itemContent;
  };

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
            const score = commandScore(extendValue, search);
            return score;
          },
        }}
        // CommandDialog passes className to DialogContent
        className="max-w-[95vw] md:max-w-4xl h-[85vh] md:h-[600px] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl"
      >
        <div className="flex items-center border-b px-4 py-3 shrink-0">
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <CommandInput
            placeholder={`Search ${activeCategory === "all" ? "" : activeCategory + " "}models...`}
            className="flex-1 h-9 bg-transparent border-0 ring-0 focus:ring-0 text-sm"
          />
        </div>

        <div className="flex h-[500px] overflow-hidden">
          {/* Sidebar Categories */}
          <div className="w-[180px] border-r bg-muted/30 p-2 flex flex-col gap-1 shrink-0 overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Categories
            </div>
            {MODEL_CATEGORIES.map((cat) => {
              const count = countModelsInCategory(cat.id, allModels);
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{cat.label}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main List Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-background/50">
            {/* Selected Chips */}
            {mode === "multiple" && internalSelected.length > 0 && (
              <div className="flex gap-2 px-3 py-2 border-b flex-wrap bg-background/50 backdrop-blur-sm">
                {internalSelected.map((id) => {
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
                        onClick={() => {
                          setInternalSelected((prev) =>
                            prev.filter((i) => i !== id),
                          );
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <CommandList className="max-h-[600px] overflow-y-auto p-2">
              <CommandEmpty>No models found.</CommandEmpty>

              {/* Default Model */}
              {filteredModels.defaultModel && (
                <CommandGroup heading="Default">
                  {renderModelItem(filteredModels.defaultModel, true)}
                </CommandGroup>
              )}

              {/* Favorites */}
              {filteredModels.favorites.length > 0 && (
                <CommandGroup heading="Favorites">
                  {filteredModels.favorites.map((model) =>
                    renderModelItem(model),
                  )}
                </CommandGroup>
              )}

              {/* Recents */}
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

              {/* Rest by provider */}
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

// Helper
function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}
