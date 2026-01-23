"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bookmark, LayoutGrid, List, Search } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { BookmarksTable } from "@/components/bookmarks/BookmarksTable";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

export const dynamic = "force-dynamic";

function BookmarksPageContent() {
  // All hooks MUST be at the top, before any early returns
  const { showBookmarks, isLoading } = useFeatureToggles();
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const bookmarks = useQuery(api.bookmarks.list);
  const removeBookmark = useMutation(api.bookmarks.remove);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredBookmarks = useMemo(() => {
    if (!bookmarks) return [];
    if (!searchQuery) return bookmarks;

    const query = searchQuery.toLowerCase();
    return bookmarks.filter((bookmark: any) => {
      const messageContent = bookmark.message?.content.toLowerCase() || "";
      const conversationTitle =
        bookmark.conversation?.title.toLowerCase() || "";
      const note = bookmark.note?.toLowerCase() || "";
      const tags = bookmark.tags?.join(" ").toLowerCase() || "";

      return (
        messageContent.includes(query) ||
        conversationTitle.includes(query) ||
        note.includes(query) ||
        tags.includes(query)
      );
    });
  }, [bookmarks, searchQuery]);

  // Handler defined alongside hooks (uses removeBookmark from hook)
  const handleRemove = async (id: string) => {
    try {
      await removeBookmark({ bookmarkId: id as any });
      toast.success("Bookmark removed");
    } catch (_error) {
      toast.error("Failed to remove bookmark");
    }
  };

  // Show loading while preferences are being fetched
  if (isLoading) {
    return <FeatureLoadingScreen />;
  }

  // Route guard: show disabled page if bookmarks feature is off
  if (!showBookmarks) {
    return (
      <DisabledFeaturePage featureName="Bookmarks" settingKey="showBookmarks" />
    );
  }

  if (bookmarks === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">
            Loading bookmarks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Bookmarks</h1>
              <p className="text-sm text-muted-foreground">
                Saved messages and conversations
              </p>
            </div>

            <div className="flex gap-3 items-center w-full md:w-auto">
              {/* View Toggle */}
              <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border/40">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative w-full md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-muted/40 border-border/40 focus:bg-background focus:border-primary/30 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
                <Bookmark className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-semibold">
                  {searchQuery ? "No matching bookmarks" : "No bookmarks yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Bookmark messages to find them here."}
                </p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {filteredBookmarks.map((bookmark: any) => (
                <BookmarkCard key={bookmark._id} bookmark={bookmark} />
              ))}
            </div>
          ) : (
            <BookmarksTable
              bookmarks={filteredBookmarks}
              onRemove={handleRemove}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function BookmarksLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground animate-pulse">
          Loading bookmarks...
        </p>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <Suspense fallback={<BookmarksLoadingSkeleton />}>
      <BookmarksPageContent />
    </Suspense>
  );
}
