import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import { createMockIdentity, createTestUserData } from "../lib/test/factories";
import schema from "../schema";

const NOW = new Date("2026-11-03T12:00:00.000Z");
const DATE = "2026-11-03";
const MODEL = "openai:gpt-5";

async function createUser(
  t: ReturnType<typeof convexTest>,
  identity = createMockIdentity(),
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", createTestUserData({ clerkId: identity.subject })),
  );
  return { userId, identity };
}

describe("recommendation usage compatibility", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps recommendation and chat aggregates in separate buckets in either insertion order", async () => {
    vi.setSystemTime(NOW);

    for (const featureOrder of [
      ["model_recommendations", "chat"],
      ["chat", "model_recommendations"],
    ] as const) {
      const t = convexTest(schema);
      const { userId } = await createUser(t);
      const oldRecord = await t.run((ctx) =>
        ctx.db.insert("usageRecords", {
          userId,
          date: DATE,
          model: MODEL,
          feature: "smart_assistant",
          operationType: "text",
          inputTokens: 120,
          outputTokens: 45,
          reasoningTokens: 8,
          cost: 0.12,
          messageCount: 3,
          isByok: false,
        }),
      );
      const original = await t.run((ctx) => ctx.db.get(oldRecord));

      for (const feature of featureOrder) {
        await t.run((ctx) =>
          ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
            userId,
            model: MODEL,
            inputTokens: feature === "chat" ? 20 : 10,
            outputTokens: feature === "chat" ? 10 : 5,
            cost: feature === "chat" ? 0.02 : 0.01,
            feature,
          }),
        );
      }

      const records = await t.run((ctx) =>
        ctx.db
          .query("usageRecords")
          .withIndex("by_user_date_model", (q) =>
            q.eq("userId", userId).eq("date", DATE).eq("model", MODEL),
          )
          .collect(),
      );
      expect(records).toHaveLength(3);
      expect(await t.run((ctx) => ctx.db.get(oldRecord))).toEqual(original);
      expect(records.map((record) => [record.feature, record.cost])).toEqual(
        expect.arrayContaining([
          ["smart_assistant", 0.12],
          ["model_recommendations", 0.01],
          ["chat", 0.02],
        ]),
      );
    }
  });

  it("treats featureless legacy rows as chat and aggregates repeated calls only within the same feature", async () => {
    vi.setSystemTime(NOW);
    const t = convexTest(schema);
    const { userId } = await createUser(t);
    const legacyId = await t.run((ctx) =>
      ctx.db.insert("usageRecords", {
        userId,
        date: DATE,
        model: MODEL,
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.1,
        messageCount: 2,
      }),
    );

    for (const cost of [0.03, 0.04]) {
      await t.run((ctx) =>
        ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId,
          model: MODEL,
          inputTokens: 15,
          outputTokens: 7,
          cost,
          feature: "model_recommendations",
        }),
      );
    }
    await t.run((ctx) =>
      ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
        userId,
        model: MODEL,
        inputTokens: 5,
        outputTokens: 2,
        cost: 0.005,
      }),
    );

    const records = await t.run((ctx) =>
      ctx.db
        .query("usageRecords")
        .withIndex("by_user_date_model", (q) =>
          q.eq("userId", userId).eq("date", DATE).eq("model", MODEL),
        )
        .collect(),
    );
    expect(records).toHaveLength(2);
    const legacyRecord = await t.run((ctx) => ctx.db.get(legacyId));
    expect(legacyRecord).toMatchObject({
      inputTokens: 105,
      outputTokens: 52,
      messageCount: 3,
    });
    expect(legacyRecord?.feature).toBeUndefined();
    expect(legacyRecord?.cost).toBeCloseTo(0.105);
    expect(
      records.find((record) => record.feature === "model_recommendations"),
    ).toMatchObject({
      inputTokens: 30,
      outputTokens: 14,
      cost: 0.07,
      messageCount: 2,
    });

    const secondUser = await createUser(t);
    vi.setSystemTime(new Date("2026-11-04T12:00:00.000Z"));
    await t.run((ctx) =>
      ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
        userId,
        model: MODEL,
        inputTokens: 1,
        outputTokens: 1,
        cost: 0.06,
        feature: "model_recommendations",
      }),
    );
    vi.setSystemTime(NOW);
    await t.run((ctx) =>
      ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
        userId: secondUser.userId,
        model: MODEL,
        inputTokens: 1,
        outputTokens: 1,
        cost: 0.07,
        feature: "model_recommendations",
      }),
    );
    await t.run((ctx) =>
      ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
        userId,
        model: "anthropic:claude-sonnet",
        inputTokens: 1,
        outputTokens: 1,
        cost: 0.08,
        feature: "model_recommendations",
      }),
    );

    const isolatedRecords = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(
      isolatedRecords.filter(
        (record) => record.feature === "model_recommendations",
      ),
    ).toHaveLength(4);
    expect(
      isolatedRecords.find(
        (record) => record.userId === userId && record.date === "2026-11-04",
      ),
    ).toMatchObject({ model: MODEL, cost: 0.06 });
    expect(
      isolatedRecords.find((record) => record.userId === secondUser.userId),
    ).toMatchObject({ model: MODEL, date: DATE, cost: 0.07 });
    expect(
      isolatedRecords.find(
        (record) => record.model === "anthropic:claude-sonnet",
      ),
    ).toMatchObject({ userId, date: DATE, cost: 0.08 });
  });

  it("projects old and new categories without changing grand totals or historical labels", async () => {
    vi.setSystemTime(NOW);
    const t = convexTest(schema);
    const identity = createMockIdentity();
    const userId = await t.run((ctx) =>
      ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject, isAdmin: true }),
      ),
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("usageRecords", {
        userId,
        date: DATE,
        model: MODEL,
        feature: "smart_assistant",
        inputTokens: 100,
        outputTokens: 40,
        cost: 0.1,
        messageCount: 2,
      });
      await ctx.db.insert("usageRecords", {
        userId,
        date: DATE,
        model: MODEL,
        feature: "model_recommendations",
        operationType: "text",
        inputTokens: 10,
        outputTokens: 4,
        cost: 0.02,
        messageCount: 1,
      });
      await ctx.db.insert("usageRecords", {
        userId,
        date: DATE,
        model: "legacy:model",
        inputTokens: 5,
        outputTokens: 3,
        cost: 0.01,
        messageCount: 1,
      });
    });

    const recordsBefore = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    const userContext = t.withIdentity(identity);
    const [breakdown, userBreakdown, allUsersBreakdown] = await Promise.all([
      userContext.query(api.usage.queries.getCostByFeature, {
        startDate: DATE,
        endDate: DATE,
      }),
      userContext.query(api.usage.queries.getUserCostByFeature, {
        userId,
        startDate: DATE,
        endDate: DATE,
      }),
      userContext.query(api.usage.queries.getAllUsersCostByFeature, {
        startDate: DATE,
        endDate: DATE,
      }),
    ]);
    const summary = await t
      .withIdentity(identity)
      .query(api.usage.queries.getUsageSummary, {
        startDate: DATE,
        endDate: DATE,
      });

    for (const projectedBreakdown of [
      breakdown,
      userBreakdown,
      allUsersBreakdown,
    ]) {
      expect(projectedBreakdown.smart_assistant).toMatchObject({
        total: 0,
        text: 0,
        tokens: 0,
        requests: 0,
      });
      expect(projectedBreakdown.model_recommendations).toMatchObject({
        total: 0.02,
        text: 0.02,
        tokens: 14,
        requests: 1,
      });
      expect(projectedBreakdown.chat).toMatchObject({
        total: 0.11,
        text: 0.11,
        tokens: 148,
        requests: 2,
      });
    }
    expect(summary).toMatchObject({
      totalCost: 0.13,
      totalTokens: 162,
      totalInputTokens: 115,
      totalOutputTokens: 47,
      totalRequests: 3,
      messageCount: 4,
    });
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toEqual(recordsBefore);
  });
});
