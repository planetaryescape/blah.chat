import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { createMockIdentity, createTestUserData } from "../lib/test/factories";
import schema from "../schema";

const generateObjectMock = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateObject: generateObjectMock,
  };
});

function seedSuggestions(prefix: string) {
  return [
    {
      id: `${prefix}-1`,
      text: "Plan next steps for this week",
      icon: "sparkles" as const,
    },
    {
      id: `${prefix}-2`,
      text: "Rewrite this into a crisp update",
      icon: "penLine" as const,
    },
    {
      id: `${prefix}-3`,
      text: "Debug this issue with a safe fix",
      icon: "brain" as const,
    },
    {
      id: `${prefix}-4`,
      text: "Compare these options and choose one",
      icon: "zap" as const,
    },
    {
      id: `${prefix}-5`,
      text: "Draft a short follow-up message",
      icon: "sparkles" as const,
    },
    {
      id: `${prefix}-6`,
      text: "Brainstorm fresh ideas for this project",
      icon: "brain" as const,
    },
  ];
}

describe("chatSuggestions", () => {
  afterEach(() => {
    generateObjectMock.mockReset();
    vi.restoreAllMocks();
  });

  it("getForCurrentUser returns fallback + needsRefresh=true when cache missing", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    const result = await asUser.query(
      api.chatSuggestions.getForCurrentUser,
      {},
    );

    expect(result.needsRefresh).toBe(true);
    expect(result.source).toBe("fallback");
    expect(result.suggestions).toHaveLength(6);
  });

  it("refreshForCurrentUser stores exactly 6 sanitized suggestions", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );

      await ctx.db.insert("memories", {
        userId: userId as Id<"users">,
        content: "User is building a SaaS launch plan and weekly checklist",
        embedding: [0.1, 0.2],
        metadata: {
          category: "project",
          importance: 9,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    generateObjectMock.mockResolvedValueOnce({
      object: {
        suggestions: [
          { text: "  Plan my launch week with milestones  ", icon: "sparkles" },
          { text: "Plan my launch week with milestones", icon: "sparkles" },
          { text: "short", icon: "brain" },
          {
            text: "Rewrite this investor update to be clearer and shorter",
            icon: "penLine",
          },
          {
            text: "Debug this TypeScript error and show the safest fix",
            icon: "brain",
          },
          {
            text: "Compare these pricing options and recommend one",
            icon: "zap",
          },
          {
            text: "Brainstorm creative angles for the product launch",
            icon: "sparkles",
          },
          {
            text: "Draft a concise follow-up email for the team meeting",
            icon: "penLine",
          },
        ],
      },
    } as any);

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
    const result = await asUser.action(
      api.chatSuggestions.refreshForCurrentUser,
      {
        force: true,
      },
    );

    expect(result.suggestions).toHaveLength(6);

    const cache = await t.run(async (ctx) =>
      ctx.db
        .query("chatSuggestionsCache")
        .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
        .first(),
    );

    expect(cache).not.toBeNull();
    expect(cache?.suggestions).toHaveLength(6);
    expect(new Set(cache?.suggestions.map((s) => s.text)).size).toBe(6);
  });

  it("getForCurrentUser returns needsRefresh=true when TTL expired", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );

      await ctx.db.insert("chatSuggestionsCache", {
        userId,
        fingerprint: "empty",
        suggestions: seedSuggestions("expired"),
        generatedAt: Date.now() - 10_000,
        expiresAt: Date.now() - 1_000,
        updatedAt: Date.now() - 10_000,
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    const result = await asUser.query(
      api.chatSuggestions.getForCurrentUser,
      {},
    );

    expect(result.source).toBe("cache");
    expect(result.needsRefresh).toBe(true);
  });

  it("fingerprint mismatch marks cache stale", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );

      await ctx.db.insert("chatSuggestionsCache", {
        userId,
        fingerprint: "empty",
        suggestions: seedSuggestions("fingerprint"),
        generatedAt: Date.now(),
        expiresAt: Date.now() + 60_000,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("memories", {
        userId,
        content: "User prefers concise technical summaries",
        embedding: [0.5],
        metadata: {
          category: "preference",
          importance: 7,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    const result = await asUser.query(
      api.chatSuggestions.getForCurrentUser,
      {},
    );

    expect(result.source).toBe("cache");
    expect(result.needsRefresh).toBe(true);
  });

  it("generation failure returns cached suggestions safely", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();
    const cached = seedSuggestions("safe-cache");

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );

      await ctx.db.insert("memories", {
        userId,
        content: "User works on API integrations and project planning",
        embedding: [0.7, 0.2],
        metadata: {
          category: "project",
          importance: 8,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("chatSuggestionsCache", {
        userId,
        fingerprint: "old-fingerprint",
        suggestions: cached,
        generatedAt: Date.now() - 1000,
        expiresAt: Date.now() - 100,
        updatedAt: Date.now() - 1000,
      });
    });

    generateObjectMock.mockRejectedValueOnce(
      new Error("synthetic generation failure"),
    );

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
    const result = await asUser.action(
      api.chatSuggestions.refreshForCurrentUser,
      {
        force: true,
      },
    );

    expect(result.source).toBe("cache");
    expect(result.suggestions).toEqual(cached);
  });
});
