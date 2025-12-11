import { UserButton } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  Brain,
  ChevronDown,
  FileText,
  FolderKanban,
  Keyboard,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
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
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useListKeyboardNavigation } from "@/hooks/useListKeyboardNavigation";
import { useNewChat } from "@/hooks/useNewChat";
import { cn } from "@/lib/utils";
import { BulkActionBar } from "./BulkActionBar";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { ConversationList } from "./ConversationList";

const MENU_ITEMS = [
  { icon: Search, label: "Search", href: "/search", featureKey: null },
  { icon: NotebookPen, label: "Notes", href: "/notes", featureKey: "showNotes" as const },
  { icon: Brain, label: "Memories", href: "/memories", featureKey: null },
  { icon: FolderKanban, label: "Projects", href: "/projects", featureKey: "showProjects" as const },
  { icon: FileText, label: "Templates", href: "/templates", featureKey: "showTemplates" as const },
  { icon: Bookmark, label: "Bookmarks", href: "/bookmarks", featureKey: "showBookmarks" as const },
  { icon: Keyboard, label: "Shortcuts", href: "/shortcuts", featureKey: null },
  { icon: Settings, label: "Settings", href: "/settings", featureKey: null },
];

export function AppSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useQueryState("project");

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
  const { isMobile } = useSidebar();
  const { setFilteredConversations } = useConversationContext();
  const { startNewChat } = useNewChat();

  // Check if current user is admin
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);

  // Feature toggles for conditional sidebar items
  const features = useFeatureToggles();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Collapsible state with localStorage
  const [conversationsExpanded, setConversationsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("conversationsExpanded");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem(
      "conversationsExpanded",
      JSON.stringify(conversationsExpanded),
    );
  }, [conversationsExpanded]);

  const handleNewChat = () => {
    startNewChat();
  };

  // Keyboard shortcuts removed - now centralized in useKeyboardShortcuts hook

  const filteredConversations = conversations?.filter((conv: any) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Update context whenever filtered conversations change
  useEffect(() => {
    setFilteredConversations(filteredConversations);
  }, [filteredConversations, setFilteredConversations]);

  // Arrow key navigation
  const { selectedId, clearSelection } = useListKeyboardNavigation<any>({
    items: filteredConversations || [],
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

  // Filter menu items based on feature toggles
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (!item.featureKey) return true; // Always show items without featureKey
    return features[item.featureKey]; // Show only if feature is enabled
  });

  const displayedItems = isMobile ? visibleMenuItems.slice(0, 3) : visibleMenuItems;
  const overflowItems = isMobile ? visibleMenuItems.slice(3) : [];

  // Bulk action handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

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

  const _handleBulkUnpin = async () => {
    // Handled by handleBulkPin directly via toggle logic
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
      <SidebarHeader className="pt-6 px-4 group-data-[collapsible=icon]:px-2">
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
            className="w-full bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border shadow-sm transition-all duration-200 justify-between h-9"
            data-tour="new-chat"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Chat
            </span>
            <ShortcutBadge keys={["mod", "shift", "O"]} />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden relative min-h-[200px]">
          {/* Collapsible header with chevron */}
          <div
            onClick={() => setConversationsExpanded(!conversationsExpanded)}
            className="flex items-center justify-between px-2 cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors"
          >
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                !conversationsExpanded && "-rotate-90",
              )}
            />
          </div>

          {!conversationsExpanded && (
            <div className="px-2 pt-2 text-xs text-muted-foreground">
              Expand to view conversations or press{" "}
              <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono text-[10px]">
                ⌘K
              </kbd>{" "}
              to search
            </div>
          )}

          {conversationsExpanded && (
            <>
              {/* Project filter and search box - now inside group, below label */}
              <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-sidebar via-sidebar to-transparent px-2 space-y-2">
                {features.showProjects && (
                  <ProjectFilter
                    value={projectFilter}
                    onChange={setProjectFilter}
                  />
                )}
                <div
                  role="search"
                  aria-label="Search conversations"
                  className="relative"
                >
                  <Search
                    className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search conversations"
                    className="pl-8 h-9 text-sm bg-background/50 border-sidebar-border focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <SidebarGroupContent>
                {/* Bulk Action Bar - Top Position */}
                {selectedIds.length > 0 ? (
                  <div className="px-2 pb-2">
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
                  /* Selection Mode Hint */
                  <div className="px-2 pb-2 text-[10px] text-muted-foreground hidden sm:block">
                    Tip: Right-click to select
                  </div>
                )}

                <ConversationList
                  conversations={filteredConversations || []}
                  selectedId={selectedId}
                  onClearSelection={clearSelection}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                />
              </SidebarGroupContent>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* Separator between conversations and tools */}
      <div className="px-2 py-3">
        <Separator />
      </div>

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          {displayedItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

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
                  {overflowItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}

          {/* Admin Dashboard - only visible to admins */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin Dashboard">
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
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <UserButton afterSignOutUrl="/sign-in" />
            <ThemeSwitcher />
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-2">
          <UserButton afterSignOutUrl="/sign-in" />
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
