"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG } from "./constants";
import { KnowledgeSourceCard } from "./KnowledgeSourceCard";
import type { KnowledgeSource, SourceType } from "./types";

interface KnowledgeSourceListProps {
  sources: KnowledgeSource[];
  selectedSourceId: Id<"knowledgeSources"> | null;
  onSelect: (id: Id<"knowledgeSources">) => void;
  groupByType: boolean;
}

type GroupState = Record<SourceType, boolean>;

export function KnowledgeSourceList({
  sources,
  selectedSourceId,
  onSelect,
  groupByType,
}: KnowledgeSourceListProps) {
  const [expandedGroups, setExpandedGroups] = useState<GroupState>({
    file: true,
    text: true,
    web: true,
    youtube: true,
  });

  const toggleGroup = (type: SourceType) => {
    setExpandedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  if (!groupByType) {
    return (
      <div className="space-y-2">
        {sources.map((source) => (
          <KnowledgeSourceCard
            key={source._id}
            source={source}
            isSelected={selectedSourceId === source._id}
            onClick={() => onSelect(source._id)}
          />
        ))}
      </div>
    );
  }

  const groupedSources = sources.reduce(
    (acc, source) => {
      const type = source.type as SourceType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(source);
      return acc;
    },
    {} as Record<SourceType, KnowledgeSource[]>,
  );

  const sortedTypes = (Object.keys(groupedSources) as SourceType[]).sort(
    (a, b) => TYPE_CONFIG[a].order - TYPE_CONFIG[b].order,
  );

  return (
    <div className="space-y-4">
      {sortedTypes.map((type) => {
        const config = TYPE_CONFIG[type];
        const Icon = config.icon;
        const typeSources = groupedSources[type];
        const isExpanded = expandedGroups[type];

        return (
          <div key={type}>
            <button
              type="button"
              onClick={() => toggleGroup(type)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium",
                "text-muted-foreground hover:text-foreground transition-colors",
                "rounded-md hover:bg-muted/50",
              )}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Icon className="h-4 w-4" />
              <span>{config.label}</span>
              <span className="ml-auto text-xs text-muted-foreground/70">
                {typeSources.length}
              </span>
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-2 pl-2">
                {typeSources.map((source) => (
                  <KnowledgeSourceCard
                    key={source._id}
                    source={source}
                    isSelected={selectedSourceId === source._id}
                    onClick={() => onSelect(source._id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {sortedTypes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No sources found</p>
        </div>
      )}
    </div>
  );
}
