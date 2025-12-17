"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import {
  useArchiveConversation,
  useDeleteConversation,
  useTogglePin,
  useToggleStar,
} from "@/lib/hooks/mutations";

export function useConversationActions(
  conversationId: Id<"conversations"> | null,
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
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const autoRenameAction = useAction(api.conversations.actions.bulkAutoRename);

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
      const results = await autoRenameAction({
        conversationIds: [conversationId],
      });

      if (results[0]?.success) {
        toast.success("Conversation renamed", { id: "auto-rename" });
        analytics.track("conversation_action", {
          action: "auto_rename",
          source,
          conversationId,
        });
      } else {
        throw new Error(results[0]?.error || "Failed to generate title");
      }
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
