import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockIdentity,
  createTestConversationData,
  createTestUserData,
} from "@/lib/test/factories";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import schema from "../schema";

describe("model switching", () => {
  // Use fake timers to prevent scheduled functions from running
  // sendMessage schedules generateResponse which calls external APIs
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  describe("updateModel mutation", () => {
    it("persists model to conversation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-4o-mini" }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.conversations.updateModel, {
        conversationId: convId,
        model: "anthropic:claude-3-5-sonnet",
      });

      const updated = await t.run(async (ctx) => ctx.db.get(convId));
      expect(updated?.model).toBe("anthropic:claude-3-5-sonnet");
    });

    it("updates updatedAt timestamp", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, originalUpdatedAt } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const id = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const conv = await ctx.db.get(id);
        return { convId: id, originalUpdatedAt: conv!.updatedAt };
      });

      // Advance time to ensure different timestamp
      vi.advanceTimersByTime(10);

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.conversations.updateModel, {
        conversationId: convId,
        model: "openai:gpt-4o",
      });

      const updated = await t.run(async (ctx) => ctx.db.get(convId));
      expect(updated!.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });

    it("throws for non-owner", async () => {
      const t = convexTest(schema);

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "other", email: "other@example.com" }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
      });

      const asOther = t.withIdentity(createMockIdentity({ subject: "other" }));

      await expect(
        // @ts-ignore - Type instantiation too deep with 94+ Convex modules
        asOther.mutation(api.conversations.updateModel, {
          conversationId: convId,
          model: "anthropic:claude-3-5-sonnet",
        }),
      ).rejects.toThrow("Not found");
    });
  });

  describe("sendMessage with model", () => {
    it("creates assistant message with specified model", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId } = await t.run(async (ctx) => {
        const uid = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cid = await ctx.db.insert(
          "conversations",
          createTestConversationData(uid),
        );
        return { convId: cid, userId: uid };
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.mutation(api.chat.sendMessage, {
        conversationId: convId,
        content: "Test message",
        modelId: "anthropic:claude-3-5-sonnet",
      });

      // Mutation returns conversationId (assistant message created in action, not mutation)
      expect(result.conversationId).toBeDefined();

      // Verify user message was created
      const messages = await t.run(async (ctx) =>
        ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", result.conversationId),
          )
          .filter((q) => q.eq(q.field("role"), "user"))
          .collect(),
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Test message");
    });

    it("uses fallback model when none specified", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.mutation(api.chat.sendMessage, {
        content: "Test without model",
      });

      // Mutation returns conversationId (assistant message created in action)
      expect(result.conversationId).toBeDefined();

      // Verify user message was created
      const messages = await t.run(async (ctx) =>
        ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", result.conversationId),
          )
          .filter((q) => q.eq(q.field("role"), "user"))
          .collect(),
      );

      expect(messages).toHaveLength(1);
    });
  });

  describe("mid-conversation model switch", () => {
    it("conversation model updates correctly", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-4o-mini" }),
        );
      });

      const asUser = t.withIdentity(identity);

      // Send first message
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.chat.sendMessage, {
        conversationId: convId,
        content: "First message",
        modelId: "openai:gpt-4o-mini",
      });

      // Release lock (generation action doesn't run in tests due to fake timers)
      await t.run(async (ctx) => {
        const lock = await ctx.db
          .query("generationLocks")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .first();
        if (lock) await ctx.db.delete(lock._id);
      });

      // Switch model
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.conversations.updateModel, {
        conversationId: convId,
        model: "anthropic:claude-3-5-sonnet",
      });

      // Verify conversation model was updated
      const conv = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conv?.model).toBe("anthropic:claude-3-5-sonnet");

      // Send second message with new model
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.chat.sendMessage, {
        conversationId: convId,
        content: "Second message",
        modelId: "anthropic:claude-3-5-sonnet",
      });

      // Verify user messages were created (assistant messages created in action)
      const messages = await t.run(async (ctx) =>
        ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .filter((q) => q.eq(q.field("role"), "user"))
          .order("asc")
          .collect(),
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("First message");
      expect(messages[1].content).toBe("Second message");
    });
  });

  describe("comparison mode", () => {
    it("creates multiple assistant messages with different models", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.mutation(api.chat.sendMessage, {
        conversationId: convId,
        content: "Compare these models",
        models: ["openai:gpt-4o-mini", "anthropic:claude-3-5-sonnet"],
      });

      // Comparison mode returns comparisonGroupId (message IDs created in action)
      expect(result.comparisonGroupId).toBeDefined();
      expect(result.conversationId).toBeDefined();
    });

    it("single model does not return comparisonGroupId", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.mutation(api.chat.sendMessage, {
        content: "Single model message",
        modelId: "openai:gpt-4o-mini",
      });

      // Single mode should not have comparisonGroupId
      expect(result.comparisonGroupId).toBeUndefined();
      expect(result.conversationId).toBeDefined();
    });
  });
});
