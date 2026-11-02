import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUsageRecordData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const model = "openai:gpt-oss-20b";
async function fixture(spend = 10, hardLimit = true, budget = 10) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    );
    const other = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "other" }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(userId, { model, isCollaborative: true }),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: other,
      role: "collaborator",
      joinedAt: Date.now(),
    });
    const userMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, userId, {
        createdAt: 1,
        comparisonGroupId: "comparison",
        isActiveBranch: true,
      }),
    );
    const assistantId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, userId, {
        role: "assistant",
        model,
        status: "error",
        createdAt: 2,
        parentMessageId: userMessageId,
        comparisonGroupId: "comparison",
        isActiveBranch: true,
      }),
    );
    const siblingId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, userId, {
        role: "assistant",
        model,
        createdAt: 3,
        parentMessageId: userMessageId,
        comparisonGroupId: "comparison",
      }),
    );
    const settingsId = await ctx.db.insert("adminSettings", {
      autoMemoryExtractEnabled: false,
      autoMemoryExtractInterval: 5,
      enableHybridSearch: false,
      defaultMonthlyBudget: budget,
      defaultBudgetAlertThreshold: 0.8,
      budgetHardLimitEnabled: hardLimit,
      defaultDailyMessageLimit: 50,
      alertEmail: "test@example.com",
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    await ctx.db.insert(
      "usageRecords",
      createTestUsageRecordData(userId, { cost: spend }),
    );
    // Neither a different user's spend nor adjacent months can exhaust this month.
    await ctx.db.insert(
      "usageRecords",
      createTestUsageRecordData(other, { cost: 100 }),
    );
    await ctx.db.insert(
      "usageRecords",
      createTestUsageRecordData(userId, { date: "2026-10-31", cost: 100 }),
    );
    await ctx.db.insert(
      "usageRecords",
      createTestUsageRecordData(userId, { date: "2026-12-01", cost: 100 }),
    );
    return {
      userId,
      conversationId,
      userMessageId,
      assistantId,
      siblingId,
      settingsId,
    };
  });
  const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
  const { key } = await client.mutation(api.cliAuth.create, {});
  return { t, client, key, ...ids };
}
afterEach(() => vi.useRealTimers());

describe("configured monthly spend hard limit", () => {
  it.each([
    10, 11,
  ])("denies every paid entry point at spend %s with no writes or schedules", async (spend) => {
    const {
      t,
      client,
      key,
      conversationId,
      userMessageId,
      assistantId,
      siblingId,
    } = await fixture(spend);
    const readState = () =>
      t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        conversations: await ctx.db.query("conversations").collect(),
        users: await ctx.db.query("users").collect(),
        usage: await ctx.db.query("usageRecords").collect(),
        keys: await ctx.db.query("cliApiKeys").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      }));
    const before = await readState();
    for (const operation of [
      () =>
        client.mutation(api.chat.sendMessage, {
          content: "new",
          modelId: model,
        }),
      () =>
        client.mutation(api.chat.sendMessage, {
          conversationId,
          content: "comparison",
          models: [model, "auto"],
        }),
      () => client.mutation(api.chat.regenerate, { messageId: assistantId }),
      () =>
        client.mutation(api.chat.retryMessage, { messageId: userMessageId }),
      () =>
        client.mutation(api.chat.editMessage, {
          messageId: userMessageId,
          content: "edited",
        }),
      () =>
        client.mutation(api.chat.mergeBranches, {
          conversationId,
          parentMessageIds: [assistantId, siblingId],
          content: "merge",
        }),
      () =>
        client.mutation(api.cliAuth.sendMessage, {
          apiKey: key,
          conversationId,
          content: "cli",
        }),
      () =>
        client.mutation(
          api.conversations.consolidation.createConsolidationConversation,
          { comparisonGroupId: "comparison", consolidationModel: model },
        ),
      () =>
        client.mutation(api.conversations.consolidation.consolidateInSameChat, {
          conversationId,
          comparisonGroupId: "comparison",
          consolidationModel: model,
        }),
    ]) {
      await expect(operation()).rejects.toThrow(/Monthly budget exceeded/);
      expect(await readState()).toEqual(before);
    }
  });

  it.each([
    [9.99, true, 10],
    [11, false, 10],
    [11, true, 0],
  ] as const)("allows regeneration for spend=%s enabled=%s budget=%s without charging twice", async (spend, enabled, budget) => {
    const { t, client, assistantId } = await fixture(spend, enabled, budget);
    const before = await t.run((ctx) => ctx.db.query("usageRecords").collect());
    const id = await client.mutation(api.chat.regenerate, {
      messageId: assistantId,
    });
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      status: "pending",
    });
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toEqual(before);
    expect(
      (
        await t.run((ctx) =>
          ctx.db.system.query("_scheduled_functions").collect(),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it("does not exempt admins from an explicitly enabled spend limit", async () => {
    const { t, client, userId, assistantId } = await fixture();
    await t.run((ctx) => ctx.db.patch(userId, { isAdmin: true }));
    await expect(
      client.mutation(api.chat.regenerate, { messageId: assistantId }),
    ).rejects.toThrow(/Monthly budget exceeded/);
  });

  it("charges admission against the initiating collaborator, not the conversation owner", async () => {
    const { t, assistantId } = await fixture(0);
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "other" }))
        .mutation(api.chat.regenerate, { messageId: assistantId }),
    ).rejects.toThrow(/Monthly budget exceeded/);
  });

  it("defaults enforcement off without persisted settings", async () => {
    const { t, client, settingsId, assistantId } = await fixture(100);
    await t.run((ctx) => ctx.db.delete(settingsId));
    expect(
      await client.mutation(api.chat.regenerate, { messageId: assistantId }),
    ).toBeTruthy();
  });

  it("permits non-generating branches and merges at the limit", async () => {
    const { t, client, conversationId, userMessageId, assistantId, siblingId } =
      await fixture();
    await client.mutation(api.chat.branchFromMessage, {
      messageId: userMessageId,
    });
    await client.mutation(api.chat.mergeBranches, {
      conversationId,
      parentMessageIds: [assistantId, siblingId],
      content: "merge only",
      generateResponse: false,
    });
    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(scheduled.map((job) => job.name)).not.toContain(
      getFunctionName(internal.generation.generateResponse),
    );
  });

  it("denies concurrent sends at the recorded limit without creating messages or scheduling", async () => {
    const { t, client, conversationId } = await fixture();
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        client.mutation(api.chat.sendMessage, {
          conversationId,
          content: "competing send",
          modelId: model,
        }),
      ),
    );
    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
      before,
    );
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });

  it("rechecks newly recorded spend, without charging admission or caching an earlier allowance", async () => {
    const { t, client, userId, assistantId } = await fixture(9);
    expect(
      await client.query(api.usage.checkBudget.checkBudget, { userId }),
    ).toMatchObject({ allowed: true, totalSpend: 9 });
    await t.run((ctx) =>
      ctx.db.insert(
        "usageRecords",
        createTestUsageRecordData(userId, { cost: 1 }),
      ),
    );
    await expect(
      client.mutation(api.chat.regenerate, { messageId: assistantId }),
    ).rejects.toThrow(/Monthly budget exceeded/);
    expect(
      await client.query(api.usage.checkBudget.checkBudget, { userId }),
    ).toMatchObject({ allowed: false, totalSpend: 10 });
  });
});
