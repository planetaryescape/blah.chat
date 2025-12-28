"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { ArrowLeft, BookOpen, Loader2, Search, Settings } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useMemo, useState } from "react";
import { KnowledgeDetailPanel } from "@/components/knowledge/KnowledgeDetailPanel";
import { KnowledgeFilters } from "@/components/knowledge/KnowledgeFilters";
import { KnowledgeSourceList } from "@/components/knowledge/KnowledgeSourceList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type SourceType = "file" | "text" | "web" | "youtube";
type SourceStatus = "pending" | "processing" | "completed" | "failed";

function KnowledgePageContent() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  // URL state via nuqs for deep linking
  const [sourceParam, setSourceParam] = useQueryState(
    "source",
    parseAsString.withDefault(""),
  );
  const [chunkParam] = useQueryState("chunk", parseAsString.withDefault(""));
  const [typeParam, setTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all"),
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );

  // Local search state (not URL-persisted for performance)
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  // @ts-ignore - Type depth exceeded
  const sources = useQuery(api.knowledgeBank.index.list, {});

  // Filter sources
  const filteredSources = useMemo(() => {
    if (!sources) return [];

    return sources.filter((source: any) => {
      // Type filter
      if (typeParam !== "all" && source.type !== typeParam) return false;

      // Status filter
      if (statusParam !== "all" && source.status !== statusParam) return false;

      // Search filter (title only, case-insensitive)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!source.title.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [sources, typeParam, statusParam, searchQuery]);

  // Selected source
  const selectedSourceId = sourceParam
    ? (sourceParam as Id<"knowledgeSources">)
    : null;
  const highlightChunkId = chunkParam
    ? (chunkParam as Id<"knowledgeChunks">)
    : null;

  const handleSelectSource = (id: Id<"knowledgeSources">) => {
    setSourceParam(id);
  };

  const handleCloseDetail = () => {
    setSourceParam("");
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to continue</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 mt-0.5"
                asChild
              >
                <Link href="/settings?tab=knowledge">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight">
                  Knowledge Bank
                </h1>
                <p className="text-sm text-muted-foreground">
                  Explore and manage your saved documents, web pages, and videos
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              {/* Search */}
              <div className="relative w-full md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-muted/40 border-border/40 focus:bg-background focus:border-primary/30 transition-all text-sm"
                />
              </div>

              <Button variant="outline" size="sm" asChild>
                <Link href="/settings?tab=knowledge">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <KnowledgeFilters
              typeFilter={typeParam as SourceType | "all"}
              statusFilter={statusParam as SourceStatus | "all"}
              onTypeChange={(type) => setTypeParam(type === "all" ? "" : type)}
              onStatusChange={(status) =>
                setStatusParam(status === "all" ? "" : status)
              }
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Source List */}
        <ScrollArea className={cn("flex-1", selectedSourceId && "max-w-[60%]")}>
          <div className="container mx-auto max-w-6xl px-4 py-6">
            {sources === undefined ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold">
                    {sources.length === 0
                      ? "No sources yet"
                      : "No matching sources"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {sources.length === 0
                      ? "Add documents, web pages, or videos from Settings."
                      : "Try adjusting your filters or search query."}
                  </p>
                </div>
                {sources.length === 0 && (
                  <Button variant="outline" asChild>
                    <Link href="/settings?tab=knowledge">Add Source</Link>
                  </Button>
                )}
              </div>
            ) : (
              <KnowledgeSourceList
                sources={filteredSources}
                selectedSourceId={selectedSourceId}
                onSelect={handleSelectSource}
                groupByType={typeParam === "all" || typeParam === ""}
              />
            )}
          </div>
        </ScrollArea>

        {/* Detail Panel */}
        {selectedSourceId && (
          <div className="w-[40%] min-w-[350px] h-full overflow-hidden border-l">
            <KnowledgeDetailPanel
              sourceId={selectedSourceId}
              highlightChunkId={highlightChunkId}
              onClose={handleCloseDetail}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <KnowledgePageContent />
    </Suspense>
  );
}
