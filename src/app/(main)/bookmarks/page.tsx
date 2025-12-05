"use client";

import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { Bookmark, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";

import { ScrollArea } from "@/components/ui/scroll-area";

// ... imports

export default function BookmarksPage() {
  const bookmarks = useQuery(api.bookmarks.list);
  const [searchQuery, setSearchQuery] = useState("");

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
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Bookmark className="h-6 w-6" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Bookmarks
                </h1>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Your collection of saved messages and important conversations.
              </p>
            </div>

            <div className="flex gap-3 items-center w-full md:w-auto">
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-all"
                />
              </div>
              <div className="h-10 px-4 flex items-center justify-center rounded-md bg-muted/30 border border-border/50 text-sm font-medium text-muted-foreground min-w-[3rem]">
                {filteredBookmarks.length}
              </div>
            </div>
          </div>
        </div>
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-muted/5 rounded-3xl border border-dashed border-border/50">
              <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
                <Bookmark className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-semibold font-display">
                  {searchQuery ? "No matching bookmarks" : "No bookmarks yet"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query to find what you're looking for."
                    : "Start bookmarking important messages in your conversations to easily find them here later."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBookmarks.map((bookmark: any) => (
                <BookmarkCard key={bookmark._id} bookmark={bookmark} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
