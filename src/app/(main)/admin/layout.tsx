"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { AdminSidebar } from "@/components/sidebar/admin-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
    // Redirect non-admins to home
    if (!isLoading && isAuthenticated && isAdmin === false) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // Show loading while checking auth AND admin status
  if (isLoading || isAdmin === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <>
      <AdminSidebar />
      <main
        id="admin-content"
        className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-hidden"
        aria-label="Admin interface"
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <div className="ml-auto">
            <FeedbackButton />
          </div>
        </header>
        {children}
      </main>
    </>
  );
}
