import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const { generateObjectMock, generateTextMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  generateTextMock: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateObject: generateObjectMock,
  generateText: generateTextMock,
}));

const EXPENSIVE_MODEL = "openai:gpt-5";
const PREVIEW_MODEL = "openai:gpt-5-mini";

async function seedConversation(t: ReturnType<typeof convexTest>) {
  const identity = createMockIdentity();
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", createTestUserData({ clerkId: identity.subject })),
  );
  const conversationId = await t.run(async (ctx) => {
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(userId, {
        model: EXPENSIVE_MODEL,
        systemPrompt: "Be concise.",
      }),
    );
    await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, userId, {
        content: "Compare these options",
      }),
    );
    return conversationId;
  });
  return { identity, userId, conversationId };
}

describe("model triage accounting and preview authorization", () => {
  afterEach(() => {
    generateObjectMock.mockReset();
    generateTextMock.mockReset();
    vi.restoreAllMocks();
  });

  it("records classification and analysis in the future recommendation bucket", async () => {
    expect(MODEL_CONFIG[EXPENSIVE_MODEL]).toBeDefined();
    const t = convexTest(schema);
    const { identity, userId, conversationId } = await seedConversation(t);
    const historicalId = await t.run((ctx) =>
      ctx.db.insert("usageRecords", {
        userId,
        date: new Date().toISOString().slice(0, 10),
        model: "openai:gpt-oss-120b",
        feature: "smart_assistant",
        operationType: "text",
        inputTokens: 90,
        outputTokens: 30,
        cost: 0.12,
        messageCount: 2,
      }),
    );
    const historicalBefore = await t.run((ctx) => ctx.db.get(historicalId));

    generateObjectMock
      .mockResolvedValueOnce({
        object: { primaryCategory: "coding" },
        usage: { inputTokens: 11, outputTokens: 3 },
      })
      .mockImplementationOnce(async ({ prompt }: { prompt: string }) => {
        const recommendedModel = prompt.match(
          /\[((?:openai|anthropic|google|xai|deepseek|meta):[^\]]+)\]/,
        )?.[1];
        return {
          object: {
            shouldRecommend: true,
            recommendedModel,
            reasoning: "The cheaper model fits this request.",
          },
          usage: { inputTokens: 17, outputTokens: 5 },
        };
      });

    // @ts-ignore - Convex test action types exceed the generated API depth.
    await t
      .withIdentity(identity)
      .action(internal.ai.modelTriage.analyzeModelFit, {
        conversationId,
        userMessage: "Compare these options",
        currentModelId: EXPENSIVE_MODEL,
      });

    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(
      records.filter((record) => record.feature === "smart_assistant"),
    ).toHaveLength(1);
    expect
      .soft(await t.run((ctx) => ctx.db.get(historicalId)))
      .toEqual(historicalBefore);
    expect(
      records
        .filter((record) => record.feature === "model_recommendations")
        .map((record) => ({
          model: record.model,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          cost: record.cost,
          messageCount: record.messageCount,
        })),
    ).toEqual([
      expect.objectContaining({
        model: "openai:gpt-oss-120b",
        inputTokens: 28,
        outputTokens: 8,
        cost: expect.closeTo(0.000009, 12),
        messageCount: 2,
      }),
    ]);
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
  });

  it("keeps auto-selected, already-recommended and inexpensive triage calls as skips", async () => {
    const t = convexTest(schema);
    const { identity, conversationId, userId } = await seedConversation(t);
    const runTriage = (currentModelId: string, wasAutoSelected?: boolean) =>
      // @ts-ignore - Convex test action types exceed the generated API depth.
      t.withIdentity(identity).action(internal.ai.modelTriage.analyzeModelFit, {
        conversationId,
        userMessage: "Compare these options",
        currentModelId,
        wasAutoSelected,
      });

    await runTriage(EXPENSIVE_MODEL, true);
    await t.run((ctx) =>
      ctx.db.patch(conversationId, {
        modelRecommendation: {
          suggestedModelId: PREVIEW_MODEL,
          currentModelId: EXPENSIVE_MODEL,
          reasoning: "Already considered",
          estimatedSavings: { costReduction: "$1/M", percentSaved: 50 },
          createdAt: Date.now(),
          dismissed: false,
        },
      }),
    );
    await runTriage(EXPENSIVE_MODEL);
    await t.run((ctx) =>
      ctx.db.patch(conversationId, { modelRecommendation: undefined }),
    );
    await runTriage(PREVIEW_MODEL);

    expect(generateObjectMock).not.toHaveBeenCalled();
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.get(conversationId))).toMatchObject({
      userId,
      model: EXPENSIVE_MODEL,
    });
  });

  it("denies anonymous, unregistered and nonmember previews before provider or usage work", async () => {
    const t = convexTest(schema);
    const owner = await seedConversation(t);
    const outsider = createMockIdentity();
    await t.run((ctx) =>
      ctx.db.insert("users", createTestUserData({ clerkId: outsider.subject })),
    );
    const unregistered = createMockIdentity();
    generateTextMock.mockResolvedValue({
      text: "Unauthorized preview should not run",
      usage: { inputTokens: 17, outputTokens: 5 },
    });
    const previewArgs = {
      conversationId: owner.conversationId,
      userMessage: "Compare these options",
      suggestedModelId: PREVIEW_MODEL,
    };

    const missingConversation = await t.run(async (ctx) => {
      const id = await ctx.db.insert(
        "conversations",
        createTestConversationData(owner.userId),
      );
      await ctx.db.delete(id);
      return id;
    });
    const outcomes = await Promise.allSettled([
      t.action(api.ai.modelTriage.generatePreview, previewArgs),
      t
        .withIdentity(unregistered)
        .action(api.ai.modelTriage.generatePreview, previewArgs),
      t
        .withIdentity(outsider)
        .action(api.ai.modelTriage.generatePreview, previewArgs),
      t
        .withIdentity(owner.identity)
        .action(api.ai.modelTriage.generatePreview, {
          ...previewArgs,
          conversationId: missingConversation,
        }),
    ]);

    expect(outcomes.map(({ status }) => status)).toEqual([
      "rejected",
      "rejected",
      "rejected",
      "rejected",
    ]);
    expect(outcomes[0]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ message: "Not authenticated" }),
    });

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toHaveLength(0);
  });

  it("blocks an owner preview when the real monthly budget check denies the caller", async () => {
    const t = convexTest(schema);
    const owner = await seedConversation(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("adminSettings", {
        autoMemoryExtractEnabled: false,
        autoMemoryExtractInterval: 5,
        enableHybridSearch: false,
        defaultMonthlyBudget: 0.01,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 50,
        alertEmail: "test@example.com",
        updatedBy: owner.userId,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("usageRecords", {
        userId: owner.userId,
        date: new Date().toISOString().slice(0, 10),
        model: PREVIEW_MODEL,
        feature: "chat",
        operationType: "text",
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.02,
        messageCount: 1,
      });
    });

    // @ts-ignore - Convex query types exceed the generated API depth.
    const budget = await t
      .withIdentity(owner.identity)
      .query(api.usage.checkBudget.checkBudget, { userId: owner.userId });
    expect(budget).toMatchObject({
      allowed: false,
      totalSpend: 0.02,
      budget: 0.01,
    });

    const recordsBefore = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    generateTextMock.mockResolvedValue({
      text: "This must not be generated over budget",
    });

    // @ts-ignore - Convex test action types exceed the generated API depth.
    const previewOutcome = await Promise.allSettled([
      t
        .withIdentity(owner.identity)
        .action(api.ai.modelTriage.generatePreview, {
          conversationId: owner.conversationId,
          userMessage: "Compare these options",
          suggestedModelId: PREVIEW_MODEL,
        }),
    ]);
    expect.soft(previewOutcome[0]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        message: expect.stringContaining("Monthly budget exceeded"),
      }),
    });

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toEqual(recordsBefore);
  });

  it("allows a preview when the configured monthly budget is unlimited", async () => {
    const t = convexTest(schema);
    const owner = await seedConversation(t);
    const historicalId = await t.run(async (ctx) => {
      await ctx.db.insert("adminSettings", {
        autoMemoryExtractEnabled: false,
        autoMemoryExtractInterval: 5,
        enableHybridSearch: false,
        defaultMonthlyBudget: 0,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 50,
        alertEmail: "test@example.com",
        updatedBy: owner.userId,
        updatedAt: Date.now(),
      });
      return await ctx.db.insert("usageRecords", {
        userId: owner.userId,
        date: new Date().toISOString().slice(0, 10),
        model: PREVIEW_MODEL,
        feature: "chat",
        operationType: "text",
        inputTokens: 10_000,
        outputTokens: 5_000,
        cost: 10,
        messageCount: 5,
      });
    });
    const historicalBefore = await t.run((ctx) => ctx.db.get(historicalId));

    // @ts-ignore - Convex query types exceed the generated API depth.
    const budget = await t
      .withIdentity(owner.identity)
      .query(api.usage.checkBudget.checkBudget, { userId: owner.userId });
    expect(budget).toMatchObject({ allowed: true, budget: 0, remaining: 0 });

    generateTextMock.mockResolvedValue({
      text: "Preview remains available with an unlimited budget",
      usage: { inputTokens: 17, outputTokens: 5 },
    });
    // @ts-ignore - Convex test action types exceed the generated API depth.
    await expect(
      t
        .withIdentity(owner.identity)
        .action(api.ai.modelTriage.generatePreview, {
          conversationId: owner.conversationId,
          userMessage: "Compare these options",
          suggestedModelId: PREVIEW_MODEL,
        }),
    ).resolves.toEqual({
      content: "Preview remains available with an unlimited budget",
    });

    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(await t.run((ctx) => ctx.db.get(historicalId))).toEqual(
      historicalBefore,
    );
    expect(records).toHaveLength(2);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: owner.userId,
          feature: "model_recommendations",
          model: PREVIEW_MODEL,
          inputTokens: 17,
          outputTokens: 5,
        }),
      ]),
    );
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("allows owners and collaborators to preview and charges the caller", async () => {
    const t = convexTest(schema);
    const owner = await seedConversation(t);
    const collaboratorIdentity = createMockIdentity();
    const collaboratorId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: collaboratorIdentity.subject }),
      );
      await ctx.db.patch(owner.conversationId, { isCollaborative: true });
      await ctx.db.insert("conversationParticipants", {
        conversationId: owner.conversationId,
        userId,
        role: "collaborator",
        joinedAt: Date.now(),
      });
      return userId;
    });
    generateTextMock.mockResolvedValue({
      text: "A concise preview",
      usage: { inputTokens: 17, outputTokens: 5 },
    });
    const previewArgs = {
      conversationId: owner.conversationId,
      userMessage: "Compare these options",
      suggestedModelId: PREVIEW_MODEL,
    };

    // @ts-ignore - Convex test action types exceed the generated API depth.
    await expect(
      t
        .withIdentity(owner.identity)
        .action(api.ai.modelTriage.generatePreview, previewArgs),
    ).resolves.toEqual({ content: "A concise preview" });
    // @ts-ignore - Convex test action types exceed the generated API depth.
    await t
      .withIdentity(collaboratorIdentity)
      .action(api.ai.modelTriage.generatePreview, previewArgs);

    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(records).toHaveLength(2);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: owner.userId,
          feature: "model_recommendations",
          model: PREVIEW_MODEL,
          inputTokens: 17,
          outputTokens: 5,
          cost: 0.00001425,
        }),
        expect.objectContaining({
          userId: collaboratorId,
          feature: "model_recommendations",
          model: PREVIEW_MODEL,
          inputTokens: 17,
          outputTokens: 5,
          cost: 0.00001425,
        }),
      ]),
    );
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });
});
