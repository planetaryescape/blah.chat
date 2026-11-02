import { SPEECH_PREPARATION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import {
  calculateCost,
  normalizeUsageTokens,
  type UsageTokenInfo,
} from "@blah-chat/ai/utils";
import { generateText } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
} from "./_generated/server";
import { SPEECH_PREPARATION_PROMPT } from "./lib/prompts/operational/speechPreparation";
import { applyCodeOutline } from "./lib/speech/assistance";
import { prepareDeterministic, validateNarration } from "./lib/speech/prepare";
import type { PreparedNarration } from "./lib/speech/types";
import { getCurrentUser } from "./lib/userSync";

const failureUsage = z.object({
  usage: z.object({
    inputTokens: z.number().nonnegative().optional(),
    outputTokens: z.number().nonnegative().optional(),
    reasoningTokens: z.number().nonnegative().optional(),
    outputTokenDetails: z
      .object({ reasoningTokens: z.number().nonnegative().optional() })
      .optional(),
  }),
});

const REQUEST_TTL_MS = 10 * 60_000;
const requestIdSchema = z.string().uuid();

async function cleanupSessions(ctx: MutationCtx) {
  const expired = await ctx.db
    .query("speechPreparationSessions")
    .withIndex("by_expiry", (q) => q.lte("expiresAt", Date.now()))
    .take(100);
  for (const row of expired) await ctx.db.delete(row._id);
}

export const cleanupExpired = internalMutation({
  args: {},
  handler: cleanupSessions,
});

async function insertSession(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  requestId: string,
  cancelled: boolean,
  sourceHash?: string,
) {
  // Keep both queued work and cancellation tombstones finite per authenticated owner.
  if (
    (
      await ctx.db
        .query("speechPreparationSessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(100)
    ).length >= 100
  )
    throw new Error("Speech preparation request limit reached");
  await ctx.db.insert("speechPreparationSessions", {
    userId,
    requestId,
    cancelled,
    sourceHash,
    expiresAt: Date.now() + REQUEST_TTL_MS,
  });
  await ctx.scheduler.runAfter(
    REQUEST_TTL_MS,
    internal.speechPreparation.cleanupExpired,
    {},
  );
}

export const cancel = mutation({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    requestIdSchema.parse(args.requestId);
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    await cleanupSessions(ctx);
    const existing = await ctx.db
      .query("speechPreparationSessions")
      .withIndex("by_user_request", (q) =>
        q.eq("userId", user._id).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) await ctx.db.patch(existing._id, { cancelled: true });
    else await insertSession(ctx, user._id, args.requestId, true);
    return null;
  },
});

export const beginSession = internalMutation({
  args: {
    userId: v.id("users"),
    requestId: v.string(),
    sourceHash: v.string(),
  },
  handler: async (ctx, args) => {
    requestIdSchema.parse(args.requestId);
    // Read before cleanup: an expired-but-retained request is never restarted either.
    const existing = await ctx.db
      .query("speechPreparationSessions")
      .withIndex("by_user_request", (q) =>
        q.eq("userId", args.userId).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) return false;
    await cleanupSessions(ctx);
    await insertSession(
      ctx,
      args.userId,
      args.requestId,
      false,
      args.sourceHash,
    );
    return true;
  },
});

export const sessionActive = internalQuery({
  args: {
    userId: v.id("users"),
    requestId: v.string(),
    sourceHash: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("speechPreparationSessions")
      .withIndex("by_user_request", (q) =>
        q.eq("userId", args.userId).eq("requestId", args.requestId),
      )
      .unique();
    return (
      !!session &&
      !session.cancelled &&
      session.sourceHash === args.sourceHash &&
      session.expiresAt > Date.now()
    );
  },
});

export const prepare = action({
  args: {
    text: v.string(),
    messageId: v.optional(v.id("messages")),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PreparedNarration> => {
    const deadline = Date.now() + 30_000;
    if (!(await ctx.auth.getUserIdentity())) throw new Error("Unauthorized");
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) throw new Error("Unauthorized");
    if (
      !(await ctx.runQuery(api.users.getUserPreference, { key: "ttsEnabled" }))
    )
      throw new Error("TTS is disabled in user preferences");
    let source = args.text;
    if (args.messageId) {
      const message: Doc<"messages"> | null = await ctx.runQuery(
        api.messages.getForCurrentUser,
        { messageId: args.messageId },
      );
      if (!message) throw new Error("Unauthorized source message");
      if (args.text !== message.content)
        throw new Error(
          "Speech source does not match canonical message content",
        );
      source = message.content;
    }
    const { narration, codeBlocks } = await prepareDeterministic(source);
    const sessionArgs =
      args.requestId !== undefined
        ? {
            userId: user._id,
            requestId: requestIdSchema.parse(args.requestId),
            sourceHash: narration.sourceHash,
          }
        : undefined;
    if (
      sessionArgs &&
      !(await ctx.runMutation(
        internal.speechPreparation.beginSession,
        sessionArgs,
      ))
    ) {
      narration.warnings.push(
        "Preparation request cancelled, expired or already started; deterministic technical detail retained.",
      );
      return narration;
    }
    const active = async (): Promise<boolean> =>
      !sessionArgs ||
      (await ctx.runQuery(
        internal.speechPreparation.sessionActive,
        sessionArgs,
      ));
    if (!codeBlocks.length) return narration;
    const byok = await ctx.runQuery(
      internal.byok.credentials.getConfigByAuth,
      {},
    );
    // This model uses the operational direct-provider registry, not the BYOK gateway.
    // Until that path supports reader credentials, never send BYOK content to server keys.
    if (byok?.byokEnabled) {
      narration.warnings.push(
        "Optional code explanation unavailable under BYOK; complete deterministic technical detail retained.",
      );
      return narration;
    }
    let calls = 0;
    for (const block of codeBlocks) {
      if (calls >= 4 || Date.now() >= deadline || block.text.length > 6000) {
        narration.warnings.push(
          `Optional explanation skipped for ${block.blockId}: preparation limits; technical detail retained.`,
        );
        continue;
      }
      const prompt = JSON.stringify({
        sourceHash: narration.sourceHash,
        blockId: block.blockId,
        code: block.text,
      });
      if (prompt.length + SPEECH_PREPARATION_PROMPT.length > 6000) {
        narration.warnings.push(
          `Optional explanation skipped for ${block.blockId}: input limit; technical detail retained.`,
        );
        continue;
      }
      // Previous calls are recorded before the next admission check. This is a
      // recorded-spend policy, not a reservation across concurrent actions.
      const budget = await ctx.runQuery(api.usage.checkBudget.checkBudget, {
        userId: user._id,
      });
      if (!budget.allowed) {
        narration.warnings.push(
          "Optional code explanation skipped because the usage budget is exhausted; complete technical detail retained.",
        );
        break;
      }
      if (Date.now() >= deadline || !(await active())) break;
      calls++;
      let usage: UsageTokenInfo | undefined;
      try {
        const result = await generateText({
          model: getModel(SPEECH_PREPARATION_MODEL.id),
          system: SPEECH_PREPARATION_PROMPT,
          prompt,
          maxOutputTokens: 2000,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        });
        usage = result.usage;
        if (Date.now() >= deadline)
          throw new Error("Preparation deadline exceeded");
        applyCodeOutline(narration, block, result.text, result.finishReason);
      } catch (error) {
        if (!usage) {
          const parsed = failureUsage.safeParse(error);
          if (parsed.success) usage = parsed.data.usage;
        }
        narration.warnings.push(
          `Optional explanation unavailable for ${block.blockId}; complete deterministic technical detail retained.`,
        );
      } finally {
        // Usage is recorded even for invalid or truncated output. Never log source or provider errors.
        const {
          inputTokens,
          outputTokens,
          reasoningTokens,
          cachedInputTokens,
        } = normalizeUsageTokens(usage);
        await ctx.runMutation(internal.usage.mutations.recordTextGeneration, {
          userId: user._id,
          model: SPEECH_PREPARATION_MODEL.id,
          inputTokens,
          outputTokens,
          reasoningTokens,
          cost: calculateCost(SPEECH_PREPARATION_MODEL.id, {
            inputTokens,
            outputTokens,
            reasoningTokens,
            cachedInputTokens,
          }),
          feature: "chat",
        });
      }
      // Cancellation cannot undo an in-flight provider call or its recorded cost.
      if (!(await active())) break;
    }
    return validateNarration(narration);
  },
});
