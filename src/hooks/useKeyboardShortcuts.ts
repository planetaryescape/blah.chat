import { useConversationContext } from "@/contexts/ConversationContext";
import { analytics } from "@/lib/analytics";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const createConversation = useMutation(api.conversations.create);
  const { filteredConversations } = useConversationContext();

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

      // Cmd+Shift+N - New chat
      if (isMod && e.shiftKey && e.key === "N") {
        e.preventDefault();
        try {
          const conversationId = await createConversation({
            model: "openai:gpt-4o",
          });
          router.push(`/chat/${conversationId}`);
          analytics.track("conversation_started", { model: "openai:gpt-4o" });
        } catch (error) {
          console.error("Failed to create conversation:", error);
        }
      }

      // Cmd+, - Settings
      if (isMod && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }

      // Cmd+B - Bookmarks
      if (isMod && e.key === "b") {
        e.preventDefault();
        router.push("/bookmarks");
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

      // Esc - Go back / Close modals (handled by individual components)
      if (e.key === "Escape") {
        // Allow default behavior
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
  }, [router, pathname, createConversation, filteredConversations]);
}

// Export keyboard shortcut reference for documentation
export const KEYBOARD_SHORTCUTS = {
  global: {
    "Cmd/Ctrl + K": "Open command palette",
    "Cmd/Ctrl + Shift + N": "New chat",
    "Cmd/Ctrl + 1-9": "Jump to conversation 1-9",
    "Cmd/Ctrl + [": "Previous conversation",
    "Cmd/Ctrl + ]": "Next conversation",
    "Cmd/Ctrl + ,": "Settings",
    "Cmd/Ctrl + B": "Bookmarks",
    "Cmd/Ctrl + F": "Search",
    Esc: "Close dialogs/modals",
  },
  chat: {
    "Cmd/Ctrl + M": "Model selector",
    Enter: "Send message",
    "Shift + Enter": "New line",
  },
} as const;
