"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { SearchEmptyState } from "./SearchEmptyState";
import { SearchResultSkeletonList } from "./SearchResultSkeleton";

interface SearchResultsProps {
  results: Array<{
    _id: Id<"messages">;
    conversationId: Id<"conversations">;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: number;
  }>;
  isLoading: boolean;
  query: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  // Bulk selection props
  selectedCount?: number;
  isSelected?: (id: Id<"messages">) => boolean;
  toggleSelection?: (id: Id<"messages">) => void;
  selectAll?: (ids: Id<"messages">[]) => void;
  clearSelection?: () => void;
  onRefresh?: () => void;
}

export function SearchResults({
  results,
  isLoading,
  query,
  hasMore = false,
  onLoadMore,
  hasFilters = false,
  onClearFilters,
  selectedCount = 0,
  isSelected,
  toggleSelection,
  selectAll,
  clearSelection,
  onRefresh,
}: SearchResultsProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading || !onLoadMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        rootMargin: "200px", // Trigger 200px before reaching the element
      },
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  // Loading state
  if (isLoading && results.length === 0) {
    return <SearchResultSkeletonList count={6} />;
  }

  // No results state
  if (!isLoading && results.length === 0 && query) {
    return (
      <SearchEmptyState
        query={query}
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk action toolbar */}
      {selectedCount > 0 &&
        selectAll &&
        clearSelection &&
        isSelected &&
        toggleSelection &&
        onRefresh && (
          <BulkActionToolbar
            selectedCount={selectedCount}
            selectedMessages={results.filter((r: any) => isSelected(r._id))}
            onClearSelection={clearSelection}
            onActionComplete={onRefresh}
          />
        )}

      {/* Select all checkbox */}
      {results.length > 0 && selectAll && clearSelection && isSelected && (
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <Checkbox
            checked={selectedCount > 0 && selectedCount === results.length}
            onCheckedChange={(checked) => {
              if (checked) selectAll(results.map((r: any) => r._id));
              else clearSelection();
            }}
          />
          <Label className="text-sm text-muted-foreground cursor-pointer">
            Select all {results.length} result{results.length === 1 ? "" : "s"}
          </Label>
        </div>
      )}

      {/* Results header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Found {results.length} result{results.length === 1 ? "" : "s"}
            {hasMore && " (showing first batch)"}
          </p>
        </div>
      )}

      {/* Results list with stagger animation */}
      <div className="border border-border/40 rounded-lg overflow-hidden bg-muted/5">
        <motion.div
          className="divide-y divide-border/40"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.02,
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          {results.map((result: any, index: number) => (
            <motion.div
              key={result._id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.2,
                  },
                },
              }}
            >
              <SearchResultCard
                message={result}
                query={query}
                index={index}
                isSelected={isSelected ? isSelected(result._id) : false}
                onToggleSelection={toggleSelection || (() => {})}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Load more trigger & button */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading more results...</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={onLoadMore}
              className="min-w-[200px]"
            >
              Load More Results
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  message,
  query,
  index,
  isSelected,
  onToggleSelection,
}: {
  message: SearchResultsProps["results"][0];
  query: string;
  index: number;
  isSelected: boolean;
  onToggleSelection: (id: Id<"messages">) => void;
}) {
  const conversation = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    api.conversations.get,
    message.conversationId
      ? { conversationId: message.conversationId }
      : "skip",
  );

  // Highlight query terms in content (sanitized)
  const highlightedContent = highlightText(message.content, query);

  const handleResultClick = () => {
    analytics.track("search_result_clicked", {
      resultPosition: index,
    });
  };

  return (
    <div className="relative group/item z-0">
      {/* Selected Indicator - Left Bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary z-20" />
      )}

      <div
        className={cn(
          "w-full text-left px-4 py-3.5 transition-colors duration-200 border-b border-border/40",
          isSelected ? "bg-accent/50" : "hover:bg-muted/30",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox - aligned with content */}
          <div
            onClick={(e) => e.preventDefault()}
            className="pt-1 opacity-10 group-hover/item:opacity-100 transition-opacity" // Hide checkbox by default unless selected? keeping it visible on hover for cleaner look
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(message._id)}
              className="h-4 w-4 border-muted-foreground/40 data-[state=checked]:border-primary"
            />
          </div>

          <Link
            href={`/chat/${message.conversationId}?messageId=${message._id}#message-${message._id}`}
            className="flex-1 min-w-0 block"
            onClick={handleResultClick}
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3
                  className={cn(
                    "text-[13px] truncate font-medium",
                    isSelected ? "text-foreground" : "text-foreground/90",
                  )}
                >
                  {conversation?.title || "Untitled Conversation"}
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground font-medium uppercase tracking-wider">
                  {message.role === "user" ? "You" : "AI"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                {message.createdAt
                  ? formatDistanceToNow(message.createdAt, { addSuffix: true })
                  : ""}
              </span>
            </div>

            <div className="pr-8">
              <p
                className={cn(
                  "text-[12px] line-clamp-2 leading-relaxed text-muted-foreground/70",
                  isSelected ? "text-muted-foreground/90" : "",
                )}
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function highlightText(text: string, query: string): string {
  // Normalize content: trim whitespace and collapse excess newlines
  // This prevents leading whitespace from causing inconsistent card heights
  const normalizedText = (text ?? "")
    .trim()
    .replace(/^\s+/gm, "") // Remove leading whitespace from each line
    .replace(/\n{3,}/g, "\n\n"); // Collapse 3+ newlines to 2

  if (!query?.trim()) return DOMPurify.sanitize(normalizedText);

  const terms = query?.trim().split(/\s+/) ?? [];
  let highlighted = normalizedText;

  terms.forEach((term) => {
    if (term.length < 2) return; // Skip single chars
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    highlighted = highlighted.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>',
    );
  });

  // Sanitize to prevent XSS while allowing mark tags
  return DOMPurify.sanitize(highlighted, {
    ALLOWED_TAGS: ["mark"],
    ALLOWED_ATTR: ["class"],
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
