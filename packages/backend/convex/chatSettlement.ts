import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx, query } from "./_generated/server";
import { canAccessConversation } from "./conversations/branching";
import { logger } from "./lib/logger";
import { getCurrentUser } from "./lib/userSync";
import { queueExistingBudgetAlert } from "./usage/mutations";

const measurement = v.union(
  v.literal("reported"),
  v.literal("estimated"),
  v.literal("unknown"),
);

const pricing = v.object({
  input: v.number(),
  output: v.number(),
  cached: v.optional(v.number()),
  reasoning: v.optional(v.number()),
  tiers: v.optional(
    v.array(
      v.object({
        minInputTokens: v.number(),
        input: v.optional(v.number()),
        output: v.optional(v.number()),
        cached: v.optional(v.number()),
        reasoning: v.optional(v.number()),
      }),
    ),
  ),
});

type Pricing = {
  input: number;
  output: number;
  cached?: number;
  reasoning?: number;
  tiers?: Array<{
    minInputTokens: number;
    input?: number;
    output?: number;
    cached?: number;
    reasoning?: number;
  }>;
};

function validRate(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

function validatePricing(value: Pricing | undefined): void {
  if (!value) return;
  if (
    !validRate(value.input) ||
    !validRate(value.output) ||
    !validRate(value.cached) ||
    !validRate(value.reasoning) ||
    value.tiers?.some(
      (tier) =>
        !Number.isSafeInteger(tier.minInputTokens) ||
        tier.minInputTokens < 0 ||
        !validRate(tier.input) ||
        !validRate(tier.output) ||
        !validRate(tier.cached) ||
        !validRate(tier.reasoning),
    )
  ) {
    throw new Error("Chat pricing rates must be finite and non-negative");
  }
}

function finiteNonnegative(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

function utcDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function canonicalEvidence(args: {
  evidenceKind: "reported" | "estimated";
  measurement: "reported" | "estimated" | "unknown";
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  costUsd?: number;
  rateVersion?: string;
}): string {
  return JSON.stringify({
    evidenceKind: args.evidenceKind,
    measurement: args.measurement,
    inputTokens: args.inputTokens ?? null,
    outputTokens: args.outputTokens ?? null,
    cachedInputTokens: args.cachedInputTokens ?? null,
    cacheWriteTokens: args.cacheWriteTokens ?? null,
    reasoningTokens: args.reasoningTokens ?? null,
    costUsd: args.costUsd ?? null,
    rateVersion: args.rateVersion ?? null,
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export const ensureRun = internalMutation({
  args: {
    ownerUserId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args): Promise<Id<"agentRuns"> | null> => {
    const [user, conversation, message] = await Promise.all([
      ctx.db.get(args.ownerUserId),
      ctx.db.get(args.conversationId),
      ctx.db.get(args.messageId),
    ]);
    if (!user || !conversation || !message) {
      throw new Error("Chat settlement owner or message mismatch");
    }
    if (
      message.userId !== args.ownerUserId ||
      message.conversationId !== args.conversationId ||
      message.role !== "assistant" ||
      !(await canAccessConversation(ctx, conversation._id, args.ownerUserId))
    ) {
      throw new Error("Chat settlement owner or message mismatch");
    }
    if (conversation.isIncognito) return null;
    const existing = await ctx.db
      .query("agentRuns")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();
    if (existing) {
      if (existing.ownerUserId !== message.userId) {
        throw new Error("Chat settlement run owner mismatch");
      }
      return existing._id;
    }
    return await ctx.db.insert("agentRuns", {
      ownerUserId: message.userId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      createdAt: Date.now(),
    });
  },
});

export const createAttempt = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    model: v.string(),
    provider: v.optional(v.string()),
    pricing: v.optional(pricing),
    pricingVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const owner = run ? await ctx.db.get(run.ownerUserId) : null;
    if (!run || !owner || run.ownerErasedAt !== undefined) {
      throw new Error("Chat settlement run unavailable");
    }
    validatePricing(args.pricing);
    const conversation = run.conversationId
      ? await ctx.db.get(run.conversationId)
      : null;
    const message = run.messageId ? await ctx.db.get(run.messageId) : null;
    if (
      !conversation ||
      conversation.isIncognito ||
      !message ||
      message.role !== "assistant" ||
      message.userId !== run.ownerUserId ||
      message.conversationId !== conversation._id ||
      message.status !== "generating" ||
      !(await canAccessConversation(ctx, conversation._id, run.ownerUserId))
    ) {
      throw new Error("New chat attempt requires a live generating message");
    }
    const attempts = await ctx.db
      .query("runAttempts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    if (attempts.length >= 8) throw new Error("Chat attempt limit exceeded");
    return await ctx.db.insert("runAttempts", {
      runId: args.runId,
      ownerUserId: run.ownerUserId,
      model: args.model,
      isByok: false,
      provider: args.provider,
      pricing: args.pricing,
      pricingVersion: args.pricingVersion,
      attemptIndex: attempts.length,
      status: "dispatching",
      createdAt: Date.now(),
    });
  },
});

export const beginDispatch = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    attemptId: v.id("runAttempts"),
    stepIndex: v.number(),
    iterationKind: v.union(v.literal("main"), v.literal("continuation")),
    dispatchRequestHash: v.string(),
  },
  handler: async (ctx, args) => {
    if (
      !Number.isSafeInteger(args.stepIndex) ||
      args.stepIndex < 0 ||
      args.stepIndex > 14 ||
      !/^[a-f0-9]{64}$/.test(args.dispatchRequestHash)
    ) {
      throw new Error("Invalid chat dispatch identity");
    }
    const [run, attempt] = await Promise.all([
      ctx.db.get(args.runId),
      ctx.db.get(args.attemptId),
    ]);
    if (
      !run ||
      run.ownerErasedAt !== undefined ||
      !attempt ||
      attempt.runId !== run._id ||
      attempt.ownerUserId !== run.ownerUserId
    ) {
      throw new Error("Invalid chat dispatch lineage");
    }
    const usageKey = `chat-dispatch-v1:${args.attemptId}:${args.stepIndex}:${args.iterationKind}`;
    const existing = await ctx.db
      .query("usageEvents")
      .withIndex("by_usage_key", (q) => q.eq("usageKey", usageKey))
      .first();
    if (existing) {
      if (existing.dispatchRequestHash !== args.dispatchRequestHash) {
        throw new Error("Chat dispatch identity conflict");
      }
      return { usageKey, eventId: existing._id };
    }
    if (attempt.status !== "dispatching") {
      throw new Error("Cannot begin dispatch for a terminal chat attempt");
    }
    const conversation = run.conversationId
      ? await ctx.db.get(run.conversationId)
      : null;
    const message = run.messageId ? await ctx.db.get(run.messageId) : null;
    if (
      !conversation ||
      conversation.isIncognito ||
      !message ||
      message.role !== "assistant" ||
      message.userId !== run.ownerUserId ||
      message.conversationId !== conversation._id ||
      message.status !== "generating" ||
      !(await ctx.db.get(run.ownerUserId)) ||
      !(await canAccessConversation(ctx, conversation._id, run.ownerUserId))
    ) {
      throw new Error("New dispatch requires a live generating message");
    }
    const attemptDispatches = await ctx.db
      .query("usageEvents")
      .withIndex("by_attempt_step", (q) => q.eq("attemptId", attempt._id))
      .collect();
    if (
      attemptDispatches.filter((event) => event.evidenceKind === "dispatch")
        .length >= 15
    ) {
      throw new Error("Chat dispatch limit exceeded");
    }
    const now = Date.now();
    const eventId = await ctx.db.insert("usageEvents", {
      attribution: { kind: "run", runId: run._id, attemptId: attempt._id },
      runId: run._id,
      attemptId: attempt._id,
      ownerUserId: run.ownerUserId,
      conversationId: run.conversationId,
      model: attempt.model,
      feature: "chat",
      operationType: "text",
      isByok: false,
      provider: attempt.provider,
      pricingVersion: attempt.pricingVersion,
      stepIndex: args.stepIndex,
      iterationKind: args.iterationKind,
      dispatchRequestHash: args.dispatchRequestHash,
      usageKey,
      evidenceKey: `${usageKey}:dispatch`,
      evidenceKind: "dispatch",
      measurement: "unknown",
      currency: "USD",
      occurredAt: now,
      dispatchAt: now,
    });
    await refreshRunProjection(ctx, run._id);
    return { usageKey, eventId };
  },
});

export const settleDispatch = internalMutation({
  args: {
    usageKey: v.string(),
    evidenceKind: v.union(v.literal("reported"), v.literal("estimated")),
    measurement,
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    cacheWriteTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    rateVersion: v.optional(v.string()),
    evidenceHash: v.string(),
  },
  handler: async (ctx, args) => {
    const dispatch = await ctx.db
      .query("usageEvents")
      .withIndex("by_usage_key", (q) => q.eq("usageKey", args.usageKey))
      .first();
    if (!dispatch || dispatch.evidenceKind !== "dispatch") {
      throw new Error("Unknown chat dispatch");
    }
    const [run, attempt, owner] = await Promise.all([
      ctx.db.get(dispatch.runId),
      ctx.db.get(dispatch.attemptId),
      ctx.db.get(dispatch.ownerUserId),
    ]);
    if (
      !run ||
      run.ownerErasedAt !== undefined ||
      !attempt ||
      attempt.isByok !== false ||
      !owner ||
      attempt.runId !== run._id ||
      run.ownerUserId !== dispatch.ownerUserId ||
      attempt.ownerUserId !== dispatch.ownerUserId ||
      attempt.model !== dispatch.model ||
      attempt.provider !== dispatch.provider ||
      dispatch.attemptId !== attempt._id ||
      dispatch.attribution.runId !== run._id ||
      dispatch.attribution.attemptId !== attempt._id ||
      dispatch.isByok !== false ||
      args.measurement === "unknown" ||
      !/^[a-f0-9]{64}$/.test(args.evidenceHash)
    ) {
      throw new Error("Chat settlement lineage or evidence invalid");
    }
    for (const value of [
      args.inputTokens,
      args.outputTokens,
      args.cachedInputTokens,
      args.cacheWriteTokens,
      args.reasoningTokens,
    ]) {
      if (!finiteNonnegative(value)) {
        throw new Error("Chat usage values must be finite and non-negative");
      }
      if (value !== undefined && !Number.isSafeInteger(value)) {
        throw new Error("Chat token counts must be non-negative integers");
      }
    }
    if (!finiteNonnegative(args.costUsd)) {
      throw new Error("Chat usage values must be finite and non-negative");
    }
    if (
      args.rateVersion !== undefined &&
      attempt.pricingVersion !== undefined &&
      args.rateVersion !== attempt.pricingVersion
    ) {
      throw new Error("Chat receipt cannot change the dispatch rate version");
    }
    if (
      args.costUsd !== undefined &&
      !Number.isSafeInteger(Math.round(args.costUsd * 1_000_000_000))
    ) {
      throw new Error("Chat cost exceeds supported money precision");
    }
    if (
      (args.evidenceKind === "reported" && args.measurement !== "reported") ||
      (args.evidenceKind === "estimated" && args.measurement !== "estimated")
    ) {
      throw new Error("Chat evidence kind and measurement must match");
    }
    const payload = canonicalEvidence(args);
    const payloadHash = await sha256(payload);
    const evidenceKey = `${args.usageKey}:${args.evidenceKind}:${args.evidenceHash}:${payloadHash}`;
    const prior = await ctx.db
      .query("usageEvents")
      .withIndex("by_usage_key", (q) => q.eq("usageKey", args.usageKey))
      .collect();
    const sameSource = prior.find(
      (event) =>
        event.evidenceKind === args.evidenceKind &&
        event.sourceEvidenceHash === args.evidenceHash,
    );
    if (sameSource) {
      if (sameSource.evidenceKey !== evidenceKey) {
        throw new Error(
          "Conflicting evidence revision requires reconciliation",
        );
      }
      return { eventId: sameSource._id, duplicate: true };
    }
    const duplicate = await ctx.db
      .query("usageEvents")
      .withIndex("by_evidence_key", (q) => q.eq("evidenceKey", evidenceKey))
      .first();
    if (duplicate) return { eventId: duplicate._id, duplicate: true };
    const reported = prior.filter((event) => event.evidenceKind === "reported");
    if (args.evidenceKind === "reported" && reported.length > 0) {
      const completingPartial =
        args.inputTokens !== undefined &&
        args.outputTokens !== undefined &&
        reported.every(
          (event) =>
            (event.inputTokens === undefined ||
              event.outputTokens === undefined) &&
            (
              [
                "inputTokens",
                "outputTokens",
                "cachedInputTokens",
                "cacheWriteTokens",
                "reasoningTokens",
                "costUsd",
              ] as const
            ).every(
              (key) => event[key] === undefined || event[key] === args[key],
            ),
        );
      if (!completingPartial)
        throw new Error("Conflicting reported usage requires reconciliation");
    }
    const estimates = prior.filter(
      (event) => event.evidenceKind === "estimated",
    );
    if (args.evidenceKind === "estimated" && reported.length > 0) {
      return { eventId: reported[0]!._id, duplicate: true };
    }
    if (args.evidenceKind === "estimated" && estimates.length > 0) {
      throw new Error("Conflicting estimate requires reconciliation");
    }
    const correction =
      args.evidenceKind === "reported"
        ? (estimates[0] ?? reported[0])
        : undefined;
    const eventId = await ctx.db.insert("usageEvents", {
      attribution: dispatch.attribution,
      runId: dispatch.runId,
      attemptId: dispatch.attemptId,
      ownerUserId: dispatch.ownerUserId,
      conversationId: dispatch.conversationId,
      model: dispatch.model,
      feature: "chat",
      operationType: "text",
      isByok: false,
      provider: dispatch.provider,
      pricingVersion: args.rateVersion ?? dispatch.pricingVersion,
      stepIndex: dispatch.stepIndex,
      iterationKind: dispatch.iterationKind,
      dispatchRequestHash: dispatch.dispatchRequestHash,
      usageKey: args.usageKey,
      evidenceKey,
      sourceEvidenceHash: args.evidenceHash,
      evidenceKind: args.evidenceKind,
      correctsUsageEventId: correction?._id,
      measurement: args.measurement,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cachedInputTokens: args.cachedInputTokens,
      cacheWriteTokens: args.cacheWriteTokens,
      reasoningTokens: args.reasoningTokens,
      costUsd: args.costUsd,
      currency: "USD",
      rateVersion: args.rateVersion ?? dispatch.pricingVersion,
      occurredAt: Date.now(),
      dispatchAt: dispatch.dispatchAt ?? dispatch.occurredAt,
    });
    await refreshRunProjection(ctx, run._id);
    return { eventId, duplicate: false };
  },
});

type ProjectionTotals = {
  date: string;
  model: string;
  input: number;
  output: number;
  cached: number;
  cacheWrite: number;
  reasoning: number;
  cost: number;
  hasUnknownCost: boolean;
  hasUnknownUsage: boolean;
  estimated: boolean;
  messageCount: number;
};

async function refreshRunProjection(
  ctx: MutationCtx,
  runId: Id<"agentRuns">,
): Promise<void> {
  const run = await ctx.db.get(runId);
  if (!run || run.ownerErasedAt !== undefined) return;
  const events = await ctx.db
    .query("usageEvents")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .collect();
  const groups = new Map<string, Doc<"usageEvents">[]>();
  for (const event of events) {
    const group = groups.get(event.usageKey) ?? [];
    group.push(event);
    groups.set(event.usageKey, group);
  }
  const orderedDispatches = Array.from(groups.values())
    .map((group) => group.find((event) => event.evidenceKind === "dispatch"))
    .filter((event): event is Doc<"usageEvents"> => event !== undefined)
    .sort(
      (left, right) =>
        (left.dispatchAt ?? left.occurredAt) -
        (right.dispatchAt ?? right.occurredAt),
    );
  const firstDispatchKey = orderedDispatches[0]?.usageKey;
  const totals = new Map<string, ProjectionTotals>();
  for (const group of groups.values()) {
    const dispatch = group.find((event) => event.evidenceKind === "dispatch");
    if (!dispatch) continue;
    const selected =
      group.find(
        (event) =>
          event.evidenceKind === "reported" &&
          event.inputTokens !== undefined &&
          event.outputTokens !== undefined,
      ) ??
      group.find((event) => event.evidenceKind === "reported") ??
      group.find((event) => event.evidenceKind === "estimated");
    const date = utcDate(dispatch.dispatchAt ?? dispatch.occurredAt);
    const key = `${date}\0${dispatch.model}`;
    const target = totals.get(key) ?? {
      date,
      model: dispatch.model,
      input: 0,
      output: 0,
      cached: 0,
      cacheWrite: 0,
      reasoning: 0,
      cost: 0,
      hasUnknownCost: false,
      hasUnknownUsage: false,
      estimated: false,
      messageCount: 0,
    };
    if (!selected) {
      target.hasUnknownCost = true;
      target.hasUnknownUsage = true;
    } else {
      target.input += selected.inputTokens ?? 0;
      target.output += selected.outputTokens ?? 0;
      target.cached += selected.cachedInputTokens ?? 0;
      target.cacheWrite += selected.cacheWriteTokens ?? 0;
      target.reasoning += selected.reasoningTokens ?? 0;
      if (
        selected.inputTokens === undefined ||
        selected.outputTokens === undefined
      ) {
        target.hasUnknownUsage = true;
      }
      if (selected.costUsd === undefined) target.hasUnknownCost = true;
      else
        target.cost =
          (Math.round(target.cost * 1_000_000_000) +
            Math.round(selected.costUsd * 1_000_000_000)) /
          1_000_000_000;
      if (selected.evidenceKind === "estimated") target.estimated = true;
    }
    if (dispatch.usageKey === firstDispatchKey) target.messageCount = 1;
    totals.set(key, target);
  }

  const previous = await ctx.db
    .query("chatUsageProjections")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .collect();
  const previousByKey = new Map(
    previous.map((projection) => [
      `${projection.date}\0${projection.model}`,
      projection,
    ]),
  );
  let recognizedCostIncreased = false;
  for (const [key, next] of totals) {
    const old = previousByKey.get(key);
    const usageRecordId =
      old?.usageRecordId ??
      (await ctx.db.insert("usageRecords", {
        userId: run.ownerUserId,
        date: next.date,
        model: next.model,
        conversationId: run.conversationId,
        feature: "chat",
        operationType: "text",
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cost: 0,
        messageCount: 0,
        isByok: false,
      }));
    const usageRecord = await ctx.db.get(usageRecordId);
    if (!usageRecord || usageRecord.userId !== run.ownerUserId) {
      throw new Error("Chat usage projection row is unavailable");
    }
    const inputDelta = next.input - (old?.inputTokens ?? 0);
    const outputDelta = next.output - (old?.outputTokens ?? 0);
    const reasoningDelta = next.reasoning - (old?.reasoningTokens ?? 0);
    const costDelta =
      Math.round(next.cost * 1_000_000_000) -
      Math.round((old?.costUsd ?? 0) * 1_000_000_000);
    if (costDelta > 0) recognizedCostIncreased = true;
    const messageDelta = next.messageCount - (old?.messageCount ?? 0);
    const rowInput = usageRecord.inputTokens + inputDelta;
    const rowOutput = usageRecord.outputTokens + outputDelta;
    const rowReasoning = (usageRecord.reasoningTokens ?? 0) + reasoningDelta;
    const rowCost =
      (Math.round(usageRecord.cost * 1_000_000_000) + costDelta) /
      1_000_000_000;
    const rowMessages = usageRecord.messageCount + messageDelta;
    if (
      [rowInput, rowOutput, rowReasoning, rowCost, rowMessages].some(
        (n) => n < 0,
      )
    ) {
      throw new Error(
        "Chat usage correction would make a legacy total negative",
      );
    }
    await ctx.db.patch(usageRecordId, {
      inputTokens: rowInput,
      outputTokens: rowOutput,
      reasoningTokens: rowReasoning,
      cost: rowCost,
      messageCount: rowMessages,
    });
    const conversation = run.conversationId
      ? await ctx.db.get(run.conversationId)
      : null;
    if (conversation) {
      const lifetime = await ctx.db
        .query("conversationTokenUsage")
        .withIndex("by_conversation_model", (q) =>
          q.eq("conversationId", conversation._id).eq("model", next.model),
        )
        .first();
      if (lifetime) {
        const nextInput = lifetime.inputTokens + inputDelta;
        const nextOutput = lifetime.outputTokens + outputDelta;
        const nextCount = lifetime.messageCount + messageDelta;
        if (nextInput < 0 || nextOutput < 0 || nextCount < 0) {
          throw new Error(
            "Chat lifetime correction would make totals negative",
          );
        }
        await ctx.db.patch(lifetime._id, {
          inputTokens: nextInput,
          outputTokens: nextOutput,
          totalTokens: lifetime.totalTokens + inputDelta + outputDelta,
          reasoningTokens: (lifetime.reasoningTokens ?? 0) + reasoningDelta,
          messageCount: nextCount,
          lastUpdatedAt: Date.now(),
        });
      } else if (inputDelta >= 0 && outputDelta >= 0 && messageDelta >= 0) {
        await ctx.db.insert("conversationTokenUsage", {
          conversationId: conversation._id,
          model: next.model,
          totalTokens: inputDelta + outputDelta,
          inputTokens: inputDelta,
          outputTokens: outputDelta,
          reasoningTokens: reasoningDelta,
          messageCount: messageDelta,
          lastUpdatedAt: Date.now(),
          createdAt: Date.now(),
        });
      } else {
        throw new Error("Chat lifetime projection is missing for a correction");
      }
    }
    const projection = {
      ownerUserId: run.ownerUserId,
      date: next.date,
      conversationId: run.conversationId,
      model: next.model,
      feature: "chat" as const,
      operationType: "text" as const,
      isByok: false as const,
      runId,
      usageRecordId,
      inputTokens: next.input,
      outputTokens: next.output,
      cachedInputTokens: next.cached,
      cacheWriteTokens: next.cacheWrite,
      reasoningTokens: next.reasoning,
      messageCount: next.messageCount,
      costUsd: next.cost,
      hasUnknownCost: next.hasUnknownCost,
      hasUnknownUsage: next.hasUnknownUsage,
      measurement:
        next.hasUnknownCost || next.hasUnknownUsage
          ? ("unknown" as const)
          : next.estimated
            ? ("estimated" as const)
            : ("reported" as const),
      updatedAt: Date.now(),
    };
    if (old) await ctx.db.patch(old._id, projection);
    else await ctx.db.insert("chatUsageProjections", projection);
    previousByKey.delete(key);
  }
  if (previousByKey.size > 0) {
    throw new Error("Chat dispatch projection dimensions changed unexpectedly");
  }
  if (recognizedCostIncreased) {
    try {
      await queueExistingBudgetAlert(ctx, run.ownerUserId);
    } catch {
      logger.warn("Budget alert delivery failed after usage settlement", {
        tag: "ChatAccounting",
        runId,
      });
    }
  }
  const message = run.messageId ? await ctx.db.get(run.messageId) : null;
  if (
    message &&
    message.userId === run.ownerUserId &&
    message.conversationId === run.conversationId &&
    message.role === "assistant"
  ) {
    const current = [...totals.values()];
    await ctx.db.patch(message._id, {
      inputTokens: current.reduce((sum, row) => sum + row.input, 0),
      outputTokens: current.reduce((sum, row) => sum + row.output, 0),
      reasoningTokens: current.reduce((sum, row) => sum + row.reasoning, 0),
      cost:
        current.reduce(
          (sum, row) => sum + Math.round(row.cost * 1_000_000_000),
          0,
        ) / 1_000_000_000,
    });
  }
}

export const finishAttempt = internalMutation({
  args: {
    attemptId: v.id("runAttempts"),
    status: v.union(
      v.literal("complete"),
      v.literal("stopped"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.status !== "dispatching") return;
    await ctx.db.patch(args.attemptId, {
      status: args.status,
      finishedAt: Date.now(),
    });
  },
});

export const getReceipt = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const run = await ctx.db
      .query("agentRuns")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();
    if (
      !run ||
      run.ownerUserId !== user._id ||
      run.ownerErasedAt !== undefined
    ) {
      return null;
    }
    const [message, conversation] = await Promise.all([
      ctx.db.get(args.messageId),
      run.conversationId ? ctx.db.get(run.conversationId) : null,
    ]);
    if (
      !message ||
      !conversation ||
      conversation.isIncognito ||
      message.userId !== user._id ||
      message.conversationId !== conversation._id ||
      message.role !== "assistant" ||
      !(await canAccessConversation(ctx, conversation._id, user._id))
    ) {
      return null;
    }
    const [events, projections, attempts] = await Promise.all([
      ctx.db
        .query("usageEvents")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect(),
      ctx.db
        .query("chatUsageProjections")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect(),
      ctx.db
        .query("runAttempts")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect(),
    ]);
    const dispatches = events.filter(
      (event) => event.evidenceKind === "dispatch",
    );
    const reportedKeys = new Set(
      events
        .filter(
          (event) =>
            event.evidenceKind === "reported" &&
            event.inputTokens !== undefined &&
            event.outputTokens !== undefined,
        )
        .map((event) => event.usageKey),
    );
    const reportedEvidenceKeys = new Set(
      events
        .filter((event) => event.evidenceKind === "reported")
        .map((event) => event.usageKey),
    );
    const estimatedKeys = new Set(
      events
        .filter(
          (event) =>
            event.evidenceKind === "estimated" &&
            !reportedEvidenceKeys.has(event.usageKey),
        )
        .map((event) => event.usageKey),
    );
    const projectionUnknownCost = projections.some(
      (projection) => projection.hasUnknownCost,
    );
    const projectionUnknownUsage = projections.some(
      (projection) => projection.hasUnknownUsage,
    );
    return {
      messageId: args.messageId,
      status: message.status,
      dispatchCount: dispatches.length,
      reportedDispatchCount: reportedKeys.size,
      unresolvedDispatchCount: dispatches.filter(
        (event) =>
          !reportedKeys.has(event.usageKey) &&
          !estimatedKeys.has(event.usageKey),
      ).length,
      estimatedDispatchCount: [...estimatedKeys].filter(
        (key) => !reportedKeys.has(key),
      ).length,
      inputTokens: projections.reduce(
        (sum, projection) => sum + projection.inputTokens,
        0,
      ),
      outputTokens: projections.reduce(
        (sum, projection) => sum + projection.outputTokens,
        0,
      ),
      costUsd:
        projections.reduce(
          (sum, projection) =>
            sum + Math.round(projection.costUsd * 1_000_000_000),
          0,
        ) / 1_000_000_000,
      hasUnknownCost:
        projectionUnknownCost ||
        dispatches.some(
          (event) =>
            !reportedKeys.has(event.usageKey) &&
            !estimatedKeys.has(event.usageKey),
        ),
      hasUnknownUsage:
        projectionUnknownUsage ||
        dispatches.some(
          (event) =>
            !reportedKeys.has(event.usageKey) &&
            !estimatedKeys.has(event.usageKey),
        ),
      attempts: attempts.length,
    };
  },
});
