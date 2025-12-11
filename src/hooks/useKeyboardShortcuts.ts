import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useConversationContext } from "@/contexts/ConversationContext";
import { useNewChat } from "@/hooks/useNewChat";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { filteredConversations } = useConversationContext();
  const { startNewChat } = useNewChat();

  // Extract conversationId from pathname (e.g., /chat/xyz123)
  const conversationId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Skip if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Cmd+A, Cmd+C, Cmd+V, Cmd+X in inputs
        if (isMod && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
          return;
        }
      }

      // Cmd+K - Command palette (handled in CommandPalette component)
      // This is just a placeholder

      // Cmd+Shift+O - New chat
      if (isMod && e.shiftKey && e.key === "O") {
        e.preventDefault();
        startNewChat();
      }

      // Cmd+J - Quick model switcher
      if (isMod && e.key === "j") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-quick-model-switcher"));
      }

      // Cmd+, - Settings
      if (isMod && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }

      // Cmd+F - Search (only outside of inputs)
      if (
        isMod &&
        e.key === "f" &&
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        router.push("/search");
      }

      // Cmd+1-9 - Quick-jump to filtered conversations
      if (isMod && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = Number.parseInt(e.key, 10) - 1;
        if (filteredConversations?.[index]) {
          router.push(`/chat/${filteredConversations[index]._id}`);
        }
      }

      // Cmd+[ - Previous conversation
      if (isMod && e.key === "[") {
        e.preventDefault();
        navigateConversation("prev");
      }

      // Cmd+] - Next conversation
      if (isMod && e.key === "]") {
        e.preventDefault();
        navigateConversation("next");
      }

      // Notes page shortcuts
      if (pathname?.startsWith("/notes")) {
        // Cmd+Shift+N - New note
        if (isMod && e.shiftKey && e.key.toLowerCase() === "n") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("create-new-note"));
        }

        // Esc - Clear selection / go back to list
        if (e.key === "Escape") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("clear-note-selection"));
        }
      }

      // Esc - Go back / Close modals (handled by individual components)
      if (e.key === "Escape" && !pathname?.startsWith("/notes")) {
        // Allow default behavior for non-notes pages
      }
    };

    function navigateConversation(direction: "prev" | "next") {
      if (!conversationId || !filteredConversations?.length) return;

      // Sort chronologically (newest first)
      const sorted = [...filteredConversations].sort(
        (a, b) => b._creationTime - a._creationTime,
      );
      const currentIdx = sorted.findIndex((c) => c._id === conversationId);

      if (currentIdx === -1) return;

      const nextIdx =
        direction === "next"
          ? Math.min(currentIdx + 1, sorted.length - 1)
          : Math.max(currentIdx - 1, 0);

      router.push(`/chat/${sorted[nextIdx]._id}`);
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, pathname, filteredConversations, conversationId, startNewChat]);
}

// Export keyboard shortcut reference for documentation
export const KEYBOARD_SHORTCUTS = {
  global: {
    "Cmd/Ctrl + K": "Open command palette",
    "Cmd/Ctrl + Shift + O": "New chat",
    "Cmd/Ctrl + 1-9": "Jump to conversation 1-9",
    "Cmd/Ctrl + [": "Previous conversation",
    "Cmd/Ctrl + ]": "Next conversation",
    "Cmd/Ctrl + ,": "Settings",

    "Cmd/Ctrl + F": "Search",
    Esc: "Close dialogs/modals",
  },
  chat: {
    "Cmd/Ctrl + J": "Quick model switcher",
    Enter: "Send message",
    "Shift + Enter": "New line",
  },
  notes: {
    "Cmd/Ctrl + Shift + N": "New note",
    "Cmd/Ctrl + S": "Save note (manual)",
    Esc: "Clear selection",
  },
  messageActions: {
    R: "Regenerate response (hover message first)",
    C: "Copy message",
    B: "Bookmark message",
    Delete: "Delete message",
  },
} as const;
