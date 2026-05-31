import "server-only";

import {
  getConversationShareByShareId,
  getSharedConversation as getSharedConv,
  getSharedMessages as getSharedMsgs,
} from "@/lib/persistence/conversationShares";
import { getNoteShareMetadata as getPostgresNoteShareMetadata } from "@/lib/persistence/notes";

interface ShareMetadata {
  title: string;
  description: string;
  type: "conversation" | "note";
}

/**
 * Get share metadata for OG tags (server-side only)
 * Tries conversation share first, then note share
 */
export async function getShareMetadata(
  shareId: string,
): Promise<ShareMetadata | null> {
  const conversationMeta = await getConversationShareMetadata(shareId);
  if (conversationMeta) return conversationMeta;

  const noteMeta = await getNoteShareMetadata(shareId);
  return noteMeta;
}

async function getConversationShareMetadata(
  shareId: string,
): Promise<ShareMetadata | null> {
  try {
    const share = await getConversationShareByShareId(shareId);
    if (!share?.isActive) return null;
    if (share.expiresAt && share.expiresAt < Date.now()) return null;

    const conversation = await getSharedConv(shareId);
    if (!conversation) return null;

    const msgs = await getSharedMsgs(shareId);
    const firstUserMessage = msgs.find((m) => m.role === "user");

    const description = firstUserMessage?.content
      ? String(firstUserMessage.content).slice(0, 155)
      : "Shared conversation on blah.chat";

    return {
      title: conversation.title || "Shared Conversation",
      description,
      type: "conversation",
    };
  } catch {
    return null;
  }
}

async function getNoteShareMetadata(
  shareId: string,
): Promise<ShareMetadata | null> {
  const note = await getPostgresNoteShareMetadata(shareId);
  if (!note) return null;

  return {
    title: note.title || "Shared Note",
    description: note.requiresPassword
      ? "Password-protected shared note on blah.chat"
      : "Shared note on blah.chat",
    type: "note",
  };
}
