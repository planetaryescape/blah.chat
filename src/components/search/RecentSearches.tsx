"use client";

import { Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentSearchesProps {
  recentSearches: string[];
  isLoading?: boolean;
  onSelectSearch: (query: string) => void;
  onClearRecent: () => void;
}

export function RecentSearches({
  recentSearches,
  isLoading = false,
  onSelectSearch,
  onClearRecent,
}: RecentSearchesProps) {
  // Show loading skeleton while data is being loaded
  if (isLoading) {
    return (
      <div className="space-y-3 mt-7">
        <div className="flex items-center justify-between mb-4 pr-5">
          <div className="flex items-center gap-2 px-5">
            <Skeleton className="w-4 h-5" />
            <Skeleton className="w-32 h-5" />
          </div>
          <Skeleton className="w-18 h-6" />
        </div>
        <div className="space-y-2">
          {["skeleton-1", "skeleton-2", "skeleton-3"].map((skeletonId) => (
            <Skeleton key={skeletonId} className="w-full h-10" />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state only after loading is complete
  if (recentSearches.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-sm">No recent searches yet</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Your search history will appear here
        </p>
      </div>
    );
  }

  return (
    <Card className="border-border/40 bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Searches
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearRecent}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1 pr-4">
            {recentSearches.map((search) => (
              <button
                key={search} // Use search string as key since searches should be unique
                type="button"
                onClick={() => onSelectSearch(search)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors group text-left"
              >
                <span className="text-sm truncate flex-1 font-mono">
                  {search}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Search
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
        {/* Fade gradient for scroll affordance */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      </CardContent>
    </Card>
  );
}
