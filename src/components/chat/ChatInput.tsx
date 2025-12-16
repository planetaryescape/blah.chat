"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useChatInputEvents } from "@/hooks/useChatInputEvents";
import { useChatInputKeyboard } from "@/hooks/useChatInputKeyboard";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { getModelConfig } from "@/lib/ai/utils";
import { analytics } from "@/lib/analytics";
import { useSendMessage } from "@/lib/hooks/mutations";
import { cn } from "@/lib/utils";
import { type ChatWidth, getChatWidthClass } from "@/lib/utils/chatWidth";
import type { OptimisticMessage } from "@/types/optimistic";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentPreview } from "./AttachmentPreview";
import { AudioWaveform } from "./AudioWaveform";
import { FileUpload } from "./FileUpload";
import { InputBottomBar } from "./InputBottomBar";
import { QuotePreview } from "./QuotePreview";
import { RateLimitDialog } from "./RateLimitDialog";
import type { ThinkingEffort } from "./ThinkingEffortSelector";
import { VoiceInput, type VoiceInputRef } from "./VoiceInput";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

interface ChatInputProps {
  conversationId: Id<"conversations">;
  isGenerating: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  thinkingEffort?: ThinkingEffort;
  onThinkingEffortChange?: (effort: ThinkingEffort) => void;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  isComparisonMode?: boolean;
  selectedModels?: string[];
  onStartComparison?: (models: string[]) => void;
  onExitComparison?: () => void;
  isEmpty?: boolean;
  modelSelectorOpen?: boolean;
  onModelSelectorOpenChange?: (open: boolean) => void;
  comparisonDialogOpen?: boolean;
  onComparisonDialogOpenChange?: (open: boolean) => void;
  chatWidth?: ChatWidth;
  onOptimisticUpdate?: (messages: OptimisticMessage[]) => void;
}

export function ChatInput({
  conversationId,
  isGenerating,
  selectedModel,
  onModelChange,
  thinkingEffort,
  onThinkingEffortChange,
  attachments,
  chatWidth,
  onAttachmentsChange,
  isComparisonMode = false,
  selectedModels = [],
  onStartComparison,
  onExitComparison,
  isEmpty = false,
  modelSelectorOpen,
  onModelSelectorOpenChange,
  comparisonDialogOpen,
  onComparisonDialogOpenChange,
  onOptimisticUpdate,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(
    null
  );
  const [_isTranscribing, setIsTranscribing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [lastCompletedMessageId, setLastCompletedMessageId] = useState<
    string | null
  >(null);
  const [quote, setQuote] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const voiceInputRef = useRef<VoiceInputRef>(null);
  const { isMobile, isTouchDevice } = useMobileDetect();

  const { mutate: sendMessage } = useSendMessage(onOptimisticUpdate);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const stopGeneration = useMutation(api.chat.stopGeneration);
  const lastAssistantMessage = useQuery(api.messages.getLastAssistantMessage, {
    conversationId,
  });

  // Check model capabilities
  const modelConfig = getModelConfig(selectedModel);
  const supportsVision = modelConfig?.capabilities?.includes("vision") ?? false;
  const supportsThinking = !!modelConfig?.reasoning;

  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    if ((!input.trim() && !quote) || isSending || uploading) return;

    setIsSending(true);
    const messageContent = quote
      ? `> ${quote}\n\n${input.trim()}`
      : input.trim();

    sendMessage(
      {
        conversationId,
        content: messageContent,
        ...(isComparisonMode
          ? { models: selectedModels }
          : { modelId: selectedModel }),
        thinkingEffort,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      {
        onSuccess: () => {
          setInput("");
          setQuote(null);
          onAttachmentsChange([]);
          setIsSending(false);
        },
        onError: (error) => {
          if (
            error instanceof Error &&
            error.message.includes("Daily message limit")
          ) {
            setShowRateLimitDialog(true);
          }
          setIsSending(false);
        },
      }
    );
  };

  // Use extracted keyboard hook
  const { handleKeyDown } = useChatInputKeyboard({
    input,
    setInput,
    textareaRef,
    onSubmit: handleSubmit,
  });

  // Use extracted events hook
  useChatInputEvents({
    textareaRef,
    setInput,
    setQuote,
    isEmpty,
    isMobile,
    isTouchDevice,
    lastAssistantMessageId: lastAssistantMessage?._id,
    lastAssistantMessageStatus: lastAssistantMessage?.status,
    lastCompletedMessageId,
    setLastCompletedMessageId,
  });

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await stopGeneration({ conversationId });
      analytics.track("generation_stopped", {
        model: selectedModel,
        source: "stop_button",
      });
    } catch (error) {
      console.error("Failed to stop generation:", error);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  // Dynamic placeholder based on model capabilities
  const getPlaceholder = () => {
    const config = getModelConfig(selectedModel);
    if (config?.capabilities?.includes("vision")) {
      return "Describe an image or upload a file...";
    }
    if (
      config?.capabilities?.includes("thinking") ||
      config?.capabilities?.includes("extended-thinking")
    ) {
      return "Ask me to reason through a problem...";
    }
    return "Message blah.chat...";
  };

  return (
    <div
      className={cn(
        "w-full mx-auto px-2 sm:px-4 pb-4 sm:pb-6 !pb-[calc(1rem+env(safe-area-inset-bottom))] transition-[max-width] duration-300 ease-out",
        getChatWidthClass(chatWidth, false)
      )}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        role="search"
        aria-label="Send message to AI"
        className={cn(
          "relative flex flex-col gap-2 p-2 transition-all duration-300 ease-out",
          "bg-background/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-border/50 dark:border-white/10",
          "rounded-3xl",
          isFocused
            ? "shadow-glow ring-1 ring-ring/10 dark:ring-white/10"
            : "shadow-lg hover:shadow-xl hover:border-border/80 dark:hover:border-white/20"
        )}
      >
        {/* Quote Preview */}
        {quote && <QuotePreview quote={quote} onDismiss={() => setQuote(null)} />}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="px-4 pt-2">
            <AttachmentPreview
              attachments={attachments}
              onRemove={(idx) =>
                onAttachmentsChange(attachments.filter((_, i) => i !== idx))
              }
            />
          </div>
        )}

        <div className="flex gap-2 items-end pl-2 pr-2">

          {/* Textarea or Waveform */}
          {isRecording ? (
            <div className="relative w-full min-h-[60px] flex items-center justify-center rounded-xl bg-primary/5 my-1 overflow-hidden">
              <AudioWaveform
                stream={recordingStream!}
                height={60}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : (
            <Textarea
              ref={textareaRef}
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={getPlaceholder()}
              aria-label="Message input"
              aria-describedby="input-hint"
              aria-multiline="true"
              className="resize-none min-h-[50px] py-3 px-2 bg-transparent border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/70"
              rows={1}
              disabled={isSending || uploading}
              data-tour="input"
            />
          )}

          {/* Hidden keyboard hint */}
          <div id="input-hint" className="sr-only">
            Type your message. Press Enter to send, Shift+Enter for new line.
          </div>

          {/* Action buttons (right side) */}
          <div className="pb-1.5 pr-1 flex items-center gap-1">
            {/* File upload - always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <FileUpload
                    conversationId={conversationId}
                    attachments={attachments}
                    onAttachmentsChange={onAttachmentsChange}
                    onUploadComplete={() => textareaRef.current?.focus()}
                    uploading={uploading}
                    setUploading={setUploading}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>

            {(
              (typeof window !== "undefined" &&
                "webkitSpeechRecognition" in window)) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <VoiceInput
                      ref={voiceInputRef}
                      onTranscript={async (text, autoSend) => {
                        setIsTranscribing(false);
                        if (autoSend && text.trim()) {
                          setIsSending(true);
                          try {
                            await sendMessage({
                              conversationId,
                              content: text.trim(),
                              ...(isComparisonMode
                                ? { models: selectedModels }
                                : { modelId: selectedModel }),
                              thinkingEffort,
                              attachments:
                                attachments.length > 0 ? attachments : undefined,
                            });
                            onAttachmentsChange([]);
                          } catch (error) {
                            if (
                              error instanceof Error &&
                              error.message.includes("Daily message limit")
                            ) {
                              setShowRateLimitDialog(true);
                            } else {
                              console.error("Failed to send message:", error);
                            }
                          } finally {
                            setIsSending(false);
                          }
                        } else {
                          setInput((prev) =>
                            prev.trim() ? `${prev} ${text}` : text
                          );
                        }
                      }}
                      onRecordingStateChange={(recording, stream) => {
                        setIsRecording(recording);
                        setRecordingStream(stream || null);
                        if (!recording && stream) setIsTranscribing(true);
                      }}
                      isDisabled={isSending || uploading}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voice input</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              type={isGenerating ? "button" : isRecording ? "button" : "submit"}
              size="icon"
              onClick={
                isGenerating
                  ? handleStop
                  : isRecording
                    ? () => voiceInputRef.current?.stopRecording("send")
                    : undefined
              }
              data-testid="send-button"
              aria-label={
                isGenerating
                  ? "Stop generating response"
                  : isRecording
                    ? "Stop recording and send"
                    : "Send message"
              }
              className={cn(
                "h-10 w-10 rounded-full transition-all duration-300 shadow-lg",
                (!input.trim() && !quote && !isRecording && !isGenerating) ||
                  isSending ||
                  uploading
                  ? "bg-muted text-muted-foreground opacity-50"
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-md hover:shadow-primary/25"
              )}
              disabled={
                (!input.trim() && !quote && !isRecording && !isGenerating) ||
                isSending ||
                uploading
              }
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : isGenerating ? (
                <Square className="w-4 h-4 fill-current" aria-hidden="true" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <InputBottomBar
          isComparisonMode={isComparisonMode}
          selectedModels={selectedModels}
          onExitComparison={onExitComparison}
          onStartComparison={onStartComparison}
          comparisonDialogOpen={comparisonDialogOpen}
          onComparisonDialogOpenChange={onComparisonDialogOpenChange}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          modelSelectorOpen={modelSelectorOpen}
          onModelSelectorOpenChange={onModelSelectorOpenChange}
          supportsThinking={supportsThinking}
          thinkingEffort={thinkingEffort}
          onThinkingEffortChange={onThinkingEffortChange}
          isEmpty={isEmpty}
          hasContent={input.length > 0}
        />
      </form>

      <RateLimitDialog
        open={showRateLimitDialog}
        onOpenChange={setShowRateLimitDialog}
        limit={50}
      />
    </div>
  );
}
