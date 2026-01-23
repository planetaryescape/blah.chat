"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { type Attachment, ChatInput } from "@/components/chat/ChatInput";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { useChatModel } from "@/hooks/useChatModel";
import { useMessageAnnouncer } from "@/hooks/useMessageAnnouncer";

export default function ChatPage() {
  const params = useParams();
  const _router = useRouter();
  const conversationId = params.conversationId as Id<"conversations">;

  // Load conversation data
  // Fix: query expects conversationId, not id
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversation = useQuery(api.conversations.get, { conversationId });
  const messages = useQuery(api.messages.list, { conversationId });

  // Model selection state
  const { selectedModel, handleModelChange } = useChatModel({ conversationId });

  // Attachment state
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Announce incoming messages for accessibility
  useMessageAnnouncer(messages);

  const isLoading = messages === undefined;

  // Determine if generating based on last message status
  // Fix: schema uses "generating", not "inProgress"
  const lastMessage = messages?.[messages.length - 1];
  const isGenerating =
    lastMessage?.role === "assistant" && lastMessage?.status === "generating";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        conversationId={conversationId}
        selectedModel={selectedModel}
        modelLoading={false}
        hasMessages={(messages?.length ?? 0) > 0}
        isFirst={false} // Placeholder
        isLast={false} // Placeholder
        isComparisonActive={false}
        comparisonModelCount={0}
        showProjects={true}
        onNavigatePrevious={() => {}}
        onNavigateNext={() => {}}
        onModelBadgeClick={() => {}}
        onComparisonBadgeClick={() => {}}
      />

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10"
            >
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading conversation...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <VirtualizedMessageList
                conversationId={conversationId}
                messages={messages || []}
                showModelNames={false} // Default or logic
                isGenerating={isGenerating}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 pb-6 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20">
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput
            conversationId={conversationId}
            isGenerating={isGenerating || false}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
        </div>
      </div>
    </div>
  );
}
