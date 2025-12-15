"use client";

import { Button } from "@/components/ui/button";
import { CommandItem } from "@/components/ui/command";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getModelCategories } from "@/lib/ai/categories";
import type { ModelConfig } from "@/lib/ai/utils";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Star, Zap } from "lucide-react";
import { ModelDetailCard } from "./ModelDetailCard";

interface ModelSelectorItemProps {
  model: ModelConfig;
  isSelected: boolean;
  isFavorite: boolean;
  mode: "single" | "multiple";
  showDefaultBadge?: boolean;
  activeCategory: string;
  onSelect: (modelId: string) => void;
  onToggleFavorite: (modelId: string) => void;
}

/**
 * Format context window tokens to human-readable string
 */
function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}

/**
 * Individual model item in the model selector.
 * Displays model info with selection state, favorite toggle, and optional HoverCard.
 */
export function ModelSelectorItem({
  model,
  isSelected,
  isFavorite,
  mode,
  showDefaultBadge = false,
  activeCategory,
  onSelect,
  onToggleFavorite,
}: ModelSelectorItemProps) {
  // Get model categories (only for "All" view)
  const categories = activeCategory === "all" ? getModelCategories(model) : [];

  const itemContent = (
    <CommandItem
      key={model.id}
      value={model.id}
      keywords={[model.name, model.provider, model.description || ""]}
      onSelect={() => onSelect(model.id)}
      className={cn(
        "group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer aria-selected:bg-muted/50 data-[selected=true]:bg-muted/50 transition-colors",
        isSelected ? "bg-primary/5" : ""
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Selection Indicator */}
        <div
          className={cn(
            "flex items-center justify-center w-4 h-4 rounded-full border transition-all",
            isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30 group-hover:border-primary/50"
          )}
        >
          {isSelected && <Check className="w-2.5 h-2.5" />}
        </div>

        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium text-sm truncate",
                isSelected ? "text-primary" : "text-foreground"
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
            <span className="text-muted-foreground/30">•</span>
            <span>{formatContextWindow(model.contextWindow)}</span>
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
            onToggleFavorite(model.id);
          }}
        >
          <Star
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite
                ? "fill-amber-400 text-amber-400 opacity-100"
                : "text-muted-foreground hover:text-amber-400"
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
}
