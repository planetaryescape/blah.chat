"use client";

import { MODEL_CATEGORIES, countModelsInCategory } from "@/lib/ai/categories";
import type { ModelConfig } from "@/lib/ai/utils";
import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  allModels: ModelConfig[];
}

/**
 * Sidebar for filtering models by category.
 */
export function CategorySidebar({
  activeCategory,
  onCategoryChange,
  allModels,
}: CategorySidebarProps) {
  return (
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
            onClick={() => onCategoryChange(cat.id)}
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
  );
}
