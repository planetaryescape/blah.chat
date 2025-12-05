"use client";

import { CommandPalette } from "@/components/CommandPalette";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useConvexAuth } from "convex/react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Don't show sidebar when not authenticated
  if (!isLoading && !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex w-full h-[100dvh] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-hidden">
          <div className="border-b p-2">
            <SidebarTrigger />
          </div>
          {children}
        </main>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
