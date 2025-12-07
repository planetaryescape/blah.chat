"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { analytics } from "@/lib/analytics";
import { createActionItems } from "@/lib/command-palette-actions";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Command } from "cmdk";
import { useAction, useMutation, useQuery } from "convex/react";
import { Archive, Loader2, MessageSquare, Pin, Search } from "lucide-react";
import { matchSorter } from "match-sorter";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { DeleteConversationDialog } from "./sidebar/DeleteConversationDialog";
import { RenameDialog } from "./sidebar/RenameDialog";
import { useConversationActions } from "@/hooks/useConversationActions";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Doc<"conversations">[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);
  // @ts-ignore
  const conversations = useQuery(api.conversations.list, {});
  const createConversation = useMutation(api.conversations.create);
  // @ts-ignore
  const hybridSearchAction = useAction(
    api.conversations.hybridSearch.hybridSearch,
  );

  // Extract conversationId from pathname
  const conversationId = pathname?.startsWith("/chat/")
    ? (pathname.split("/")[2] as Id<"conversations">)
    : null;

  // Get current conversation if in chat
  const currentConversation = useQuery(
    // @ts-ignore
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );

  // Conversation actions hook
  const conversationActions = useConversationActions(
    conversationId,
    "command_palette",
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Clear search query when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Debounced hybrid search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await hybridSearchAction({
          query: searchQuery,
          limit: 20,
          includeArchived: false,
        });
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, hybridSearchAction]);

  const handleNewChat = async () => {
    try {
      const conversationId = await createConversation({
        model: "openai:gpt-4o",
      });
      router.push(`/chat/${conversationId}`);
      setOpen(false);
      analytics.track("conversation_started", { model: "openai:gpt-4o" });
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const handleTheme = (theme: "light" | "dark" | "system") => {
    setTheme(theme);
    setOpen(false);
  };

  // Create action items
  const actionItems = useMemo(
    () =>
      createActionItems({
        handleNewChat,
        handleNavigate,
        handleTheme,
        conversationId,
        conversation: currentConversation,
        onRename: () => {
          setShowRename(true);
          setOpen(false);
        },
        onDelete: () => {
          setShowDelete(true);
          setOpen(false);
        },
        onArchive: async () => {
          await conversationActions.handleArchive();
          setOpen(false);
        },
        onTogglePin: async () => {
          await conversationActions.handleTogglePin(
            currentConversation?.pinned || false,
          );
          setOpen(false);
        },
        onToggleStar: async () => {
          await conversationActions.handleToggleStar(
            currentConversation?.starred || false,
          );
          setOpen(false);
        },
        onAutoRename: async () => {
          await conversationActions.handleAutoRename();
          setOpen(false);
        },
      }),
    [
      handleNewChat,
      handleNavigate,
      handleTheme,
      conversationId,
      currentConversation,
      conversationActions,
    ],
  );

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actionItems;

    return matchSorter(actionItems, searchQuery, {
      keys: ["label", "keywords"],
      threshold: matchSorter.rankings.CONTAINS,
    });
  }, [searchQuery, actionItems]);

  // Group conversations by status - use search results when searching
  const groupedConversations = useMemo(() => {
    // If search active, use search results in "recent" group
    if (searchQuery.trim()) {
      return {
        pinned: [],
        recent: searchResults,
        archived: [],
      };
    }

    // Otherwise, use default grouping
    if (!conversations) return { pinned: [], recent: [], archived: [] };

    return {
      pinned: conversations.filter((c: any) => c.pinned && !c.archived),
      recent: conversations.filter((c: any) => !c.pinned && !c.archived),
      archived: conversations.filter((c: any) => c.archived),
    };
  }, [conversations, searchQuery, searchResults]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden bg-transparent border-0 shadow-2xl">
          <DialogTitle className="sr-only">Command Menu</DialogTitle>
          <div className="surface-glass-strong rounded-xl border border-border/40 overflow-hidden">
            <Command className="bg-transparent" shouldFilter={false}>
              <div className="flex items-center border-b border-border/40 px-3">
                {isSearching ? (
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 opacity-50 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                )}
                <Command.Input
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder="Type a command or search..."
                  className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No conversations found" : "No results found."}
                </Command.Empty>

                {filteredActions.filter((a) => a.group === "actions").length >
                  0 && (
                  <Command.Group
                    heading="Actions"
                    className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider"
                  >
                    {filteredActions
                      .filter((a) => a.group === "actions")
                      .map((action) => (
                        <Command.Item
                          key={action.id}
                          value={action.id}
                          onSelect={action.onSelect}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                          aria-keyshortcuts={action.shortcut}
                        >
                          <action.icon className="h-4 w-4" />
                          <span>{action.label}</span>
                          {action.shortcut && (
                            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                              {action.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                  </Command.Group>
                )}

                {/* Pinned Conversations */}
                {groupedConversations.pinned.length > 0 && (
                  <Command.Group
                    heading="Pinned"
                    className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
                  >
                    {groupedConversations.pinned.map((conv: any) => (
                      <Command.Item
                        key={conv._id}
                        value={conv._id}
                        onSelect={() => handleNavigate(`/chat/${conv._id}`)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                      >
                        <Pin className="h-4 w-4 opacity-70" />
                        <span className="truncate">{conv.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Recent Conversations (no limit - virtualized for performance) */}
                {groupedConversations.recent.length > 0 && (
                  <Command.Group
                    heading={
                      searchQuery.trim()
                        ? "Search Results"
                        : "Recent Conversations"
                    }
                    className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
                  >
                    {groupedConversations.recent.map((conv: any) => (
                      <Command.Item
                        key={conv._id}
                        value={conv._id}
                        onSelect={() => handleNavigate(`/chat/${conv._id}`)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                      >
                        <MessageSquare className="h-4 w-4 opacity-70" />
                        <span className="truncate">{conv.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Archived Conversations (no limit) */}
                {groupedConversations.archived.length > 0 && (
                  <Command.Group
                    heading="Archived"
                    className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
                  >
                    {groupedConversations.archived.map((conv: any) => (
                      <Command.Item
                        key={conv._id}
                        value={conv._id}
                        onSelect={() => handleNavigate(`/chat/${conv._id}`)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                      >
                        <Archive className="h-4 w-4 opacity-70" />
                        <span className="truncate">{conv.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Conversation Actions */}
                {filteredActions.filter((a) => a.group === "conversation")
                  .length > 0 && (
                  <Command.Group
                    heading="Conversation"
                    className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
                  >
                    {filteredActions
                      .filter((a) => a.group === "conversation")
                      .map((action) => (
                        <Command.Item
                          key={action.id}
                          value={action.id}
                          onSelect={action.onSelect}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors",
                            action.destructive &&
                              "text-destructive aria-selected:text-destructive",
                          )}
                        >
                          <action.icon className="h-4 w-4" />
                          <span>{action.label}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                )}

                {filteredActions.filter((a) => a.group === "theme").length >
                  0 && (
                  <Command.Group
                    heading="Theme"
                    className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
                  >
                    {filteredActions
                      .filter((a) => a.group === "theme")
                      .map((action) => (
                        <Command.Item
                          key={action.id}
                          value={action.id}
                          onSelect={action.onSelect}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                        >
                          <action.icon className="h-4 w-4" />
                          <span>{action.label}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation action dialogs */}
      {currentConversation && (
        <>
          <RenameDialog
            conversation={currentConversation}
            open={showRename}
            onOpenChange={setShowRename}
          />
          <DeleteConversationDialog
            open={showDelete}
            onOpenChange={setShowDelete}
            onConfirm={conversationActions.handleDelete}
            conversationTitle={currentConversation.title}
          />
        </>
      )}
    </>
  );
}
