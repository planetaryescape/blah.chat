import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { analytics } from "@/lib/analytics";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const createConversation = useMutation(api.conversations.create);

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

      // Cmd+N - New chat
      if (isMod && e.key === "n") {
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

      // Esc - Go back / Close modals (handled by individual components)
      if (e.key === "Escape") {
        // Allow default behavior
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, pathname, createConversation]);
}

// Export keyboard shortcut reference for documentation
export const KEYBOARD_SHORTCUTS = {
  global: {
    "Cmd/Ctrl + K": "Open command palette",
    "Cmd/Ctrl + N": "New chat",
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
