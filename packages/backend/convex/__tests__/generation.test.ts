import { describe, expect, it } from "vitest";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUsageRecordData,
  createTestUserData,
} from "@/lib/test/factories";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import schema from "../schema";

/**
 * Generation tests
 *
 * Note: The main generation action (generate) calls external LLM APIs,
 * so we test the supporting queries/mutations that the generation system uses:
 * - Message status transitions
 * - Usage recording
 * - Message recovery
 * - Supporting queries
 */

describe("convex/generation support", () => {
  describe("message status transitions", () => {
    it("tracks message from pending to generating to complete", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, msgId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const mId = await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "assistant",
            status: "pending",
            content: "",
            model: "openai:gpt-4o",
          }),
        );
        return { convId: cId, msgId: mId };
      });

      // Verify pending state
      let msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("pending");

      // Simulate generating state
      await t.run(async (ctx) => {
        await ctx.db.patch(msgId, {
          status: "generating",
          generationStartedAt: Date.now(),
        });
      });

      msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("generating");
      expect(msg?.generationStartedAt).toBeDefined();

      // Simulate complete state
      await t.run(async (ctx) => {
        await ctx.db.patch(msgId, {
          status: "complete",
          content: "Hello! How can I help you?",
          generationCompletedAt: Date.now(),
        });
      });

      msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("complete");
      expect(msg?.content).toBe("Hello! How can I help you?");
      expect(msg?.generationCompletedAt).toBeDefined();
    });

    it("handles error state with error message", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            status: "generating",
            content: "",
            model: "openai:gpt-4o",
          }),
        );
      });

      // Simulate error state
      await t.run(async (ctx) => {
        await ctx.db.patch(msgId, {
          status: "error",
          error: "Rate limit exceeded",
          generationCompletedAt: Date.now(),
        });
      });

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("error");
      expect(msg?.error).toBe("Rate limit exceeded");
    });

    it("stores partial content during streaming", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            status: "generating",
            content: "",
            model: "openai:gpt-4o",
          }),
        );
      });

      // Simulate partial content updates during streaming
      await t.run(async (ctx) => {
        await ctx.db.patch(msgId, { partialContent: "Hello" });
      });

      let msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.partialContent).toBe("Hello");

      await t.run(async (ctx) => {
        await ctx.db.patch(msgId, { partialContent: "Hello! How" });
      });

      msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.partialContent).toBe("Hello! How");
    });
  });

  describe("usage recording", () => {
    it("records usage with tokens and cost", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
      });

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "usageRecords",
          createTestUsageRecordData(userId, {
            model: "openai:gpt-4o",
            inputTokens: 500,
            outputTokens: 200,
            cost: 0.025,
          }),
        );
      });

      const records = await t.run(async (ctx) => {
        return await ctx.db
          .query("usageRecords")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
      });

      expect(records).toHaveLength(1);
      expect(records[0].inputTokens).toBe(500);
      expect(records[0].outputTokens).toBe(200);
      expect(records[0].cost).toBe(0.025);
    });

    it("aggregates usage by date", async () => {
      const t = convexTest(schema);
      const today = new Date().toISOString().split("T")[0];

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
      });

      // Insert multiple records for same day
      await t.run(async (ctx) => {
        await ctx.db.insert(
          "usageRecords",
          createTestUsageRecordData(userId, {
            date: today,
            inputTokens: 100,
            outputTokens: 50,
            cost: 0.01,
          }),
        );
        await ctx.db.insert(
          "usageRecords",
          createTestUsageRecordData(userId, {
            date: today,
            inputTokens: 200,
            outputTokens: 100,
            cost: 0.02,
          }),
        );
      });

      const records = await t.run(async (ctx) => {
        return await ctx.db
          .query("usageRecords")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", userId).eq("date", today),
          )
          .collect();
      });

      const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
      const totalInput = records.reduce((sum, r) => sum + r.inputTokens, 0);
      const totalOutput = records.reduce((sum, r) => sum + r.outputTokens, 0);

      expect(totalCost).toBe(0.03);
      expect(totalInput).toBe(300);
      expect(totalOutput).toBe(150);
    });
  });

  describe("message recovery", () => {
    it("recovers stuck generating message after threshold", async () => {
      const t = convexTest(schema);
      const tenMinutesAgo = Date.now() - 11 * 60 * 1000;

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            status: "generating",
            content: "",
            model: "openai:gpt-4o",
            createdAt: tenMinutesAgo,
            generationStartedAt: tenMinutesAgo,
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.recovery.recoverStuckMessages,
        {},
      );

      expect(result.recovered).toBe(1);

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("error");
      expect(msg?.error).toContain("Generation timed out");
    });

    it("does not recover recent generating messages", async () => {
      const t = convexTest(schema);

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            status: "generating",
            content: "",
            model: "openai:gpt-4o",
            generationStartedAt: Date.now(),
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.recovery.recoverStuckMessages,
        {},
      );

      expect(result.recovered).toBe(0);

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("generating");
    });

    it("recovers stuck pending message after threshold", async () => {
      const t = convexTest(schema);
      const tenMinutesAgo = Date.now() - 11 * 60 * 1000;

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            status: "pending",
            content: "",
            model: "openai:gpt-4o",
            createdAt: tenMinutesAgo,
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.recovery.recoverStuckMessages,
        {},
      );

      expect(result.recovered).toBe(1);

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.status).toBe("error");
    });

    it("recoverMessage checks age threshold", async () => {
      const t = convexTest(schema);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            status: "generating",
            content: "",
            model: "openai:gpt-4o",
            createdAt: fiveMinutesAgo,
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.recovery.recoverMessage,
        {
          messageId: msgId,
        },
      );

      expect(result.recovered).toBe(false);
      expect(result.reason).toContain("minutes old");
    });
  });

  describe("conversation model tracking", () => {
    it("stores model on assistant messages", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-4o" }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "assistant",
            content: "Response",
            model: "openai:gpt-4o",
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const messages = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(messages[0].model).toBe("openai:gpt-4o");
    });

    it("conversation tracks last used model", async () => {
      const t = convexTest(schema);

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, {
            model: "anthropic:claude-3-5-sonnet",
          }),
        );
      });

      const conv = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conv?.model).toBe("anthropic:claude-3-5-sonnet");
    });
  });

  describe("tool calls storage", () => {
    it("stores tool calls for assistant messages", async () => {
      const t = convexTest(schema);

      const { msgId, toolCallId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const mId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            content: "Searching the web...",
            model: "openai:gpt-4o",
          }),
        );
        const tcId = await ctx.db.insert("toolCalls", {
          messageId: mId,
          conversationId: convId,
          userId,
          toolName: "web_search",
          toolCallId: "call_123",
          args: { query: "weather today" },
          result: { results: [] },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
        return { msgId: mId, toolCallId: tcId };
      });

      const toolCalls = await t.run(async (ctx) => {
        return await ctx.db
          .query("toolCalls")
          .withIndex("by_message", (q) => q.eq("messageId", msgId))
          .collect();
      });

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].toolName).toBe("web_search");
      expect(toolCalls[0].isPartial).toBe(false);
    });
  });

  describe("attachments for generation", () => {
    it("stores attachments linked to messages", async () => {
      const t = convexTest(schema);

      const { msgId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const mId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "user",
            content: "What's in this image?",
          }),
        );
        // Create a proper storage ID using the test framework
        const storageId = await ctx.storage.store(new Blob(["test image"]));
        await ctx.db.insert("attachments", {
          messageId: mId,
          conversationId: convId,
          userId,
          type: "image",
          name: "screenshot.png",
          storageId,
          mimeType: "image/png",
          size: 1024,
          createdAt: Date.now(),
        });
        return { msgId: mId };
      });

      const attachments = await t.run(async (ctx) => {
        return await ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", msgId))
          .collect();
      });

      expect(attachments).toHaveLength(1);
      expect(attachments[0].mimeType).toBe("image/png");
    });
  });

  describe("reasoning content storage", () => {
    it("stores reasoning for thinking models", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "assistant",
            content: "The answer is 42.",
            model: "anthropic:claude-3-7-sonnet",
            reasoning: "Let me think about this step by step...",
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const messages = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(messages[0].reasoning).toBe(
        "Let me think about this step by step...",
      );
    });
  });

  describe("generation metadata", () => {
    it("stores token counts on messages", async () => {
      const t = convexTest(schema);

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            content: "Response",
            model: "openai:gpt-4o",
            inputTokens: 150,
            outputTokens: 50,
            cost: 0.005,
          }),
        );
      });

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.inputTokens).toBe(150);
      expect(msg?.outputTokens).toBe(50);
      expect(msg?.cost).toBe(0.005);
    });

    it("stores generation timing", async () => {
      const t = convexTest(schema);
      const startTime = Date.now();

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            content: "Response",
            model: "openai:gpt-4o",
            status: "complete",
            generationStartedAt: startTime,
            generationCompletedAt: startTime + 2500,
          }),
        );
      });

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.generationStartedAt).toBe(startTime);
      expect(msg?.generationCompletedAt).toBe(startTime + 2500);
      expect(msg?.generationCompletedAt! - msg?.generationStartedAt!).toBe(
        2500,
      );
    });
  });
});
