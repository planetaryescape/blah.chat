"use client";

import { api } from "@/convex/_generated/api";
import { useNewChat } from "@/hooks/useNewChat";
import { useNewChatModel } from "@/hooks/useNewChatModel";
import { analytics } from "@/lib/analytics";
import { useTemplateStore } from "@/stores/templateStore";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { startNewChat } = useNewChat();
  const { newChatModel } = useNewChatModel();
  const navigationStarted = useRef(false);

  // Zustand store for template text
  const consumeTemplateText = useTemplateStore((s) => s.consumeTemplateText);

  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const createConversation = useMutation(api.conversations.create);

  const fromTemplate = searchParams.get("from") === "template";

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle template-based new chat creation
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!fromTemplate) return;
    if (navigationStarted.current) return;

    navigationStarted.current = true;

    const createChatWithTemplate = async () => {
      // Get template text from Zustand store
      const templateData = consumeTemplateText();

      if (!templateData) {
        // No template text found, just start normal chat
        startNewChat();
        return;
      }

      try {
        // Create new conversation
        const conversationId = await createConversation({
          model: newChatModel,
          title: templateData.name || "New Chat",
        });

        // Track analytics
        analytics.track("template_used", {
          templateId: "from-store",
          templateName: templateData.name,
          conversationId,
        });

        // Store the template text in sessionStorage for the chat page to pick up
        // This survives the navigation to the new chat page
        sessionStorage.setItem("pending-template-text", templateData.text);

        // Navigate to new chat
        router.replace(`/chat/${conversationId}?insertTemplate=true`);
      } catch (error) {
        console.error("Failed to create chat with template:", error);
        startNewChat();
      }
    };

    createChatWithTemplate();
  }, [authLoading, isAuthenticated, fromTemplate, consumeTemplateText, createConversation, newChatModel, router, startNewChat]);

  // Handle normal new chat (no template)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (fromTemplate) return; // Handled by other effect
    if (navigationStarted.current) return;

    navigationStarted.current = true;
    startNewChat();
  }, [isAuthenticated, authLoading, fromTemplate, startNewChat]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Authenticated>
        <p className="text-muted-foreground">
          {fromTemplate ? "Loading template..." : "Loading..."}
        </p>
      </Authenticated>
      <Unauthenticated>
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </Unauthenticated>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}

