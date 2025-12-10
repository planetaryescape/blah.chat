"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2, Quote, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { getModelConfig } from "@/lib/ai/utils";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { type ChatWidth, getChatWidthClass } from "@/lib/utils/chatWidth";
import { AttachmentPreview } from "./AttachmentPreview";
import { AudioWaveform } from "./AudioWaveform";
import { FileUpload } from "./FileUpload";
import { ImageGenerateButton } from "./ImageGenerateButton";
import { KeyboardHints } from "./KeyboardHints";
import { RateLimitDialog } from "./RateLimitDialog";
import { VoiceInput, type VoiceInputRef } from "./VoiceInput";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComparisonTrigger } from "./ComparisonTrigger";
import { QuickModelSwitcher } from "./QuickModelSwitcher";
import {
  type ThinkingEffort,
  ThinkingEffortSelector,
} from "./ThinkingEffortSelector";

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
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [lastCompletedMessageId, setLastCompletedMessageId] = useState<
    string | null
  >(null);
  const [quote, setQuote] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const voiceInputRef = useRef<VoiceInputRef>(null);
  const { isMobile, isTouchDevice } = useMobileDetect();

  const sendMessage = useMutation(api.chat.sendMessage);
  const stopGeneration = useMutation(api.chat.stopGeneration);
  const _user = useQuery(api.users.getCurrentUser);
  const lastAssistantMessage = useQuery(api.messages.getLastAssistantMessage, {
    conversationId,
  });

  const _isExpanded = input.length > 50;

  // Check model capabilities
  const modelConfig = getModelConfig(selectedModel);
  const supportsVision = modelConfig?.capabilities?.includes("vision") ?? false;
  const supportsThinking = !!modelConfig?.reasoning;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Allow typing during generation, but prevent submission
    if (isGenerating) return;

    if ((!input.trim() && !quote) || isSending || uploading) return;

    setIsSending(true);
    try {
      const messageContent = quote
        ? `> ${quote}\n\n${input.trim()}`
        : input.trim();

      await sendMessage({
        conversationId,
        content: messageContent,
        ...(isComparisonMode
          ? { models: selectedModels }
          : { modelId: selectedModel }),
        thinkingEffort,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Track message sent with comprehensive properties
      analytics.track("message_sent", {
        model: isComparisonMode ? selectedModels.join(",") : selectedModel,
        isComparisonMode,
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length,
        attachmentTypes: [
          ...new Set(attachments.map((a) => a.type)),
        ].join(","),
        inputLength: messageContent.length,
        hasQuote: !!quote,
        thinkingEffort,
      });

      setInput("");
      setQuote(null);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }

    // Cmd/Ctrl+$ - Insert math block template
    if ((e.metaKey || e.ctrlKey) && e.key === "$") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = input.substring(0, start);
      const after = input.substring(end);

      const template = "$$\n\n$$";
      const newValue = before + template + after;
      setInput(newValue);

      // Position cursor inside math block (after $$\n)
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await stopGeneration({ conversationId });

      // Track generation stopped by user
      analytics.track("generation_stopped", {
        model: selectedModel,
        source: "stop_button",
      });
    } catch (error) {
      console.error("Failed to stop generation:", error);
    }
  };

  // Auto-resize (blocks.so pattern)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  // Handle prompted actions from EmptyScreen
  useEffect(() => {
    const handleInsertPrompt = (e: CustomEvent<string>) => {
      setInput(e.detail);
      // Optional: auto-focus
      textareaRef.current?.focus();
    };

    window.addEventListener("insert-prompt" as any, handleInsertPrompt as any);
    return () => {
      window.removeEventListener(
        "insert-prompt" as any,
        handleInsertPrompt as any,
      );
    };
  }, []);

  // Handle quote selection
  useEffect(() => {
    const handleQuoteSelection = (e: CustomEvent<string>) => {
      setQuote(e.detail);
      textareaRef.current?.focus();
    };

    window.addEventListener(
      "quote-selection" as any,
      handleQuoteSelection as any,
    );
    return () => {
      window.removeEventListener(
        "quote-selection" as any,
        handleQuoteSelection as any,
      );
    };
  }, []);

  // Handle focus restoration after dialogs close (e.g., QuickModelSwitcher)
  useEffect(() => {
    const handleFocusInput = () => {
      textareaRef.current?.focus();
    };

    window.addEventListener("focus-chat-input", handleFocusInput);
    return () => {
      window.removeEventListener("focus-chat-input", handleFocusInput);
    };
  }, []);

  // Autofocus on empty state (skip mobile/touch)
  useEffect(() => {
    if (isEmpty && !isMobile && !isTouchDevice && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEmpty, isMobile, isTouchDevice]);

  // Auto-focus input after AI message generation completes
  useEffect(() => {
    if (
      !isMobile &&
      lastAssistantMessage?.status === "complete" &&
      lastAssistantMessage._id !== lastCompletedMessageId &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      setLastCompletedMessageId(lastAssistantMessage._id);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [
    lastAssistantMessage?.status,
    lastAssistantMessage?._id,
    lastCompletedMessageId,
    isMobile,
  ]);

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
        getChatWidthClass(chatWidth, false),
      )}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        role="search"
        aria-label="Send message to AI"
        className={cn(
          "relative flex flex-col gap-2 p-2 transition-all duration-300 ease-out",
          "bg-background/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-border/50 dark:border-white/10", // Theme aware background
          "rounded-3xl", // More rounded
          isFocused
            ? "shadow-glow ring-1 ring-ring/10 dark:ring-white/10"
            : "shadow-lg hover:shadow-xl hover:border-border/80 dark:hover:border-white/20",
        )}
      >
        {/* Quote Preview */}
        {quote && (
          <div className="mx-2 mt-2 p-3 rounded-xl bg-muted/50 dark:bg-white/5 border border-border/50 dark:border-white/10 flex items-start gap-3 group relative">
            <div className="shrink-0 mt-0.5">
              <Quote className="w-4 h-4 text-primary/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed font-medium">
                {quote}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-1 -mt-1 opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={() => setQuote(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

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
          {/* Action buttons (left side) */}
          {/* Action buttons (left side) */}
          {/* Removed FileUpload from here */}

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
              disabled={isSending || uploading} // Removed isGenerating
              data-tour="input"
            />
          )}

          {/* Hidden keyboard hint */}
          <div id="input-hint" className="sr-only">
            Type your message. Press Enter to send, Shift+Enter for new line.
          </div>

          {/* Send button & Mic (right side) */}
          <div className="pb-1.5 pr-1 flex items-center gap-1">
            {input.trim() && (
              <ImageGenerateButton
                conversationId={conversationId}
                initialPrompt={input}
                variant="ghost"
                size="icon"
                iconOnly
              />
            )}
            {(supportsVision ||
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
                      isDisabled={isSending || uploading} // Removed isGenerating
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
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-md hover:shadow-primary/25",
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

        <div className="px-4 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            {supportsVision && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <FileUpload
                      conversationId={conversationId}
                      attachments={attachments}
                      onAttachmentsChange={onAttachmentsChange}
                      uploading={uploading}
                      setUploading={setUploading}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload files</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isComparisonMode && onExitComparison ? (
              <Badge
                variant="secondary"
                className="mr-2 flex items-center gap-2"
              >
                Comparing {selectedModels.length} models
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={onExitComparison}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ) : (
              <QuickModelSwitcher
                currentModel={selectedModel}
                onSelectModel={onModelChange}
                open={modelSelectorOpen ?? false}
                onOpenChange={onModelSelectorOpenChange ?? (() => {})}
                mode="single"
                showTrigger={true}
              />
            )}
            {supportsThinking &&
              thinkingEffort &&
              onThinkingEffortChange &&
              !isComparisonMode && (
                <ThinkingEffortSelector
                  value={thinkingEffort}
                  onChange={onThinkingEffortChange}
                />
              )}
            {onStartComparison && (
              <ComparisonTrigger
                onStartComparison={onStartComparison}
                isActive={isComparisonMode}
                open={comparisonDialogOpen}
                onOpenChange={onComparisonDialogOpenChange}
              />
            )}
          </div>
          <KeyboardHints isEmpty={isEmpty} hasContent={input.length > 0} />
        </div>
      </form>

      <RateLimitDialog
        open={showRateLimitDialog}
        onOpenChange={setShowRateLimitDialog}
        limit={50}
      />
    </div>
  );
}
