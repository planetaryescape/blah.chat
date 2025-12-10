"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { Bot, Calendar, Loader2, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
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
      <motion.div
        className="space-y-4"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
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
              hidden: { opacity: 0, y: 20, rotateX: -15 },
              show: {
                opacity: 1,
                y: 0,
                rotateX: 0,
                transition: {
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
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
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversation = useQuery(api.conversations.get, {
    conversationId: message.conversationId,
  });

  // Highlight query terms in content (sanitized)
  const highlightedContent = highlightText(message.content, query);

  const handleResultClick = () => {
    analytics.track("search_result_clicked", {
      resultPosition: index,
    });
  };

  return (
    <div
      className={cn(
        "group relative bg-card/50 hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-xl transition-all duration-300 overflow-hidden",
        isSelected && "bg-primary/5 border-primary/50",
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 transition-opacity duration-500 pointer-events-none" />

      <div className="p-5 relative flex gap-3">
        {/* Checkbox - prevent navigation */}
        <div onClick={(e) => e.preventDefault()} className="pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(message._id)}
          />
        </div>

        {/* Card content */}
        <Link
          href={`/chat/${message.conversationId}?messageId=${message._id}#message-${message._id}`}
          className="flex-1 min-w-0"
          onClick={handleResultClick}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span className="truncate">
                  {conversation?.title || "Untitled Conversation"}
                </span>
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/50">
                  {message.role === "user" ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                  <span className="capitalize font-medium">{message.role}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>

          <div className="pl-4 border-l-2 border-primary/10 group-hover:border-primary/30 transition-colors">
            <p
              className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
            />
          </div>
        </Link>
      </div>
    </div>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return DOMPurify.sanitize(text);

  const terms = query.trim().split(/\s+/);
  let highlighted = text;

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
