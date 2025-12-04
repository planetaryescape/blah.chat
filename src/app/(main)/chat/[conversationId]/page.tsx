"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ThinkingEffortSelector, type ThinkingEffort } from "@/components/chat/ThinkingEffortSelector";
import { Separator } from "@/components/ui/separator";
import { getModelConfig } from "@/lib/ai/models";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";

export default function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();

  const conversation = useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip"
  );
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );
  const user = useQuery(api.users.getCurrentUser);

  const [selectedModel, setSelectedModel] = useState<string>(
    conversation?.model || user?.preferences.defaultModel || "openai:gpt-5-mini"
  );
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>("medium");

  // Sync with conversation model on load
  useEffect(() => {
    if (conversation?.model) {
      setSelectedModel(conversation.model);
    }
  }, [conversation?.model]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        e.preventDefault();
        document.querySelector('[data-model-selector]')?.dispatchEvent(new Event('click', { bubbles: true }));
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  // Redirect if conversation not found
  useEffect(() => {
    if (conversation === null) {
      router.push("/");
    }
  }, [conversation, router]);

  if (!conversationId || conversation === undefined || messages === undefined) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  if (conversation === null) {
    return null;
  }

  const isGenerating = messages.some(
    (m: Doc<"messages">) =>
      m.role === "assistant" &&
      ["pending", "generating"].includes(m.status || ""),
  );

  const modelConfig = getModelConfig(selectedModel);
  const showThinkingEffort = modelConfig?.supportsThinkingEffort;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-4 px-4 py-3 border-b">
        <h1 className="text-lg font-semibold truncate flex-1">
          {conversation.title || "New Chat"}
        </h1>

        <div className="flex items-center gap-2">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />

          {showThinkingEffort && (
            <>
              <Separator orientation="vertical" className="h-8" />
              <ThinkingEffortSelector value={thinkingEffort} onChange={setThinkingEffort} />
            </>
          )}
        </div>
      </header>

      <MessageList messages={messages} />

      <ChatInput
        conversationId={conversationId}
        isGenerating={isGenerating}
        selectedModel={selectedModel}
        thinkingEffort={showThinkingEffort ? thinkingEffort : undefined}
      />
    </div>
  );
}
