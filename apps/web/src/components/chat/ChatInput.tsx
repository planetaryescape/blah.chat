"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Expand, Loader2, Send, Square, Upload } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useBrowserFeature from "@/hooks/useBrowserFeature";
import { useChatInputEvents } from "@/hooks/useChatInputEvents";
import { useChatInputKeyboard } from "@/hooks/useChatInputKeyboard";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { getModelConfig } from "@/lib/ai/utils";
import { analytics } from "@/lib/analytics";
import { useSendMessage } from "@/lib/hooks/mutations";
import { cn } from "@/lib/utils";
import { type ChatWidth, getChatWidthClass } from "@/lib/utils/chatWidth";
import type { OptimisticMessage } from "@/types/optimistic";
import { AttachmentPreview } from "./AttachmentPreview";
import { AudioWaveform } from "./AudioWaveform";
import { ExpandedInputDialog } from "./ExpandedInputDialog";
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

export const ChatInput = memo(function ChatInput({
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
    null,
  );
  const [_isTranscribing, setIsTranscribing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [showExpandedInput, setShowExpandedInput] = useState(false);
  const [lastCompletedMessageId, setLastCompletedMessageId] = useState<
    string | null
  >(null);
  const [quote, setQuote] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const voiceInputRef = useRef<VoiceInputRef>(null);
  const dragCounterRef = useRef(0);
  const { isMobile, isTouchDevice } = useMobileDetect();
  const hasSpeechRecognition = useBrowserFeature("webkitSpeechRecognition");

  const { mutate: sendMessage } = useSendMessage(onOptimisticUpdate);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const stopGeneration = useMutation(api.chat.stopGeneration);
  const lastAssistantMessage = useQuery(api.messages.getLastAssistantMessage, {
    conversationId,
  });

  // Check model capabilities
  const modelConfig = getModelConfig(selectedModel);
  const _supportsVision =
    modelConfig?.capabilities?.includes("vision") ?? false;
  const supportsThinking = !!modelConfig?.reasoning;

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
  };

  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    if ((!input.trim() && !quote) || isSending || uploading) return;

    setIsSending(true);

    const originalInput = input.trim();
    const originalQuote = quote;
    const originalAttachments = [...attachments];
    const messageContent = originalQuote
      ? `> ${originalQuote}\n\n${originalInput}`
      : originalInput;

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
        onError: (error) => {
          const currentInput = textareaRef.current?.value?.trim() || "";
          if (!currentInput) {
            setInput(originalInput);
            setQuote(originalQuote);
            onAttachmentsChange(originalAttachments);
          }

          if (
            error instanceof Error &&
            error.message.includes("Daily message limit")
          ) {
            setShowRateLimitDialog(true);
          }
        },
      },
    );

    setInput("");
    setQuote(null);
    onAttachmentsChange([]);
    setIsSending(false);

    if (!isMobile) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const { handleKeyDown } = useChatInputKeyboard({
    input,
    setInput,
    textareaRef,
    onSubmit: handleSubmit,
  });

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

  // Auto-resize textarea - NOW RUNS ON INPUT CHANGE
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

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

  // Determine what to show on right side
  const hasContent = input.trim().length > 0 || quote;
  const canSend =
    (hasContent || isRecording || isGenerating) && !isSending && !uploading;
  const showMic =
    !hasContent && !isGenerating && hasSpeechRecognition && !isRecording;
  const showExpandButton = input.length > 100;

  return (
    <div
      className={cn(
        "w-full mx-auto px-2 sm:px-4 pb-4 sm:pb-6 !pb-[calc(1rem+env(safe-area-inset-bottom))] transition-[max-width] duration-300 ease-out",
        getChatWidthClass(chatWidth, false),
      )}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="search"
        aria-label="Send message to AI"
        className={cn(
          "relative flex flex-col gap-2 p-2 transition-all duration-300 ease-out",
          "bg-background/60 backdrop-blur-xl",
          "border border-white/[0.06] dark:border-white/[0.08]",
          "rounded-3xl",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06),0_8px_16px_rgba(0,0,0,0.04)]",
          isFocused && [
            "ring-1 ring-primary/20",
            "shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.1),0_2px_8px_rgba(var(--primary-rgb),0.08),0_8px_24px_rgba(var(--primary-rgb),0.06)]",
            "border-primary/20",
          ],
          !isFocused &&
            "hover:border-white/[0.1] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,0,0,0.06)]",
        )}
      >
        {/* Drop zone overlay */}
        <AnimatePresence>
          {isDraggingOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-10 rounded-3xl overflow-hidden pointer-events-none"
            >
              <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-3xl animate-pulse" />
              <div className="absolute inset-0 bg-primary/5 backdrop-blur-sm flex items-center justify-center">
                <motion.div
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">
                    Drop files here
                  </span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quote Preview */}
        {quote && (
          <QuotePreview quote={quote} onDismiss={() => setQuote(null)} />
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="px-3 pt-2">
            <AttachmentPreview
              attachments={attachments}
              onRemove={(idx) =>
                onAttachmentsChange(attachments.filter((_, i) => i !== idx))
              }
            />
          </div>
        )}

        {/* Main input row - ChatGPT style: [+] [textarea] [mic/send] */}
        <div className="flex gap-2 items-end px-2">
          {/* Plus button - LEFT, bottom-aligned */}
          <div className="pb-1.5 flex-shrink-0">
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
          </div>

          {/* Textarea container - grows upward, takes remaining space */}
          <div className="flex-1 min-w-0 relative">
            {isRecording ? (
              <div className="relative min-h-[50px] flex items-center justify-center rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
                <div className="absolute inset-0 border border-primary/20 rounded-xl" />
                <AudioWaveform
                  stream={recordingStream!}
                  height={50}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : (
              <>
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
                  className="resize-none min-h-[50px] max-h-[200px] py-3 px-2 pr-8 bg-transparent border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/50"
                  rows={1}
                  disabled={isSending || uploading}
                  data-tour="input"
                />
                {/* Expand button for long text */}
                {showExpandButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowExpandedInput(true)}
                        className="absolute top-2 right-1 h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground hover:bg-transparent"
                        aria-label="Expand input"
                      >
                        <Expand className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Expand editor</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>

          <div id="input-hint" className="sr-only">
            Type your message. Press Enter to send, Shift+Enter for new line.
          </div>

          {/* Right button(s) - bottom-aligned */}
          <div className="pb-1.5 flex-shrink-0 flex items-center gap-1">
            {/* VoiceInput always rendered (hidden when !showMic) to preserve ref during recording */}
            <div className={cn(showMic ? "block" : "hidden")}>
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
                                attachments.length > 0
                                  ? attachments
                                  : undefined,
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
                            prev.trim() ? `${prev} ${text}` : text,
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
            </div>

            {/* Stop recording button (preview mode) - appears during recording */}
            {isRecording && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        voiceInputRef.current?.stopRecording("preview")
                      }
                      aria-label="Stop recording and edit"
                      className="h-10 w-10 rounded-full"
                    >
                      <Square
                        className="w-4 h-4 fill-current"
                        aria-hidden="true"
                      />
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop & edit</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Show send/stop button when not showing mic */}
            {!showMic && (
              <motion.div
                whileHover={canSend ? { scale: 1.05 } : undefined}
                whileTap={canSend ? { scale: 0.95, rotate: -2 } : undefined}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type={
                    isGenerating ? "button" : isRecording ? "button" : "submit"
                  }
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
                    "h-10 w-10 rounded-full transition-all duration-200",
                    !canSend
                      ? "bg-muted/50 text-muted-foreground/50"
                      : [
                          "bg-primary text-primary-foreground",
                          "shadow-[0_2px_8px_rgba(var(--primary-rgb),0.25)]",
                          "hover:shadow-[0_4px_16px_rgba(var(--primary-rgb),0.35)]",
                        ],
                  )}
                  disabled={!canSend}
                >
                  {isSending ? (
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : isGenerating ? (
                    <Square
                      className="w-4 h-4 fill-current"
                      aria-hidden="true"
                    />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" aria-hidden="true" />
                  )}
                </Button>
              </motion.div>
            )}
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

      <ExpandedInputDialog
        open={showExpandedInput}
        onOpenChange={setShowExpandedInput}
        value={input}
        onChange={setInput}
        onSubmit={() => {
          setShowExpandedInput(false);
          formRef.current?.requestSubmit();
        }}
        placeholder={getPlaceholder()}
      />
    </div>
  );
});
