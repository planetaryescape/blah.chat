"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getModelConfig } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentPreview } from "./AttachmentPreview";
import { AudioWaveform } from "./AudioWaveform";
import { FileUpload } from "./FileUpload";
import { ImageGenerateButton } from "./ImageGenerateButton";
import { RateLimitDialog } from "./RateLimitDialog";
import { VoiceInput, type VoiceInputRef } from "./VoiceInput";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { KeyboardHints } from "./KeyboardHints";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ComparisonTrigger } from "./ComparisonTrigger";
import { ModelSelector } from "./ModelSelector";
import {
    ThinkingEffortSelector,
    type ThinkingEffort,
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
}

export function ChatInput({
  conversationId,
  isGenerating,
  selectedModel,
  onModelChange,
  thinkingEffort,
  onThinkingEffortChange,
  attachments,
  onAttachmentsChange,
  isComparisonMode = false,
  selectedModels = [],
  onStartComparison,
  onExitComparison,
  isEmpty = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(
    null,
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const voiceInputRef = useRef<VoiceInputRef>(null);
  const { isMobile, isTouchDevice } = useMobileDetect();

  // @ts-ignore
  const sendMessage = useMutation(api.chat.sendMessage);
  const stopGeneration = useMutation(api.chat.stopGeneration);
  const user = useQuery(api.users.getCurrentUser);

  const isExpanded = input.length > 50;

  // Check model capabilities
  const modelConfig = getModelConfig(selectedModel);
  const supportsVision = modelConfig?.capabilities?.includes("vision") ?? false;
  const supportsThinking = modelConfig?.supportsThinkingEffort ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Allow typing during generation, but prevent submission
    if (isGenerating) return;

    if (!input.trim() || isSending || uploading) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId,
        content: input.trim(),
        ...(isComparisonMode
          ? { models: selectedModels }
          : { modelId: selectedModel }),
        thinkingEffort,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setInput("");
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
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await stopGeneration({ conversationId });
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
  }, [input]);

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

  // Autofocus on empty state (skip mobile/touch)
  useEffect(() => {
    if (isEmpty && !isMobile && !isTouchDevice && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEmpty, isMobile, isTouchDevice]);

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
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-4 sm:pb-6 !pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn(
          "relative flex flex-col gap-2 p-2 transition-all duration-300 ease-out",
          "bg-zinc-900/90 backdrop-blur-xl border border-white/10", // Darker, more grounded background like T3
          "rounded-3xl", // More rounded
          isFocused
            ? "shadow-glow ring-1 ring-white/10"
            : "shadow-lg hover:shadow-xl hover:border-white/20",
        )}
      >
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
          {supportsVision && (
            <div className="flex gap-1 items-center pb-2">
              <FileUpload
                conversationId={conversationId}
                attachments={attachments}
                onAttachmentsChange={onAttachmentsChange}
                uploading={uploading}
                setUploading={setUploading}
              />
            </div>
          )}

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
              className="resize-none min-h-[50px] py-3 px-2 bg-transparent border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/70"
              rows={1}
              disabled={isSending || uploading} // Removed isGenerating
            />
          )}

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
            )}
            <Button
              type={isGenerating ? "button" : (isRecording ? "button" : "submit")}
              size="icon"
              onClick={
                isGenerating
                  ? handleStop
                  : (isRecording
                      ? () => voiceInputRef.current?.stopRecording("send")
                      : undefined)
              }
              className={cn(
                "h-10 w-10 rounded-full transition-all duration-300 shadow-lg",
                (!input.trim() && !isRecording && !isGenerating) ||
                  isSending ||
                  uploading
                  ? "bg-muted text-muted-foreground opacity-50"
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-md hover:shadow-primary/25",
              )}
              disabled={
                (!input.trim() && !isRecording && !isGenerating) ||
                isSending ||
                uploading
              }
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isGenerating ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="px-4 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
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
              <ModelSelector
                value={selectedModel}
                onChange={onModelChange}
                className="h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium"
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
              />
            )}
          </div>
          <KeyboardHints isEmpty={isEmpty} hasContent={input.length > 0} />
        </div>
      </form>

      <RateLimitDialog
        open={showRateLimitDialog}
        onOpenChange={setShowRateLimitDialog}
        limit={user?.dailyMessageLimit || 50}
      />
    </div>
  );
}
