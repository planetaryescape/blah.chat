"use client";

import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useNewChat } from "@/hooks/useNewChat";

export default function AppPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { startNewChat } = useNewChat();
  const navigationStarted = useRef(false);

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  // Navigate to chat when authenticated
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (navigationStarted.current) return; // Prevent double navigation

    navigationStarted.current = true;
    startNewChat();
  }, [isAuthenticated, isLoading, startNewChat]);

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
