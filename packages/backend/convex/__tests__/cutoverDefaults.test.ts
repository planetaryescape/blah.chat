import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import { makeFunctionReference } from "convex/server";
import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import {
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

describe("explicit provider-outage default repair", () => {
  it("changes only new-chat preferences, preserves history, and is idempotent", async () => {
    const t = convexTest(schema);
    const ids = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", createTestUserData());
      const preference = await ctx.db.insert("userPreferences", {
        userId,
        category: "models",
        key: "defaultModel",
        value: "retired-provider-model",
        createdAt: 1,
        updatedAt: 1,
      });
      const working = await ctx.db.insert("userPreferences", {
        userId,
        category: "chat",
        key: "anotherPreference",
        value: "preserve-me",
        createdAt: 1,
        updatedAt: 1,
      });
      const otherUserId = await ctx.db.insert("users", createTestUserData());
      const available = await ctx.db.insert("userPreferences", {
        userId: otherUserId,
        category: "models",
        key: "defaultModel",
        value: DEFAULT_MODEL_ID,
        createdAt: 1,
        updatedAt: 1,
      });
      const conversation = await ctx.db.insert(
        "conversations",
        createTestConversationData(userId, { model: "historical-model" }),
      );
      const message = await ctx.db.insert(
        "messages",
        createTestMessageData(conversation, userId, {
          model: "historical-model",
          content: "Preserve this historical response.",
        }),
      );
      return { preference, working, available, conversation, message };
    });
    const repair = makeFunctionReference<
      "mutation",
      { acknowledgeProviderOutage: true },
      { defaultModel: string; changedFrom: Record<string, number> }
    >("migrations/cutoverDefaults:useAvailableTextDefault");
    expect(
      (await t.mutation(repair, { acknowledgeProviderOutage: true }))
        .changedFrom,
    ).toEqual({ "retired-provider-model": 1 });
    expect(
      await t.run(async (ctx) => (await ctx.db.get(ids.preference))?.value),
    ).toBe(DEFAULT_MODEL_ID);
    expect(
      await t.run(async (ctx) => (await ctx.db.get(ids.working))?.value),
    ).toBe("preserve-me");
    expect(
      await t.run(async (ctx) => (await ctx.db.get(ids.available))?.updatedAt),
    ).toBe(1);
    expect(
      await t.run(async (ctx) => (await ctx.db.get(ids.conversation))?.model),
    ).toBe("historical-model");
    expect(
      await t.run(async (ctx) => (await ctx.db.get(ids.message))?.content),
    ).toBe("Preserve this historical response.");
    expect(
      await t.run(async (ctx) => (await ctx.db.get(ids.message))?.model),
    ).toBe("historical-model");
    expect(
      (await t.mutation(repair, { acknowledgeProviderOutage: true }))
        .changedFrom,
    ).toEqual({});
  });
});
