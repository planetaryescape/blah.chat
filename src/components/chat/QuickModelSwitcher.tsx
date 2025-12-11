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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Check, Sparkles, Star, X, Zap } from "lucide-react";
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
  } = sortModels(
    allModels,
    prefDefaultModel,
    favorites,
    recents,
  );

  // Filter models by active category
  const filteredModels = useMemo(() => {
    const category = MODEL_CATEGORIES.find((c) => c.id === activeCategory);
    if (!category || category.id === "all") {
      return { defaultModel, favorites: favModels, recents: recentModels, rest };
    }

    return {
      defaultModel:
        defaultModel && category.filter(defaultModel) ? defaultModel : undefined,
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

            {/* Category pills (only in "All" view) */}
            {activeCategory === "all" && categories.length > 0 && (
              <>
                {categories.slice(0, 3).map((catId) => {
                  const cat = MODEL_CATEGORIES.find((c) => c.id === catId);
                  if (!cat) return null;
                  const Icon = cat.icon;

                  return (
                    <Badge
                      key={catId}
                      variant="outline"
                      className="text-[9px] h-4 px-1 gap-0.5 bg-muted/50"
                    >
                      {Icon && <Icon className="w-2 h-2" />}
                      {cat.label}
                    </Badge>
                  );
                })}
                {categories.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1 bg-muted/50"
                  >
                    +{categories.length - 3}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {!model.isLocal && (
            <div className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
              ${model.pricing.input}/{model.pricing.output}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(model.id);
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isFavorite(model.id)
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-muted-foreground/40",
              )}
            />
          </Button>
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
          variant="ghost"
          onClick={() => onOpenChange(true)}
          className="h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5"
        >
          <span className="max-w-[120px] truncate">
            {mode === "single"
              ? allModels.find((m) => m.id === currentModel)?.name ||
                "Select model"
              : "Select models"}
          </span>
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
      >
        {/* Search Input - Top Priority */}
        <CommandInput
          placeholder={`Search ${activeCategory === "all" ? "" : activeCategory + " "}models...`}
        />

        {/* Category Tabs */}
        <div className="border-b px-2 pt-0 pb-2">
          <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
            <TabsList className="w-full grid grid-cols-4 h-auto p-1 gap-1">
              {MODEL_CATEGORIES.slice(0, 8).map((cat) => {
                const count = countModelsInCategory(cat.id, allModels);
                const Icon = cat.icon;

                return (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="text-xs py-1.5 flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span className="hidden sm:inline truncate">{cat.label}</span>
                    <span className="sm:hidden truncate">
                      {cat.label.slice(0, 3)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0 ml-auto bg-background/50"
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

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
          {filteredModels.defaultModel && (
            <CommandGroup heading="Default">
              {renderModelItem(filteredModels.defaultModel, true)}
            </CommandGroup>
          )}

          {/* Favorites */}
          {filteredModels.favorites.length > 0 && (
            <CommandGroup heading="Favorites">
              {filteredModels.favorites.map((model) => renderModelItem(model))}
            </CommandGroup>
          )}

          {/* Recents */}
          {filteredModels.recents.length > 0 && (
            <CommandGroup heading="Recent">
              {filteredModels.recents.map((model) => renderModelItem(model))}
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
