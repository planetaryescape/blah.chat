"use client";

import {
    CommandActionGroup,
    CommandConversationGroup,
} from "@/components/command-palette";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useNewChat } from "@/hooks/useNewChat";
import { createActionItems } from "@/lib/command-palette-actions";
import { Command } from "cmdk";
import { useAction, useQuery } from "convex/react";
import { Archive, Loader2, MessageSquare, Pin, Search } from "lucide-react";
import { matchSorter } from "match-sorter";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteConversationDialog } from "./sidebar/DeleteConversationDialog";
import { RenameDialog } from "./sidebar/RenameDialog";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Doc<"conversations">[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const _listRef = useRef<HTMLDivElement>(null);
  const conversations = useQuery(api.conversations.list, {});
  const hybridSearchAction = useAction(
    api.conversations.hybridSearch.hybridSearch
  );
  const { startNewChat } = useNewChat();
  const features = useFeatureToggles();

  const conversationId = pathname?.startsWith("/chat/")
    ? (pathname.split("/")[2] as Id<"conversations">)
    : null;

  const currentConversation = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    api.conversations.get,
    conversationId ? { conversationId } : "skip"
  );

  const conversationActions = useConversationActions(
    conversationId,
    "command_palette"
  );

  // Keyboard shortcut to open
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

  // Clear search on close
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

  const handleNewChat = () => {
    startNewChat();
    setOpen(false);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const handleTheme = (theme: "light" | "dark" | "system") => {
    setTheme(theme);
    setOpen(false);
  };

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
            currentConversation?.pinned || false
          );
          setOpen(false);
        },
        onToggleStar: async () => {
          await conversationActions.handleToggleStar(
            currentConversation?.starred || false
          );
          setOpen(false);
        },
        showNotes: features.showNotes,
        showTemplates: features.showTemplates,
        showProjects: features.showProjects,
        showBookmarks: features.showBookmarks,
        onAutoRename: async () => {
          await conversationActions.handleAutoRename();
          setOpen(false);
        },
      }),
    [
      conversationId,
      currentConversation,
      conversationActions,
      features.showNotes,
      features.showTemplates,
      features.showProjects,
      features.showBookmarks,
    ]
  );

  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actionItems;
    return matchSorter(actionItems, searchQuery, {
      keys: ["label", "keywords"],
      threshold: matchSorter.rankings.CONTAINS,
    });
  }, [searchQuery, actionItems]);

  const groupedConversations = useMemo(() => {
    if (searchQuery.trim()) {
      return { pinned: [], recent: searchResults, archived: [] };
    }
    if (!conversations) return { pinned: [], recent: [], archived: [] };
    return {
      pinned: conversations.filter((c: any) => c.pinned && !c.archived),
      recent: conversations.filter((c: any) => !c.pinned && !c.archived),
      archived: conversations.filter((c: any) => c.archived),
    };
  }, [conversations, searchQuery, searchResults]);

  const actionsByGroup = useMemo(() => ({
    actions: filteredActions.filter((a) => a.group === "actions"),
    navigation: filteredActions.filter((a) => a.group === "navigation"),
    conversation: filteredActions.filter((a) => a.group === "conversation"),
    theme: filteredActions.filter((a) => a.group === "theme"),
  }), [filteredActions]);

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

                <CommandActionGroup heading="Actions" actions={actionsByGroup.actions} />
                <CommandActionGroup heading="Navigation" actions={actionsByGroup.navigation} className="mt-2" />

                <CommandConversationGroup
                  heading="Pinned"
                  conversations={groupedConversations.pinned}
                  icon={Pin}
                  onSelect={handleNavigate}
                />

                <CommandConversationGroup
                  heading={searchQuery.trim() ? "Search Results" : "Recent Conversations"}
                  conversations={groupedConversations.recent}
                  icon={MessageSquare}
                  onSelect={handleNavigate}
                />

                <CommandConversationGroup
                  heading="Archived"
                  conversations={groupedConversations.archived}
                  icon={Archive}
                  onSelect={handleNavigate}
                />

                <CommandActionGroup heading="Conversation" actions={actionsByGroup.conversation} className="mt-2" />
                <CommandActionGroup heading="Theme" actions={actionsByGroup.theme} className="mt-2" />
              </Command.List>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

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
