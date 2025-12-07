"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function useConversationActions(
  conversationId: Id<"conversations"> | null,
  source: "command_palette" | "header_menu",
) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // @ts-ignore
  const deleteMutation = useMutation(api.conversations.deleteConversation);
  // @ts-ignore
  const archiveMutation = useMutation(api.conversations.archive);
  // @ts-ignore
  const togglePinMutation = useMutation(api.conversations.togglePin);
  // @ts-ignore
  const toggleStarMutation = useMutation(api.conversations.toggleStar);
  // @ts-ignore
  const autoRenameAction = useAction(api.conversations.actions.bulkAutoRename);

  const handleDelete = async () => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      await deleteMutation({ conversationId });
      toast.success("Conversation deleted");
      analytics.track("conversation_action", {
        action: "delete",
        source,
        conversationId,
      });
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      await archiveMutation({ conversationId });
      toast.success("Conversation archived");
      analytics.track("conversation_action", {
        action: "archive",
        source,
        conversationId,
      });
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to archive";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePin = async (isPinned: boolean) => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      await togglePinMutation({ conversationId });
      toast.success(isPinned ? "Conversation unpinned" : "Conversation pinned");
      analytics.track("conversation_action", {
        action: isPinned ? "unpin" : "pin",
        source,
        conversationId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle pin";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStar = async (isStarred: boolean) => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      await toggleStarMutation({ conversationId });
      toast.success(
        isStarred ? "Conversation unstarred" : "Conversation starred",
      );
      analytics.track("conversation_action", {
        action: isStarred ? "unstar" : "star",
        source,
        conversationId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle star";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoRename = async () => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
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
      setIsLoading(false);
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
