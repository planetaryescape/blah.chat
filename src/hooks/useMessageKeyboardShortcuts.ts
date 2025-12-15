"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { RefObject, useEffect } from "react";
import { toast } from "sonner";

interface UseMessageKeyboardShortcutsOptions {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  content: string;
  isFocused: boolean;
  isUser: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
  messageRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hook to handle keyboard shortcuts for focused messages.
 *
 * Shortcuts:
 * - r: Regenerate (assistant messages only)
 * - b: Bookmark
 * - c: Copy to clipboard
 * - n: Save as note
 * - delete/backspace: Delete message
 */
export function useMessageKeyboardShortcuts({
  messageId,
  conversationId,
  content,
  isFocused,
  isUser,
  isGenerating,
  readOnly,
  messageRef,
}: UseMessageKeyboardShortcutsOptions) {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const regenerate = useMutation(api.chat.regenerate);
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const createBookmark = useMutation(api.bookmarks.create);

  useEffect(() => {
    if (!isFocused || readOnly) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't interfere with typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      switch (e.key.toLowerCase()) {
        case "r":
          // Regenerate (assistant messages only, no modifier)
          if (!isUser && !isGenerating && !isMod) {
            e.preventDefault();
            try {
              await regenerate({ messageId });
              toast.success("Regenerating response...");
            } catch (_error) {
              toast.error("Failed to regenerate");
            }
          }
          break;

        case "b":
          // Bookmark (no modifier)
          if (!isMod) {
            e.preventDefault();
            try {
              await createBookmark({
                conversationId,
                messageId,
              });
              toast.success("Message bookmarked");
            } catch (_error) {
              toast.error("Failed to bookmark");
            }
          }
          break;

        case "c":
          // Copy (no modifier - Cmd+C is native)
          if (!isMod) {
            e.preventDefault();
            await navigator.clipboard.writeText(content);
            toast.success("Copied to clipboard");
          }
          break;

        case "n":
          // Save as note (no modifier)
          if (!isMod) {
            e.preventDefault();
            const event = new CustomEvent("save-message-as-note", {
              detail: { messageId },
            });
            window.dispatchEvent(event);
          }
          break;

        case "delete":
        case "backspace":
          // Delete message and focus next
          if (!isMod) {
            e.preventDefault();
            try {
              await deleteMsg({ messageId });
              // Focus next message sibling
              const nextSibling =
                messageRef.current?.parentElement?.nextElementSibling?.querySelector(
                  '[tabindex="0"]',
                ) as HTMLElement;
              nextSibling?.focus();
              toast.success("Message deleted");
            } catch (_error) {
              toast.error("Failed to delete");
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isFocused,
    readOnly,
    isUser,
    isGenerating,
    messageId,
    conversationId,
    content,
    regenerate,
    createBookmark,
    deleteMsg,
    messageRef,
  ]);
}
