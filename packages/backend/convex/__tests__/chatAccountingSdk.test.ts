import { DEFAULT_MODEL_ID, MODEL_CONFIG } from "@blah-chat/ai/models";
import { getModel } from "@blah-chat/ai/registry";
import { APICallError, generateText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { type FunctionArgs, getFunctionName } from "convex/server";
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
import { api, internal } from "../_generated/api";
import {
  canonicalDispatchInput,
  createChatAccounting,
  priceChatStep,
  usageDigest,
} from "../lib/chatUsage";
import {
  createMockIdentity,
  createTestConversationData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const originalModelConfig = MODEL_CONFIG[DEFAULT_MODEL_ID];
const fixturePricing = {
  input: 1,
  output: 2,
  tiers: [{ minInputTokens: 20, input: 4, output: 5 }],
};
vi.mock("@blah-chat/ai/registry", async (original) => ({
  ...(await original<typeof import("@blah-chat/ai/registry")>()),
  getModel: vi.fn(),
}));
beforeAll(async () => {
  await import("../generation");
}, 30_000);
beforeEach(() => {
  MODEL_CONFIG[DEFAULT_MODEL_ID] = {
    ...originalModelConfig,
    pricing: fixturePricing,
  };
  vi.useFakeTimers();
  vi.stubEnv("TAVILY_API_KEY", "synthetic-no-network");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw Error("No network permitted");
    }),
  );
});
afterEach(() => {
  MODEL_CONFIG[DEFAULT_MODEL_ID] = originalModelConfig;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const usage = (
  input: number,
  output: number,
  cacheRead = 0,
  reasoning = 0,
) => ({
  inputTokens: {
    total: input,
    noCache: input - cacheRead,
    cacheRead,
    cacheWrite: 0,
  },
  outputTokens: { total: output, text: output - reasoning, reasoning },
});
function streamResult(
  input: number,
  output: number,
  toolId?: string,
  text?: string,
) {
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });
        if (toolId)
          controller.enqueue({
            type: "tool-call",
            toolCallId: toolId,
            toolName: "calculator",
            input: '{"expression":"6*7"}',
          });
        if (text) {
          controller.enqueue({ type: "text-start", id: "answer" });
          controller.enqueue({ type: "text-delta", id: "answer", delta: text });
          controller.enqueue({ type: "text-end", id: "answer" });
        }
        controller.enqueue({
          type: "finish",
          finishReason: {
            unified: toolId ? "tool-calls" : "stop",
            raw: undefined,
          },
          usage: usage(input, output),
        });
        controller.close();
      },
    }),
  };
}
async function fixture(options?: { incognito?: boolean; auto?: boolean }) {
  const t = convexTest(schema);
  const { ownerId, conversationId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "accounting-sdk-owner" }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId, {
        model: DEFAULT_MODEL_ID,
        isIncognito: options?.incognito,
        cachedSystemPrompt: JSON.stringify([
          { role: "system", content: "Synthetic accounting proof" },
        ]),
      }),
    );
    if (options?.auto)
      await ctx.db.insert("userPreferences", {
        userId: ownerId,
        category: "models",
        key: "autoRouterEnabled",
        value: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    return { ownerId, conversationId };
  });
  const owner = t.withIdentity(
    createMockIdentity({ subject: "accounting-sdk-owner" }),
  );
  const accepted = await owner.mutation(api.chat.sendMessage, {
    conversationId,
    content: "Calculate 6*7",
    modelId: options?.auto ? "auto" : DEFAULT_MODEL_ID,
    clientMessageId: "sdk-accounting-proof",
  });
  const jobs = async () =>
    t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter(
        (job) => job.name === "generation:generateResponse",
      ),
    );
  const firstJob = (await jobs())[0];
  if (!firstJob) throw Error("Missing admitted generation");
  const messageId = accepted.assistantMessageIds[0]!;
  const run = async () =>
    t.action(
      internal.generation.generateResponse,
      firstJob.args[0] as FunctionArgs<
        typeof internal.generation.generateResponse
      >,
    );
  const snapshot = async () =>
    t.run(async (ctx) => ({
      events: await ctx.db.query("usageEvents").collect(),
      attempts: await ctx.db.query("runAttempts").collect(),
      usage: await ctx.db.query("usageRecords").collect(),
      lifetime: await ctx.db.query("conversationTokenUsage").collect(),
      message: await ctx.db.get(messageId),
    }));
  return {
    t,
    owner,
    ownerId,
    conversationId,
    messageId,
    run,
    jobs,
    firstJob,
    snapshot,
  };
}

describe("ordinary chat physical SDK accounting", () => {
  it("settles all three real SDK steps and lifetime tokens exactly once", async () => {
    const f = await fixture();
    const requests: Parameters<MockLanguageModelV3["doStream"]>[0][] = [];
    let calls = 0;
    vi.mocked(getModel).mockReturnValue(
      new MockLanguageModelV3({
        doStream: async (params) => {
          requests.push(params);
          calls++;
          return streamResult(
            calls * 10,
            calls * 2,
            calls < 3 ? `call-${calls}` : undefined,
            calls === 3 ? "42" : undefined,
          );
        },
      }),
    );
    await f.run();
    const state = await f.snapshot();
    expect(calls).toBe(3);
    expect(
      state.events.filter((event) => event.evidenceKind === "dispatch"),
    ).toHaveLength(3);
    expect(
      new Set(state.events.map((event) => event.dispatchRequestHash)).size,
    ).toBe(3);
    expect(state.message).toMatchObject({
      status: "complete",
      content: "42",
      inputTokens: 60,
      outputTokens: 12,
    });
    // Independent rate-card oracle: $14 + $100 + $150 per million,
    // not the helper under test and not a tier applied to aggregate input.
    expect(state.usage.reduce((sum, row) => sum + row.cost, 0)).toBeCloseTo(
      0.000264,
      12,
    );
    expect(state.usage.reduce((sum, row) => sum + row.messageCount, 0)).toBe(1);
    expect(state.lifetime).toHaveLength(1);
    expect(state.lifetime[0]).toMatchObject({
      inputTokens: 60,
      outputTokens: 12,
      totalTokens: 72,
      messageCount: 1,
    });
    expect(
      state.events
        .filter((event) => event.evidenceKind === "dispatch")
        .map((event) => event.dispatchRequestHash),
    ).toEqual(
      requests.map((params) => {
        const { abortSignal: _signal, ...request } = params;
        return usageDigest(request);
      }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("records a tool-only stream and separate real generateText continuation", async () => {
    const f = await fixture();
    let streams = 0;
    let generates = 0;
    vi.mocked(getModel).mockReturnValue(
      new MockLanguageModelV3({
        doStream: async () => {
          streams++;
          return streamResult(
            streams * 10,
            2,
            streams === 1 ? "tool-only" : undefined,
          );
        },
        doGenerate: async () => {
          generates++;
          return {
            content: [{ type: "text", text: "42 from continuation" }],
            finishReason: { unified: "stop", raw: undefined },
            usage: usage(30, 6),
            warnings: [],
          };
        },
      }),
    );
    await f.run();
    const state = await f.snapshot();
    expect(streams).toBe(2);
    expect(generates).toBe(1);
    expect(state.attempts).toHaveLength(2);
    expect(
      state.events
        .filter((event) => event.evidenceKind === "dispatch")
        .map((event) => event.iterationKind),
    ).toEqual(["main", "main", "continuation"]);
    expect(
      state.events.filter((event) => event.evidenceKind === "reported"),
    ).toHaveLength(3);
    expect(state.message).toMatchObject({
      status: "complete",
      inputTokens: 60,
      outputTokens: 10,
      content: "42 from continuation",
    });
    expect(state.usage.reduce((sum, row) => sum + row.cost, 0)).toBeCloseTo(
      0.000254,
      12,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a paid step plus unresolved failed dispatch when auto retries the same answer", async () => {
    const f = await fixture({ auto: true });
    let calls = 0;
    vi.mocked(getModel).mockReturnValue(
      new MockLanguageModelV3({
        doStream: async () => {
          calls++;
          if (calls === 2)
            throw new APICallError({
              message: "synthetic rate limit",
              url: "https://synthetic.invalid",
              requestBodyValues: {},
              statusCode: 429,
              isRetryable: true,
            });
          return streamResult(
            10,
            2,
            calls === 1 ? "paid-before-failure" : undefined,
            calls === 3 ? "Retry kept prior cost" : undefined,
          );
        },
      }),
    );
    await f.run();
    expect(calls).toBe(2); // SDK maxRetries=0: hidden HTTP retries cannot disappear.
    const retry = (await f.jobs()).find((job) => job._id !== f.firstJob._id);
    expect(retry).toBeDefined();
    await f.t.action(
      internal.generation.generateResponse,
      retry!.args[0] as FunctionArgs<
        typeof internal.generation.generateResponse
      >,
    );
    const state = await f.snapshot();
    expect(calls).toBe(3);
    expect(state.attempts).toHaveLength(2);
    expect(
      state.events.filter((event) => event.evidenceKind === "dispatch"),
    ).toHaveLength(3);
    expect(state.message).toMatchObject({
      status: "complete",
      inputTokens: 20,
      outputTokens: 4,
    });
    const receipt = await f.owner.query(api.chatSettlement.getReceipt, {
      messageId: f.messageId,
    });
    expect(receipt).toMatchObject({
      unresolvedDispatchCount: 1,
      reportedDispatchCount: 2,
    });
    expect(receipt?.costUsd).toBeCloseTo(0.000028, 12);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves stopped state and late usage without another provider call", async () => {
    const f = await fixture();
    let calls = 0;
    vi.mocked(getModel).mockReturnValue(
      new MockLanguageModelV3({
        doStream: async () => {
          calls++;
          await f.owner.mutation(api.chat.stopGeneration, {
            conversationId: f.conversationId,
          });
          vi.setSystemTime(Date.now() + 20);
          return streamResult(10, 2, undefined, "late text must not publish");
        },
      }),
    );
    await f.run();
    const stopped = await f.snapshot();
    expect(stopped.message).toMatchObject({ status: "stopped", content: "" });
    expect(calls).toBe(1);
    const dispatch = stopped.events.find(
      (event) => event.evidenceKind === "dispatch",
    )!;
    const late = {
      usageKey: dispatch.usageKey,
      evidenceKind: "reported" as const,
      measurement: "reported" as const,
      inputTokens: 10,
      outputTokens: 2,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      costUsd: priceChatStep(
        usage(10, 2),
        MODEL_CONFIG[DEFAULT_MODEL_ID].pricing,
      ),
      rateVersion: `catalog-v1:${usageDigest(MODEL_CONFIG[DEFAULT_MODEL_ID].pricing)}`,
      evidenceHash: usageDigest(usage(10, 2)),
    };
    await f.t.mutation(internal.chatSettlement.settleDispatch, late);
    const once = await f.snapshot();
    await f.t.mutation(internal.chatSettlement.settleDispatch, late);
    expect(await f.snapshot()).toEqual(once);
    expect(once.message).toMatchObject({
      status: "stopped",
      content: "",
      inputTokens: 10,
      outputTokens: 2,
    });
    expect(calls).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not create durable accounting for an incognito action", async () => {
    const f = await fixture({ incognito: true });
    vi.mocked(getModel).mockReturnValue(
      new MockLanguageModelV3({
        doStream: async () => streamResult(10, 2, undefined, "ephemeral"),
      }),
    );
    await f.run();
    const state = await f.snapshot();
    expect(state.message).toMatchObject({ status: "complete" });
    expect(state.events).toHaveLength(0);
    expect(state.attempts).toHaveLength(0);
    expect(
      await f.t.run((ctx) => ctx.db.query("agentRuns").collect()),
    ).toHaveLength(0);
  });

  it("retries failed financial delivery without repeating a paid request", async () => {
    const f = await fixture();
    let calls = 0;
    await f.t.mutation(internal.messages.startGeneration, {
      conversationId: f.conversationId,
      messageId: f.messageId,
    });
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        calls++;
        return {
          content: [{ type: "text", text: "paid once" }],
          finishReason: { unified: "stop", raw: undefined },
          usage: usage(10, 2),
          warnings: [],
        };
      },
    });
    const ctx: Parameters<typeof createChatAccounting>[0] = {
      runMutation: async (ref, args) => {
        if (getFunctionName(ref) === "chatSettlement:settleDispatch")
          throw Error("synthetic ingestion transport failure");
        return f.t.mutation(ref, args);
      },
      scheduler: {
        runAfter: (delay, ref, args) =>
          f.t.run((mutationCtx) =>
            mutationCtx.scheduler.runAfter(delay, ref, args),
          ),
      },
    };
    const accounting = await createChatAccounting(ctx, {
      ownerUserId: f.ownerId,
      conversationId: f.conversationId,
      messageId: f.messageId,
      modelId: DEFAULT_MODEL_ID,
    });
    if (!accounting) throw Error("Expected ordinary accounting");
    const result = await generateText({
      model: await accounting.wrap(model, "main"),
      prompt: "synthetic",
      maxRetries: 0,
    });
    expect(result.text).toBe("paid once");
    const delivery = await f.t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter(
        (job) => job.name === "chatSettlement:settleDispatch",
      ),
    );
    expect(calls).toBe(1);
    expect(delivery).toHaveLength(1);
    await f.t.mutation(
      internal.chatSettlement.settleDispatch,
      delivery[0].args[0] as FunctionArgs<
        typeof internal.chatSettlement.settleDispatch
      >,
    );
    expect(
      (await f.snapshot()).events.filter(
        (event) => event.evidenceKind === "reported",
      ),
    ).toHaveLength(1);
    expect(calls).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("dispatch hashing and per-request pricing", () => {
  it("retains URLs and binary data and rejects non-finite values", () => {
    expect(usageDigest(new URL("https://example.com/a"))).not.toBe(
      usageDigest(new URL("https://example.com/b")),
    );
    expect(usageDigest(new Uint8Array([1]))).not.toBe(
      usageDigest(new Uint8Array([2])),
    );
    expect(canonicalDispatchInput({ b: 2, a: 1 })).toBe(
      canonicalDispatchInput({ a: 1, b: 2 }),
    );
    expect(() => usageDigest({ size: Number.NaN })).toThrow("Non-finite");
  });
  it("prices tiers per request and partitions included reasoning/cache without double charging", () => {
    const pricing = {
      input: 1,
      output: 2,
      cached: 0.1,
      reasoning: 3,
      tiers: [
        { minInputTokens: 100, input: 2, output: 4, cached: 0.2, reasoning: 6 },
      ],
    };
    expect(priceChatStep(usage(80, 20, 10, 5), pricing)).toBe(0.000116);
    expect(priceChatStep(usage(120, 20, 10, 5), pricing)).toBe(0.000312);
    expect(priceChatStep(usage(80, 20), undefined)).toBeUndefined();
    expect(
      priceChatStep(
        {
          ...usage(80, 20),
          inputTokens: { total: 80, cacheRead: 10, cacheWrite: 5 },
        },
        pricing,
      ),
    ).toBeUndefined();
  });
});
