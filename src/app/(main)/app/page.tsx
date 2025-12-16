"use client";

import { UserSyncError } from "@/components/auth/UserSyncError";
import { api } from "@/convex/_generated/api";
import { useNewChat } from "@/hooks/useNewChat";
import { Authenticated, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AppPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { startNewChat } = useNewChat();
  const navigationStarted = useRef(false);

  // Check if user exists in Convex (webhook sync)
  // undefined = loading, null = not found (webhook failed), object = user exists
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  // Navigate to chat when authenticated AND user exists in Convex
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (convexUser === undefined) return; // Still loading user data
    if (convexUser === null) return; // User doesn't exist - show error (don't redirect)
    if (navigationStarted.current) return; // Prevent double navigation

    navigationStarted.current = true;
    startNewChat();
  }, [isAuthenticated, authLoading, convexUser, startNewChat]);

  // Show error if authenticated but no Convex user (webhook failure)
  if (isAuthenticated && convexUser === null) {
    return <UserSyncError />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Authenticated>
        <p className="text-muted-foreground">Loading...</p>
      </Authenticated>
      <Unauthenticated>
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </Unauthenticated>
    </div>
  );
}

