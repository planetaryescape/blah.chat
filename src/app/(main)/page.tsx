"use client";

import { useEffect } from "react";
import { useMutation, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";
import { DEFAULT_MODEL } from "@/lib/ai/registry";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createConversation = useMutation(api.conversations.create);
  const conversations = useQuery(api.conversations.list);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (conversations === undefined) return; // Query loading

    let cancelled = false;

    const handleNavigation = async () => {
      // Check if most recent conversation is empty
      const mostRecent = conversations[0];
      if (mostRecent && mostRecent.messageCount === 0) {
        // Reuse empty conversation
        if (!cancelled) {
          router.push(`/chat/${mostRecent._id}`);
        }
        return;
      }

      // Create new conversation
      const conversationId = await createConversation({
        model: DEFAULT_MODEL,
        title: "New Chat",
      });
      if (!cancelled) {
        router.push(`/chat/${conversationId}`);
      }
    };

    handleNavigation();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, conversations, createConversation, router]);

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
