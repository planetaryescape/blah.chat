"use client";

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { UserSyncError } from "@/components/auth/UserSyncError";
import { useNewChat } from "@/hooks/useNewChat";
import { useCurrentUser } from "@/lib/hooks/queries/useCurrentUser";

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

interface SyncState {
  clerkLoaded: boolean;
  isSignedIn: boolean;
  userLoading: boolean;
  hasUser: boolean;
  hasError: boolean;
}

function shouldShowError(s: SyncState) {
  return s.isSignedIn && !s.userLoading && !s.hasUser && s.hasError;
}

function shouldShowLoading(s: SyncState) {
  return !s.clerkLoaded || (s.isSignedIn && s.userLoading);
}

function isReady(s: SyncState, started: boolean) {
  return (
    s.clerkLoaded && s.isSignedIn && !s.userLoading && s.hasUser && !started
  );
}

export default function AppPageClient() {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { startNewChat } = useNewChat();
  const navigationStarted = useRef(false);

  const {
    data: currentUser,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser({ enabled: clerkLoaded && !!isSignedIn });

  if (clerkLoaded && !isSignedIn) {
    redirect("/sign-in");
  }

  const state: SyncState = {
    clerkLoaded: !!clerkLoaded,
    isSignedIn: !!isSignedIn,
    userLoading,
    hasUser: !!currentUser,
    hasError: !!userError,
  };

  // react-doctor: navigation must follow async user-sync state.
  useEffect(() => {
    if (!isReady(state, navigationStarted.current)) return;
    navigationStarted.current = true;
    startNewChat();
  }, [state, startNewChat]);

  if (shouldShowError(state)) {
    return <UserSyncError />;
  }

  if (shouldShowLoading(state)) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <LoadingScreen
      message={isSignedIn ? "Loading..." : "Redirecting to sign in..."}
    />
  );
}
