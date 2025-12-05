"use client";

import { RecentSearches } from "@/components/search/RecentSearches";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchHeader } from "@/components/search/SearchHeader";
import { SearchResults } from "@/components/search/SearchResults";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { Suspense, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

function SearchPageContent() {
  const [page, setPage] = useState(1);

  const { filters, setFilter, clearFilters, hasActiveFilters } =
    useSearchFilters();
  const { recentSearches, addSearch, clearRecent } = useRecentSearches();

  const {
    inputValue,
    setInputValue,
    debouncedQuery,
    results,
    isSearching,
    hasMore,
  } = useSearchQuery({
    ...filters,
    limit: page * PAGE_SIZE,
  });

  const {
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useBulkSelection();

  // Clear selection when filter/search changes
  useEffect(() => {
    clearSelection();
  }, [debouncedQuery, filters, clearSelection]);

  // Add to recent searches when query is submitted
  const handleQueryChange = (newValue: string) => {
    setInputValue(newValue);
    if (newValue.trim() && debouncedQuery !== newValue.trim()) {
      // Reset page when query changes
      setPage(1);
    }
  };

  // Track successful searches
  const prevQueryRef = useRef<string>("");
  useEffect(() => {
    if (
      debouncedQuery &&
      results.length > 0 &&
      !isSearching &&
      debouncedQuery !== prevQueryRef.current
    ) {
      addSearch(debouncedQuery);
      prevQueryRef.current = debouncedQuery;
    }
  }, [debouncedQuery, results.length, isSearching, addSearch]);

  const handleSelectRecentSearch = (query: string) => {
    setInputValue(query);
    setPage(1);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const handleClearFilters = () => {
    clearFilters();
    setPage(1);
  };

  const handleActionComplete = () => {
    // Trigger search results refresh
    setPage(1);
    clearSelection();
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed header */}
      <div className="flex-none z-50">
        <SearchHeader>
          <div className="space-y-4">
            <SearchBar
              value={inputValue}
              onChange={handleQueryChange}
              isSearching={isSearching}
              autoFocus
            />
            <SearchFilters
              filters={filters}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
              onFilterChange={setFilter}
            />
          </div>
        </SearchHeader>
      </div>

      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8 relative">
          {/* Show recent searches when no query */}
          {!debouncedQuery && !inputValue && (
            <RecentSearches
              recentSearches={recentSearches}
              onSelectSearch={handleSelectRecentSearch}
              onClearRecent={clearRecent}
            />
          )}

          {/* Show results when searching */}
          {(debouncedQuery || inputValue) && (
            <SearchResults
              results={results}
              isLoading={isSearching}
              query={debouncedQuery}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              hasFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              selectedCount={selectedCount}
              isSelected={isSelected}
              toggleSelection={toggleSelection}
              selectAll={selectAll}
              clearSelection={clearSelection}
              onRefresh={handleActionComplete}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="flex-none z-50 p-6">
        <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
