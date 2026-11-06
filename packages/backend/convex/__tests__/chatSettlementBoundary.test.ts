import { DEFAULT_MODEL_ID } from "@blah-chat/ai/models";
import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const hash = "a".repeat(64);
const reportHash = "b".repeat(64);
async function fixture(collaborative = false) {
  const t = convexTest(schema);
  const data = await t.run(async (ctx) => {
    const conversationOwnerId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "boundary-conversation-owner" }),
    );
    const ownerId = collaborative
      ? await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "boundary-initiator" }),
        )
      : conversationOwnerId;
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(conversationOwnerId, {
        isCollaborative: collaborative,
      }),
    );
    const participantId = collaborative
      ? await ctx.db.insert("conversationParticipants", {
          conversationId,
          userId: ownerId,
          role: "collaborator",
          joinedAt: Date.now(),
        })
      : null;
    const messageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, ownerId, {
        role: "assistant",
        status: "generating",
        model: DEFAULT_MODEL_ID,
      }),
    );
    return {
      ownerId,
      conversationOwnerId,
      conversationId,
      messageId,
      participantId,
    };
  });
  const owner = t.withIdentity(
    createMockIdentity({
      subject: collaborative
        ? "boundary-initiator"
        : "boundary-conversation-owner",
    }),
  );
  const runId = await t.mutation(internal.chatSettlement.ensureRun, {
    ownerUserId: data.ownerId,
    conversationId: data.conversationId,
    messageId: data.messageId,
  });
  if (!runId) throw Error("Expected ordinary run");
  const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
    runId,
    model: DEFAULT_MODEL_ID,
    pricing: { input: 1, output: 2 },
    pricingVersion: "fixture-v1",
  });
  const dispatch = await t.mutation(internal.chatSettlement.beginDispatch, {
    runId,
    attemptId,
    stepIndex: 0,
    iterationKind: "main",
    dispatchRequestHash: hash,
  });
  const report = {
    usageKey: dispatch.usageKey,
    evidenceKind: "reported" as const,
    measurement: "reported" as const,
    inputTokens: 80,
    outputTokens: 8,
    reasoningTokens: 3,
    costUsd: 0.008,
    rateVersion: "fixture-v1",
    evidenceHash: reportHash,
  };
  const snapshot = () =>
    t.run(async (ctx) => ({
      events: await ctx.db.query("usageEvents").collect(),
      usage: await ctx.db.query("usageRecords").collect(),
      projections: await ctx.db.query("chatUsageProjections").collect(),
      lifetime: await ctx.db.query("conversationTokenUsage").collect(),
    }));
  return { ...data, t, owner, runId, attemptId, dispatch, report, snapshot };
}

describe("settlement compatibility and failure boundaries", () => {
  it("admits the initiating collaborator, hides their receipt from the conversation owner, and revokes new work", async () => {
    const f = await fixture(true);
    await f.t.mutation(internal.chatSettlement.settleDispatch, f.report);
    expect(
      await f.owner.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toMatchObject({ costUsd: 0.008 });
    const conversationOwner = f.t.withIdentity(
      createMockIdentity({ subject: "boundary-conversation-owner" }),
    );
    expect(
      await conversationOwner.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toBeNull();
    expect(
      await f.t.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toBeNull();
    await f.t.run((ctx) => ctx.db.delete(f.participantId!));
    expect(
      await f.owner.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toBeNull();
    await expect(
      f.t.mutation(internal.chatSettlement.beginDispatch, {
        runId: f.runId,
        attemptId: f.attemptId,
        stepIndex: 1,
        iterationKind: "main",
        dispatchRequestHash: hash,
      }),
    ).rejects.toThrow("live generating message");
    const before = await f.snapshot();
    await f.t.mutation(internal.chatSettlement.settleDispatch, f.report);
    expect(await f.snapshot()).toEqual(before);
  });

  it("keeps legacy helper spend separate from a ledger projection and includes corrections in public budget totals", async () => {
    const f = await fixture();
    await f.t.mutation(internal.chatSettlement.settleDispatch, {
      ...f.report,
      evidenceKind: "estimated",
      measurement: "estimated",
      costUsd: 0.01,
      inputTokens: 100,
      outputTokens: 10,
    });
    await f.t.mutation(internal.usage.mutations.recordTextGeneration, {
      userId: f.ownerId,
      conversationId: f.conversationId,
      model: DEFAULT_MODEL_ID,
      inputTokens: 20,
      outputTokens: 2,
      cost: 0.002,
      feature: "chat",
      isByok: false,
    });
    const before = await f.snapshot();
    const projectionId = before.projections[0].usageRecordId;
    const helper = before.usage.find((row) => row._id !== projectionId)!;
    expect(before.usage.find((row) => row._id === projectionId)?.cost).toBe(
      0.01,
    );
    expect(helper.cost).toBe(0.002);
    await f.t.mutation(internal.chatSettlement.settleDispatch, f.report);
    const after = await f.snapshot();
    expect(after.usage.find((row) => row._id === helper._id)).toEqual(helper);
    expect(after.usage.reduce((sum, row) => sum + row.cost, 0)).toBeCloseTo(
      0.01,
      12,
    );
    const budget = await f.owner.query(api.usage.checkBudget.checkBudget, {
      userId: f.ownerId,
    });
    expect(budget.totalSpend).toBeCloseTo(0.01, 12);
    const feature = await f.owner.query(api.usage.queries.getCostByFeature, {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    });
    expect(feature.chat.total).toBeCloseTo(0.01, 12);
    expect(
      await f.owner.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toMatchObject({ costUsd: 0.008 });
  });

  it("preserves a historical lifetime total even when its old dimensions were inconsistent", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      const lifetime = await ctx.db.query("conversationTokenUsage").first();
      if (!lifetime) throw Error("Dispatch should initialize its projection");
      await ctx.db.patch(lifetime._id, {
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 350,
        totalTokens: 500,
        messageCount: 5,
      });
    });
    await f.t.mutation(internal.chatSettlement.settleDispatch, f.report);
    const after = await f.snapshot();
    expect(after.lifetime[0]).toMatchObject({
      inputTokens: 180,
      outputTokens: 58,
      reasoningTokens: 353,
      totalTokens: 588,
      messageCount: 5,
    });
  });

  it("deduplicates simultaneous and reordered receipt delivery without changing any projection twice", async () => {
    const f = await fixture();
    await Promise.all([
      f.t.mutation(internal.chatSettlement.settleDispatch, f.report),
      f.t.mutation(internal.chatSettlement.settleDispatch, f.report),
    ]);
    const once = await f.snapshot();
    expect(once.events).toHaveLength(2);
    expect(once.usage.reduce((sum, row) => sum + row.cost, 0)).toBe(0.008);
    await f.t.mutation(internal.chatSettlement.settleDispatch, {
      ...f.report,
      evidenceKind: "estimated",
      measurement: "estimated",
      costUsd: 0.01,
      evidenceHash: "c".repeat(64),
    });
    await f.t.mutation(internal.chatSettlement.settleDispatch, f.report);
    expect(await f.snapshot()).toEqual(once);
  });

  it("keeps partial reported units unresolved until a compatible complete receipt arrives", async () => {
    const f = await fixture();
    await f.t.mutation(internal.chatSettlement.settleDispatch, {
      ...f.report,
      outputTokens: undefined,
      reasoningTokens: undefined,
      costUsd: undefined,
    });
    expect(
      await f.owner.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toMatchObject({
      inputTokens: 80,
      reportedDispatchCount: 0,
      unresolvedDispatchCount: 1,
      hasUnknownUsage: true,
      hasUnknownCost: true,
    });
    await f.t.mutation(internal.chatSettlement.settleDispatch, {
      ...f.report,
      evidenceHash: "c".repeat(64),
    });
    expect(
      await f.owner.query(api.chatSettlement.getReceipt, {
        messageId: f.messageId,
      }),
    ).toMatchObject({
      inputTokens: 80,
      outputTokens: 8,
      reportedDispatchCount: 1,
      unresolvedDispatchCount: 0,
      hasUnknownUsage: false,
      hasUnknownCost: false,
      costUsd: 0.008,
    });
    expect((await f.snapshot()).events).toHaveLength(3);
  });

  it("rejects non-integer physical identities, changed rate lineage, and cross-run attempts without writes", async () => {
    const f = await fixture();
    const before = await f.snapshot();
    for (const stepIndex of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -1,
      0.5,
      15,
    ]) {
      await expect(
        f.t.mutation(internal.chatSettlement.beginDispatch, {
          runId: f.runId,
          attemptId: f.attemptId,
          stepIndex,
          iterationKind: "main",
          dispatchRequestHash: hash,
        }),
      ).rejects.toThrow("Invalid chat dispatch identity");
    }
    await expect(
      f.t.mutation(internal.chatSettlement.settleDispatch, {
        ...f.report,
        rateVersion: "unrelated-price",
      }),
    ).rejects.toThrow("rate version");
    expect(await f.snapshot()).toEqual(before);
  });
});
