import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { internal } from "../_generated/api";
import {
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

describe("convex/messages/toolCalls", () => {
  it.each([
    { name: "object", result: { answer: 42 } },
    { name: "array", result: ["source", 2] },
    { name: "false", result: false },
    { name: "zero", result: 0 },
    { name: "empty string", result: "" },
    { name: "null", result: null },
    { name: "error", result: { success: false, error: "task failed" } },
  ])("persists native $name result through the normalized mutation", async ({
    result,
  }) => {
    const t = convexTest(schema);
    const { messageId, conversationId, userId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "native-tool-user" }),
      );
      const conversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(userId),
      );
      const messageId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, userId, {
          role: "assistant",
          model: "gpt-4o",
        }),
      );
      return { messageId, conversationId, userId };
    });

    // @ts-ignore - Type instantiation too deep with 94+ Convex modules
    await t.mutation(internal.messages.toolCalls.upsertToolCall, {
      messageId,
      conversationId,
      userId,
      toolCallId: "native-result-call",
      toolName: "calculator",
      args: { expression: "6 * 7" },
      result,
      isPartial: false,
      timestamp: 1,
    });

    const stored = await t.run((ctx) =>
      ctx.db
        .query("toolCalls")
        .withIndex("by_message", (q) => q.eq("messageId", messageId))
        .unique(),
    );
    expect(stored?.args).toEqual({ expression: "6 * 7" });
    expect(stored?.result).toEqual(result);
    expect(stored?.isPartial).toBe(false);
  });

  describe("cleanupPartialToolCalls", () => {
    it("deletes only partial tool calls", async () => {
      const t = convexTest(schema);

      const { messageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user1" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            model: "gpt-4o",
          }),
        );

        // Insert 2 partial and 2 complete tool calls
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc1",
          toolName: "web_search",
          args: { query: "test" },
          isPartial: true,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc2",
          toolName: "web_search",
          args: { query: "test2" },
          isPartial: true,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc3",
          toolName: "web_search",
          args: { query: "complete1" },
          result: { results: [] },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc4",
          toolName: "web_search",
          args: { query: "complete2" },
          result: { results: [] },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });

        return { messageId: msgId, conversationId: convId };
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.toolCalls.cleanupPartialToolCalls,
        { messageId },
      );

      expect(result.deleted).toBe(2);

      // Verify only complete tool calls remain
      const remaining = await t.run(async (ctx) => {
        return await ctx.db
          .query("toolCalls")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();
      });

      expect(remaining).toHaveLength(2);
      expect(remaining.every((tc) => !tc.isPartial)).toBe(true);
      expect(remaining.map((tc) => tc.toolCallId).sort()).toEqual([
        "tc3",
        "tc4",
      ]);
    });

    it("preserves all tool calls when none are partial", async () => {
      const t = convexTest(schema);

      const { messageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user1" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            model: "gpt-4o",
          }),
        );

        // Insert only complete tool calls
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc1",
          toolName: "web_search",
          args: { query: "test" },
          result: { results: [] },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc2",
          toolName: "code_execution",
          args: { code: "print(1)" },
          result: { output: "1" },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });

        return { messageId: msgId };
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.toolCalls.cleanupPartialToolCalls,
        { messageId },
      );

      expect(result.deleted).toBe(0);

      const remaining = await t.run(async (ctx) => {
        return await ctx.db
          .query("toolCalls")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();
      });

      expect(remaining).toHaveLength(2);
    });

    it("handles empty case gracefully", async () => {
      const t = convexTest(schema);

      const { messageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user1" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            model: "gpt-4o",
          }),
        );
        return { messageId: msgId };
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.mutation(
        internal.messages.toolCalls.cleanupPartialToolCalls,
        { messageId },
      );

      expect(result.deleted).toBe(0);
    });
  });

  describe("finalizeToolCalls", () => {
    it("marks partial tool calls as complete", async () => {
      const t = convexTest(schema);

      const { messageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user1" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            model: "gpt-4o",
          }),
        );

        // Insert partial tool calls
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc1",
          toolName: "web_search",
          args: { query: "test" },
          result: { results: [] },
          isPartial: true,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc2",
          toolName: "web_search",
          args: { query: "test2" },
          result: { results: [] },
          isPartial: true,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });

        return { messageId: msgId };
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await t.mutation(internal.messages.toolCalls.finalizeToolCalls, {
        messageId,
      });

      const toolCalls = await t.run(async (ctx) => {
        return await ctx.db
          .query("toolCalls")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();
      });

      expect(toolCalls).toHaveLength(2);
      expect(toolCalls.every((tc) => !tc.isPartial)).toBe(true);
    });

    it("does nothing when no partial tool calls exist", async () => {
      const t = convexTest(schema);

      const { messageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user1" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            role: "assistant",
            model: "gpt-4o",
          }),
        );

        await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId: convId,
          userId,
          toolCallId: "tc1",
          toolName: "web_search",
          args: { query: "test" },
          result: { results: [] },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });

        return { messageId: msgId };
      });

      // Should not throw
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await t.mutation(internal.messages.toolCalls.finalizeToolCalls, {
        messageId,
      });

      const toolCalls = await t.run(async (ctx) => {
        return await ctx.db
          .query("toolCalls")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();
      });

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].isPartial).toBe(false);
    });
  });
});
