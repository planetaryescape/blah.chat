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

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const RECEIPT_A = "c".repeat(64);
const RECEIPT_B = "d".repeat(64);

async function fixture() {
  const t = convexTest(schema);
  const { ownerId, conversationId, messageId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "settlement-owner" }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId),
    );
    const messageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, ownerId, {
        role: "assistant",
        status: "generating",
        model: "openai:gpt-4o",
      }),
    );
    return { ownerId, conversationId, messageId };
  });
  return {
    t,
    ownerId,
    conversationId,
    messageId,
    owner: t.withIdentity(createMockIdentity({ subject: "settlement-owner" })),
  };
}

describe("chat attempt settlement", () => {
  it("keeps a known subtotal and unknown coverage across models and dispatch dates", async () => {
    const { t, owner, ownerId, conversationId, messageId } = await fixture();
    const legacyId = await t.run((ctx) =>
      ctx.db.insert("usageRecords", {
        userId: ownerId,
        date: "2026-11-06",
        model: "openai:gpt-4o",
        conversationId,
        feature: "chat",
        operationType: "text",
        inputTokens: 7,
        outputTokens: 2,
        reasoningTokens: 1,
        cost: 0.123,
        messageCount: 4,
        isByok: false,
      }),
    );
    const legacyBefore = await t.run((ctx) => ctx.db.get(legacyId));
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    const attemptA = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
      provider: "openai",
      pricing: { input: 2, output: 8 },
      pricingVersion: "catalog:test-v1",
    });
    const attemptB = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "anthropic:claude-sonnet",
      provider: "anthropic",
      pricing: { input: 3, output: 9 },
      pricingVersion: "catalog:test-v2",
    });
    const unknown = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId: attemptA,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: HASH_A,
    });
    const known = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId: attemptA,
      stepIndex: 1,
      iterationKind: "main",
      dispatchRequestHash: HASH_B,
    });
    const otherModel = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId: attemptB,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: RECEIPT_A,
    });
    await t.run(async (ctx) => {
      const event = await ctx.db
        .query("usageEvents")
        .withIndex("by_usage_key", (q) => q.eq("usageKey", known.usageKey))
        .first();
      if (!event) throw new Error("expected dispatch event");
      const dispatchAt = Date.UTC(2026, 10, 5, 23, 59);
      await ctx.db.patch(event._id, { dispatchAt, occurredAt: dispatchAt });
    });
    await t.mutation(internal.chatSettlement.settleDispatch, {
      usageKey: known.usageKey,
      evidenceKind: "reported",
      measurement: "reported",
      inputTokens: 10,
      outputTokens: 4,
      reasoningTokens: 2,
      costUsd: 0.02,
      evidenceHash: RECEIPT_B,
    });
    await t.mutation(internal.chatSettlement.settleDispatch, {
      usageKey: otherModel.usageKey,
      evidenceKind: "reported",
      measurement: "reported",
      inputTokens: 5,
      outputTokens: 3,
      costUsd: 0.03,
      evidenceHash: HASH_A,
    });

    const receipt = await owner.query(api.chatSettlement.getReceipt, {
      messageId,
    });
    expect(receipt).toMatchObject({
      dispatchCount: 3,
      reportedDispatchCount: 2,
      unresolvedDispatchCount: 1,
      inputTokens: 15,
      outputTokens: 7,
      costUsd: 0.05,
      hasUnknownCost: true,
      hasUnknownUsage: true,
    });
    const projectionRows = await t.run((ctx) =>
      ctx.db.query("chatUsageProjections").collect(),
    );
    expect(projectionRows).toHaveLength(3);
    expect(new Set(projectionRows.map((row) => row.usageRecordId)).size).toBe(
      3,
    );
    expect(projectionRows.map((row) => row.date).sort()).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-06",
    ]);
    const legacyAfter = await t.run((ctx) => ctx.db.get(legacyId));
    expect(legacyAfter).toEqual(legacyBefore);
    expect(legacyAfter).toMatchObject({
      inputTokens: 7,
      outputTokens: 2,
      reasoningTokens: 1,
      cost: 0.123,
      messageCount: 4,
    });
    const usageRecords = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(usageRecords).toHaveLength(4);
    expect(usageRecords.filter((row) => row.messageCount === 1)).toHaveLength(
      1,
    );
    expect(usageRecords.reduce((sum, row) => sum + row.cost, 0)).toBeCloseTo(
      0.173,
    );
    const lifetime = await t.run((ctx) =>
      ctx.db
        .query("conversationTokenUsage")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .collect(),
    );
    expect(lifetime).toHaveLength(2);
    expect(lifetime.reduce((sum, row) => sum + row.inputTokens, 0)).toBe(15);
    expect(lifetime.reduce((sum, row) => sum + row.outputTokens, 0)).toBe(7);
    expect(
      lifetime.reduce((sum, row) => sum + (row.reasoningTokens ?? 0), 0),
    ).toBe(2);
    expect(lifetime.reduce((sum, row) => sum + row.messageCount, 0)).toBe(1);
    expect(unknown.usageKey).not.toBe(known.usageKey);
  });

  it("deduplicates full evidence payloads and rejects reused hashes with changed values", async () => {
    const { t, ownerId, conversationId, messageId } = await fixture();
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
    });
    const dispatch = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: HASH_A,
    });
    const receipt = {
      usageKey: dispatch.usageKey,
      evidenceKind: "reported" as const,
      measurement: "reported" as const,
      inputTokens: 80,
      outputTokens: 8,
      costUsd: 0.008,
      evidenceHash: RECEIPT_A,
    };
    await t.mutation(internal.chatSettlement.settleDispatch, receipt);
    await expect(
      t.mutation(internal.chatSettlement.settleDispatch, {
        ...receipt,
        inputTokens: 81,
      }),
    ).rejects.toThrow("Conflicting evidence revision requires reconciliation");
    const events = await t.run((ctx) => ctx.db.query("usageEvents").collect());
    expect(events).toHaveLength(2);
  });

  it("rejects invalid pricing snapshots and fractional reported token units", async () => {
    const { t, ownerId, conversationId, messageId } = await fixture();
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    await expect(
      t.mutation(internal.chatSettlement.createAttempt, {
        runId,
        model: "openai:gpt-4o",
        pricing: { input: -1, output: 1 },
      }),
    ).rejects.toThrow("Chat pricing rates must be finite and non-negative");
    const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
    });
    const dispatch = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: HASH_A,
    });
    await expect(
      t.mutation(internal.chatSettlement.settleDispatch, {
        usageKey: dispatch.usageKey,
        evidenceKind: "reported",
        measurement: "reported",
        inputTokens: 1.5,
        outputTokens: 1,
        costUsd: 0.1,
        evidenceHash: RECEIPT_A,
      }),
    ).rejects.toThrow("Chat token counts must be non-negative integers");
    expect(
      await t.run((ctx) => ctx.db.query("usageEvents").collect()),
    ).toHaveLength(1);
  });

  it("returns null without persisting a run for an incognito conversation", async () => {
    const { t, ownerId, conversationId, messageId } = await fixture();
    await t.run((ctx) => ctx.db.patch(conversationId, { isIncognito: true }));
    await expect(
      t.mutation(internal.chatSettlement.ensureRun, {
        ownerUserId: ownerId,
        conversationId,
        messageId,
      }),
    ).resolves.toBeNull();
    expect(await t.run((ctx) => ctx.db.query("agentRuns").collect())).toEqual(
      [],
    );
  });

  it("retains dispatch identity and corrects an estimate to reported usage once", async () => {
    const { t, ownerId, conversationId, messageId } = await fixture();
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
    });
    const dispatch = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: HASH_A,
    });

    const estimateArgs = {
      usageKey: dispatch.usageKey,
      evidenceKind: "estimated" as const,
      measurement: "estimated" as const,
      inputTokens: 100,
      outputTokens: 10,
      costUsd: 0.01,
      rateVersion: "catalog:test-v1",
      evidenceHash: RECEIPT_A,
    };
    await t.mutation(internal.chatSettlement.settleDispatch, estimateArgs);
    await t.mutation(internal.chatSettlement.settleDispatch, estimateArgs);

    const reportedArgs = {
      ...estimateArgs,
      evidenceKind: "reported" as const,
      measurement: "reported" as const,
      inputTokens: 80,
      outputTokens: 8,
      costUsd: 0.008,
      evidenceHash: RECEIPT_B,
    };
    await t.mutation(internal.chatSettlement.settleDispatch, reportedArgs);
    const beforeReplay = await t.run(async (ctx) => ({
      events: await ctx.db.query("usageEvents").collect(),
      projections: await ctx.db.query("chatUsageProjections").collect(),
    }));
    await t.mutation(internal.chatSettlement.settleDispatch, reportedArgs);
    expect(
      await t.run(async (ctx) => ({
        events: await ctx.db.query("usageEvents").collect(),
        projections: await ctx.db.query("chatUsageProjections").collect(),
      })),
    ).toEqual(beforeReplay);
    expect(beforeReplay.events.map((event) => event.evidenceKind)).toEqual([
      "dispatch",
      "estimated",
      "reported",
    ]);
    expect(beforeReplay.projections).toHaveLength(1);
    expect(beforeReplay.projections[0]).toMatchObject({
      inputTokens: 80,
      outputTokens: 8,
      costUsd: 0.008,
      measurement: "reported",
      runId,
      isByok: false,
    });
    expect(beforeReplay.projections[0]?.usageRecordId).toBeDefined();
    const usageRecords = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(usageRecords).toHaveLength(1);
    expect(usageRecords[0]).toMatchObject({
      inputTokens: 80,
      outputTokens: 8,
      cost: 0.008,
      messageCount: 1,
      feature: "chat",
      operationType: "text",
      isByok: false,
    });
    const lifetime = await t.run((ctx) =>
      ctx.db
        .query("conversationTokenUsage")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .collect(),
    );
    expect(lifetime).toHaveLength(1);
    expect(lifetime[0]).toMatchObject({
      inputTokens: 80,
      outputTokens: 8,
      totalTokens: 88,
      reasoningTokens: 0,
      messageCount: 1,
    });
  });

  it("rejects a changed dispatch hash and conflicting reported evidence", async () => {
    const { t, ownerId, conversationId, messageId } = await fixture();
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
    });
    const dispatchArgs = {
      runId,
      attemptId,
      stepIndex: 0,
      iterationKind: "main" as const,
      dispatchRequestHash: HASH_A,
    };
    const dispatch = await t.mutation(
      internal.chatSettlement.beginDispatch,
      dispatchArgs,
    );
    await expect(
      t.mutation(internal.chatSettlement.beginDispatch, {
        ...dispatchArgs,
        dispatchRequestHash: HASH_B,
      }),
    ).rejects.toThrow("Chat dispatch identity conflict");
    const reported = {
      usageKey: dispatch.usageKey,
      evidenceKind: "reported" as const,
      measurement: "reported" as const,
      inputTokens: 80,
      outputTokens: 8,
      costUsd: 0.008,
      evidenceHash: RECEIPT_A,
    };
    await t.mutation(internal.chatSettlement.settleDispatch, reported);
    await expect(
      t.mutation(internal.chatSettlement.settleDispatch, {
        ...reported,
        inputTokens: 81,
        evidenceHash: RECEIPT_B,
      }),
    ).rejects.toThrow("Conflicting reported usage requires reconciliation");
  });

  it("exposes a receipt only to its initiating owner and detaches it on conversation deletion", async () => {
    const { t, owner, ownerId, conversationId, messageId } = await fixture();
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
    });
    await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: HASH_A,
    });
    const pendingReceipt = await owner.query(api.chatSettlement.getReceipt, {
      messageId,
    });
    expect(pendingReceipt).toMatchObject({ unresolvedDispatchCount: 1 });
    expect(pendingReceipt).toMatchObject({
      costUsd: 0,
      hasUnknownCost: true,
      hasUnknownUsage: true,
    });
    const stranger = t.withIdentity(
      createMockIdentity({ subject: "settlement-stranger" }),
    );
    await expect(
      stranger.query(api.chatSettlement.getReceipt, { messageId }),
    ).resolves.toBeNull();

    await owner.mutation(api.conversations.deleteConversation, {
      conversationId,
    });
    await expect(
      owner.query(api.chatSettlement.getReceipt, { messageId }),
    ).resolves.toBeNull();
    await expect(
      t.mutation(internal.chatSettlement.settleDispatch, {
        usageKey: `chat-dispatch-v1:${attemptId}:0:main`,
        evidenceKind: "reported",
        measurement: "reported",
        inputTokens: 80,
        outputTokens: 8,
        costUsd: 0.008,
        evidenceHash: RECEIPT_A,
      }),
    ).resolves.toMatchObject({ duplicate: false });
    expect(
      await t.run((ctx) => ctx.db.query("chatUsageProjections").collect()),
    ).toHaveLength(1);
    const detachedProjection = await t.run((ctx) =>
      ctx.db.query("chatUsageProjections").first(),
    );
    expect(detachedProjection?.conversationId).toBeUndefined();
    expect(detachedProjection?.costUsd).toBe(0.008);
  });

  it("erases events and rejects late settlement after owner data erasure", async () => {
    const { t, ownerId, conversationId, messageId } = await fixture();
    const runId = await t.mutation(internal.chatSettlement.ensureRun, {
      ownerUserId: ownerId,
      conversationId,
      messageId,
    });
    const attemptId = await t.mutation(internal.chatSettlement.createAttempt, {
      runId,
      model: "openai:gpt-4o",
    });
    const dispatch = await t.mutation(internal.chatSettlement.beginDispatch, {
      runId,
      attemptId,
      stepIndex: 0,
      iterationKind: "main",
      dispatchRequestHash: HASH_A,
    });
    await t.run(async (ctx) => {
      const { cascadeDeleteUserData } = await import("../lib/utils/cascade");
      await cascadeDeleteUserData(ctx, ownerId);
    });
    expect(
      await t.run((ctx) => ctx.db.query("usageEvents").collect()),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.query("agentRuns").collect()),
    ).toHaveLength(0);
    await expect(
      t.mutation(internal.chatSettlement.settleDispatch, {
        usageKey: dispatch.usageKey,
        evidenceKind: "reported",
        measurement: "reported",
        inputTokens: 80,
        outputTokens: 8,
        costUsd: 0.008,
        evidenceHash: RECEIPT_A,
      }),
    ).rejects.toThrow("Unknown chat dispatch");
  });
});
