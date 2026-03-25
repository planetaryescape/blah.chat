"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { UserSyncError } from "@/components/auth/UserSyncError";
import { useNewChat } from "@/hooks/useNewChat";
import { useCurrentUser } from "@/lib/hooks/queries/useCurrentUser";

export default function AppPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { startNewChat } = useNewChat();
  const navigationStarted = useRef(false);

  const {
    data: currentUser,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser();

  useEffect(() => {
    if (clerkLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [clerkLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;
    if (userLoading) return;
    if (!currentUser) return;
    if (navigationStarted.current) return;

    navigationStarted.current = true;
    startNewChat();
  }, [clerkLoaded, isSignedIn, userLoading, currentUser, startNewChat]);

  if (isSignedIn && !userLoading && !currentUser && userError) {
    return <UserSyncError />;
  }

  if (!clerkLoaded || (isSignedIn && userLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      {isSignedIn ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      )}
    </div>
  );
}
