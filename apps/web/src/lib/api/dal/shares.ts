import "server-only";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

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
  // Try conversation share first
  const conversationMeta = await getConversationShareMetadata(shareId);
  if (conversationMeta) return conversationMeta;

  // Fall back to note share
  const noteMeta = await getNoteShareMetadata(shareId);
  return noteMeta;
}

/**
 * Get conversation share metadata
 */
async function getConversationShareMetadata(
  shareId: string,
): Promise<ShareMetadata | null> {
  try {
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const share = await fetchQuery(api.shares.get, { shareId });
    if (!share || "revoked" in share || "expired" in share) return null;

    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const conversation = await fetchQuery(api.shares.getSharedConversation, {
      shareId,
    });
    if (!conversation || "revoked" in conversation || "expired" in conversation)
      return null;

    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const messages = await fetchQuery(api.shares.getSharedMessages, {
      shareId,
    });

    const firstUserMessage = Array.isArray(messages)
      ? messages.find((m: { role: string }) => m.role === "user")
      : null;

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

/**
 * Get note share metadata
 */
async function getNoteShareMetadata(
  shareId: string,
): Promise<ShareMetadata | null> {
  try {
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const note = await fetchQuery(api.notes.getByShareId, { shareId });
    if (!note || !note.isPublic) return null;

    // Get full note content for description
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const fullNote = await fetchQuery(api.notes.getPublicNote, {
      noteId: note._id,
    });

    const description = fullNote?.content
      ? String(fullNote.content).slice(0, 155)
      : "Shared note on blah.chat";

    return {
      title: note.title || "Shared Note",
      description,
      type: "note",
    };
  } catch {
    return null;
  }
}
