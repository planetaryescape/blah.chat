"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TagNode } from "@/lib/utils/tagUtils";

interface TagTreeProps {
  tree: TagNode[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function TagTree({ tree, selectedTags, onToggleTag }: TagTreeProps) {
  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TagTreeNode
          key={node.tag}
          node={node}
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
        />
      ))}
    </div>
  );
}

interface TagTreeNodeProps {
  node: TagNode;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

function TagTreeNode({ node, selectedTags, onToggleTag }: TagTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedTags.includes(node.tag);

  // Check if any descendant is selected
  const hasSelectedDescendant = (n: TagNode): boolean => {
    if (selectedTags.includes(n.tag)) return true;
    return n.children.some(hasSelectedDescendant);
  };

  const indeterminate = !isSelected && hasSelectedDescendant(node);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/10 hover:bg-primary/15",
        )}
        onClick={() => onToggleTag(node.tag)}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 hover:bg-muted/80 rounded p-0.5 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Checkbox */}
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
            isSelected
              ? "bg-primary text-primary-foreground border-primary"
              : indeterminate
                ? "bg-muted border-primary"
                : "opacity-50 border-input",
          )}
        >
          {isSelected ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : indeterminate ? (
            <div className="h-1.5 w-1.5 rounded-sm bg-primary" />
          ) : null}
        </div>

        {/* Label */}
        <span className="flex-1 text-sm truncate">{node.label}</span>

        {/* Count */}
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {node.count}
        </span>
      </div>

      {/* Children - indented */}
      {hasChildren && expanded && (
        <div className="ml-5">
          {node.children.map((child) => (
            <TagTreeNode
              key={child.tag}
              node={child}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
