import { useAuth, useUser } from "@clerk/nextjs";
import {
  Bookmark,
  CheckSquare,
  FileText,
  FolderKanban,
  Mic,
  NotebookPen,
  Search,
  Settings,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NewIncognitoDialog } from "@/components/chat/NewIncognitoDialog";
import { Separator } from "@/components/ui/separator";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { useListKeyboardNavigation } from "@/hooks/useListKeyboardNavigation";
import { useNewChat } from "@/hooks/useNewChat";
import { useRestConversationSync } from "@/hooks/useRestConversationSync";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useBulkConversationCrud } from "@/lib/hooks/mutations/useBulkConversationCrud";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { ConversationPrefetcher } from "./ConversationPrefetcher";
import { SidebarConversationSection } from "./SidebarConversationSection";
import { SidebarHeaderContent } from "./SidebarHeaderContent";
import { SidebarNavigationFooter } from "./SidebarNavigationFooter";

const MENU_ITEMS = [
  { icon: Search, label: "Search", href: "/search", featureKey: null },
  {
    icon: NotebookPen,
    label: "Notes",
    href: "/notes",
    featureKey: "showNotes" as const,
  },
  {
    icon: FolderKanban,
    label: "Projects",
    href: "/projects",
    featureKey: "showProjects" as const,
  },
  {
    icon: CheckSquare,
    label: "Tasks",
    href: "/tasks",
    featureKey: "showTasks" as const,
  },
  {
    icon: Mic,
    label: "Smart Assistant",
    href: "/assistant",
    featureKey: "showSmartAssistant" as const,
  },
  {
    icon: FileText,
    label: "Templates",
    href: "/templates",
    featureKey: "showTemplates" as const,
  },
  {
    icon: Bookmark,
    label: "Bookmarks",
    href: "/bookmarks",
    featureKey: "showBookmarks" as const,
  },
  { icon: Settings, label: "Settings", href: "/settings", featureKey: null },
];

const RECENT_CONVERSATION_CUTOFF = Date.now() - 7 * 24 * 60 * 60 * 1000;
type SidebarConversation = {
  _id: string;
  updatedAt: number;
  pinned?: boolean;
  starred?: boolean;
};

interface SidebarFeatures {
  showNotes: boolean;
  showTemplates: boolean;
  showProjects: boolean;
  showBookmarks: boolean;
  showSlides: boolean;
  showTasks: boolean;
  showSmartAssistant: boolean;
  isLoading: boolean;
}

interface SidebarBulkMutations {
  bulkDelete: (args: { conversationIds: string[] }) => Promise<unknown>;
  bulkArchive: (args: { conversationIds: string[] }) => Promise<unknown>;
  bulkPin: (args: { conversationIds: string[] }) => Promise<unknown>;
  bulkUnpin: (args: { conversationIds: string[] }) => Promise<unknown>;
  bulkStar: (args: { conversationIds: string[] }) => Promise<unknown>;
  bulkUnstar: (args: { conversationIds: string[] }) => Promise<unknown>;
  bulkAutoRename: (args: {
    conversationIds: string[];
  }) => Promise<Array<{ success: boolean }>>;
}

function useSidebarFeatureVisibility(isMobile: boolean) {
  const showNotes = useUserPreference("showNotes");
  const showTemplates = useUserPreference("showTemplates");
  const showProjects = useUserPreference("showProjects");
  const showBookmarks = useUserPreference("showBookmarks");
  const showTasks = useUserPreference("showTasks");
  const showSmartAssistant = useUserPreference("showSmartAssistant");

  const sidebarFeatures = useMemo<SidebarFeatures>(() => {
    return {
      showNotes: showNotes ?? true,
      showTemplates: showTemplates ?? true,
      showProjects: showProjects ?? true,
      showBookmarks: showBookmarks ?? true,
      showSlides: false,
      showTasks: showTasks ?? true,
      showSmartAssistant: showSmartAssistant ?? true,
      isLoading: false,
    };
  }, [
    showNotes,
    showTemplates,
    showProjects,
    showBookmarks,
    showTasks,
    showSmartAssistant,
  ]);

  const visibleMenuItems = useMemo(
    () =>
      MENU_ITEMS.filter((item) => {
        if (isMobile && item.href === "/shortcuts") return false;
        if (!item.featureKey) return true;
        if (sidebarFeatures.isLoading) return false;
        return sidebarFeatures[item.featureKey];
      }),
    [isMobile, sidebarFeatures],
  );

  return {
    sidebarFeatures,
    displayedItems: isMobile ? visibleMenuItems.slice(0, 3) : visibleMenuItems,
    overflowItems: isMobile ? visibleMenuItems.slice(3) : [],
  };
}

function useIncognitoDialogState() {
  const [showIncognitoDialog, setShowIncognitoDialog] = useState(false);

  useEffect(() => {
    const handler = () => setShowIncognitoDialog(true);
    window.addEventListener("open-new-incognito-dialog", handler);
    return () =>
      window.removeEventListener("open-new-incognito-dialog", handler);
  }, []);

  return {
    showIncognitoDialog,
    setShowIncognitoDialog,
    openIncognitoDialog: () => setShowIncognitoDialog(true),
  };
}

function useSidebarBulkActions(
  conversations: SidebarConversation[] | undefined,
  {
    bulkArchive,
    bulkAutoRename,
    bulkDelete,
    bulkPin,
    bulkStar,
    bulkUnpin,
    bulkUnstar,
  }: SidebarBulkMutations,
) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBulkDelete = async () => {
    try {
      await bulkDelete({
        conversationIds: selectedIds as string[],
      });
      toast.success(`Deleted ${selectedIds.length} conversations`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (_error) {
      toast.error("Failed to delete conversations");
    }
  };

  const handleBulkArchive = async () => {
    try {
      await bulkArchive({
        conversationIds: selectedIds as string[],
      });
      toast.success(`Archived ${selectedIds.length} conversations`);
      setSelectedIds([]);
    } catch (_error) {
      toast.error("Failed to archive conversations");
    }
  };

  const handleBulkPin = async () => {
    const selectedConversations =
      conversations?.filter((conversation) =>
        selectedIds.includes(conversation._id),
      ) || [];
    const allPinned =
      selectedConversations.length > 0 &&
      selectedConversations.every((conversation) => conversation.pinned);

    try {
      if (allPinned) {
        await bulkUnpin({
          conversationIds: selectedIds as string[],
        });
        toast.success(`Unpinned ${selectedIds.length} conversations`);
      } else {
        await bulkPin({
          conversationIds: selectedIds as string[],
        });
        toast.success(`Pinned ${selectedIds.length} conversations`);
      }
      setSelectedIds([]);
    } catch (_error) {
      toast.error("Failed to update pin status");
    }
  };

  const handleBulkStar = async () => {
    const selectedConversations =
      conversations?.filter((conversation) =>
        selectedIds.includes(conversation._id),
      ) || [];
    const allStarred =
      selectedConversations.length > 0 &&
      selectedConversations.every((conversation) => conversation.starred);

    try {
      if (allStarred) {
        await bulkUnstar({
          conversationIds: selectedIds as string[],
        });
        toast.success(`Unstarred ${selectedIds.length} conversations`);
      } else {
        await bulkStar({
          conversationIds: selectedIds as string[],
        });
        toast.success(`Starred ${selectedIds.length} conversations`);
      }
      setSelectedIds([]);
    } catch (_error) {
      toast.error("Failed to update star status");
    }
  };

  const handleBulkAutoRename = async () => {
    try {
      toast.info("Generating titles...");
      const results = await bulkAutoRename({
        conversationIds: selectedIds as string[],
      });
      toast.success(
        `Renamed ${results.filter((result) => result.success).length} conversations`,
      );
      setSelectedIds([]);
    } catch (_error) {
      toast.error("Failed to rename conversations");
    }
  };

  return {
    selectedIds,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    toggleSelection,
    handleClearSelection,
    handleBulkDelete,
    handleBulkArchive,
    handleBulkPin,
    handleBulkStar,
    handleBulkAutoRename,
  };
}

export function AppSidebar() {
  const [projectFilter, setProjectFilter] = useQueryState("project");

  // Local-first: REST syncs to local cache, reads from cache (instant)
  const { conversations: rawConversations, isLoading: conversationsLoading } =
    useRestConversationSync((projectFilter as any) || undefined);

  const conversations = rawConversations;
  const bulkCrud = useBulkConversationCrud();

  // Prefetch messages for recent conversations (< 7 days) for instant navigation
  const recentConversationIds = useMemo(() => {
    if (!conversations) return [];
    return conversations
      .filter((c) => c.updatedAt > RECENT_CONVERSATION_CUTOFF)
      .slice(0, 20) // Cap at 20 to avoid too many subscriptions
      .map((c) => c._id);
  }, [conversations]);

  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { startNewChat } = useNewChat();
  const { isLoaded: isAuthLoaded } = useAuth();

  const { user: clerkUser } = useUser();
  const isAdmin =
    (clerkUser?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;
  const { displayedItems, overflowItems, sidebarFeatures } =
    useSidebarFeatureVisibility(isMobile);
  const {
    handleBulkArchive,
    handleBulkAutoRename,
    handleBulkDelete,
    handleBulkPin,
    handleBulkStar,
    handleClearSelection,
    selectedIds,
    setShowBulkDeleteConfirm,
    showBulkDeleteConfirm,
    toggleSelection,
  } = useSidebarBulkActions(
    conversations as SidebarConversation[] | undefined,
    {
      bulkArchive: ({ conversationIds }) =>
        bulkCrud.archiveMany({ conversationIds: conversationIds as any }),
      bulkAutoRename: ({ conversationIds }) =>
        bulkCrud.autoRenameMany({ conversationIds: conversationIds as any }),
      bulkDelete: ({ conversationIds }) =>
        bulkCrud.deleteMany({ conversationIds: conversationIds as any }),
      bulkPin: ({ conversationIds }) =>
        bulkCrud.setPinned(
          (conversations ?? []).filter((conversation) =>
            conversationIds.includes(conversation._id),
          ),
          true,
        ),
      bulkStar: ({ conversationIds }) =>
        bulkCrud.setStarred(
          (conversations ?? []).filter((conversation) =>
            conversationIds.includes(conversation._id),
          ),
          true,
        ),
      bulkUnpin: ({ conversationIds }) =>
        bulkCrud.setPinned(
          (conversations ?? []).filter((conversation) =>
            conversationIds.includes(conversation._id),
          ),
          false,
        ),
      bulkUnstar: ({ conversationIds }) =>
        bulkCrud.setStarred(
          (conversations ?? []).filter((conversation) =>
            conversationIds.includes(conversation._id),
          ),
          false,
        ),
    },
  );
  const { openIncognitoDialog, setShowIncognitoDialog, showIncognitoDialog } =
    useIncognitoDialogState();

  const handleNewChat = () => {
    startNewChat();
  };

  // Keyboard shortcuts removed - now centralized in useKeyboardShortcuts hook

  // Arrow key navigation
  const { selectedId, clearSelection } = useListKeyboardNavigation<any>({
    items: conversations || [],
    onSelect: (conv: any) => {
      // If in selection mode, select it? Or just navigate?
      // For now, keep standard navigation to avoid confusion unless keys are bound differently
      router.push(`/chat/${conv._id}`);
      clearSelection();
    },
    enabled: true,
    loop: true,
    getItemId: (conv: any) => conv._id,
  });

  return (
    <Sidebar
      id="conversation-list"
      collapsible="icon"
      data-tour="sidebar"
      role="navigation"
      aria-label="Main navigation and conversations"
    >
      <SidebarHeaderContent
        onNewChat={handleNewChat}
        onOpenIncognito={openIncognitoDialog}
      />

      <SidebarConversationSection
        conversations={conversations || []}
        conversationsLoading={conversationsLoading}
        projectFilter={projectFilter}
        selectedId={selectedId}
        selectedIds={selectedIds}
        showProjects={sidebarFeatures.showProjects}
        onChangeProjectFilter={setProjectFilter}
        onClearSelection={clearSelection}
        onClearBulkSelection={handleClearSelection}
        onDeleteSelection={() => setShowBulkDeleteConfirm(true)}
        onArchiveSelection={handleBulkArchive}
        onPinSelection={handleBulkPin}
        onStarSelection={handleBulkStar}
        onAutoRenameSelection={handleBulkAutoRename}
        onToggleSelection={toggleSelection}
      />

      <div className="px-2 py-1">
        <Separator />
      </div>

      <SidebarNavigationFooter
        displayedItems={displayedItems}
        overflowItems={overflowItems}
        isAdmin={Boolean(isAdmin)}
        isAuthLoaded={isAuthLoaded}
        isMobile={isMobile}
        pathname={pathname}
        onNavigate={() => {
          if (isMobile) setOpenMobile(false);
        }}
      />

      <BulkDeleteDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
      />

      <NewIncognitoDialog
        open={showIncognitoDialog}
        onOpenChange={setShowIncognitoDialog}
      />

      {/* Prefetch recent conversations for instant navigation */}
      {recentConversationIds.map((id) => (
        <ConversationPrefetcher key={id} conversationId={id} />
      ))}
    </Sidebar>
  );
}
