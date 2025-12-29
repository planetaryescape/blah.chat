"use client";

import { BookOpen, FileText, Globe, X, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SourceStatus, SourceType } from "./types";

interface KnowledgeFiltersProps {
  typeFilter: SourceType | "all";
  statusFilter: SourceStatus | "all";
  onTypeChange: (type: SourceType | "all") => void;
  onStatusChange: (status: SourceStatus | "all") => void;
}

const TYPE_OPTIONS: {
  value: SourceType | "all";
  label: string;
  icon?: typeof FileText;
}[] = [
  { value: "all", label: "All Types" },
  { value: "file", label: "Files", icon: FileText },
  { value: "text", label: "Text", icon: BookOpen },
  { value: "web", label: "Web", icon: Globe },
  { value: "youtube", label: "YouTube", icon: Youtube },
];

const STATUS_OPTIONS: { value: SourceStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Ready" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

export function KnowledgeFilters({
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
}: KnowledgeFiltersProps) {
  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    onTypeChange("all");
    onStatusChange("all");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTypeChange(option.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                "flex items-center gap-1.5",
                typeFilter === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onStatusChange(option.value)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
              statusFilter === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 px-2 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
