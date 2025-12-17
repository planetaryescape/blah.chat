"use node";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const BATCH_SIZE = 50;

/**
 * Backfill conversation token usage from messages (source of truth)
 *
 * Run from Convex Dashboard:
 * internal.migrations.007_normalize_conversation_metadata.backfillConversationTokenUsage
 */
export const backfillConversationTokenUsage = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    let totalConversations = 0;
    let totalUsageRecords = 0;

    console.log("🚀 Starting token usage backfill...");

    while (true) {
      const batch = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["007_normalize_conversation_metadata_helpers"]
          .getConversationBatch,
        { cursor, batchSize: BATCH_SIZE },
      )) as {
        conversations: Array<{ _id: string }>;
        nextCursor: string | null;
      };

      if (batch.conversations.length === 0) break;

      for (const conv of batch.conversations) {
        const messagesByModel = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.migrations["007_normalize_conversation_metadata_helpers"]
            .getMessageTokensByModel,
          { conversationId: conv._id },
        )) as Array<{
          model: string;
          totalTokens: number;
          inputTokens: number;
          outputTokens: number;
          reasoningTokens: number;
          messageCount: number;
        }>;

        for (const usage of messagesByModel) {
          (await (ctx.runMutation as any)(
            // @ts-ignore - TypeScript recursion limit
            internal.migrations["007_normalize_conversation_metadata_helpers"]
              .insertTokenUsageRecord,
            { conversationId: conv._id, ...usage },
          )) as Promise<void>;
          totalUsageRecords++;
        }
      }

      totalConversations += batch.conversations.length;
      cursor = batch.nextCursor;
      console.log(
        `✅ Processed ${totalConversations} conversations (${totalUsageRecords} records)`,
      );

      if (!batch.nextCursor) break;
    }

    console.log(
      `🎉 Backfill complete! ${totalConversations} conversations, ${totalUsageRecords} usage records`,
    );
    return { totalConversations, totalUsageRecords };
  },
});
