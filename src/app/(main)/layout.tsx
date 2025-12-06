"use client";

import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsManager } from "@/components/KeyboardShortcutsManager";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Button } from "@/components/ui/button";
import {
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { ConversationProvider } from "@/contexts/ConversationContext";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

function Header() {
  const { open } = useSidebar();
  const router = useRouter();
  // @ts-ignore
  const conversations = useQuery(api.conversations.list, {});
  const createConversation = useMutation(api.conversations.create);

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

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-all duration-300 ease-in-out">
      <SidebarTrigger />
      {!open && (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/search")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Don't show sidebar when not authenticated
  if (!isLoading && !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <ConversationProvider>
      <KeyboardShortcutsManager />
      <SidebarProvider>
        <div className="flex w-full h-[100dvh] overflow-hidden">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-hidden">
            <Header />
            {children}
          </main>
        </div>
        <CommandPalette />
      </SidebarProvider>
    </ConversationProvider>
  );
}
