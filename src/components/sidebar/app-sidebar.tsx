"use client";

import { Logo } from "@/components/brand/Logo";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { Button } from "@/components/ui/button";
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
  Plus,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConversationList } from "./ConversationList";

export function AppSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  // @ts-ignore
  const conversations = useQuery(api.conversations.list, {});
  const createConversation = useMutation(api.conversations.create);
  const router = useRouter();

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-6 px-4">
        <div className="flex items-center justify-between px-2">
          <div className="hidden group-data-[collapsible=icon]:hidden sm:block">
            <Logo size="md" />
          </div>
          <div className="group-data-[collapsible=icon]:block hidden">
            <Logo size="sm" showText={false} />
          </div>
          <div className="sm:hidden">
            <Logo size="sm" />
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
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Search">
              <Link href="/search">
                <Search className="w-4 h-4" />
                <span>Search</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Memories">
              <Link href="/memories">
                <Brain className="w-4 h-4" />
                <span>Memories</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Projects">
              <Link href="/projects">
                <FolderKanban className="w-4 h-4" />
                <span>Projects</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Templates">
              <Link href="/templates">
                <FileText className="w-4 h-4" />
                <span>Templates</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Usage">
              <Link href="/usage">
                <BarChart3 className="w-4 h-4" />
                <span>Usage</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Bookmarks">
              <Link href="/bookmarks">
                <Bookmark className="w-4 h-4" />
                <span>Bookmarks</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/settings">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
