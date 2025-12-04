"use client";

import { useEffect } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";
import { DEFAULT_MODEL } from "@/lib/ai/registry";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createConversation = useMutation(api.conversations.create);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Will be redirected by middleware or Clerk
      return;
    }

    const autoCreate = async () => {
      const conversationId = await createConversation({
        model: DEFAULT_MODEL,
        title: "New Chat",
      });
      router.push(`/chat/${conversationId}`);
    };

    autoCreate();
  }, [isAuthenticated, isLoading, createConversation, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Authenticated>
        <p className="text-muted-foreground">Creating conversation...</p>
      </Authenticated>
      <Unauthenticated>
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </Unauthenticated>
    </div>
  );
}
