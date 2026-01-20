"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type RefObject, useEffect } from "react";
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
  const deleteMsg = useMutation(api.chat.deleteMessage);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
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
          // Regenerate (assistant messages only, no modifier) - opens model selector
          if (!isUser && !isGenerating && !isMod) {
            e.preventDefault();
            const event = new CustomEvent("open-regenerate-model-selector", {
              detail: { messageId },
            });
            window.dispatchEvent(event);
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
          // Delete message and focus next/prev message or chat input
          if (!isMod) {
            e.preventDefault();
            try {
              // Find next or previous message group before deleting
              const currentGroup = messageRef.current?.closest(
                "[id^='message-group-']",
              );
              const nextGroup =
                currentGroup?.nextElementSibling as HTMLElement | null;
              const prevGroup =
                currentGroup?.previousElementSibling as HTMLElement | null;

              await deleteMsg({ messageId });

              // Focus next, or prev, or chat input as fallback
              requestAnimationFrame(() => {
                let targetElement: HTMLElement | null = null;

                if (nextGroup && document.body.contains(nextGroup)) {
                  targetElement = nextGroup;
                } else if (prevGroup && document.body.contains(prevGroup)) {
                  targetElement = prevGroup;
                }

                if (targetElement) {
                  targetElement.setAttribute("tabindex", "-1");
                  targetElement.focus();
                } else {
                  // Fallback to chat input
                  const chatInput = document.getElementById(
                    "chat-input",
                  ) as HTMLElement | null;
                  chatInput?.focus();
                }
              });

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
    createBookmark,
    deleteMsg,
    messageRef,
  ]);
}
