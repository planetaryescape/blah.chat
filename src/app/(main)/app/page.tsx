"use client";

import { api } from "@/convex/_generated/api";
import { DEFAULT_MODEL } from "@/lib/ai/registry";
import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AppPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createConversation = useMutation(api.conversations.create);
  const conversations = useQuery(api.conversations.list, {});
  const navigationStarted = useRef(false);

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  // Navigate to chat when authenticated and data loaded
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (conversations === undefined) return; // Query loading
    if (navigationStarted.current) return; // Already navigating

    // Check sessionStorage to prevent rapid re-creation across remounts
    const lastCreationKey = "last_conversation_creation";
    const lastCreation = sessionStorage.getItem(lastCreationKey);
    const now = Date.now();

    if (lastCreation) {
      const timeSinceLastCreation = now - Number.parseInt(lastCreation, 10);
      if (timeSinceLastCreation < 1000) {
        // Less than 1 second since last creation, skip
        return;
      }
    }

    navigationStarted.current = true;

    const handleNavigation = async () => {
      // Check if most recent conversation is empty
      const mostRecent = conversations[0];
      if (mostRecent && mostRecent.messageCount === 0) {
        // Reuse empty conversation
        router.push(`/chat/${mostRecent._id}`);
        return;
      }

      // Create new conversation
      sessionStorage.setItem(lastCreationKey, now.toString());
      const conversationId = await createConversation({
        model: DEFAULT_MODEL,
        title: "New Chat",
      });
      router.push(`/chat/${conversationId}`);
    };

    handleNavigation();
  }, [isAuthenticated, isLoading, conversations, router, createConversation]);

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
