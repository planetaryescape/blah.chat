"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { UserSyncError } from "@/components/auth/UserSyncError";
import { useNewChat } from "@/hooks/useNewChat";

export default function AppPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { startNewChat } = useNewChat();
  const navigationStarted = useRef(false);

  // Check if user exists in Convex (webhook sync)
  // undefined = loading, null = not found (webhook failed), object = user exists
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  // Redirect unauthenticated users to sign-in (check Clerk auth first)
  useEffect(() => {
    if (clerkLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [clerkLoaded, isSignedIn, router]);

  // Navigate to chat when authenticated AND user exists in Convex
  // Only proceed if Clerk auth is ready and user is signed in
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return; // Wait for Clerk auth
    if (authLoading || !isAuthenticated) return; // Wait for Convex auth
    if (convexUser === undefined) return; // Still loading user data
    if (convexUser === null) return; // User doesn't exist - show error (don't redirect)
    if (navigationStarted.current) return; // Prevent double navigation

    navigationStarted.current = true;
    startNewChat();
  }, [
    clerkLoaded,
    isSignedIn,
    isAuthenticated,
    authLoading,
    convexUser,
    startNewChat,
  ]);

  // Show error if authenticated but no Convex user (webhook failure)
  if (isSignedIn && isAuthenticated && convexUser === null) {
    return <UserSyncError />;
  }

  // Show loading while Clerk or Convex auth is initializing
  if (!clerkLoaded || (isSignedIn && authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
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
