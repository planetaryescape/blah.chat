import { DEFAULT_MODEL_ID, MODEL_CONFIG } from "@blah-chat/ai/models";
import { calculateCost } from "@blah-chat/ai/utils";
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

const TRIAGE_EXPENSIVE_THRESHOLD = 5;
const EXPENSIVE_MODEL_CONFIG = Object.values(MODEL_CONFIG).find(
  (model) =>
    model.provider !== "auto" &&
    (model.pricing.input + model.pricing.output) / 2 >=
      TRIAGE_EXPENSIVE_THRESHOLD,
);
if (!EXPENSIVE_MODEL_CONFIG) {
  throw new Error("Model catalog must include a triage-expensive model");
}
const EXPENSIVE_MODEL = EXPENSIVE_MODEL_CONFIG.id;
const PREVIEW_MODEL = DEFAULT_MODEL_ID;

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
        model: DEFAULT_MODEL_ID,
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
        model: DEFAULT_MODEL_ID,
        inputTokens: 28,
        outputTokens: 8,
        cost: calculateCost(DEFAULT_MODEL_ID, {
          inputTokens: 28,
          outputTokens: 8,
        }),
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
    expect(outcomes[1]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ message: "User not found" }),
    });
    expect(outcomes[2]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Preview generation failed: Conversation not found or access denied",
        ),
      }),
    });
    expect(outcomes[3]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Preview generation failed: Conversation not found or access denied",
        ),
      }),
    });

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toHaveLength(0);
  });

  it("builds preview context from the active branch, not newer discarded turns", async () => {
    const t = convexTest(schema);
    const owner = await seedConversation(t);
    const rootSentinel = "ACTIVE_ROOT_CONTEXT_SENTINEL";
    const assistantSentinel = "ACTIVE_BRANCH_ASSISTANT_SENTINEL";
    const question = "Compare these options";
    const createdAt = Date.now();
    await t.run(async (ctx) => {
      const seededQuestion = await ctx.db
        .query("messages")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", owner.conversationId),
        )
        .first();
      if (!seededQuestion) throw new Error("Expected seeded root message");
      await ctx.db.patch(seededQuestion._id, {
        content: rootSentinel,
        isActiveBranch: true,
        createdAt: createdAt - 4,
      });
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          role: "assistant",
          content: assistantSentinel,
          isActiveBranch: true,
          createdAt: createdAt - 3,
        }),
      );
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          content: question,
          isActiveBranch: true,
          createdAt: createdAt - 2,
        }),
      );
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          content: "DISCARDED_BRANCH_USER_SENTINEL",
          isActiveBranch: false,
          createdAt: createdAt - 1,
        }),
      );
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          role: "assistant",
          content: "DISCARDED_BRANCH_ASSISTANT_SENTINEL",
          isActiveBranch: false,
          createdAt,
        }),
      );
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          content: "DISCARDED_BRANCH_TAIL_SENTINEL",
          isActiveBranch: false,
          createdAt: createdAt + 1,
        }),
      );
    });
    generateTextMock.mockResolvedValue({
      text: "Active branch preview",
      usage: { inputTokens: 17, outputTokens: 5 },
    });

    // @ts-ignore - Convex test action types exceed the generated API depth.
    await t
      .withIdentity(owner.identity)
      .action(api.ai.modelTriage.generatePreview, {
        conversationId: owner.conversationId,
        userMessage: question,
        suggestedModelId: PREVIEW_MODEL,
      });

    const requestPrompt = generateTextMock.mock.calls[0]?.[0]?.prompt;
    expect(requestPrompt).toContain(rootSentinel);
    expect(requestPrompt).toContain(assistantSentinel);
    expect(requestPrompt).toContain(question);
    expect(requestPrompt).not.toContain("DISCARDED_BRANCH_USER_SENTINEL");
    expect(requestPrompt).not.toContain("DISCARDED_BRANCH_ASSISTANT_SENTINEL");
    expect(requestPrompt).not.toContain("DISCARDED_BRANCH_TAIL_SENTINEL");
  });

  it("keeps all legacy turns in preview context when no branch flags exist", async () => {
    const t = convexTest(schema);
    const owner = await seedConversation(t);
    const legacyUser = "LEGACY_ROOT_SENTINEL";
    const legacyAssistant = "LEGACY_ASSISTANT_SENTINEL";
    const question = "Compare these options";
    const createdAt = Date.now();
    await t.run(async (ctx) => {
      const seededQuestion = await ctx.db
        .query("messages")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", owner.conversationId),
        )
        .first();
      if (!seededQuestion) throw new Error("Expected seeded legacy message");
      await ctx.db.patch(seededQuestion._id, {
        content: legacyUser,
        createdAt: createdAt - 3,
      });
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          role: "assistant",
          content: legacyAssistant,
          createdAt: createdAt - 2,
        }),
      );
      await ctx.db.insert(
        "messages",
        createTestMessageData(owner.conversationId, owner.userId, {
          content: question,
          createdAt: createdAt - 1,
        }),
      );
    });
    const storedMessages = await t.run((ctx) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", owner.conversationId),
        )
        .collect(),
    );
    expect(
      storedMessages.every((message) => message.isActiveBranch === undefined),
    ).toBe(true);
    generateTextMock.mockResolvedValue({ text: "Legacy preview" });

    // @ts-ignore - Convex test action types exceed the generated API depth.
    await t
      .withIdentity(owner.identity)
      .action(api.ai.modelTriage.generatePreview, {
        conversationId: owner.conversationId,
        userMessage: question,
        suggestedModelId: PREVIEW_MODEL,
      });

    const requestPrompt = generateTextMock.mock.calls[0]?.[0]?.prompt;
    expect(requestPrompt).toContain(legacyUser);
    expect(requestPrompt).toContain(legacyAssistant);
    expect(requestPrompt).toContain(question);
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
          cost: calculateCost(PREVIEW_MODEL, {
            inputTokens: 17,
            outputTokens: 5,
          }),
        }),
        expect.objectContaining({
          userId: collaboratorId,
          feature: "model_recommendations",
          model: PREVIEW_MODEL,
          inputTokens: 17,
          outputTokens: 5,
          cost: calculateCost(PREVIEW_MODEL, {
            inputTokens: 17,
            outputTokens: 5,
          }),
        }),
      ]),
    );
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });
});
