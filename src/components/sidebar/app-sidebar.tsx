import { Logo } from "@/components/brand/Logo";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { api } from "@/convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
    BarChart3,
    Bookmark,
    Brain,
    FileText,
    FolderKanban,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConversationList } from "./ConversationList";

const MENU_ITEMS = [
  { icon: Search, label: "Search", href: "/search" },
  { icon: Brain, label: "Memories", href: "/memories" },
  { icon: FolderKanban, label: "Projects", href: "/projects" },
  { icon: FileText, label: "Templates", href: "/templates" },
  { icon: BarChart3, label: "Usage", href: "/usage" },
  { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function AppSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  // @ts-ignore
  const conversations = useQuery(api.conversations.list, {});
  const createConversation = useMutation(api.conversations.create);
  const router = useRouter();
  const { isMobile } = useSidebar();

  const handleNewChat = async () => {
    // Check if most recent conversation is empty
    const mostRecent = conversations?.[0];
    if (mostRecent && mostRecent.messageCount === 0) {
      router.push(`/chat/${mostRecent._id}`);
      return;
    }

    // Create new conversation
    const conversationId = await createConversation({
      model: "openai:gpt-5-mini",
    });
    router.push(`/chat/${conversationId}`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const filteredConversations = conversations?.filter((conv: any) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayedItems = isMobile ? MENU_ITEMS.slice(0, 3) : MENU_ITEMS;
  const overflowItems = isMobile ? MENU_ITEMS.slice(3) : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-6 px-4">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/"
            className="hidden group-data-[collapsible=icon]:hidden sm:block hover:opacity-80 transition-opacity"
          >
            <Logo size="md" />
          </Link>
          <Link
            href="/"
            className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity"
          >
            <Logo size="sm" showText={false} />
          </Link>
          <div className="sm:hidden">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </Link>
          </div>
        </div>

        <div className="px-2 mt-4 group-data-[collapsible=icon]:hidden">
          <Button
            onClick={handleNewChat}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-glow hover:shadow-glow-lg transition-all duration-300"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex justify-center mt-2">
          <Button
            onClick={handleNewChat}
            className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 p-0"
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-sidebar via-sidebar to-transparent px-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-background/50 border-sidebar-border focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <ConversationList conversations={filteredConversations || []} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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
                      <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
    </Sidebar>
  );
}
