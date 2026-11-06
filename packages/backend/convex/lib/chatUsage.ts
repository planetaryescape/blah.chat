"use node";

import { createHash } from "node:crypto";
import { MODEL_CONFIG, type ModelConfig } from "@blah-chat/ai/models";
import { type LanguageModelMiddleware, wrapLanguageModel } from "ai";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { logger } from "./logger";

type Pricing = ModelConfig["pricing"];
type Model = Parameters<typeof wrapLanguageModel>[0]["model"];
type RawUsage = Awaited<ReturnType<Model["doGenerate"]>>["usage"];
type DispatchInput = Parameters<Model["doStream"]>[0];
type Receipt = {
  usageKey: string;
  evidenceKind: "reported" | "estimated";
  measurement: "reported" | "estimated";
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  costUsd?: number;
  rateVersion?: string;
  evidenceHash: string;
};
type AccountingContext = Pick<ActionCtx, "runMutation"> & {
  scheduler: Pick<ActionCtx["scheduler"], "runAfter">;
};

/** Hash the actual SDK V3 dispatch, not the initial options of a tool loop. */
export function canonicalDispatchInput(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof URL) return JSON.stringify({ url: value.href });
  if (value instanceof ArrayBuffer) {
    return JSON.stringify({ binary: Buffer.from(value).toString("base64") });
  }
  if (ArrayBuffer.isView(value)) {
    return JSON.stringify({
      binary: Buffer.from(
        value.buffer,
        value.byteOffset,
        value.byteLength,
      ).toString("base64"),
    });
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Non-finite dispatch value");
  }
  if (typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("Unsupported dispatch value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalDispatchInput(item ?? null)).join(",")}]`;
  }
  // SAFETY: primitives, arrays, URLs and binary values were handled above.
  // Remaining object properties are recursively canonicalized, never executed.
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${canonicalDispatchInput(record[key])}`,
    )
    .join(",")}}`;
}

export function usageDigest(value: unknown): string {
  return createHash("sha256")
    .update(canonicalDispatchInput(value))
    .digest("hex");
}

/** Catalog estimate per physical request; SDK output already includes reasoning. */
export function priceChatStep(
  usage: RawUsage,
  pricing?: Pricing,
): number | undefined {
  const input = usage.inputTokens.total;
  const output = usage.outputTokens.total;
  if (!pricing || input === undefined || output === undefined) return undefined;
  const read = usage.inputTokens.cacheRead;
  const write = usage.inputTokens.cacheWrite;
  const reasoning = usage.outputTokens.reasoning;
  if (
    [input, output, read, write, reasoning].some(
      (value) =>
        value !== undefined && (!Number.isSafeInteger(value) || value < 0),
    ) ||
    (write !== undefined && write > 0) ||
    (read ?? 0) > input ||
    (reasoning ?? 0) > output
  )
    return undefined;
  let rates = pricing;
  let minimum = -1;
  for (const tier of pricing.tiers ?? []) {
    if (input >= tier.minInputTokens && tier.minInputTokens > minimum) {
      rates = { ...pricing, ...tier };
      minimum = tier.minInputTokens;
    }
  }
  // Missing discounted-cache or separately-priced reasoning coverage is unknown.
  if (
    (rates.cached !== undefined && read === undefined) ||
    (rates.reasoning !== undefined && reasoning === undefined)
  )
    return undefined;
  const cacheRead = read ?? 0;
  const thinking = reasoning ?? 0;
  const total =
    ((input - cacheRead) * rates.input +
      cacheRead * (rates.cached ?? rates.input) +
      (output - thinking) * rates.output +
      thinking * (rates.reasoning ?? rates.output)) /
    1_000_000;
  // USD nanodollars: deterministic recognition, display rounding is separate.
  return Number.isFinite(total) && total >= 0
    ? Math.round(total * 1_000_000_000) / 1_000_000_000
    : undefined;
}

export async function createChatAccounting(
  ctx: AccountingContext,
  args: {
    ownerUserId: Id<"users">;
    conversationId: Id<"conversations">;
    messageId: Id<"messages">;
    modelId: string;
  },
) {
  const runId = await ctx.runMutation(internal.chatSettlement.ensureRun, {
    ownerUserId: args.ownerUserId,
    conversationId: args.conversationId,
    messageId: args.messageId,
  });
  if (!runId) return undefined;
  const config = MODEL_CONFIG[args.modelId];
  const pricing = config ? structuredClone(config.pricing) : undefined;
  const rateVersion = pricing
    ? `catalog-v1:${usageDigest(pricing)}`
    : undefined;
  const attempts: Id<"runAttempts">[] = [];

  const deliver = async (receipt: Receipt) => {
    try {
      await ctx.runMutation(internal.chatSettlement.settleDispatch, receipt);
    } catch {
      // Retry ingestion, never the paid provider request. The pre-dispatch
      // unknown fact remains durable even if both delivery channels fail.
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.chatSettlement.settleDispatch,
          receipt,
        );
      } catch {
        logger.error("Chat usage delivery remains unresolved", {
          tag: "ChatAccounting",
          usageKey: receipt.usageKey,
        });
      }
    }
  };

  const finishOne = async (
    attemptId: Id<"runAttempts">,
    status: "complete" | "stopped" | "error",
  ) => {
    try {
      await ctx.runMutation(internal.chatSettlement.finishAttempt, {
        attemptId,
        status,
      });
    } catch {
      try {
        await ctx.scheduler.runAfter(0, internal.chatSettlement.finishAttempt, {
          attemptId,
          status,
        });
      } catch {
        logger.error("Chat attempt status delivery remains unresolved", {
          tag: "ChatAccounting",
          attemptId,
        });
      }
    }
  };

  const wrap = async (model: Model, iterationKind: "main" | "continuation") => {
    const attemptId = await ctx.runMutation(
      internal.chatSettlement.createAttempt,
      {
        runId,
        model: args.modelId,
        provider: model.provider,
        pricing,
        pricingVersion: rateVersion,
      },
    );
    attempts.push(attemptId);
    let stepIndex = 0;
    const begin = async (params: DispatchInput) => {
      // Omit only the outer control signal, not a same-named field inside
      // authored tool input or provider options.
      const { abortSignal: _signal, ...request } = params;
      return ctx.runMutation(internal.chatSettlement.beginDispatch, {
        runId,
        attemptId,
        stepIndex: stepIndex++,
        iterationKind,
        dispatchRequestHash: usageDigest(request),
      });
    };
    const report = async (usageKey: string, usage: RawUsage) => {
      await deliver({
        usageKey,
        evidenceKind: "reported",
        measurement: "reported",
        inputTokens: usage.inputTokens.total,
        outputTokens: usage.outputTokens.total,
        cachedInputTokens: usage.inputTokens.cacheRead,
        cacheWriteTokens: usage.inputTokens.cacheWrite,
        reasoningTokens: usage.outputTokens.reasoning,
        costUsd: priceChatStep(usage, pricing),
        rateVersion,
        evidenceHash: usageDigest(usage),
      });
    };
    const middleware: LanguageModelMiddleware = {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate, params }) => {
        const dispatch = await begin(params);
        try {
          const result = await doGenerate();
          await report(dispatch.usageKey, result.usage);
          return result;
        } catch (error) {
          await finishOne(attemptId, "error");
          throw error;
        }
      },
      wrapStream: async ({ doStream, params }) => {
        const dispatch = await begin(params);
        const result = await doStream();
        return {
          ...result,
          stream: result.stream.pipeThrough(
            new TransformStream({
              transform: async (part, controller) => {
                if (part.type === "finish")
                  await report(dispatch.usageKey, part.usage);
                controller.enqueue(part);
              },
            }),
          ),
        };
      },
    };
    return wrapLanguageModel({ model, middleware });
  };

  const finish = async (status: "complete" | "stopped" | "error") => {
    await Promise.all(
      attempts.map((attemptId) => finishOne(attemptId, status)),
    );
  };
  return { wrap, finish };
}
