"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import { useNewChat } from "@/hooks/useNewChat";
import { useNewChatModel } from "@/hooks/useNewChatModel";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { useTemplateStore } from "@/stores/templateStore";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: authLoaded, userId } = useAuth();
  const { startNewChat } = useNewChat();
  const { newChatModel } = useNewChatModel();
  const apiClient = useApiClient();
  const navigationStarted = useRef(false);

  // Zustand store for template text
  const consumeTemplateText = useTemplateStore((s) => s.consumeTemplateText);

  const fromTemplate = searchParams.get("from") === "template";
  const isAuthenticated = Boolean(userId);
  const authLoading = !authLoaded;

  // Redirect unauthenticated users to sign-in
  // react-doctor: navigation must follow async state
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
        const conversation = await apiClient.post<{ _id: string }>(
          "/api/v1/conversations",
          {
            model: newChatModel,
            title: templateData.name || "New Chat",
          },
        );
        const conversationId = conversation._id;

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
  }, [
    authLoading,
    isAuthenticated,
    fromTemplate,
    consumeTemplateText,
    apiClient,
    newChatModel,
    router,
    startNewChat,
  ]);

  // Handle normal new chat (no template)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (fromTemplate) return; // Handled by other effect
    if (navigationStarted.current) return;

    navigationStarted.current = true;
    startNewChat();
  }, [isAuthenticated, authLoading, fromTemplate, startNewChat]);

  return (
    <>
      {isAuthenticated ? (
        <MessageListSkeleton />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      )}
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<MessageListSkeleton />}>
      <ChatPageContent />
    </Suspense>
  );
}
