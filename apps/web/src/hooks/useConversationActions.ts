"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import {
  useArchiveConversation,
  useAutoRenameConversation,
  useDeleteConversation,
  useTogglePin,
  useToggleStar,
} from "@/lib/hooks/mutations";

export function useConversationActions(
  conversationId: string | null,
  source: "command_palette" | "header_menu",
) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);

  const { mutate: deleteConversation, isPending: isDeleting } =
    useDeleteConversation();
  const { mutate: archiveConversation, isPending: isArchiving } =
    useArchiveConversation();
  const { mutate: togglePin, isPending: isPinning } = useTogglePin();
  const { mutate: toggleStar, isPending: isStarring } = useToggleStar();
  const { mutateAsync: autoRenameConversation } = useAutoRenameConversation();

  const isLoading =
    isDeleting || isArchiving || isPinning || isStarring || isRenaming;

  const handleDelete = () => {
    if (!conversationId) return;
    deleteConversation(
      { conversationId },
      {
        onSuccess: () => {
          analytics.track("conversation_action", {
            action: "delete",
            source,
            conversationId,
          });
          router.push("/");
        },
      },
    );
  };

  const handleArchive = () => {
    if (!conversationId) return;
    archiveConversation(
      { conversationId },
      {
        onSuccess: () => {
          analytics.track("conversation_action", {
            action: "archive",
            source,
            conversationId,
          });
          router.push("/");
        },
      },
    );
  };

  const handleTogglePin = (isPinned: boolean) => {
    if (!conversationId) return;
    togglePin(
      { conversationId },
      {
        onSuccess: () => {
          toast.success(
            isPinned ? "Conversation unpinned" : "Conversation pinned",
          );
          analytics.track("conversation_action", {
            action: isPinned ? "unpin" : "pin",
            source,
            conversationId,
          });
        },
      },
    );
  };

  const handleToggleStar = (isStarred: boolean) => {
    if (!conversationId) return;
    toggleStar(
      { conversationId },
      {
        onSuccess: () => {
          toast.success(
            isStarred ? "Conversation unstarred" : "Conversation starred",
          );
          analytics.track("conversation_action", {
            action: isStarred ? "unstar" : "star",
            source,
            conversationId,
          });
        },
      },
    );
  };

  const handleAutoRename = async () => {
    if (!conversationId) return;
    try {
      setIsRenaming(true);
      toast.loading("Generating title...", { id: "auto-rename" });
      await autoRenameConversation({
        conversationId,
      });
      toast.success("Conversation renamed", { id: "auto-rename" });
      analytics.track("conversation_action", {
        action: "auto_rename",
        source,
        conversationId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to auto-rename";
      toast.error(msg, { id: "auto-rename" });
    } finally {
      setIsRenaming(false);
    }
  };

  return {
    handleDelete,
    handleArchive,
    handleTogglePin,
    handleToggleStar,
    handleAutoRename,
    isLoading,
  };
}
