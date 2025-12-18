"use client";

import { useConvexAuth } from "convex/react";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { SelectionContextMenu } from "@/components/chat/SelectionContextMenu";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { NotificationBell } from "@/components/notifications";
import { KeyboardShortcutsManager } from "@/components/KeyboardShortcutsManager";
import { OfflineQueueIndicator } from "@/components/layout/OfflineQueueIndicator";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ConversationProvider } from "@/contexts/ConversationContext";
import { SelectionProvider } from "@/contexts/SelectionContext";
import { useNewChat } from "@/hooks/useNewChat";

function Header() {
  const { open } = useSidebar();
  const router = useRouter();
  const { startNewChat } = useNewChat();

  const handleNewChat = () => {
    startNewChat();
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
            aria-label="New Chat"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/search")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Search conversations"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <FeedbackButton />
      </div>
    </header>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <SelectionProvider>
      <ConversationProvider>
        <KeyboardShortcutsManager />

        {/* Skip to main content - WCAG 2.1 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Don't show sidebar when not authenticated */}
        {!isLoading && !isAuthenticated ? (
          children
        ) : (
          <SidebarProvider>
            {isAdminRoute ? (
              // Admin routes: let admin layout control structure
              <div className="flex w-full h-[100dvh] overflow-hidden">
                {children}
              </div>
            ) : (
              // Regular routes: sidebar + main
              <div className="flex w-full h-[100dvh] overflow-hidden">
                <Suspense fallback={null}>
                  <AppSidebar />
                </Suspense>
                <main
                  id="main-content"
                  className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-hidden"
                  aria-label="Chat interface"
                >
                  <Header />
                  {children}
                </main>
              </div>
            )}
            <CommandPalette />
            <OnboardingTour />
            <SelectionContextMenu />
            <OfflineQueueIndicator />
          </SidebarProvider>
        )}
      </ConversationProvider>
    </SelectionProvider>
  );
}
