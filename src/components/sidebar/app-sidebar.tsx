import { UserButton, useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  Brain,
  CheckSquare,
  FileText,
  FolderKanban,
  Keyboard,
  Mic,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { ProjectFilter } from "@/components/projects/ProjectFilter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useConversationContext } from "@/contexts/ConversationContext";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useListKeyboardNavigation } from "@/hooks/useListKeyboardNavigation";
import { useNewChat } from "@/hooks/useNewChat";
import { cn } from "@/lib/utils";
import { BulkActionBar } from "./BulkActionBar";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { ConversationList } from "./ConversationList";
import { ConversationListSkeleton } from "./ConversationListSkeleton";

const MENU_ITEMS = [
  { icon: Search, label: "Search", href: "/search", featureKey: null },
  {
    icon: NotebookPen,
    label: "Notes",
    href: "/notes",
    featureKey: "showNotes" as const,
  },
  { icon: Brain, label: "Memories", href: "/memories", featureKey: null },
  {
    icon: FolderKanban,
    label: "Projects",
    href: "/projects",
    featureKey: "showProjects" as const,
  },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", featureKey: null },
  { icon: Mic, label: "Smart Assistant", href: "/assistant", featureKey: null },
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
  { icon: Keyboard, label: "Shortcuts", href: "/shortcuts", featureKey: null }, // Hidden on mobile via featureKey filtering logic update below
  { icon: Settings, label: "Settings", href: "/settings", featureKey: null },
];

export function AppSidebar() {
  const [projectFilter, setProjectFilter] = useQueryState("project");

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversations = useQuery(api.conversations.list, {
    projectId:
      (projectFilter as Id<"projects"> | "none" | undefined) || undefined,
  });

  // Bulk actions mutations
  const bulkDelete = useMutation(api.conversations.bulkDelete);
  const bulkArchive = useMutation(api.conversations.bulkArchive);
  const bulkPin = useMutation(api.conversations.bulkPin);
  const bulkUnpin = useMutation(api.conversations.bulkUnpin);
  const bulkStar = useMutation(api.conversations.bulkStar);
  const bulkUnstar = useMutation(api.conversations.bulkUnstar);
  const bulkAutoRename = useAction(api.conversations.actions.bulkAutoRename);

  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { setFilteredConversations } = useConversationContext();
  const { startNewChat } = useNewChat();
  const { isLoaded: isAuthLoaded } = useAuth();

  // Get advanced settings with proper loading state detection
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const rawAdvancedSettings = useQuery(api.users.getUserPreferencesByCategory, {
    category: "advanced",
  });

  // Check if current user is admin
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);

  // Use advancedSettings for sidebar visibility
  // Use the raw query state to properly detect loading
  const sidebarFeatures = useMemo(() => {
    // rawAdvancedSettings: undefined = loading, null = not authenticated, object = loaded
    const isLoading = rawAdvancedSettings === undefined;
    const isNotAuthenticated = rawAdvancedSettings === null;

    if (isLoading || isNotAuthenticated) {
      // During loading or when not authenticated, don't show any advanced features
      // This prevents the flicker of items appearing and then disappearing
      return {
        showNotes: false,
        showTemplates: false,
        showProjects: false,
        showBookmarks: false,
        isLoading: true,
      };
    }

    // Settings are loaded - use actual values with defaults from PREFERENCE_DEFAULTS
    return {
      showNotes: rawAdvancedSettings.showNotes ?? true,
      showTemplates: rawAdvancedSettings.showTemplates ?? true,
      showProjects: rawAdvancedSettings.showProjects ?? true,
      showBookmarks: rawAdvancedSettings.showBookmarks ?? true,
      isLoading: false,
    };
  }, [rawAdvancedSettings]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleNewChat = () => {
    startNewChat();
  };

  // Keyboard shortcuts removed - now centralized in useKeyboardShortcuts hook

  // Update context whenever conversations change
  useEffect(() => {
    setFilteredConversations(conversations);
  }, [conversations, setFilteredConversations]);

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

  // Filter menu items based on advanced settings
  // Don't render any items with featureKeys during loading to prevent flicker
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    // Special case: Hide Shortcuts on mobile
    if (isMobile && item.href === "/shortcuts") return false;

    if (!item.featureKey) return true; // Always show items without featureKey (Search, Memories, Tasks, etc.)

    // During loading, hide all items with featureKeys to prevent them from showing then disappearing
    if (sidebarFeatures.isLoading) return false;

    return sidebarFeatures[item.featureKey]; // Show only if feature is enabled in advanced settings
  });

  const displayedItems = isMobile
    ? visibleMenuItems.slice(0, 3)
    : visibleMenuItems;
  const overflowItems = isMobile ? visibleMenuItems.slice(3) : [];

  // Bulk action handlers - wrapped in useCallback to prevent infinite re-renders
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
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
      // If current chat was deleted, redirect home
      // Checking if pathname is in selectedIds is hard here without pathname hook,
      // but convex query update will trigger redirect in ConversationItem if needed?
      // ConversationItem handles redirect if *itself* is deleted.
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
    // Check if all selected are already pinned
    const selectedConvos =
      conversations?.filter((c: any) => selectedIds.includes(c._id)) || [];
    const allPinned =
      selectedConvos.length > 0 && selectedConvos.every((c: any) => c.pinned);

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
    // Check if all selected are already starred
    const selectedConvos =
      conversations?.filter((c: any) => selectedIds.includes(c._id)) || [];
    const allStarred =
      selectedConvos.length > 0 && selectedConvos.every((c: any) => c.starred);

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
      const successCount = results.filter((r: any) => r.success).length;
      toast.success(`Renamed ${successCount} conversations`);
      setSelectedIds([]);
    } catch (_error) {
      toast.error("Failed to rename conversations");
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      data-tour="sidebar"
      role="navigation"
      aria-label="Main navigation and conversations"
    >
      <SidebarHeader className="pt-6 px-1.5 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/app"
            className="hidden group-data-[collapsible=icon]:hidden sm:block hover:opacity-80 transition-opacity"
          >
            <Logo size="md" />
          </Link>
          <Link
            href="/app"
            className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity"
          >
            <Logo size="sm" showText={false} />
          </Link>
          <div className="sm:hidden">
            <Link href="/app" className="hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </Link>
          </div>
        </div>

        <div className="mt-4 group-data-[collapsible=icon]:hidden">
          <Button
            onClick={handleNewChat}
            className="w-full px-2.5 py-2.5 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border shadow-sm transition-all duration-200 justify-between h-9 cursor-pointer"
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
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-0">
        <SidebarGroup className="group-data-[collapsible=icon]:hidden shrink-0">
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>

          {/* Project filter - Fixed */}
          {sidebarFeatures.showProjects && (
            <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          )}
        </SidebarGroup>

        {/* Scrollable conversations area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <SidebarGroup className="group-data-[collapsible=icon]:hidden h-full pt-0">
            <SidebarGroupContent className="h-full overflow-y-auto">
              {conversations === undefined ? (
                <ConversationListSkeleton />
              ) : (
                <>
                  {/* Bulk Action Bar - Top Position */}
                  {selectedIds.length > 0 ? (
                    <div className="px-2 pb-2 sticky top-0 bg-sidebar z-10">
                      <BulkActionBar
                        selectedCount={selectedIds.length}
                        onClearSelection={handleClearSelection}
                        onDelete={() => setShowBulkDeleteConfirm(true)}
                        onArchive={handleBulkArchive}
                        onPin={handleBulkPin}
                        onUnpin={() => {}}
                        onStar={handleBulkStar}
                        onUnstar={() => {}}
                        onAutoRename={handleBulkAutoRename}
                        className="w-full border shadow-sm"
                      />
                    </div>
                  ) : (
                    <></>
                  )}
                  <ConversationList
                    conversations={conversations || []}
                    selectedId={selectedId}
                    onClearSelection={clearSelection}
                    selectedIds={selectedIds}
                    onToggleSelection={toggleSelection}
                  />
                  <div className="mt-2">
                    {/* Selection Mode Hint */}
                    <div className="px-2 pb-2 text-[10px] text-muted-foreground hidden sm:block">
                      Tip: Right-click to select
                    </div>

                    {/* Keyboard Shortcut Hint */}
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

      {/* Separator between conversations and tools */}
      <div className="px-2 py-1">
        <Separator />
      </div>

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
                >
                  <Link href={item.href}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {isMobile && overflowItems.length > 0 && (
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
                  {overflowItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            isActive &&
                              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                          )}
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}

          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Admin Dashboard"
                isActive={pathname.startsWith("/admin")}
              >
                <Link
                  href="/admin/feedback"
                  className="text-amber-500 hover:text-amber-400"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden min-h-10">
          <div className="flex items-center justify-between">
            {isAuthLoaded && <UserButton afterSignOutUrl="/sign-in" />}
            <ThemeSwitcher />
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-2">
          {isAuthLoaded && <UserButton afterSignOutUrl="/sign-in" />}
        </div>
      </SidebarFooter>

      <BulkDeleteDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
      />
    </Sidebar>
  );
}
