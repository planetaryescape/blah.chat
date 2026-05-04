"use client";

import type { Conversation } from "@blah-chat/api-client";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Archive, Loader2, MessageSquare, Pin, Search } from "lucide-react";
import { matchSorter } from "match-sorter";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CommandActionGroup,
  CommandConversationGroup,
} from "@/components/command-palette";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useNewChat } from "@/hooks/useNewChat";
import { useSDKClient } from "@/lib/api/sdkClient";
import { createActionItems } from "@/lib/command-palette-actions";
import { DeleteConversationDialog } from "./sidebar/DeleteConversationDialog";
import { RenameDialog } from "./sidebar/RenameDialog";

function getConversationIdFromPath(
  pathname: string | null | undefined,
): string | null {
  if (!pathname?.startsWith("/chat/")) return null;
  const conversationId = pathname.split("/")[2];
  return conversationId || null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const _listRef = useRef<HTMLDivElement>(null);
  const sdk = useSDKClient();
  const { startNewChat } = useNewChat();
  const features = useFeatureToggles();

  const conversationId = getConversationIdFromPath(pathname);

  const { data: conversationsList } = useQuery({
    queryKey: ["command-palette-conversations"],
    queryFn: async () => {
      const result = await sdk.listConversations({ limit: 100 });
      return result.items;
    },
    staleTime: 30_000,
  });

  const { data: currentConversation } = useQuery({
    queryKey: ["conversation", conversationId],
    enabled: !!conversationId,
    queryFn: () => sdk.getConversationById(conversationId!),
  });

  const conversationActions = useConversationActions(
    conversationId as any,
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

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const messages = await sdk.searchMessages({
          query: searchQuery,
          limit: 20,
        });
        const seen = new Set<string>();
        const conversationResults: Conversation[] = [];
        for (const msg of messages) {
          const cId = msg.conversationId;
          if (cId && !seen.has(cId)) {
            seen.add(cId);
            conversationResults.push({
              _id: cId,
              title: msg.conversationTitle ?? undefined,
            } as Conversation);
          }
        }
        setSearchResults(conversationResults);
        setIsSearching(false);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, sdk]);

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
        conversationId: conversationId as any,
        conversation: currentConversation as any,
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
            (currentConversation as any)?.starred || false,
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
    ],
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
    if (!conversationsList) return { pinned: [], recent: [], archived: [] };
    return {
      pinned: conversationsList.filter((c: any) => c.pinned && !c.archived),
      recent: conversationsList.filter((c: any) => !c.pinned && !c.archived),
      archived: conversationsList.filter((c: any) => c.archived),
    };
  }, [conversationsList, searchQuery, searchResults]);

  const actionsByGroup = useMemo(
    () => ({
      actions: filteredActions.filter((a) => a.group === "actions"),
      navigation: filteredActions.filter((a) => a.group === "navigation"),
      conversation: filteredActions.filter((a) => a.group === "conversation"),
      theme: filteredActions.filter((a) => a.group === "theme"),
    }),
    [filteredActions],
  );

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

                <CommandActionGroup
                  heading="Actions"
                  actions={actionsByGroup.actions}
                />
                <CommandActionGroup
                  heading="Navigation"
                  actions={actionsByGroup.navigation}
                  className="mt-2"
                />

                <CommandConversationGroup
                  heading="Pinned"
                  conversations={groupedConversations.pinned as any}
                  icon={Pin}
                  onSelect={handleNavigate}
                />

                <CommandConversationGroup
                  heading={
                    searchQuery.trim()
                      ? "Search Results"
                      : "Recent Conversations"
                  }
                  conversations={groupedConversations.recent as any}
                  icon={MessageSquare}
                  onSelect={handleNavigate}
                />

                <CommandConversationGroup
                  heading="Archived"
                  conversations={groupedConversations.archived as any}
                  icon={Archive}
                  onSelect={handleNavigate}
                />

                <CommandActionGroup
                  heading="Conversation"
                  actions={actionsByGroup.conversation}
                  className="mt-2"
                />
                <CommandActionGroup
                  heading="Theme"
                  actions={actionsByGroup.theme}
                  className="mt-2"
                />
              </Command.List>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      {currentConversation && (
        <>
          <RenameDialog
            conversation={currentConversation as any}
            open={showRename}
            onOpenChange={setShowRename}
          />
          <DeleteConversationDialog
            open={showDelete}
            onOpenChange={setShowDelete}
            onConfirm={conversationActions.handleDelete}
            conversationTitle={currentConversation.title ?? undefined}
          />
        </>
      )}
    </>
  );
}
