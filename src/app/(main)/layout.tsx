"use client";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/CommandPalette";
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
      <div className="flex w-full h-screen">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
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
