import {
  AUTO_MODEL,
  DEFAULT_MODEL_ID,
  MODEL_CONFIG,
} from "@blah-chat/ai/models";
import * as ai from "ai";
import { MockLanguageModelV3 } from "ai/test";
import type { FunctionReturnType } from "convex/server";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText: vi.fn(),
}));

beforeAll(async () => {
  await import("../generation");
}, 30_000);
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("accepted send replay baseline", () => {
  async function fixture() {
    const t = convexTest(schema);
    const { ownerId, conversationId } = await t.run(async (ctx) => {
      const owner = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "replay-owner" }),
      );
      const conversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(owner, { model: DEFAULT_MODEL_ID }),
      );
      return { ownerId: owner, conversationId };
    });
    const owner = t.withIdentity(
      createMockIdentity({ subject: "replay-owner" }),
    );
    return {
      t,
      owner,
      conversationId,
      ownerId,
      request: {
        conversationId,
        content: "Recover this accepted send",
        modelId: DEFAULT_MODEL_ID,
        clientMessageId: "stable-replay-key",
        thinkingEffort: "medium" as const,
        attachments: [],
      },
    };
  }

  it("returns the accepted IDs for the same existing clientMessageId without new work", async () => {
    const { t, owner, request } = await fixture();
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    const beforeReplay = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      locks: await ctx.db.query("generationLocks").collect(),
      scheduled: (
        await ctx.db.system.query("_scheduled_functions").collect()
      ).map(({ _id, name, args }) => ({ _id, name, args })),
      conversations: await ctx.db.query("conversations").collect(),
      users: await ctx.db.query("users").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, request),
    ).resolves.toEqual(accepted);
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: (
          await ctx.db.system.query("_scheduled_functions").collect()
        ).map(({ _id, name, args }) => ({ _id, name, args })),
        conversations: await ctx.db.query("conversations").collect(),
        users: await ctx.db.query("users").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
      })),
    ).toEqual(beforeReplay);
  });

  it("rolls back accepted nested rows, receipt, quota and scheduling when the enclosing mutation fails", async () => {
    const { t, owner, request, ownerId } = await fixture();
    const proModel = Object.values(MODEL_CONFIG).find((model) => model.isPro);
    if (!proModel)
      throw new Error("The catalog must provide a pro-model fixture");
    await t.run(async (ctx) => {
      await ctx.db.patch(ownerId, {
        tier: "tier1",
        dailyProModelCount: 0,
        lastProModelDate: new Date().toISOString().slice(0, 10),
      });
      await ctx.db.insert("adminSettings", {
        autoMemoryExtractEnabled: false,
        autoMemoryExtractInterval: 10,
        enableHybridSearch: true,
        defaultMonthlyBudget: 0,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: false,
        defaultDailyMessageLimit: 100,
        proModelsEnabled: true,
        tier1DailyProModelLimit: 1,
        alertEmail: "rollback-test@example.com",
        updatedBy: ownerId,
        updatedAt: Date.now(),
      });
    });
    const snapshot = () =>
      t.run(async (ctx) => ({
        conversations: await ctx.db.query("conversations").collect(),
        messages: await ctx.db.query("messages").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
        users: await ctx.db.query("users").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      }));
    const before = await snapshot();
    let reachedAcceptedBoundary = false;
    // convex-test 0.0.41's ctx.runMutation drops the outer auth identity
    // (dist/index.js:798-812). Its registered-function runner preserves the
    // explicit owner identity and still runs validators and nested transactions.
    // This narrow harness-only adapter does not bypass application auth.
    const nestedOwner = owner as typeof owner & {
      mutationFromPath: (
        path: { componentPath: string; udfPath: string },
        isNested: boolean,
        args: Omit<typeof request, "conversationId">,
      ) => Promise<FunctionReturnType<typeof api.chat.sendMessage>>;
    };
    const { conversationId: _conversationId, ...createIntent } = request;
    const createRequest = { ...createIntent, modelId: proModel.id };

    await expect(
      owner.run(async (ctx) => {
        // run() supplies a real outer mutation transaction in convex-test.
        // Exercise the registered public mutation, including its validators,
        // nested mutations and scheduler writes, rather than calling a helper.
        const accepted = await nestedOwner.mutationFromPath(
          { componentPath: "", udfPath: "chat:sendMessage" },
          true,
          createRequest,
        );
        expect(await ctx.db.get(accepted.conversationId)).not.toBeNull();
        expect(await ctx.db.get(accepted.userMessageId)).not.toBeNull();
        expect(
          await ctx.db.get(accepted.assistantMessageIds[0]!),
        ).not.toBeNull();
        expect(await ctx.db.query("chatSendReceipts").collect()).toHaveLength(
          1,
        );
        expect((await ctx.db.get(ownerId))?.dailyProModelCount).toBe(1);
        expect(
          (await ctx.db.system.query("_scheduled_functions").collect()).filter(
            ({ name }) => name === "generation:generateResponse",
          ),
        ).toHaveLength(1);
        reachedAcceptedBoundary = true;
        throw new Error("INJECTED_FAILURE_AFTER_ACCEPTED_NESTED_SEND");
      }),
    ).rejects.toThrow("INJECTED_FAILURE_AFTER_ACCEPTED_NESTED_SEND");

    expect(reachedAcceptedBoundary).toBe(true);
    expect(await snapshot()).toEqual(before);
    // A failed transaction did not burn the key or leave an active lock.
    const retry = await owner.mutation(api.chat.sendMessage, createRequest);
    expect(await t.run((ctx) => ctx.db.get(retry.userMessageId))).toMatchObject(
      {
        clientMessageId: request.clientMessageId,
      },
    );
    await expect(
      owner.mutation(api.chat.sendMessage, createRequest),
    ).resolves.toEqual(retry);
    expect(await t.run((ctx) => ctx.db.get(ownerId))).toMatchObject({
      dailyProModelCount: 1,
    });
  });

  it.each([
    "complete",
    "error",
    "stopped",
  ] as const)("replays the original IDs without new work after generation is %s", async (status) => {
    const { t, owner, request } = await fixture();
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    await t.run(async (ctx) => {
      for (const id of accepted.assistantMessageIds)
        await ctx.db.patch(id, { status });
    });
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      locks: await ctx.db.query("generationLocks").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
      users: await ctx.db.query("users").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, request),
    ).resolves.toEqual(accepted);
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
        users: await ctx.db.query("users").collect(),
      })),
    ).toEqual(before);
  });

  it("recovers the same conversation for an accepted create-intent replay", async () => {
    const { t, owner, request } = await fixture();
    const createRequest = { ...request, conversationId: undefined };
    const accepted = await owner.mutation(api.chat.sendMessage, createRequest);
    const before = await t.run(async (ctx) => ({
      conversations: await ctx.db.query("conversations").collect(),
      messages: await ctx.db.query("messages").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, createRequest),
    ).resolves.toEqual(accepted);
    expect(
      await t.run(async (ctx) => ({
        conversations: await ctx.db.query("conversations").collect(),
        messages: await ctx.db.query("messages").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      })),
    ).toEqual(before);
  });

  it("replays a comparison as the original ordered assistant set without new rows or schedules", async () => {
    const { t, owner, request } = await fixture();
    const comparisonRequest = {
      ...request,
      modelId: undefined,
      models: [DEFAULT_MODEL_ID, "openai:gpt-5-mini"],
    };
    const accepted = await owner.mutation(
      api.chat.sendMessage,
      comparisonRequest,
    );
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, comparisonRequest),
    ).resolves.toEqual(accepted);
    expect(accepted.assistantMessageIds).toHaveLength(2);
    expect(accepted.comparisonGroupId).toBeDefined();
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
      })),
    ).toEqual(before);
  });

  it("keeps first-acceptance ancestry when the selected branch later changes", async () => {
    const { t, owner, request, ownerId, conversationId } = await fixture();
    const originalParent = await t.run(async (ctx) => {
      const id = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, ownerId, {
          role: "assistant",
          content: "Original branch",
        }),
      );
      await ctx.db.patch(conversationId, { activeLeafMessageId: id });
      return id;
    });
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    const laterParent = await t.run(async (ctx) => {
      const id = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, ownerId, {
          role: "assistant",
          content: "Later selected branch",
        }),
      );
      await ctx.db.patch(conversationId, { activeLeafMessageId: id });
      return id;
    });
    await expect(
      owner.mutation(api.chat.sendMessage, request),
    ).resolves.toEqual(accepted);
    const state = await t.run(async (ctx) => ({
      userMessage: await ctx.db.get(accepted.userMessageId),
      conversation: await ctx.db.get(conversationId),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
    }));
    expect(state.userMessage?.parentMessageIds).toEqual([originalParent]);
    expect(state.receipts[0]?.parentMessageIds).toEqual([originalParent]);
    expect(state.conversation?.activeLeafMessageId).toBe(laterParent);
  });

  it("rejects foreign attachments without rows, receipts or schedules", async () => {
    const { t, owner, request } = await fixture();
    const storageId = await t.run(async (ctx) => {
      const otherOwner = await ctx.db.insert("users", createTestUserData());
      const storageId = await ctx.storage.store(
        new Blob(["foreign synthetic attachment"]),
      );
      await ctx.db.insert("files", {
        userId: otherOwner,
        storageId,
        name: "foreign.txt",
        mimeType: "text/plain",
        size: 28,
        createdAt: Date.now(),
      });
      return storageId;
    });
    await expect(
      owner.mutation(api.chat.sendMessage, {
        ...request,
        attachments: [
          {
            type: "file",
            name: "foreign.txt",
            storageId,
            mimeType: "text/plain",
            size: 28,
          },
        ],
      }),
    ).rejects.toThrow("Attachment not found or unauthorized");
    const state = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
      schedules: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(state).toEqual({ messages: [], receipts: [], schedules: [] });
  });

  it("hashes the full ordered accepted media intent, not just its storage IDs", async () => {
    const { t, owner, request, ownerId } = await fixture();
    const attachments = await t.run(async (ctx) => {
      const values = [];
      for (const name of ["first.txt", "second.txt"]) {
        const storageId = await ctx.storage.store(new Blob([name]));
        await ctx.db.insert("files", {
          userId: ownerId,
          storageId,
          name,
          mimeType: "text/plain",
          size: name.length,
          createdAt: Date.now(),
        });
        values.push({
          type: "file" as const,
          name,
          storageId,
          mimeType: "text/plain",
          size: name.length,
        });
      }
      return values;
    });
    const acceptedRequest = { ...request, attachments };
    const accepted = await owner.mutation(
      api.chat.sendMessage,
      acceptedRequest,
    );
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      attachments: await ctx.db.query("attachments").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
      schedules: await ctx.db.system.query("_scheduled_functions").collect(),
      users: await ctx.db.query("users").collect(),
    }));
    const first = attachments[0]!;
    const second = attachments[1]!;
    for (const changed of [
      [second, first],
      [{ ...first, storageId: second.storageId }, second],
      [{ ...first, name: "renamed.txt" }, second],
      [{ ...first, mimeType: "application/octet-stream" }, second],
      [{ ...first, size: first.size + 1 }, second],
      [{ ...first, type: "image" as const }, second],
    ]) {
      await expect(
        owner.mutation(api.chat.sendMessage, {
          ...acceptedRequest,
          attachments: changed,
        }),
      ).rejects.toThrow(/CHAT_SEND_INTENT_CONFLICT/);
    }
    await expect(
      owner.mutation(api.chat.sendMessage, acceptedRequest),
    ).resolves.toEqual(accepted);
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        attachments: await ctx.db.query("attachments").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
        schedules: await ctx.db.system.query("_scheduled_functions").collect(),
        users: await ctx.db.query("users").collect(),
      })),
    ).toEqual(before);
  });

  it("returns a matching receipt before applying changed budget policy to fresh admissions", async () => {
    const { t, owner, request, ownerId } = await fixture();
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    const today = new Date().toISOString().slice(0, 10);
    await t.run(async (ctx) => {
      await ctx.db.insert("adminSettings", {
        autoMemoryExtractEnabled: false,
        autoMemoryExtractInterval: 10,
        enableHybridSearch: true,
        defaultMonthlyBudget: 0.01,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 100,
        alertEmail: "replay-test@example.com",
        updatedBy: ownerId,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("usageRecords", {
        userId: ownerId,
        date: today,
        model: DEFAULT_MODEL_ID,
        inputTokens: 10,
        outputTokens: 10,
        cost: 1,
        messageCount: 1,
      });
    });

    await expect(
      owner.mutation(api.chat.sendMessage, request),
    ).resolves.toEqual(accepted);
    await expect(
      owner.mutation(api.chat.sendMessage, {
        ...request,
        clientMessageId: "fresh-key-after-policy-change",
      }),
    ).rejects.toThrow(/monthly budget exceeded/i);
  });

  it("conflicts on changed intent without changing rows or scheduling more work", async () => {
    const { t, owner, request } = await fixture();
    await owner.mutation(api.chat.sendMessage, request);
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      locks: await ctx.db.query("generationLocks").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, {
        ...request,
        thinkingEffort: "high",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error) || !("data" in error)) return false;
      const data = error.data;
      return (
        typeof data === "string" &&
        JSON.parse(data).code === "CHAT_SEND_INTENT_CONFLICT"
      );
    });
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
      })),
    ).toEqual(before);
  });

  it.each([
    "create-vs-existing",
    "different-conversation",
  ] as const)("conflicts when the same key changes target from its %s target", async (targetChange) => {
    const { t, owner, request, ownerId } = await fixture();
    await owner.mutation(api.chat.sendMessage, request);
    const otherConversationId = await t.run((ctx) =>
      ctx.db.insert(
        "conversations",
        createTestConversationData(ownerId, { model: DEFAULT_MODEL_ID }),
      ),
    );
    const changedTarget =
      targetChange === "create-vs-existing"
        ? { ...request, conversationId: undefined }
        : { ...request, conversationId: otherConversationId };

    await expect(
      owner.mutation(api.chat.sendMessage, changedTarget),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error) || !("data" in error)) return false;
      const data = error.data;
      return (
        typeof data === "string" &&
        JSON.parse(data).code === "CHAT_SEND_INTENT_CONFLICT"
      );
    });
    expect(
      await t.run((ctx) => ctx.db.query("messages").collect()),
    ).toHaveLength(2);
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(1);
  });

  it.each([
    ["content", { content: "different content" }],
    ["model", { modelId: "openai:gpt-5-mini" }],
    ["manual versus Auto", { modelId: AUTO_MODEL.id }],
    [
      "comparison order",
      { modelId: undefined, models: ["model-b", "model-a"] },
    ],
    [
      "attachment metadata",
      {
        attachments: [
          {
            type: "image" as const,
            name: "image.png",
            storageId: "storage-1",
            mimeType: "image/png",
            size: 1,
          },
        ],
      },
    ],
  ])("conflicts on changed %s intent", async (_label, changed) => {
    const { owner, request } = await fixture();
    await owner.mutation(api.chat.sendMessage, request);
    await expect(
      owner.mutation(api.chat.sendMessage, { ...request, ...changed }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error) || !("data" in error)) return false;
      const data = error.data;
      return (
        typeof data === "string" &&
        JSON.parse(data).code === "CHAT_SEND_INTENT_CONFLICT"
      );
    });
  });

  it("conflicts when comparison model order changes under an accepted key", async () => {
    const { owner, request } = await fixture();
    const firstOrder = {
      ...request,
      modelId: undefined,
      models: [DEFAULT_MODEL_ID, "openai:gpt-5-mini"],
    };
    await owner.mutation(api.chat.sendMessage, firstOrder);

    await expect(
      owner.mutation(api.chat.sendMessage, {
        ...firstOrder,
        models: [...firstOrder.models].reverse(),
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error) || !("data" in error)) return false;
      const data = error.data;
      return (
        typeof data === "string" &&
        JSON.parse(data).code === "CHAT_SEND_INTENT_CONFLICT"
      );
    });
  });

  it("serializes simultaneous identical admissions into one accepted receipt", async () => {
    const { t, owner, request } = await fixture();
    const results = await Promise.all([
      owner.mutation(api.chat.sendMessage, request),
      owner.mutation(api.chat.sendMessage, request),
    ]);
    expect(results[0]).toEqual(results[1]);
    const persisted = await t.run(async (ctx) => ({
      userMessages: await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", request.conversationId!),
        )
        .filter((q) => q.eq(q.field("role"), "user"))
        .collect(),
      assistants: await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", request.conversationId!),
        )
        .filter((q) => q.eq(q.field("role"), "assistant"))
        .collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(persisted.userMessages).toHaveLength(1);
    expect(persisted.userMessages[0]).toMatchObject({
      clientMessageId: request.clientMessageId,
    });
    expect(persisted.assistants).toHaveLength(1);
    expect(persisted.assistants[0]).toMatchObject({ status: "pending" });
    expect(persisted.receipts).toHaveLength(1);
    expect(persisted.receipts[0].clientMessageId).toBe(request.clientMessageId);
    expect(
      persisted.scheduled.filter(
        ({ name }) => name === "generation:generateResponse",
      ),
    ).toHaveLength(1);
  });

  it("dispatches one real scheduled generation action and one fake SDK provider call across replay", async () => {
    const { t, owner, request } = await fixture();
    vi.stubEnv("TAVILY_API_KEY", "test-key-not-used-for-network");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("Provider fixture must not use the network");
      }),
    );
    let providerDispatches = 0;
    const model = new MockLanguageModelV3({
      doStream: () =>
        Promise.resolve({
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] });
              controller.enqueue({ type: "text-start", id: "replay-text" });
              controller.enqueue({
                type: "text-delta",
                id: "replay-text",
                delta: "Accepted once",
              });
              controller.enqueue({ type: "text-end", id: "replay-text" });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: undefined },
                usage: {
                  inputTokens: {
                    total: 8,
                    noCache: 8,
                    cacheRead: undefined,
                    cacheWrite: undefined,
                  },
                  outputTokens: { total: 3, text: 3, reasoning: undefined },
                },
              });
              controller.close();
            },
          }),
        }),
    });
    const actualAi = await vi.importActual<typeof import("ai")>("ai");
    vi.mocked(ai.streamText).mockImplementation((options) => {
      providerDispatches++;
      return actualAi.streamText({ ...options, model }) as ReturnType<
        typeof ai.streamText
      >;
    });

    const accepted = await owner.mutation(api.chat.sendMessage, request);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      await t.run((ctx) => ctx.db.get(accepted.assistantMessageIds[0]!)),
    ).toMatchObject({ status: "complete", content: "Accepted once" });

    await expect(
      owner.mutation(api.chat.sendMessage, request),
    ).resolves.toEqual(accepted);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(providerDispatches).toBe(1);
    expect(vi.mocked(ai.streamText)).toHaveBeenCalledOnce();
  });

  it("keeps receipt keys owner-scoped and does not persist receipts for incognito", async () => {
    const t = convexTest(schema);
    const { firstConversation, secondConversation } = await t.run(
      async (ctx) => {
        const firstOwner = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "key-scope-first" }),
        );
        const secondOwner = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "key-scope-second" }),
        );
        return {
          firstConversation: await ctx.db.insert(
            "conversations",
            createTestConversationData(firstOwner, { model: DEFAULT_MODEL_ID }),
          ),
          secondConversation: await ctx.db.insert(
            "conversations",
            createTestConversationData(secondOwner, {
              model: DEFAULT_MODEL_ID,
            }),
          ),
        };
      },
    );
    const firstOwner = t.withIdentity(
      createMockIdentity({ subject: "key-scope-first" }),
    );
    const secondOwner = t.withIdentity(
      createMockIdentity({ subject: "key-scope-second" }),
    );
    const request = {
      content: "Owner-scoped key",
      modelId: DEFAULT_MODEL_ID,
      clientMessageId: "same-text-different-owner",
      attachments: [],
    };
    await firstOwner.mutation(api.chat.sendMessage, {
      ...request,
      conversationId: firstConversation,
    });
    await secondOwner.mutation(api.chat.sendMessage, {
      ...request,
      conversationId: secondConversation,
    });

    const incognitoId = await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "key-scope-first"))
        .first();
      if (!user) throw new Error("Missing fixture user");
      return ctx.db.insert(
        "conversations",
        createTestConversationData(user._id, {
          model: DEFAULT_MODEL_ID,
          isIncognito: true,
        }),
      );
    });
    await firstOwner.mutation(api.chat.sendMessage, {
      ...request,
      conversationId: incognitoId,
      clientMessageId: "private-key-not-receipted",
    });
    const receipts = await t.run((ctx) =>
      ctx.db.query("chatSendReceipts").collect(),
    );
    expect(receipts).toHaveLength(2);
    expect(receipts.map((receipt) => receipt.ownerId)).toHaveLength(2);
    expect(
      receipts.some(
        (receipt) => receipt.clientMessageId === "private-key-not-receipted",
      ),
    ).toBe(false);
  });

  it("rechecks collaborator access before returning an accepted receipt", async () => {
    const t = convexTest(schema);
    const { conversationId, participantId } = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "acl-replay-owner" }),
      );
      const participantId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "acl-replay-participant" }),
      );
      const conversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(ownerId, {
          model: DEFAULT_MODEL_ID,
          isCollaborative: true,
        }),
      );
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        userId: participantId,
        role: "collaborator",
        joinedAt: Date.now(),
      });
      return { conversationId, participantId };
    });
    const participant = t.withIdentity(
      createMockIdentity({ subject: "acl-replay-participant" }),
    );
    const request = {
      conversationId,
      content: "Authorized before revocation",
      modelId: DEFAULT_MODEL_ID,
      clientMessageId: "revoked-access-key",
      attachments: [],
    };
    await participant.mutation(api.chat.sendMessage, request);
    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .collect();
      for (const row of rows) {
        if (row.userId === participantId) await ctx.db.delete(row._id);
      }
    });

    await expect(
      participant.mutation(api.chat.sendMessage, request),
    ).rejects.toThrow(/not found or unauthorized/i);
  });

  it("fails closed after a no-ID target is deleted and retains the tombstone receipt", async () => {
    const { t, owner, request } = await fixture();
    const createRequest = { ...request, conversationId: undefined };
    const accepted = await owner.mutation(api.chat.sendMessage, createRequest);
    await owner.mutation(api.conversations.deleteConversation, {
      conversationId: accepted.conversationId,
    });
    const countAfterDelete = await t.run((ctx) =>
      ctx.db.query("conversations").collect(),
    );

    await expect(
      owner.mutation(api.chat.sendMessage, createRequest),
    ).rejects.toThrow(/accepted send is no longer available/i);
    expect(
      await t.run((ctx) => ctx.db.query("conversations").collect()),
    ).toEqual(countAfterDelete);
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(1);
  });

  it("fails closed if an accepted message reference disappears while the conversation remains", async () => {
    const { t, owner, request } = await fixture();
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    await t.run((ctx) => ctx.db.delete(accepted.userMessageId));

    await expect(owner.mutation(api.chat.sendMessage, request)).rejects.toThrow(
      /accepted send is no longer available/i,
    );
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.get(accepted.conversationId)),
    ).not.toBeNull();
  });

  it("removes operational receipts during owner data erasure", async () => {
    const { t, owner, ownerId, request } = await fixture();
    await owner.mutation(api.chat.sendMessage, request);
    await t.run(async (ctx) => {
      const { cascadeDeleteUserData } = await import("../lib/utils/cascade");
      await cascadeDeleteUserData(ctx, ownerId);
    });
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(0);
  });
});
