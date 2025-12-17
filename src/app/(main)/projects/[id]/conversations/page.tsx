"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAction, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Loader2,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// Type for conversation data
type ConversationRow = {
  _id: Id<"conversations">;
  title: string;
  model: string;
  messageCount: number;
  lastMessageAt: number;
  createdAt: number;
  pinned: boolean;
};

export default function ProjectConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Doc<"conversations">[] | null
  >(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Refs
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Queries - fetch ALL project conversations (no search param to avoid focus loss)
  // @ts-ignore - Type depth exceeded with complex Convex schema
  const allConversations = useQuery(api.conversations.list, { projectId });

  // Hybrid search action - located in convex/conversations/hybridSearch.ts
  // Must use subdirectory path, not api.conversations.hybridSearch
  // @ts-ignore - Type depth exceeded
  const hybridSearch = useAction(
    (api as any)["conversations/hybridSearch"].hybridSearch,
  );

  // Mutations
  const createConversation = useMutation(api.conversations.create);
  // @ts-ignore - Type depth exceeded
  const addConversation = useMutation(api.projects.addConversation);

  // Debounced hybrid search function
  const executeHybridSearch = useDebouncedCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await hybridSearch({
          query: query.trim(),
          projectId,
          limit: 50,
        });
        setSearchResults(results);
      } catch (error) {
        console.error("Hybrid search failed:", error);
        // Fallback to client-side filtering
        if (allConversations) {
          const lowerQuery = query.toLowerCase();
          const filtered = allConversations.filter(
            (c) =>
              c.title?.toLowerCase().includes(lowerQuery) ||
              c.model?.toLowerCase().includes(lowerQuery),
          );
          setSearchResults(filtered);
        }
      } finally {
        setIsSearching(false);
      }
    },
    400, // 400ms debounce
  );

  // Trigger search when query changes
  useEffect(() => {
    executeHybridSearch(searchQuery);
  }, [searchQuery, executeHybridSearch]);

  // Use search results if available, otherwise use all conversations
  const displayedConversations =
    searchResults !== null ? searchResults : allConversations;

  // Transform data for table
  const tableData = useMemo<ConversationRow[]>(() => {
    if (!displayedConversations) return [];
    return displayedConversations.map((conv) => ({
      _id: conv._id,
      title: conv.title || "Untitled Chat",
      model: conv.model,
      messageCount: conv.messageCount || 0,
      lastMessageAt: conv.lastMessageAt || conv.createdAt,
      createdAt: conv.createdAt,
      pinned: conv.pinned || false,
    }));
  }, [displayedConversations]);

  // Column definitions
  const columns = useMemo<ColumnDef<ConversationRow>[]>(
    () => [
      {
        id: "pinned",
        accessorKey: "pinned",
        header: "",
        size: 40,
        cell: ({ row }) =>
          row.original.pinned ? (
            <span
              className="h-2 w-2 rounded-full bg-primary inline-block"
              title="Pinned"
            />
          ) : null,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium truncate max-w-[300px] block">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "model",
        header: "Model",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm truncate max-w-[150px] block">
            {row.original.model.split(":")[1] || row.original.model}
          </span>
        ),
      },
      {
        accessorKey: "messageCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-end w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Messages
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">
            {row.original.messageCount}
          </div>
        ),
      },
      {
        accessorKey: "lastMessageAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-end w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last Active
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground text-sm font-mono">
            {formatDistanceToNow(row.original.lastMessageAt, {
              addSuffix: true,
            })}
          </div>
        ),
      },
    ],
    [],
  );

  // TanStack Table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  // Virtualization
  const rows = table.getRowModel().rows;
  const shouldVirtualize = rows.length > 50;
  const estimateSize = useCallback(() => 56, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Handlers
  const handleCreateChat = async () => {
    try {
      const conversationId = await createConversation({
        model: "openai:gpt-4o",
        title: "New Project Chat",
      });
      await addConversation({ projectId, conversationId });
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleRowClick = (conversationId: Id<"conversations">) => {
    router.push(`/chat/${conversationId}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    searchInputRef.current?.focus();
  };

  // Loading state
  if (allConversations === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-xl overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <header className="flex items-center justify-between p-6 border-b bg-background/40">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
            <p className="text-muted-foreground text-sm">
              Chats linked to this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-md",
                  view === "list" && "bg-background shadow-sm text-foreground",
                )}
                onClick={() => setView("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-md",
                  view === "grid" && "bg-background shadow-sm text-foreground",
                )}
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleCreateChat}>
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </header>

        <div className="p-4 border-b bg-muted/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search conversations (hybrid: title + message content)..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 pr-10 bg-background/50 border-muted-foreground/20 focus:bg-background transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!isSearching && searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && searchResults !== null && (
            <p className="text-xs text-muted-foreground mt-2">
              Found {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>
      </div>

      {/* Empty State */}
      {tableData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
          <p className="mb-4">
            {searchQuery
              ? `No conversations matching "${searchQuery}"`
              : "No conversations linked to this project yet."}
          </p>
          {!searchQuery && (
            <Button variant="outline" onClick={handleCreateChat}>
              Start a New Chat
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        /* Grid View */
        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tableData.map((conv) => (
              <Link
                key={conv._id}
                href={`/chat/${conv._id}`}
                className="group relative flex flex-col justify-between p-5 h-40 rounded-xl border bg-card hover:bg-secondary/10 transition-all hover:shadow-md hover:border-primary/20"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground/90 truncate pr-2 group-hover:text-primary transition-colors">
                      {conv.title}
                    </h3>
                    {conv.pinned && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground opacity-70">
                    {conv.model}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground/60">
                    {conv.messageCount} messages
                  </span>
                  <span className="text-xs font-mono text-muted-foreground/60">
                    {formatDistanceToNow(conv.lastMessageAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-0">
          <div className="border rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
            {shouldVirtualize ? (
              /* Virtualized Table */
              <>
                {/* Fixed Header */}
                <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <div key={headerGroup.id} className="flex">
                      {headerGroup.headers.map((header) => (
                        <div
                          key={header.id}
                          className="flex-1 px-4 py-3 text-sm font-medium"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Virtualized Body */}
                <div
                  ref={tableContainerRef}
                  className="flex-1 overflow-auto relative"
                >
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = rows[virtualRow.index];
                      return (
                        <div
                          key={row.id}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          className="flex cursor-pointer hover:bg-muted/50 border-b absolute left-0 w-full"
                          style={{
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          onClick={() => handleRowClick(row.original._id)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <div
                              key={cell.id}
                              className="flex-1 px-4 py-3"
                              style={{ width: cell.column.getSize() }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* Standard Table */
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {rows.length ? (
                      rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(row.original._id)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No conversations found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Pagination Footer */}
      {view === "list" && tableData.length > 0 && (
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background/60">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {rows.length} of {tableData.length} conversations
              {searchQuery && ` (filtered)`}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
              <select
                value={pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
