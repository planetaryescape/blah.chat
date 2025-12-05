"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getModelConfig } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentPreview } from "./AttachmentPreview";
import { AudioWaveform } from "./AudioWaveform";
import { FileUpload } from "./FileUpload";
import { ImageGenerateButton } from "./ImageGenerateButton";
import { RateLimitDialog } from "./RateLimitDialog";
import { VoiceInput, type VoiceInputRef } from "./VoiceInput";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

import { ModelSelector } from "./ModelSelector";
import {
  ThinkingEffortSelector,
  type ThinkingEffort,
} from "./ThinkingEffortSelector";
import { ComparisonTrigger } from "./ComparisonTrigger";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

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

  // @ts-ignore
  const sendMessage = useMutation(api.chat.sendMessage);
  const user = useQuery(api.users.getCurrentUser);

  const isExpanded = input.length > 50;

  // Check model capabilities
  const modelConfig = getModelConfig(selectedModel);
  const supportsVision = modelConfig?.capabilities?.includes("vision") ?? false;
  const supportsThinking = modelConfig?.supportsThinkingEffort ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating || isSending || uploading) return;

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

  // Auto-resize (blocks.so pattern)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-focus when AI finishes generating
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-4 sm:pb-6 !pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn(
          "relative flex flex-col gap-2 p-2 transition-all duration-300 ease-out",
          "bg-surface-glass backdrop-blur-xl border border-white/10",
          "rounded-[2rem]",
          isFocused
            ? "shadow-glow ring-1 ring-primary/30"
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
              placeholder="Message blah.chat..."
              className="resize-none min-h-[50px] py-3 px-2 bg-transparent border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/70"
              rows={1}
              disabled={isGenerating || isSending || uploading}
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
                isDisabled={isGenerating || isSending || uploading}
              />
            )}
            <Button
              type={isRecording ? "button" : "submit"}
              size="icon"
              onClick={
                isRecording
                  ? () => voiceInputRef.current?.stopRecording("send")
                  : undefined
              }
              className={cn(
                "h-10 w-10 rounded-full transition-all duration-300 shadow-lg hover:shadow-primary/25",
                (!input.trim() && !isRecording) ||
                  isGenerating ||
                  isSending ||
                  uploading
                  ? "bg-muted text-muted-foreground opacity-50"
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
              )}
              disabled={
                (!input.trim() && !isRecording) ||
                isGenerating ||
                isSending ||
                uploading
              }
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
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
          <span className="text-[10px] text-muted-foreground/40 font-medium tracking-wider uppercase">
            Shift + Enter for new line
          </span>
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
