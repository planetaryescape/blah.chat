import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  getAuthenticatedConvexClient,
  getConvexClient,
} from "@/lib/api/convex";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";
import { z } from "zod";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
});

const updateConversationSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    model: z.string().min(1).optional(),
  })
  .partial();

export const conversationsDAL = {
  /**
   * Create new conversation
   */
  create: async (
    _userId: string,
    data: z.infer<typeof createConversationSchema>,
  ) => {
    const validated = createConversationSchema.parse(data);
    const convex = getConvexClient();

    const conversationId = (await (convex.mutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.create,
      {
        ...validated,
      },
    )) as any;

    // Fetch full conversation
    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.get,
      {
        conversationId,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    return formatEntity(conversation, "conversation", conversation._id);
  },

  /**
   * Get conversation by ID (with ownership verification)
   */
  getById: async (userId: string, conversationId: string) => {
    const convex = getConvexClient();

    // Uses clerkId for server-side ownership verification
    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.getWithClerkVerification,
      {
        conversationId: conversationId as Id<"conversations">,
        clerkId: userId,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    return formatEntity(conversation, "conversation", conversation._id);
  },

  /**
   * List conversations (paginated)
   */
  list: async (_userId: string, limit = 50, archived = false) => {
    const convex = getConvexClient();

    const conversations = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.list,
      {
        limit,
        archived,
      },
    )) as Array<any>;

    return conversations.map((conversation) =>
      formatEntity(conversation, "conversation", conversation._id),
    );
  },

  /**
   * Update conversation
   */
  update: async (
    userId: string,
    conversationId: string,
    data: z.infer<typeof updateConversationSchema>,
  ) => {
    const validated = updateConversationSchema.parse(data);
    const convex = getConvexClient();

    // Verify ownership first
    await conversationsDAL.getById(userId, conversationId);

    // Update title if provided (use rename mutation)
    if (validated.title) {
      await convex.mutation(api.conversations.rename, {
        conversationId: conversationId as Id<"conversations">,
        title: validated.title,
      });
    }

    // Update model if provided (use updateModel mutation)
    if (validated.model) {
      await convex.mutation(api.conversations.updateModel, {
        conversationId: conversationId as Id<"conversations">,
        model: validated.model,
      });
    }

    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.get,
      {
        conversationId: conversationId as Id<"conversations">,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return formatEntity(conversation, "conversation", conversation._id);
  },

  /**
   * Archive conversation
   */
  archive: async (userId: string, conversationId: string) => {
    const convex = getConvexClient();

    // Verify ownership first
    await conversationsDAL.getById(userId, conversationId);

    await convex.mutation(api.conversations.archive, {
      conversationId: conversationId as Id<"conversations">,
    });

    const conversation = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.get,
      {
        conversationId: conversationId as Id<"conversations">,
      },
    )) as any;

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return formatEntity(conversation, "conversation", conversation._id);
  },

  /**
   * Delete conversation (soft delete)
   */
  delete: async (
    userId: string,
    conversationId: string,
    sessionToken: string,
  ) => {
    const _convex = getConvexClient();

    // Verify ownership first
    await conversationsDAL.getById(userId, conversationId);

    // Use authenticated client for mutation that requires ctx.auth
    const authConvex = getAuthenticatedConvexClient(sessionToken);

    await authConvex.mutation(api.conversations.deleteConversation, {
      conversationId: conversationId as Id<"conversations">,
    });

    return formatEntity(
      { deleted: true, conversationId },
      "conversation",
      conversationId,
    );
  },
};
