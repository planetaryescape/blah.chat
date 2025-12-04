"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
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

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h1 className="text-lg font-semibold">{conversation.title}</h1>
        <ThemeSwitcher />
      </header>
      <MessageList messages={messages} />
      <ChatInput
        conversationId={conversationId}
        isGenerating={isGenerating}
      />
    </div>
  );
}
