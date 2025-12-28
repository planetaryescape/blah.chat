"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { KnowledgeSourceCard } from "./KnowledgeSourceCard";

type SourceType = "file" | "text" | "web" | "youtube";
type SourceStatus = "pending" | "processing" | "completed" | "failed";

interface KnowledgeSource {
  _id: Id<"knowledgeSources">;
  title: string;
  type: SourceType;
  status: SourceStatus;
  chunkCount?: number;
  url?: string;
  createdAt: number;
}

interface KnowledgeSourceListProps {
  sources: KnowledgeSource[];
  selectedSourceId: Id<"knowledgeSources"> | null;
  onSelect: (id: Id<"knowledgeSources">) => void;
  groupByType: boolean;
}

const TYPE_CONFIG = {
  file: { label: "Files", icon: FileText, order: 0 },
  text: { label: "Text Notes", icon: BookOpen, order: 1 },
  web: { label: "Web Pages", icon: Globe, order: 2 },
  youtube: { label: "YouTube Videos", icon: Youtube, order: 3 },
};

interface GroupState {
  file: boolean;
  text: boolean;
  web: boolean;
  youtube: boolean;
}

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
    // Flat list mode
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

  // Group sources by type
  const groupedSources = sources.reduce(
    (acc, source) => {
      const type = source.type as SourceType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(source);
      return acc;
    },
    {} as Record<SourceType, KnowledgeSource[]>,
  );

  // Sort groups by configured order
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
            {/* Group Header */}
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

            {/* Group Content */}
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
