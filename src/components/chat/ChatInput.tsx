"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL } from "@/lib/ai/registry";

interface ChatInputProps {
  conversationId: Id<"conversations">;
  isGenerating: boolean;
}

export function ChatInput({ conversationId, isGenerating }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useMutation(api.chat.sendMessage);

  const isExpanded = input.length > 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId,
        content: input.trim(),
        modelId: DEFAULT_MODEL,
      });
      setInput("");
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

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "border-t border-border p-4 bg-background transition-all duration-200",
        isExpanded && "shadow-lg"
      )}
    >
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message blah.chat..."
          className="resize-none min-h-[60px] transition-all duration-200 focus-within:border-ring"
          rows={1}
          disabled={isGenerating || isSending}
        />
        <Button
          type="submit"
          size="icon"
          className={cn(
            "rounded-full transition-all duration-200",
            (!input.trim() || isGenerating || isSending) && "opacity-50"
          )}
          disabled={!input.trim() || isGenerating || isSending}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
