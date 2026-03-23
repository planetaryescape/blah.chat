import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Bookmark,
  CheckSquare,
  FileText,
  FolderKanban,
  Ghost,
  Mic,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { NewIncognitoDialog } from "@/components/chat/NewIncognitoDialog";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { ProjectFilter } from "@/components/projects/ProjectFilter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrefetchableLink } from "@/components/ui/prefetchable-link";
import { Separator } from "@/components/ui/separator";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useListKeyboardNavigation } from "@/hooks/useListKeyboardNavigation";
import { useNewChat } from "@/hooks/useNewChat";
import { useRestConversationSync } from "@/hooks/useRestConversationSync";
import { useBulkConversationCrud } from "@/lib/hooks/mutations/useBulkConversationCrud";
import { cn } from "@/lib/utils";
import { BulkActionBar } from "./BulkActionBar";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { ConversationList } from "./ConversationList";
import { ConversationListSkeleton } from "./ConversationListSkeleton";
import { ConversationPrefetcher } from "./ConversationPrefetcher";

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
type SidebarMenuItemConfig = (typeof MENU_ITEMS)[number];
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
  bulkDelete: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<unknown>;
  bulkArchive: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<unknown>;
  bulkPin: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<unknown>;
  bulkUnpin: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<unknown>;
  bulkStar: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<unknown>;
  bulkUnstar: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<unknown>;
  bulkAutoRename: (args: {
    conversationIds: Id<"conversations">[];
  }) => Promise<Array<{ success: boolean }>>;
}

function useSidebarFeatureVisibility(isMobile: boolean) {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const rawAdvancedSettings = useQuery(api.users.getUserPreferencesByCategory, {
    category: "advanced",
  });

  const sidebarFeatures = useMemo<SidebarFeatures>(() => {
    const isLoading = rawAdvancedSettings === undefined;
    const isNotAuthenticated = rawAdvancedSettings === null;

    if (isLoading || isNotAuthenticated) {
      return {
        showNotes: false,
        showTemplates: false,
        showProjects: false,
        showBookmarks: false,
        showSlides: false,
        showTasks: false,
        showSmartAssistant: false,
        isLoading: true,
      };
    }

    return {
      showNotes: rawAdvancedSettings.showNotes ?? true,
      showTemplates: rawAdvancedSettings.showTemplates ?? true,
      showProjects: rawAdvancedSettings.showProjects ?? true,
      showBookmarks: rawAdvancedSettings.showBookmarks ?? true,
      showSlides: rawAdvancedSettings.showSlides ?? false,
      showTasks: rawAdvancedSettings.showTasks ?? true,
      showSmartAssistant: rawAdvancedSettings.showSmartAssistant ?? true,
      isLoading: false,
    };
  }, [rawAdvancedSettings]);

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
        conversationIds: selectedIds as Id<"conversations">[],
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
        conversationIds: selectedIds as Id<"conversations">[],
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
          conversationIds: selectedIds as Id<"conversations">[],
        });
        toast.success(`Unpinned ${selectedIds.length} conversations`);
      } else {
        await bulkPin({
          conversationIds: selectedIds as Id<"conversations">[],
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
          conversationIds: selectedIds as Id<"conversations">[],
        });
        toast.success(`Unstarred ${selectedIds.length} conversations`);
      } else {
        await bulkStar({
          conversationIds: selectedIds as Id<"conversations">[],
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
        conversationIds: selectedIds as Id<"conversations">[],
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

  // Local-first: Convex syncs to Dexie, reads from cache (instant)
  const { conversations: rawConversations, isLoading: conversationsLoading } =
    useRestConversationSync(
      (projectFilter as Id<"projects"> | "none" | undefined) || undefined,
    );

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

  // Check if current user is admin
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
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
        bulkCrud.archiveMany({ conversationIds }),
      bulkAutoRename: ({ conversationIds }) =>
        bulkCrud.autoRenameMany({ conversationIds }),
      bulkDelete: ({ conversationIds }) =>
        bulkCrud.deleteMany({ conversationIds }),
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

function SidebarHeaderContent({
  onNewChat,
  onOpenIncognito,
}: {
  onNewChat: () => void;
  onOpenIncognito: () => void;
}) {
  return (
    <SidebarHeader className="pt-6 px-1.5 group-data-[collapsible=icon]:px-2">
      <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        <PrefetchableLink
          href="/app"
          className="hidden group-data-[collapsible=icon]:hidden sm:block hover:opacity-80 transition-opacity"
        >
          <Logo size="md" />
        </PrefetchableLink>
        <PrefetchableLink
          href="/app"
          className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity"
        >
          <Logo size="sm" showText={false} />
        </PrefetchableLink>
        <div className="sm:hidden">
          <PrefetchableLink
            href="/app"
            className="transition-opacity hover:opacity-80"
          >
            <Logo size="sm" />
          </PrefetchableLink>
        </div>
      </div>

      <div className="mt-4 group-data-[collapsible=icon]:hidden flex gap-2">
        <Button
          onClick={onNewChat}
          className="flex-1 px-2.5 py-2.5 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border shadow-sm transition-all duration-200 justify-between h-9 cursor-pointer"
          data-tour="new-chat"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </span>
          <div className="hidden sm:flex">
            <ShortcutBadge keys={["Alt", "N"]} />
          </div>
        </Button>
        <Button
          onClick={onOpenIncognito}
          className="p-0 transition-all duration-200 border shadow-sm cursor-pointer h-9 w-9 shrink-0 bg-sidebar-accent hover:bg-sidebar-accent/80 text-violet-400 border-sidebar-border "
          title="New Incognito Chat (Shift+Alt+N)"
        >
          <Ghost className="w-4 h-4" />
        </Button>
      </div>
    </SidebarHeader>
  );
}

function SidebarConversationSection({
  conversations,
  conversationsLoading,
  projectFilter,
  selectedId,
  selectedIds,
  showProjects,
  onChangeProjectFilter,
  onClearSelection,
  onClearBulkSelection,
  onDeleteSelection,
  onArchiveSelection,
  onPinSelection,
  onStarSelection,
  onAutoRenameSelection,
  onToggleSelection,
}: {
  conversations: any[];
  conversationsLoading: boolean;
  projectFilter: string | null;
  selectedId: string | null;
  selectedIds: string[];
  showProjects: boolean;
  onChangeProjectFilter: (value: string | null) => void;
  onClearSelection: () => void;
  onClearBulkSelection: () => void;
  onDeleteSelection: () => void;
  onArchiveSelection: () => void;
  onPinSelection: () => void;
  onStarSelection: () => void;
  onAutoRenameSelection: () => void;
  onToggleSelection: (id: string) => void;
}) {
  return (
    <SidebarContent className="flex flex-col gap-0">
      <SidebarGroup className="group-data-[collapsible=icon]:hidden shrink-0 py-0">
        <SidebarGroupLabel>Conversations</SidebarGroupLabel>
        {showProjects && (
          <ProjectFilter
            value={projectFilter}
            onChange={onChangeProjectFilter}
          />
        )}
      </SidebarGroup>

      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarGroup className="group-data-[collapsible=icon]:hidden h-full pt-0">
          <SidebarGroupContent className="h-full overflow-y-auto">
            {conversationsLoading ? (
              <ConversationListSkeleton />
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="sticky top-0 z-10 px-2 pb-2 bg-sidebar">
                    <BulkActionBar
                      selectedCount={selectedIds.length}
                      onClearSelection={onClearBulkSelection}
                      onDelete={onDeleteSelection}
                      onArchive={onArchiveSelection}
                      onPin={onPinSelection}
                      onUnpin={() => {}}
                      onStar={onStarSelection}
                      onUnstar={() => {}}
                      onAutoRename={onAutoRenameSelection}
                      className="w-full border shadow-sm"
                    />
                  </div>
                )}
                <ConversationList
                  conversations={conversations}
                  selectedId={selectedId}
                  onClearSelection={onClearSelection}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
                />
                <div className="mt-2">
                  <div className="px-2 pb-2 text-[10px] text-muted-foreground hidden sm:block">
                    Tip: Right-click to select
                  </div>
                  <kbd className="hidden sm:inline-flex px-2 text-[9px] opacity-60">
                    ⌘1,⌘2... to jump to conversations
                  </kbd>
                </div>
              </>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </SidebarContent>
  );
}

function SidebarNavigationFooter({
  displayedItems,
  overflowItems,
  isAdmin,
  isAuthLoaded,
  isMobile,
  pathname,
  onNavigate,
}: {
  displayedItems: SidebarMenuItemConfig[];
  overflowItems: SidebarMenuItemConfig[];
  isAdmin: boolean;
  isAuthLoaded: boolean;
  isMobile: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarFooter className="pb-4">
      <SidebarMenu>
        {displayedItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={isActive}
                className="p-2.5"
                {...(item.href === "/projects" && {
                  "data-tour": "projects",
                })}
              >
                <PrefetchableLink href={item.href} onClick={onNavigate}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </PrefetchableLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}

        {isMobile && overflowItems.length > 0 && (
          <SidebarOverflowMenu
            items={overflowItems}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        )}

        {isAdmin && (
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Admin Dashboard"
              isActive={pathname.startsWith("/admin")}
            >
              <PrefetchableLink
                href="/admin/feedback"
                className="text-amber-500 hover:text-amber-400"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </PrefetchableLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
      <SidebarUserControls isAuthLoaded={isAuthLoaded} />
    </SidebarFooter>
  );
}

function SidebarOverflowMenu({
  items,
  pathname,
  onNavigate,
}: {
  items: SidebarMenuItemConfig[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="More">
            <MoreHorizontal className="w-4 h-4" />
            <span>More</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="w-48 bg-sidebar border-sidebar-border"
        >
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <DropdownMenuItem key={item.href} asChild>
                <PrefetchableLink
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  )}
                  onClick={onNavigate}
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </PrefetchableLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function SidebarUserControls({ isAuthLoaded }: { isAuthLoaded: boolean }) {
  return (
    <>
      <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden min-h-10">
        <div className="flex items-center justify-between">
          {isAuthLoaded && <SidebarUserButton />}
          <ThemeSwitcher />
        </div>
      </div>
      <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-2">
        {isAuthLoaded && <SidebarUserButton />}
      </div>
    </>
  );
}

function SidebarUserButton() {
  return (
    <UserButton
      afterSignOutUrl="/sign-in"
      appearance={{
        elements: {
          userButtonPopoverCard: { pointerEvents: "initial" },
        },
      }}
    />
  );
}
