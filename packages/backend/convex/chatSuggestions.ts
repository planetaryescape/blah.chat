import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { MEMORY_PROCESSING_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import { calculateCost } from "@blah-chat/ai/utils";
import type {
  StarterSuggestion,
  StarterSuggestionIcon,
  StarterSuggestionsResponse,
} from "@blah-chat/shared";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { logger } from "./lib/logger";

const SUGGESTION_COUNT = 5;
const SUGGESTION_TTL_MS = 6 * 60 * 60 * 1000;
const REFRESH_DEBOUNCE_MS = 30 * 1000;

const ICON_VALUES = ["sparkles", "brain", "zap", "penLine"] as const;

const generatedSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string().min(10).max(160),
      icon: z.enum(ICON_VALUES),
    }),
  ),
});

type StaleReason = "missing" | "ttl" | "fingerprint" | "invalid" | "fresh";
type CacheDoc = Doc<"chatSuggestionsCache"> | null;

const suggestionValidator = v.object({
  id: v.string(),
  text: v.string(),
  icon: v.union(
    v.literal("sparkles"),
    v.literal("brain"),
    v.literal("zap"),
    v.literal("penLine"),
  ),
});

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<StarterSuggestionsResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    const [cache, memories] = await Promise.all([
      loadUserCache(ctx.db, user._id),
      loadMemoriesForSuggestions(ctx.db, user._id),
    ]);

    const fingerprint = buildMemoryFingerprint(memories);
    const stale = getStaleState(cache, fingerprint, now);
    const fallback = fallbackSuggestions();
    const cachedSuggestions = cache?.suggestions?.length
      ? sanitizeSuggestions(cache.suggestions, fallback)
      : null;

    const suggestions = cachedSuggestions ?? fallback;
    const source = cachedSuggestions ? "cache" : "fallback";

    logger.info("Starter suggestions read", {
      tag: "ChatSuggestions",
      userId: user._id,
      source,
      needsRefresh: stale.needsRefresh,
      staleReason: stale.reason,
      memoryCount: memories.length,
    });

    return {
      suggestions,
      needsRefresh: stale.needsRefresh,
      generatedAt: cache?.generatedAt ?? now,
      source,
    };
  },
});

export const refreshForCurrentUser = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<StarterSuggestionsResponse> => {
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new Error("Unauthorized");

    const now = Date.now();
    const [cache, memories] = (await Promise.all([
      (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.chatSuggestions.getCacheForUser,
        { userId: user._id },
      ),
      (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.chatSuggestions.getMemoriesForUser,
        { userId: user._id },
      ),
    ])) as [CacheDoc, Doc<"memories">[]];

    const fingerprint = buildMemoryFingerprint(memories);
    const stale = getStaleState(cache, fingerprint, now);
    const fallback = fallbackSuggestions();
    const cachedSuggestions = cache?.suggestions?.length
      ? sanitizeSuggestions(cache.suggestions, fallback)
      : null;

    if (!args.force && !stale.needsRefresh && cache && cachedSuggestions) {
      logger.info("Starter suggestions refresh skipped (fresh cache)", {
        tag: "ChatSuggestions",
        userId: user._id,
      });

      return {
        suggestions: cachedSuggestions,
        needsRefresh: false,
        generatedAt: cache.generatedAt,
        source: "cache",
      };
    }

    if (
      !args.force &&
      cache?.lastRefreshAttemptAt &&
      now - cache.lastRefreshAttemptAt < REFRESH_DEBOUNCE_MS
    ) {
      logger.info("Starter suggestions refresh skipped (debounced)", {
        tag: "ChatSuggestions",
        userId: user._id,
      });

      return {
        suggestions: cachedSuggestions ?? fallback,
        needsRefresh: true,
        generatedAt: cache.generatedAt,
        source: cachedSuggestions ? "cache" : "fallback",
      };
    }

    if (cache) {
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.chatSuggestions.setLastRefreshAttempt,
        {
          cacheId: cache._id,
          lastRefreshAttemptAt: now,
        },
      );
    }

    const memoryContext = buildMemoryContext(memories);

    if (memoryContext.length === 0) {
      const suggestions = sanitizeSuggestions([], fallback);

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.chatSuggestions.upsertCacheForUser,
        {
          userId: user._id,
          fingerprint,
          suggestions,
          generatedAt: now,
          expiresAt: now + SUGGESTION_TTL_MS,
        },
      );

      logger.info("Starter suggestions refreshed with fallback (no memories)", {
        tag: "ChatSuggestions",
        userId: user._id,
      });

      return {
        suggestions,
        needsRefresh: false,
        generatedAt: now,
        source: "fallback",
      };
    }

    try {
      const result = await generateObject({
        model: getModel(MEMORY_PROCESSING_MODEL.id),
        schema: generatedSuggestionsSchema,
        temperature: 0.4,
        providerOptions: getGatewayOptions(
          MEMORY_PROCESSING_MODEL.id,
          undefined,
          ["starter-suggestions"],
        ),
        prompt: [
          "Generate exactly 5 short, useful chat starter prompts for this user.",
          "Use memory context for relevance but avoid exposing sensitive specifics (names, account numbers, exact private facts).",
          "Cover varied intent types: planning, writing, debugging, analysis, follow-up.",
          "Output must be practical and user-ready. No numbering.",
          "",
          "Memory context:",
          memoryContext,
        ].join("\n"),
      });

      const suggestions = sanitizeSuggestions(
        result.object.suggestions.map((suggestion, index) => ({
          id: `generated-${index + 1}`,
          text: suggestion.text,
          icon: suggestion.icon,
        })),
        fallback,
      );

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.chatSuggestions.upsertCacheForUser,
        {
          userId: user._id,
          fingerprint,
          suggestions,
          generatedAt: now,
          expiresAt: now + SUGGESTION_TTL_MS,
        },
      );

      if (result.usage) {
        const inputTokens = result.usage.inputTokens ?? 0;
        const outputTokens = result.usage.outputTokens ?? 0;
        const reasoningTokens = result.usage.reasoningTokens;
        const cost = calculateCost(MEMORY_PROCESSING_MODEL.id, {
          inputTokens,
          outputTokens,
          reasoningTokens,
        });

        await ctx.scheduler.runAfter(
          0,
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.usage.mutations.recordTextGeneration,
          {
            userId: user._id,
            model: MEMORY_PROCESSING_MODEL.id,
            inputTokens,
            outputTokens,
            reasoningTokens,
            cost,
            feature: "memory",
          },
        );
      }

      logger.info("Starter suggestions generation success", {
        tag: "ChatSuggestions",
        userId: user._id,
        staleReason: stale.reason,
      });

      return {
        suggestions,
        needsRefresh: false,
        generatedAt: now,
        source: "cache",
      };
    } catch (error) {
      logger.error("Starter suggestions generation failed", {
        tag: "ChatSuggestions",
        userId: user._id,
        staleReason: stale.reason,
        error: String(error),
      });

      if (cachedSuggestions && cache) {
        return {
          suggestions: cachedSuggestions,
          needsRefresh: true,
          generatedAt: cache.generatedAt,
          source: "cache",
        };
      }

      const suggestions = sanitizeSuggestions([], fallback);
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.chatSuggestions.upsertCacheForUser,
        {
          userId: user._id,
          fingerprint,
          suggestions,
          generatedAt: now,
          expiresAt: now + SUGGESTION_TTL_MS,
        },
      );

      return {
        suggestions,
        needsRefresh: false,
        generatedAt: now,
        source: "fallback",
      };
    }
  },
});

export const getCacheForUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await loadUserCache(ctx.db, args.userId);
  },
});

export const getMemoriesForUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await loadMemoriesForSuggestions(ctx.db, args.userId);
  },
});

export const setLastRefreshAttempt = internalMutation({
  args: {
    cacheId: v.id("chatSuggestionsCache"),
    lastRefreshAttemptAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cacheId, {
      lastRefreshAttemptAt: args.lastRefreshAttemptAt,
      updatedAt: args.lastRefreshAttemptAt,
    });
  },
});

export const upsertCacheForUser = internalMutation({
  args: {
    userId: v.id("users"),
    fingerprint: v.string(),
    suggestions: v.array(suggestionValidator),
    generatedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await loadUserCache(ctx.db, args.userId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        fingerprint: args.fingerprint,
        suggestions: args.suggestions,
        generatedAt: args.generatedAt,
        expiresAt: args.expiresAt,
        lastRefreshAttemptAt: args.generatedAt,
        updatedAt: args.generatedAt,
      });
      return;
    }

    await ctx.db.insert("chatSuggestionsCache", {
      userId: args.userId,
      fingerprint: args.fingerprint,
      suggestions: args.suggestions,
      generatedAt: args.generatedAt,
      expiresAt: args.expiresAt,
      lastRefreshAttemptAt: args.generatedAt,
      updatedAt: args.generatedAt,
    });
  },
});

async function loadUserCache(db: any, userId: Id<"users">): Promise<CacheDoc> {
  return await db
    .query("chatSuggestionsCache")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

async function loadMemoriesForSuggestions(
  db: any,
  userId: Id<"users">,
): Promise<Doc<"memories">[]> {
  const now = Date.now();
  const [recent, important] = await Promise.all([
    db
      .query("memories")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(60),
    db
      .query("memories")
      .withIndex("by_importance", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(30),
  ]);

  const merged = new Map<string, Doc<"memories">>();

  for (const memory of [...important, ...recent] as Doc<"memories">[]) {
    if (memory.metadata?.expiresAt && memory.metadata.expiresAt < now) continue;
    if (memory.metadata?.supersededBy) continue;
    merged.set(memory._id, memory);
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      const importanceDelta =
        (b.metadata?.importance ?? 0) - (a.metadata?.importance ?? 0);
      if (importanceDelta !== 0) return importanceDelta;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 80);
}

function buildMemoryFingerprint(memories: Doc<"memories">[]): string {
  if (memories.length === 0) return "empty";

  const fingerprintInput = memories
    .map((memory) => {
      const category = memory.metadata?.category ?? "general";
      const importance = memory.metadata?.importance ?? 0;
      const contentSample = memory.content
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .slice(0, 80);
      return `${memory._id}:${memory.updatedAt}:${category}:${importance}:${contentSample}`;
    })
    .sort()
    .join("|");

  return hashString(fingerprintInput);
}

function buildMemoryContext(memories: Doc<"memories">[]): string {
  if (memories.length === 0) return "";

  const topImportant = [...memories]
    .sort(
      (a, b) => (b.metadata?.importance ?? 0) - (a.metadata?.importance ?? 0),
    )
    .slice(0, 8);

  const topRecent = [...memories]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((memory) => !topImportant.find((item) => item._id === memory._id))
    .slice(0, 8);

  const selected = [...topImportant, ...topRecent].slice(0, 12);

  return selected
    .map((memory) => {
      const category = memory.metadata?.category ?? "general";
      const importance = memory.metadata?.importance ?? 0;
      const content = memory.content.trim().replace(/\s+/g, " ").slice(0, 180);
      return `- [${category}, importance ${importance}] ${content}`;
    })
    .join("\n");
}

function sanitizeSuggestions(
  rawSuggestions:
    | Array<{ id?: string; text: string; icon: StarterSuggestionIcon }>
    | undefined,
  fallback: StarterSuggestion[],
): StarterSuggestion[] {
  const cleaned: StarterSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of rawSuggestions ?? []) {
    if (cleaned.length >= SUGGESTION_COUNT) break;

    const text = suggestion.text.trim().replace(/\s+/g, " ");
    if (text.length < 10 || text.length > 160) continue;

    const dedupeKey = text.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);

    cleaned.push({
      id: suggestion.id ?? buildSuggestionId(text, cleaned.length),
      text,
      icon: suggestion.icon,
    });
  }

  for (const fallbackSuggestion of fallback) {
    if (cleaned.length >= SUGGESTION_COUNT) break;
    const dedupeKey = fallbackSuggestion.text.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    cleaned.push(fallbackSuggestion);
  }

  return cleaned.slice(0, SUGGESTION_COUNT);
}

function fallbackSuggestions(): StarterSuggestion[] {
  return [
    {
      id: "starter-plan-next-week",
      text: "Plan my week around the priorities I should focus on first",
      icon: "sparkles",
    },
    {
      id: "starter-clarify-draft",
      text: "Rewrite this draft so it is clear, concise, and confident",
      icon: "penLine",
    },
    {
      id: "starter-debug-issue",
      text: "Help me debug this issue step by step and propose the safest fix",
      icon: "brain",
    },
    {
      id: "starter-compare-options",
      text: "Compare these options and recommend one with clear tradeoffs",
      icon: "zap",
    },
    {
      id: "starter-follow-up",
      text: "Draft a short follow-up message for this conversation",
      icon: "sparkles",
    },
  ];
}

function getStaleState(
  cache: CacheDoc,
  currentFingerprint: string,
  now: number,
): { needsRefresh: boolean; reason: StaleReason } {
  if (!cache) return { needsRefresh: true, reason: "missing" };
  if (!cache.suggestions.length) {
    return { needsRefresh: true, reason: "invalid" };
  }
  if (cache.fingerprint !== currentFingerprint) {
    return { needsRefresh: true, reason: "fingerprint" };
  }
  if (cache.expiresAt < now) {
    return { needsRefresh: true, reason: "ttl" };
  }
  return { needsRefresh: false, reason: "fresh" };
}

function buildSuggestionId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `starter-${index + 1}-${slug || "prompt"}`;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fp-${(hash >>> 0).toString(16)}`;
}
