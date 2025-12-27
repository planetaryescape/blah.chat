import { convexTest } from "./testSetup";
import { describe, expect, it } from "vitest";
import {
  createMockIdentity,
  createTestConversationData,
  createTestUserData,
} from "@/lib/test/factories";
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

describe("convex/usage", () => {
  describe("recordTranscription", () => {
    it("creates usage record for transcription", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTranscription, {
          userId: userId as Id<"users">,
          model: "openai:whisper-1",
          durationMinutes: 2.5,
          cost: 0.015,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          userId: userId as Id<"users">,
          model: "openai:whisper-1",
          cost: 0.015,
          inputTokens: 0,
          outputTokens: 0,
          messageCount: 1,
        });
      });
    });
  });

  describe("recordImageGeneration", () => {
    it("creates usage record for image generation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      let conversationId: Id<"conversations">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-4o" }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordImageGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:dall-e-3",
          cost: 0.04,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          model: "openai:dall-e-3",
          cost: 0.04,
          messageCount: 1,
        });
      });
    });
  });

  describe("recordTextGeneration", () => {
    it("creates new usage record for first generation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      let conversationId: Id<"conversations">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-5" }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:gpt-5",
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
          messageCount: 1,
        });
      });
    });

    it("aggregates usage for same user+date+model", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      let conversationId: Id<"conversations">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-5" }),
        );
      });

      await t.run(async (ctx) => {
        // First generation
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:gpt-5",
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
        });

        // Second generation same model
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:gpt-5",
          inputTokens: 2000,
          outputTokens: 1000,
          cost: 0.1,
        });

        const records = await ctx.db.query("usageRecords").collect();
        // Should aggregate into single record
        expect(records).toHaveLength(1);
        expect(records[0].inputTokens).toBe(3000); // 1000 + 2000
        expect(records[0].outputTokens).toBe(1500); // 500 + 1000
        expect(records[0].cost).toBeCloseTo(0.15); // 0.05 + 0.10 (float precision)
        expect(records[0].messageCount).toBe(2);
      });
    });

    it("creates separate records for different models", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      let conversationId: Id<"conversations">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:gpt-5" }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:gpt-5",
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
        });

        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "anthropic:claude-3-opus",
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.08,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records).toHaveLength(2);
      });
    });

    it("tracks reasoning tokens when provided", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      let conversationId: Id<"conversations">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:o1" }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:o1",
          inputTokens: 1000,
          outputTokens: 500,
          reasoningTokens: 2000,
          cost: 0.15,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records[0].reasoningTokens).toBe(2000);
      });
    });

    it("aggregates reasoning tokens correctly", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      let conversationId: Id<"conversations">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { model: "openai:o1" }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:o1",
          inputTokens: 1000,
          outputTokens: 500,
          reasoningTokens: 2000,
          cost: 0.15,
        });

        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: userId as Id<"users">,
          conversationId: conversationId as Id<"conversations">,
          model: "openai:o1",
          inputTokens: 500,
          outputTokens: 250,
          reasoningTokens: 1500,
          cost: 0.1,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records[0].reasoningTokens).toBe(3500); // 2000 + 1500
      });
    });
  });

  describe("recordTTS", () => {
    it("creates usage record for TTS", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      let userId: Id<"users">;
      await t.run(async (ctx) => {
        userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      await t.run(async (ctx) => {
        // @ts-ignore - internal mutation
        await ctx.runMutation(internal.usage.mutations.recordTTS, {
          userId: userId as Id<"users">,
          model: "deepgram:tts",
          characterCount: 500,
          cost: 0.005,
        });

        const records = await ctx.db.query("usageRecords").collect();
        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          model: "deepgram:tts",
          outputTokens: 500, // Character count stored as output tokens
          cost: 0.005,
        });
      });
    });
  });

  // Note: Budget alert tests (scheduler.runAfter) are skipped because
  // convex-test doesn't support scheduled functions. The budget alert
  // logic is tested implicitly through integration tests.
});
