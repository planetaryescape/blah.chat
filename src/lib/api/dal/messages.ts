import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getAuthenticatedConvexClient,
  getConvexClient,
} from "@/lib/api/convex";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().min(1),
  modelId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image", "audio"]),
        name: z.string(),
        storageId: z.string(),
        mimeType: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
});

export const messagesDAL = {
  /**
   * Send message (returns immediately, generation happens async)
   * Returns 202 Accepted with assistant message ID for polling
   */
  send: async (
    userId: string, // This is the Clerk user ID
    conversationId: string,
    data: z.infer<typeof sendMessageSchema>,
    sessionToken: string, // JWT for authenticated Convex calls
  ) => {
    const validated = sendMessageSchema.parse(data);
    const convex = getConvexClient();

    // Use authenticated client for mutations that need ctx.auth
    const authConvex = getAuthenticatedConvexClient(sessionToken);

    // Verify user owns conversation (uses clerkId for server-side verification)
    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.getWithClerkVerification,
      {
        conversationId: conversationId as Id<"conversations">,
        clerkId: userId,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Access denied");
    }

    // Calls chat.sendMessage which creates user + pending assistant messages
    // and schedules generation action (fire-and-forget)
    // Uses authenticated client since sendMessage needs ctx.auth
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const result = await authConvex.mutation(api.chat.sendMessage, {
      conversationId: conversationId as Id<"conversations">,
      content: validated.content,
      modelId: validated.modelId,
      attachments: validated.attachments,
    });

    return {
      status: "success" as const,
      sys: {
        entity: "message",
        async: true,
      },
      data: {
        conversationId,
        messageId: result.messageId, // User message ID
        assistantMessageId: result.assistantMessageIds?.[0], // First assistant message
        status: "pending",
        pollUrl: `/api/v1/messages/${result.assistantMessageIds?.[0]}`,
      },
    };
  },

  /**
   * Get message by ID (for polling, with ownership verification)
   */
  get: async (userId: string, messageId: string) => {
    const convex = getConvexClient();

    const message = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.messages.get,
      {
        messageId: messageId as Id<"messages">,
      },
    )) as any;

    if (!message) {
      throw new Error("Message not found");
    }

    // Verify ownership via conversation (uses clerkId for server-side verification)
    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.getWithClerkVerification,
      {
        conversationId: message.conversationId,
        clerkId: userId,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Access denied");
    }

    return formatEntity(message, "message", message._id);
  },

  /**
   * List messages for conversation (with ownership verification)
   */
  list: async (userId: string, conversationId: string) => {
    const convex = getConvexClient();

    // Verify ownership (uses clerkId for server-side verification)
    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.getWithClerkVerification,
      {
        conversationId: conversationId as Id<"conversations">,
        clerkId: userId,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Access denied");
    }

    const messages = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.messages.list,
      {
        conversationId: conversationId as Id<"conversations">,
      },
    )) as Array<any>;

    return messages.map((message) =>
      formatEntity(message, "message", message._id),
    );
  },

  /**
   * Update message (edit content)
   * NOTE: Currently not supported - Convex doesn't have editMessage mutation
   * To edit a message, delete and resend instead
   */
  update: async (_userId: string, _messageId: string, _content: string) => {
    throw new Error("Message editing not yet implemented");
  },

  /**
   * Regenerate assistant response
   */
  regenerate: async (userId: string, messageId: string, _modelId?: string) => {
    const convex = getConvexClient();

    // Verify ownership
    const message = await messagesDAL.get(userId, messageId);

    // Regenerate via Convex (triggers new generation)
    // Returns Id<"messages"> directly
    const newMessageId = await convex.mutation(api.chat.regenerate, {
      messageId: messageId as Id<"messages">,
    });

    return {
      status: "success" as const,
      sys: {
        entity: "message",
        async: true,
      },
      data: {
        conversationId: message.data.conversationId,
        originalMessageId: messageId,
        newMessageId: newMessageId,
        status: "pending",
        pollUrl: `/api/v1/messages/${newMessageId}`,
      },
    };
  },

  /**
   * Delete message (soft delete)
   */
  delete: async (userId: string, messageId: string) => {
    const convex = getConvexClient();

    // Verify ownership
    await messagesDAL.get(userId, messageId);

    await convex.mutation(api.chat.deleteMessage, {
      messageId: messageId as Id<"messages">,
    });

    return formatEntity({ deleted: true, messageId }, "message", messageId);
  },
};
