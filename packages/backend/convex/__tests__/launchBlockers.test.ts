import { DEFAULT_MODEL_ID, MODEL_CONFIG } from "@blah-chat/ai/models";
import * as ai from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import { serializeConversationHistory } from "../generation/history";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";
import { getUserPreferenceByUserId } from "../users";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText: vi.fn(),
}));

beforeAll(async () => {
  // Load the provider graph as fixture setup, not inside a cancellation assertion's
  // five-second deadline. Keep the real generation entry point and SDK boundary.
  await import("../generation");
});

const models = Object.entries(MODEL_CONFIG)
  .filter(
    ([id, model]) =>
      id !== "auto" && model.pricing.input < 5 && model.pricing.output < 15,
  )
  .map(([id]) => id);
const cheap = DEFAULT_MODEL_ID;
const realGenerateText = ai.generateText;
async function fixture() {
  vi.useFakeTimers();
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    );
    const collaborator = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "collaborator" }),
    );
    const outsider = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "outsider" }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(owner, {
        model: cheap,
        isCollaborative: true,
      }),
    );
    const destinationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(outsider, { model: cheap }),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: collaborator,
      role: "collaborator",
      joinedAt: Date.now(),
    });
    const prompt = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        content: "PRIVATE ORIGINAL PROMPT",
        comparisonGroupId: "protected-group",
        createdAt: 1,
      }),
    );
    const left = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model: cheap,
        content: "PRIVATE LEFT RESPONSE",
        comparisonGroupId: "protected-group",
        parentMessageIds: [prompt],
        createdAt: 2,
      }),
    );
    const right = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model: cheap,
        content: "PRIVATE RIGHT RESPONSE",
        comparisonGroupId: "protected-group",
        parentMessageIds: [prompt],
        createdAt: 3,
      }),
    );
    return {
      owner,
      collaborator,
      outsider,
      conversationId,
      destinationId,
      prompt,
      left,
      right,
    };
  });
  return { t, ...ids };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it("completes a retry target with only its selected multi-parent ancestry and keeps B queryable", async () => {
  const { t, owner, conversationId, prompt, left, right } = await fixture();
  const { id: otherAParent, bFollowup } = await t.run(async (ctx) => {
    const id = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "user",
        content: "OTHER A ANCESTRY",
        status: "complete",
        createdAt: 0,
        isActiveBranch: true,
      }),
    );
    await ctx.db.patch(prompt, {
      content: "QUESTION A",
      status: "complete",
      isActiveBranch: true,
    });
    await ctx.db.patch(left, {
      content: "FAILED A partial answer",
      status: "error",
      parentMessageIds: [prompt, id],
      parentMessageId: prompt,
      siblingIndex: 0,
      isActiveBranch: true,
    });
    await ctx.db.patch(right, {
      content: "SUCCESSFUL B ANSWER",
      status: "complete",
      siblingIndex: 2,
      isActiveBranch: true,
    });
    const bFollowup = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "user",
        content: "QUESTION B FOLLOW-UP",
        status: "complete",
        createdAt: 4,
        parentMessageIds: [right],
        parentMessageId: right,
        isActiveBranch: true,
      }),
    );
    await ctx.db.patch(conversationId, {
      activeLeafMessageId: bFollowup,
      cachedSystemPrompt: JSON.stringify([
        { role: "system", content: "Retry action fixture" },
      ]),
    });
    return { id, bFollowup };
  });
  const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
  expect(
    await client.mutation(api.chat.retryMessage, {
      messageId: prompt,
      failedMessageId: left,
    }),
  ).toBe(prompt);
  const pending = await t.run((ctx) =>
    ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first(),
  );
  if (!pending) throw new Error("Retry did not create its pending target");
  expect(pending.parentMessageIds).toEqual([prompt, otherAParent]);
  expect(
    (await t.run((ctx) => ctx.db.get(conversationId)))?.activeLeafMessageId,
  ).toBe(pending._id);
  const activePage = await client.query(api.messages.listActivePathPaginated, {
    conversationId,
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(activePage.page.map(({ _id }) => _id)).toEqual([
    otherAParent,
    prompt,
    pending._id,
  ]);

  vi.stubEnv("TAVILY_API_KEY", "fixture-key-not-used-for-network");
  const network = vi.fn(() => {
    throw new Error("Retry action must not use the network");
  });
  vi.stubGlobal("fetch", network);
  const actualAi = await vi.importActual<typeof import("ai")>("ai");
  const promptSeen: { value?: unknown } = {};
  const usage = {
    inputTokens: {
      total: 11,
      noCache: 11,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: 7, text: 7, reasoning: undefined },
  };
  const model = new MockLanguageModelV3({
    doStream: ({ prompt: sdkPrompt }) => {
      promptSeen.value = sdkPrompt;
      return Promise.resolve({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            controller.enqueue({ type: "text-start", id: "retry-text" });
            controller.enqueue({
              type: "text-delta",
              id: "retry-text",
              delta: "Recovered answer A",
            });
            controller.enqueue({ type: "text-end", id: "retry-text" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage,
            });
            controller.close();
          },
        }),
      });
    },
  });
  vi.mocked(ai.streamText).mockImplementation(
    (options) =>
      actualAi.streamText({ ...options, model }) as ReturnType<
        typeof ai.streamText
      >,
  );

  await t.action(internal.generation.generateResponse, {
    conversationId,
    userId: owner,
    existingMessageId: pending._id,
    modelId: cheap,
  });
  expect(network).not.toHaveBeenCalled();
  const storedRetry = await t.run((ctx) => ctx.db.get(pending._id));
  expect(storedRetry).toMatchObject({
    status: "complete",
    content: "Recovered answer A",
    parentMessageIds: [prompt, otherAParent],
  });
  const serializedPrompt = JSON.stringify(promptSeen.value);
  expect(serializedPrompt).toContain("QUESTION A");
  expect(serializedPrompt).toContain("OTHER A ANCESTRY");
  expect(serializedPrompt).not.toContain("SUCCESSFUL B ANSWER");
  expect(serializedPrompt).not.toContain("QUESTION B FOLLOW-UP");
  const completedActivePage = await client.query(
    api.messages.listActivePathPaginated,
    { conversationId, paginationOpts: { numItems: 20, cursor: null } },
  );
  expect(completedActivePage.page.map(({ _id }) => _id)).toEqual([
    otherAParent,
    prompt,
    pending._id,
  ]);

  const nextSend = await client.mutation(api.chat.sendMessage, {
    conversationId,
    content: "Continue from retried A",
    modelId: cheap,
  });
  const nextUser = await t.run((ctx) => ctx.db.get(nextSend.userMessageId));
  if (!nextUser) throw new Error("Next send did not persist its user message");
  expect(nextUser.parentMessageIds).toEqual([pending._id]);
  const reloadedActivePage = await client.query(
    api.messages.listActivePathPaginated,
    { conversationId, paginationOpts: { numItems: 20, cursor: null } },
  );
  const reloadedActiveIds = reloadedActivePage.page.map(({ _id }) => _id);
  expect(reloadedActiveIds).toEqual(
    expect.arrayContaining([otherAParent, prompt, pending._id, nextUser._id]),
  );
  expect(reloadedActiveIds).not.toContain(left);
  expect(reloadedActiveIds).not.toContain(right);
  expect(reloadedActiveIds).not.toContain(bFollowup);
  expect(
    await client.query(api.messages.getBranchesAtMessage, {
      messageId: prompt,
    }),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ _id: left }),
      expect.objectContaining({ _id: right }),
    ]),
  );
});

describe("comparison source/destination authorization", () => {
  it("denies both foreign consolidations and foreign votes before copying, linking, or scheduling", async () => {
    const { t, destinationId, conversationId, left } = await fixture();
    const attacker = t.withIdentity(
      createMockIdentity({ subject: "outsider" }),
    );
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      conversations: await ctx.db.query("conversations").collect(),
    }));
    for (const operation of [
      () =>
        attacker.mutation(
          api.conversations.consolidation.createConsolidationConversation,
          { comparisonGroupId: "protected-group", consolidationModel: cheap },
        ),
      () =>
        attacker.mutation(
          api.conversations.consolidation.consolidateInSameChat,
          {
            comparisonGroupId: "protected-group",
            consolidationModel: cheap,
            conversationId: destinationId,
          },
        ),
      () =>
        attacker.mutation(
          api.conversations.consolidation.consolidateInSameChat,
          {
            comparisonGroupId: "protected-group",
            consolidationModel: cheap,
            conversationId,
          },
        ),
      () =>
        attacker.mutation(api.votes.recordVote, {
          comparisonGroupId: "protected-group",
          winnerId: left,
          rating: "left_better",
        }),
    ])
      await expect(operation()).rejects.toThrow(/Unauthorized/);
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        conversations: await ctx.db.query("conversations").collect(),
      })),
    ).toEqual(before);
    expect(await t.run((ctx) => ctx.db.query("votes").collect())).toHaveLength(
      0,
    );
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });

  it.each([
    "owner",
    "collaborator",
  ])("allows actual %s consolidation and votes with the selected group's winner", async (subject) => {
    const { t, conversationId, left } = await fixture();
    const client = t.withIdentity(createMockIdentity({ subject }));
    await client.mutation(api.votes.recordVote, {
      comparisonGroupId: "protected-group",
      winnerId: left,
      rating: "left_better",
    });
    const result = await client.mutation(
      api.conversations.consolidation.createConsolidationConversation,
      { comparisonGroupId: "protected-group", consolidationModel: cheap },
    );
    const copied = await t.run((ctx) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", result.conversationId),
        )
        .collect(),
    );
    expect(
      copied.find((message) => message.role === "user")?.content,
    ).toContain("PRIVATE ORIGINAL PROMPT");
    expect(copied.find((message) => message.role === "assistant")?.status).toBe(
      "pending",
    );
    expect(
      (
        await client.query(api.messages.listActivePathPaginated, {
          conversationId: result.conversationId,
          paginationOpts: { numItems: 20, cursor: null },
        })
      ).page,
    ).toHaveLength(2);
    expect(
      await client.mutation(
        api.conversations.consolidation.consolidateInSameChat,
        {
          comparisonGroupId: "protected-group",
          consolidationModel: cheap,
          conversationId,
        },
      ),
    ).toHaveProperty("messageId");
  });

  it("rejects a different destination, a mixed-conversation group, a foreign winner and a pro-policy bypass", async () => {
    const { t, owner, conversationId, destinationId, prompt, right } =
      await fixture();
    await t.run((ctx) => ctx.db.patch(destinationId, { userId: owner }));
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
    await expect(
      client.mutation(api.conversations.consolidation.consolidateInSameChat, {
        comparisonGroupId: "protected-group",
        consolidationModel: cheap,
        conversationId: destinationId,
      }),
    ).rejects.toThrow(/destination/);
    await expect(
      client.mutation(api.votes.recordVote, {
        comparisonGroupId: "protected-group",
        winnerId: prompt,
        rating: "left_better",
      }),
    ).rejects.toThrow(/Winner/);
    const foreignWinner = await t.run((ctx) =>
      ctx.db.insert(
        "messages",
        createTestMessageData(destinationId, owner, {
          role: "assistant",
          model: cheap,
        }),
      ),
    );
    await expect(
      client.mutation(api.votes.recordVote, {
        comparisonGroupId: "protected-group",
        winnerId: foreignWinner,
        rating: "left_better",
      }),
    ).rejects.toThrow(/Winner/);
    const pro = Object.entries(MODEL_CONFIG).find(
      ([, model]) => model.pricing.input >= 5,
    )?.[0];
    if (!pro) throw new Error("Missing expensive model fixture");
    await expect(
      client.mutation(
        api.conversations.consolidation.createConsolidationConversation,
        { comparisonGroupId: "protected-group", consolidationModel: pro },
      ),
    ).rejects.toThrow(/Pro models/);
    const wrongPrompt = await t.run((ctx) =>
      ctx.db.insert("messages", createTestMessageData(conversationId, owner)),
    );
    await t.run((ctx) =>
      ctx.db.patch(right, { parentMessageIds: [wrongPrompt] }),
    );
    await expect(
      client.mutation(
        api.conversations.consolidation.createConsolidationConversation,
        { comparisonGroupId: "protected-group", consolidationModel: cheap },
      ),
    ).rejects.toThrow(/does not match prompt/);
    await t.run((ctx) => ctx.db.patch(right, { parentMessageIds: [prompt] }));
    await t.run((ctx) =>
      ctx.db.insert(
        "messages",
        createTestMessageData(destinationId, owner, {
          comparisonGroupId: "protected-group",
          role: "assistant",
          model: cheap,
        }),
      ),
    );
    await expect(
      client.mutation(
        api.conversations.consolidation.createConsolidationConversation,
        { comparisonGroupId: "protected-group", consolidationModel: cheap },
      ),
    ).rejects.toThrow(/spans conversations/);
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
    expect(
      await t.query(api.messages.getBranchInfo, { conversationId }),
    ).toMatchObject({ totalMessages: 0 });
  });
});

it("keeps private by-user preferences internal while scheduled actions can read them without identity", async () => {
  const { t, owner } = await fixture();
  expect(getUserPreferenceByUserId.isInternal).toBe(true);
  expect(Object.hasOwn(getUserPreferenceByUserId, "isPublic")).toBe(false);
  await t.run((ctx) =>
    ctx.db.insert("userPreferences", {
      userId: owner,
      category: "customInstructions",
      key: "customInstructions",
      value: "PRIVATE INSTRUCTIONS",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  expect(
    await t.query(internal.users.getUserPreferenceByUserId, {
      userId: owner,
      key: "customInstructions",
    }),
  ).toBe("PRIVATE INSTRUCTIONS");
});

it("stops all queued comparison siblings, refuses resurrection, and preserves a later generation's lock", async () => {
  const { t, owner, conversationId, left, right } = await fixture();
  const oldLock = await t.run(async (ctx) => {
    await ctx.db.patch(left, { status: "pending" });
    await ctx.db.patch(right, { status: "pending" });
    for (let i = 0; i < 10; i++)
      await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, { createdAt: 10 + i }),
      );
    return ctx.db.insert("generationLocks", {
      conversationId,
      userId: owner,
      messageId: left,
      comparisonGroupId: "protected-group",
      pendingCount: 2,
      lockedAt: Date.now(),
    });
  });
  expect(
    await t.mutation(internal.messages.startGeneration, {
      conversationId,
      messageId: left,
    }),
  ).toMatchObject({ started: true, lockId: oldLock });
  await t.run((ctx) =>
    ctx.db.patch(left, { partialContent: "retained partial" }),
  );
  await t
    .withIdentity(createMockIdentity({ subject: "owner" }))
    .mutation(api.chat.stopGeneration, { conversationId });
  for (const messageId of [left, right]) {
    expect((await t.run((ctx) => ctx.db.get(messageId)))?.status).toBe(
      "stopped",
    );
    expect(
      await t.mutation(internal.messages.updateStatus, {
        messageId,
        status: "generating",
      }),
    ).toBe(false);
    expect(
      await t.mutation(internal.messages.markRetrying, {
        messageId,
        failedModels: [],
        retryCount: 1,
      }),
    ).toBe(false);
  }
  expect((await t.run((ctx) => ctx.db.get(left)))?.content).toBe(
    "retained partial",
  );
  expect(await t.run((ctx) => ctx.db.get(oldLock))).toBeNull();
  const newLock = await t.run((ctx) =>
    ctx.db.insert("generationLocks", {
      conversationId,
      userId: owner,
      pendingCount: 1,
      lockedAt: Date.now(),
    }),
  );
  await t.mutation(internal.lib.generationLock.releaseLock, {
    conversationId,
    lockId: oldLock,
  });
  const fetch = vi.fn(() => {
    throw new Error("Stopped startup must not contact a provider");
  });
  vi.stubGlobal("fetch", fetch);
  for (const existingMessageId of [left, right])
    await t.action(internal.generation.generateResponse, {
      conversationId,
      userId: owner,
      modelId: "auto",
      existingMessageId,
    });
  expect(fetch).not.toHaveBeenCalled();
  expect(ai.streamText).not.toHaveBeenCalled();
  expect(await t.run((ctx) => ctx.db.get(newLock))).not.toBeNull();
  expect((await t.run((ctx) => ctx.db.get(right)))?.status).toBe("stopped");
});

it("serializes only the target ancestry, preserves ordered merge parents and deduplicates shared roots before limiting", async () => {
  const { t, owner, conversationId, prompt, left, right } = await fixture();
  const { edited, target, merge } = await t.run(async (ctx) => {
    await ctx.db.patch(right, {
      content: "UNRELATED RIGHT BRANCH",
      isActiveBranch: false,
    });
    const edited = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        content: "EDITED PATH",
        parentMessageIds: [left],
        createdAt: 100,
      }),
    );
    const target = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model: cheap,
        status: "pending",
        parentMessageIds: [edited],
        comparisonGroupId: "next-compare",
        createdAt: 200,
      }),
    );
    await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model: cheap,
        content: "COMPARISON SIBLING SECRET",
        parentMessageIds: [edited],
        comparisonGroupId: "next-compare",
        createdAt: 199,
      }),
    );
    for (let i = 0; i < 40; i++)
      await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          content: "INACTIVE NOISE",
          isActiveBranch: false,
          parentMessageIds: [right],
          createdAt: 300 + i,
        }),
      );
    const merge = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model: cheap,
        status: "pending",
        parentMessageIds: [edited, right],
        createdAt: 500,
      }),
    );
    return { edited, target, merge };
  });
  const history = await t.query(internal.messages.getContextMessages, {
    conversationId,
    messageId: target,
    limit: 30,
  });
  expect(history.map((message) => message._id)).toEqual([prompt, left, edited]);
  const serialized = JSON.stringify(
    await serializeConversationHistory({
      messages: history,
      attachmentsByMessage: new Map(),
      hasVision: false,
      downloadAttachment: async () => {
        throw new Error("No attachments expected");
      },
    }),
  );
  expect(serialized).toContain("EDITED PATH");
  expect(serialized).not.toMatch(
    /UNRELATED RIGHT BRANCH|COMPARISON SIBLING SECRET|INACTIVE NOISE/,
  );
  expect(
    (
      await t.query(internal.messages.getContextMessages, {
        conversationId,
        messageId: merge,
        limit: 30,
      })
    ).map((message) => message._id),
  ).toEqual([prompt, left, edited, right]);
  expect(
    (
      await t.query(internal.messages.getContextMessages, {
        conversationId,
        messageId: merge,
        limit: 2,
      })
    ).map((message) => message._id),
  ).toEqual([edited, right]);
  // Run the real action through database reads and history serialization. Only
  // the external provider SDK boundary is intercepted; no context helper mocks.
  await t.run((ctx) =>
    ctx.db.patch(conversationId, {
      cachedSystemPrompt: JSON.stringify([
        { role: "system", content: "Test system context" },
      ]),
    }),
  );
  let providerMessages: unknown;
  const provider = vi.mocked(ai.streamText).mockImplementation((options) => {
    providerMessages = options.messages;
    throw new Error("TEST_PROVIDER_BOUNDARY_REACHED");
  });
  vi.stubEnv("TAVILY_API_KEY", "test-key-not-used-for-network");
  await expect(
    t.action(internal.generation.generateResponse, {
      conversationId,
      existingMessageId: target,
      modelId: cheap,
      userId: owner,
    }),
  ).rejects.toThrow("TEST_PROVIDER_BOUNDARY_REACHED");
  expect(provider).toHaveBeenCalledOnce();
  expect(JSON.stringify(providerMessages)).toContain("EDITED PATH");
  expect(JSON.stringify(providerMessages)).not.toMatch(
    /UNRELATED RIGHT BRANCH|COMPARISON SIBLING SECRET|INACTIVE NOISE/,
  );
});

it("round-trips SDK6 native tool outcomes through the real generation action and continuation", async () => {
  const { t, owner, conversationId } = await fixture();
  await t.run((ctx) =>
    ctx.db.patch(conversationId, {
      cachedSystemPrompt: JSON.stringify([
        { role: "system", content: "Use tool results as evidence." },
      ]),
    }),
  );
  vi.stubEnv("TAVILY_API_KEY", "test-key-not-used-for-network");

  const longNativeValue = `durable-${"z".repeat(2_000)}`;
  const citationResult = {
    query: "native result test",
    answer: "Found the source",
    results: [
      {
        title: "Evidence source",
        url: "https://example.test/evidence",
        content: "Citation snippet",
      },
    ],
  };
  const calls: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    output: unknown;
    error?: boolean;
  }> = [
    {
      id: "tc-a",
      name: "calculator",
      input: { expression: "1 + 1" },
      output: false,
    },
    { id: "tc-b", name: "calculator", input: { expression: "0" }, output: 0 },
    {
      id: "tc-c",
      name: "calculator",
      input: { expression: "1 - 1" },
      output: "",
    },
    {
      id: "tc-d",
      name: "calculator",
      input: { expression: "null" },
      output: null,
    },
    {
      id: "tc-e",
      name: "tavilySearch",
      input: { query: "native result test" },
      output: citationResult,
    },
    {
      id: "tc-f",
      name: "calculator",
      input: { expression: "3 + 3" },
      output: longNativeValue,
    },
    {
      id: "tc-g",
      name: "calculator",
      input: { expression: "4 + 4" },
      output: `pressure-${"p".repeat(300_000)}`,
    },
    {
      id: "tc-h",
      name: "manageTasks",
      input: { action: "list" },
      output: { success: false, error: "task failed" },
      error: true,
    },
  ];
  let responseMessages: unknown[] = [];
  const completionOrder: string[] = [];
  const sdkPrompt: { value?: unknown } = {};
  const mockLanguageModel = new MockLanguageModelV3({
    doGenerate: async ({ prompt }) => {
      sdkPrompt.value = prompt;
      return {
        content: [
          {
            type: "text",
            text: "The saved search result is Evidence source; the calculator results are retained.",
          },
        ],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: {
            total: 10,
            noCache: 10,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 20, text: 20, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
  vi.spyOn(ai, "generateText").mockImplementation(
    (options) =>
      realGenerateText({ ...options, model: mockLanguageModel }) as ReturnType<
        typeof ai.generateText
      >,
  );

  vi.mocked(ai.streamText).mockImplementation((options) => {
    const tools = options.tools as Record<string, any>;
    responseMessages = [
      {
        role: "assistant",
        content: calls.map(({ id, name, input }) => ({
          type: "tool-call",
          toolCallId: id,
          toolName: name,
          input,
        })),
      },
    ];
    return {
      fullStream: (async function* () {
        for (const { id, name, input } of calls) {
          yield { type: "tool-call", toolCallId: id, toolName: name, input };
        }
        for (const call of [...calls].reverse()) {
          completionOrder.push(call.id);
          if (call.error) {
            responseMessages.push({
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: call.id,
                  toolName: call.name,
                  output: { type: "error-json", value: call.output },
                },
              ],
            });
            yield {
              type: "tool-error",
              toolCallId: call.id,
              toolName: call.name,
              input: call.input,
              error: new Error("task failed"),
            };
          } else {
            const tool = tools[call.name];
            const output = await tool.toModelOutput({
              toolCallId: call.id,
              input: call.input,
              output: call.output,
            });
            responseMessages.push({
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: call.id,
                  toolName: call.name,
                  output,
                },
              ],
            });
            yield {
              type: "tool-result",
              toolCallId: call.id,
              toolName: call.name,
              input: call.input,
              output: call.output,
            };
          }
        }
      })(),
      response: Promise.resolve({
        get messages() {
          return responseMessages;
        },
      }),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 10 }),
      reasoning: Promise.resolve([]),
      steps: Promise.resolve([
        {
          toolCalls: calls.map(({ id, name, input }) => ({
            toolCallId: id,
            toolName: name,
            input,
          })),
          toolResults: calls
            .filter((call) => !call.error)
            .map(({ id, name, input, output }) => ({
              toolCallId: id,
              toolName: name,
              input,
              output,
            })),
        },
      ]),
      providerMetadata: Promise.resolve(undefined),
      sources: Promise.resolve([]),
    } as ReturnType<typeof ai.streamText>;
  });

  await t.action(internal.generation.generateResponse, {
    conversationId,
    userId: owner,
    modelId: cheap,
  });

  expect(completionOrder).toEqual(calls.map(({ id }) => id).reverse());
  const assistant = await t.run((ctx) =>
    ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .order("desc")
      .first(),
  );
  expect(assistant?.content).toContain("Evidence source");
  const stored = await t.run((ctx) =>
    ctx.db
      .query("toolCalls")
      .withIndex("by_message", (q) => q.eq("messageId", assistant!._id))
      .collect(),
  );
  const byId = new Map(stored.map((row) => [row.toolCallId, row.result]));
  expect(byId.get("tc-a")).toBe(false);
  expect(byId.get("tc-b")).toBe(0);
  expect(byId.get("tc-c")).toBe("");
  expect(byId.get("tc-d")).toBeNull();
  expect(byId.get("tc-e")).toEqual(citationResult);
  expect(byId.get("tc-f")).toBe(longNativeValue);
  expect(byId.get("tc-g")).toBe(`pressure-${"p".repeat(300_000)}`);
  expect(byId.get("tc-h")).toEqual({ success: false, error: "task failed" });
  expect(String(JSON.stringify(sdkPrompt.value))).toContain("<tool-data");
  expect(String(JSON.stringify(sdkPrompt.value))).toContain("[truncated]");

  const sources = await t.run((ctx) =>
    ctx.db
      .query("sources")
      .withIndex("by_message", (q) => q.eq("messageId", assistant!._id))
      .collect(),
  );
  expect(sources).toMatchObject([
    {
      title: "Evidence source",
      url: "https://example.test/evidence",
      snippet: "Citation snippet",
    },
  ]);

  await expect(
    realGenerateText({
      model: mockLanguageModel,
      messages: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "old-call",
              toolName: "calculator",
              args: { expression: "1+1" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            { type: "tool-result", toolCallId: "old-call", result: "2" },
          ],
        },
      ] as any,
    }),
  ).rejects.toThrow();
});

it("cancels an active provider stream without finalizing or releasing a subsequent request's lock", async () => {
  const { t, owner, conversationId, left } = await fixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, {
      cachedSystemPrompt: JSON.stringify([{ role: "system", content: "Test" }]),
    });
    await ctx.db.patch(left, { status: "pending" });
    await ctx.db.insert("generationLocks", {
      conversationId,
      userId: owner,
      messageId: left,
      pendingCount: 1,
      lockedAt: Date.now(),
    });
  });
  vi.stubEnv("TAVILY_API_KEY", "test-key-not-used-for-network");
  const network = vi.fn(() => {
    throw new Error("No live network in a provider fixture");
  });
  vi.stubGlobal("fetch", network);
  let signal: AbortSignal | undefined;
  const readUsage = vi.fn(() => {
    throw new Error("Cancelled stream must not finalize");
  });
  vi.mocked(ai.streamText).mockImplementation((options) => {
    signal = options.abortSignal;
    // SAFETY: this fixture exercises cancellation before any result property
    // except fullStream can be consumed, and traps accidental finalization.
    return {
      fullStream: (async function* () {
        await t
          .withIdentity(createMockIdentity({ subject: "owner" }))
          .mutation(api.chat.stopGeneration, { conversationId });
        await t.run((ctx) =>
          ctx.db.insert("generationLocks", {
            conversationId,
            userId: owner,
            comparisonGroupId: "new-generation",
            pendingCount: 1,
            lockedAt: Date.now(),
          }),
        );
        vi.setSystemTime(Date.now() + 20);
        yield { type: "text-delta", id: "test", text: "must not persist" };
      })(),
      get usage() {
        return readUsage();
      },
    } as ReturnType<typeof ai.streamText>;
  });
  await t.action(internal.generation.generateResponse, {
    conversationId,
    userId: owner,
    existingMessageId: left,
    modelId: cheap,
  });
  expect(signal?.aborted).toBe(true);
  expect(readUsage).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  expect((await t.run((ctx) => ctx.db.get(left)))?.status).toBe("stopped");
  expect(
    await t.run((ctx) => ctx.db.query("generationLocks").collect()),
  ).toMatchObject([{ comparisonGroupId: "new-generation", pendingCount: 1 }]);
});

it.each([
  {
    statusCode: 401,
    message: "Missing Authentication header",
    guidance: /authentication|API.*key/i,
  },
  {
    statusCode: 402,
    message: "Insufficient credits",
    guidance: /credits|billing/i,
  },
  { statusCode: 429, message: "Too many requests", guidance: /rate limit/i },
])("preserves a streamed provider $statusCode instead of replacing it with NoOutputGenerated", async ({
  statusCode,
  message,
  guidance,
}) => {
  const { t, owner, conversationId, left } = await fixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, {
      cachedSystemPrompt: JSON.stringify([{ role: "system", content: "Test" }]),
    });
    await ctx.db.patch(left, { status: "pending" });
    await ctx.db.insert("generationLocks", {
      conversationId,
      userId: owner,
      messageId: left,
      pendingCount: 1,
      lockedAt: Date.now(),
    });
  });
  vi.stubEnv("TAVILY_API_KEY", "test-key-not-used-for-network");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No live network in this fixture");
    }),
  );
  const providerError = new ai.APICallError({
    message,
    statusCode,
    url: "https://openrouter.ai/api/v1/chat/completions",
    requestBodyValues: {},
    isRetryable: false,
  });
  const readUsage = vi.fn(() => {
    throw new ai.NoOutputGeneratedError();
  });
  // SAFETY: the action must consume the error chunk before reading any result
  // property; the getters trap the SDK's later NoOutputGenerated failure.
  vi.mocked(ai.streamText).mockReturnValue({
    fullStream: (async function* () {
      yield { type: "error", error: providerError };
    })(),
    get usage() {
      return readUsage();
    },
    get totalUsage() {
      return readUsage();
    },
  } as ReturnType<typeof ai.streamText>);

  await expect(
    t.action(internal.generation.generateResponse, {
      conversationId,
      userId: owner,
      existingMessageId: left,
      modelId: cheap,
    }),
  ).rejects.toBe(providerError);
  expect(readUsage).not.toHaveBeenCalled();
  const stored = await t.run((ctx) => ctx.db.get(left));
  expect(stored?.status).toBe("error");
  expect(stored?.error).toMatch(guidance);
  expect(stored?.error).not.toMatch(/No output generated/);
  expect(
    await t.run((ctx) => ctx.db.query("generationLocks").collect()),
  ).toEqual([]);
});

it("pre-creates a stoppable CLI placeholder with the actual active parent ancestry", async () => {
  const { t, owner, conversationId, prompt, left } = await fixture();
  await t.run((ctx) =>
    ctx.db.patch(conversationId, { activeLeafMessageId: left }),
  );
  const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
  const { key } = await client.mutation(api.cliAuth.create, {});
  const result = await t.mutation(api.cliAuth.sendMessage, {
    apiKey: key,
    conversationId,
    content: "CLI FOLLOWUP",
    modelId: cheap,
  });
  const messages = await t.run((ctx) =>
    ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
  );
  const pending = messages.find((message) => message.status === "pending");
  if (!pending) throw new Error("Missing pending CLI target");
  expect(
    (
      await t.query(internal.messages.getContextMessages, {
        conversationId,
        messageId: pending._id,
      })
    ).map((message) => message._id),
  ).toEqual([prompt, left, result.userMessageId]);
  await client.mutation(api.chat.stopGeneration, { conversationId });
  await t.action(internal.generation.generateResponse, {
    conversationId,
    userId: owner,
    existingMessageId: pending._id,
    modelId: cheap,
  });
  expect(ai.streamText).not.toHaveBeenCalled();
  expect((await t.run((ctx) => ctx.db.get(pending._id)))?.status).toBe(
    "stopped",
  );
});

it("bounds prompt input and comparison fanout before writes while retaining real two-model comparison", async () => {
  const { t, conversationId } = await fixture();
  const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
  const before = await t.run((ctx) => ctx.db.query("messages").collect());
  for (const input of [
    { content: "ok", models: [] },
    { content: "ok", models: Array(9).fill(cheap) },
    { content: "ok", models: [cheap, cheap] },
    { content: "ok", models: ["not-a-configured-model"] },
    { content: "ok", models: ["toString"] },
    { content: "ok", models: ["__proto__"] },
    { content: "  ", models: [cheap] },
    { content: "x".repeat(100_001), models: [cheap] },
  ])
    await expect(
      client.mutation(api.chat.sendMessage, { conversationId, ...input }),
    ).rejects.toThrow();
  expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
    before,
  );
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  ).toHaveLength(0);
  expect(models.length).toBeGreaterThan(1);
  expect(
    (
      await client.mutation(api.chat.sendMessage, {
        conversationId,
        content: "legitimate comparison",
        models: models.slice(0, 2),
      })
    ).assistantMessageIds,
  ).toHaveLength(2);
});
