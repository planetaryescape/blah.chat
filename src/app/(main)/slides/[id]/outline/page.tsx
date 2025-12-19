"use client";

import { use, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import { Check, Loader2, ArrowLeft, Presentation } from "lucide-react";
import type { OptimisticMessage } from "@/types/optimistic";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";

export default function OutlineEditorPage({
  params,
}: {
  params: Promise<{ id: Id<"presentations"> }>;
}) {
  const unwrappedParams = use(params);
  const presentationId = unwrappedParams.id;
  const router = useRouter();
  const { showSlides } = useFeatureToggles();

  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  // Queries
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const {
    results: serverMessages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.messages.listPaginated,
    presentation?.conversationId
      ? { conversationId: presentation.conversationId }
      : "skip",
    { initialNumItems: 50 },
  );

  // Mutations
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const approveOutline = useMutation(api.presentations.approveOutline);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updateStatus = useMutation(api.presentations.updateStatus);

  // Optimistic messages state
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);
  const [isApproving, setIsApproving] = useState(false);

  const addOptimisticMessages = useCallback(
    (newMessages: OptimisticMessage[]) => {
      setOptimisticMessages((prev) => [...prev, ...newMessages]);
    },
    [],
  );

  // Merge server + optimistic messages
  type ServerMessage = NonNullable<typeof serverMessages>[number];
  type MessageWithOptimistic = ServerMessage | OptimisticMessage;

  const messages = useMemo<MessageWithOptimistic[]>(() => {
    const server = (serverMessages || []) as MessageWithOptimistic[];
    if (optimisticMessages.length === 0) return server;

    // Remove confirmed optimistic messages
    const serverTimes = new Set(
      server.map((m) => `${m.role}-${Math.floor(m.createdAt / 1000)}`),
    );
    const unconfirmed = optimisticMessages.filter(
      (om) => !serverTimes.has(`${om.role}-${Math.floor(om.createdAt / 1000)}`),
    );

    return [...server, ...unconfirmed];
  }, [serverMessages, optimisticMessages]);

  // Find last complete assistant message for approval
  const lastAssistantMessage = useMemo(() => {
    if (!serverMessages) return null;
    const assistantMsgs = serverMessages.filter(
      (m) => m.role === "assistant" && m.status === "complete",
    );
    return assistantMsgs[assistantMsgs.length - 1] || null;
  }, [serverMessages]);

  // Check if currently generating
  const isGenerating = useMemo(() => {
    if (!serverMessages) return false;
    return serverMessages.some(
      (m) =>
        m.role === "assistant" &&
        (m.status === "pending" || m.status === "generating"),
    );
  }, [serverMessages]);

  const handleApprove = async () => {
    if (!lastAssistantMessage || !presentation) return;

    setIsApproving(true);
    try {
      await approveOutline({
        presentationId,
        finalOutlineMessageId: lastAssistantMessage._id,
      });

      // Redirect to preview (Phase 3 will create this)
      router.push(`/slides/${presentationId}/preview`);
    } catch (error) {
      console.error("Error approving outline:", error);
      setIsApproving(false);
    }
  };

  // Loading state
  if (!presentation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // State for ChatInput
  const conversationModel = "zai:glm-4.6";
  const [attachments, setAttachments] = useState<
    {
      type: "file" | "image" | "audio";
      name: string;
      storageId: string;
      mimeType: string;
      size: number;
    }[]
  >([]);

  return (
    <div className="flex h-screen">
      {/* LEFT: Chat interface */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/slides")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">{presentation.title}</h1>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            Outline Editor
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          {serverMessages === undefined ? (
            <MessageListSkeleton />
          ) : (
            <>
              {paginationStatus === "CanLoadMore" && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadMore(50)}
                  >
                    Load older messages
                  </Button>
                </div>
              )}
              <VirtualizedMessageList
                messages={messages as Doc<"messages">[]}
                selectedModel={conversationModel}
                showModelNames={false}
              />
            </>
          )}
        </div>

        {/* Input */}
        {presentation.conversationId && (
          <ChatInput
            conversationId={presentation.conversationId}
            selectedModel={conversationModel}
            isGenerating={isGenerating}
            onModelChange={() => {}}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            onOptimisticUpdate={addOptimisticMessages}
          />
        )}
      </div>

      {/* RIGHT: Sidebar */}
      <div className="flex w-96 flex-col border-l bg-muted/30">
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            {/* Title */}
            <div>
              <h2 className="text-xl font-semibold">{presentation.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Refine your outline through chat, then approve to generate
                slides
              </p>
            </div>

            {/* Instructions */}
            <Card className="bg-background p-4">
              <h3 className="mb-3 font-medium">How it works</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">1.</span>
                  Review the generated outline
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">2.</span>
                  Ask for changes via chat
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">3.</span>
                  Approve when you're satisfied
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">4.</span>
                  AI creates design system & slides
                </li>
              </ol>
            </Card>

            {/* Status indicator */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isGenerating
                      ? "animate-pulse bg-amber-500"
                      : lastAssistantMessage
                        ? "bg-green-500"
                        : "bg-muted-foreground"
                  }`}
                />
                <span className="text-sm">
                  {isGenerating
                    ? "Generating outline..."
                    : lastAssistantMessage
                      ? "Outline ready for review"
                      : "Waiting for outline..."}
                </span>
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Refinement tips</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• "Make slide 3 more concise"</li>
                <li>• "Add a slide about X before the conclusion"</li>
                <li>• "Combine slides 5 and 6"</li>
                <li>• "Use more data-driven points"</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Approve button */}
        <div className="border-t p-4">
          <Button
            onClick={handleApprove}
            size="lg"
            className="w-full"
            disabled={!lastAssistantMessage || isGenerating || isApproving}
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Approve & Generate Slides
              </>
            )}
          </Button>
          {isGenerating && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Wait for generation to complete
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
