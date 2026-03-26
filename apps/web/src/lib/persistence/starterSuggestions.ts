import { starterSuggestionCaches } from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

export type ApiStarterSuggestion = {
  id: string;
  text: string;
  icon: "sparkles" | "brain" | "zap" | "penLine";
};

export type ApiStarterSuggestionsResponse = {
  suggestions: ApiStarterSuggestion[];
  needsRefresh: boolean;
  generatedAt: number;
  source: "cache" | "fallback";
};

const FALLBACK_SUGGESTIONS: ApiStarterSuggestion[] = [
  {
    id: "roadmap",
    text: "Draft a roadmap for the next 30 days.",
    icon: "sparkles",
  },
  {
    id: "debug",
    text: "Help me debug a failing feature step by step.",
    icon: "brain",
  },
  {
    id: "plan",
    text: "Break this task into an execution plan.",
    icon: "zap",
  },
  {
    id: "write",
    text: "Turn rough notes into a concise draft.",
    icon: "penLine",
  },
];

async function getOrCreateCache(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const existing = await db.query.starterSuggestionCaches.findFirst({
    where: and(eq(starterSuggestionCaches.userId, user.id)),
  });

  if (existing) {
    return { db, user, cache: existing };
  }

  const now = Date.now();
  const [created] = await db
    .insert(starterSuggestionCaches)
    .values({
      userId: user.id,
      suggestions: FALLBACK_SUGGESTIONS,
      needsRefresh: false,
      generatedAt: now,
      source: "fallback",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { db, user, cache: created! };
}

export async function getStarterSuggestions(clerkUserId: string) {
  const { cache } = await getOrCreateCache(clerkUserId);
  return {
    suggestions:
      cache.suggestions && cache.suggestions.length > 0
        ? cache.suggestions
        : FALLBACK_SUGGESTIONS,
    needsRefresh: cache.needsRefresh,
    generatedAt: cache.generatedAt,
    source: cache.source as "cache" | "fallback",
  } satisfies ApiStarterSuggestionsResponse;
}

export async function refreshStarterSuggestions(
  clerkUserId: string,
  input: { force?: boolean } = {},
) {
  const { db, cache } = await getOrCreateCache(clerkUserId);
  const now = Date.now();
  const nextSuggestions =
    input.force || cache.suggestions.length === 0
      ? FALLBACK_SUGGESTIONS
      : cache.suggestions;

  const [updated] = await db
    .update(starterSuggestionCaches)
    .set({
      suggestions: nextSuggestions,
      needsRefresh: false,
      generatedAt: now,
      source: cache.source === "cache" ? "cache" : "fallback",
      updatedAt: now,
    })
    .where(eq(starterSuggestionCaches.id, cache.id))
    .returning();

  return {
    suggestions: updated?.suggestions ?? nextSuggestions,
    needsRefresh: false,
    generatedAt: updated?.generatedAt ?? now,
    source: (updated?.source ?? "fallback") as "cache" | "fallback",
  } satisfies ApiStarterSuggestionsResponse;
}
