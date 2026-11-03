/**
 * Search and source read authorization
 *
 * Exercises the real Convex module references (nested and root aliases) through
 * convex-test dispatch against the production schema. Provider embedding is the
 * only mocked external boundary so rejection can be proven to spend nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const embedMock = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, embed: embedMock };
});

const SEARCH_TERM = "quasarnotes7731";
const BOUND_TERM = "boundterm5540";
const OWNER_SOURCE_TITLE = "owner-only-source-title-4412";
const OWNER_SOURCE_SNIPPET = "owner-only-source-snippet-4412";
const OWNER_SOURCE_URL = "https://private.example/owner-research-4412";
const OWNER_ONLY_DESCRIPTION = "owner-only-description-7719";
const COLLAB_SOURCE_TITLE = "collaborator-visible-source-8891";
const CORRUPT_SOURCE_TITLE = "corrupt-foreign-parent-source-5527";
const DELETED_PARENT_SOURCE_TITLE = "deleted-parent-source-3319";
const REMOVED_MESSAGE_SOURCE_TITLE = "removed-message-source-6631";

type Fixture = Awaited<ReturnType<typeof seedFixture>>;

function expectNoPrivateSearchData<T>(value: T) {
  const payload = JSON.stringify(value);
  expect(payload).not.toContain(SEARCH_TERM);
  expect(payload).not.toContain(OWNER_SOURCE_TITLE);
  expect(payload).not.toContain(OWNER_SOURCE_SNIPPET);
  expect(payload).not.toContain(OWNER_SOURCE_URL);
  expect(payload).not.toContain(OWNER_ONLY_DESCRIPTION);
  expect(payload).not.toContain(COLLAB_SOURCE_TITLE);
}

function sourceRow(args: {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  userId: Id<"users">;
  title: string;
  urlHash: string;
  url: string;
  snippet?: string;
  position?: number;
}) {
  return {
    messageId: args.messageId,
    conversationId: args.conversationId,
    userId: args.userId,
    provider: "tavily",
    position: args.position ?? 1,
    title: args.title,
    snippet: args.snippet,
    urlHash: args.urlHash,
    url: args.url,
    isPartial: false,
    createdAt: Date.now(),
  };
}

async function seedFixture() {
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();

    const ownerId = await ctx.db.insert(
      "users",
      createTestUserData({
        clerkId: "search-owner",
        email: "owner@example.com",
      }),
    );
    const outsiderId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "search-outsider" }),
    );
    const collaboratorId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "search-collaborator" }),
    );
    const revokedId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "search-revoked" }),
    );

    // Owner's private conversation with a searchable message and sources.
    const ownerConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId, { title: "Owner private" }),
    );
    const ownerMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(ownerConversationId, ownerId, {
        content: `${SEARCH_TERM} owner private research notes`,
      }),
    );
    await ctx.db.insert("sourceMetadata", {
      urlHash: "owner-hash",
      url: OWNER_SOURCE_URL,
      title: OWNER_SOURCE_TITLE,
      description: OWNER_ONLY_DESCRIPTION,
      ogImage: "https://private.example/owner-og-4412.png",
      siteName: "Private Research",
      enriched: true,
      firstSeenAt: now,
      lastAccessedAt: now,
      accessCount: 1,
    });
    await ctx.db.insert(
      "sources",
      sourceRow({
        messageId: ownerMessageId,
        conversationId: ownerConversationId,
        userId: ownerId,
        title: OWNER_SOURCE_TITLE,
        snippet: OWNER_SOURCE_SNIPPET,
        urlHash: "owner-hash",
        url: OWNER_SOURCE_URL,
      }),
    );

    // Member without sources keeps the authorized empty contract observable.
    const emptyConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId, { title: "Owner empty" }),
    );
    const emptyMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(emptyConversationId, ownerId, {
        content: "no citations in this answer",
      }),
    );

    // A second user's private conversation that also matches the search term.
    const outsiderConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(outsiderId, { title: "Outsider private" }),
    );
    const outsiderMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(outsiderConversationId, outsiderId, {
        content: `${SEARCH_TERM} outsider private research notes`,
      }),
    );

    // Collaborative conversation: owner plus one active participant.
    const collaborativeConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId, {
        title: "Shared research",
        isCollaborative: true,
      }),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId: collaborativeConversationId,
      userId: collaboratorId,
      role: "collaborator",
      joinedAt: now,
      invitedBy: ownerId,
    });
    const revokedParticipantId = await ctx.db.insert(
      "conversationParticipants",
      {
        conversationId: collaborativeConversationId,
        userId: revokedId,
        role: "collaborator",
        joinedAt: now,
        invitedBy: ownerId,
      },
    );
    // Simulate a revoked participant: the grant row is gone.
    await ctx.db.delete(revokedParticipantId);

    const collaborativeMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(collaborativeConversationId, ownerId, {
        content: "shared citations for the team",
      }),
    );
    await ctx.db.insert(
      "sources",
      sourceRow({
        messageId: collaborativeMessageId,
        conversationId: collaborativeConversationId,
        userId: ownerId,
        title: COLLAB_SOURCE_TITLE,
        urlHash: "collab-hash",
        url: "https://public.example/shared-8891",
      }),
    );

    // Deleted parent conversation: message and sources survive the parent.
    const deletedConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId, { title: "Deleted parent" }),
    );
    const deletedMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(deletedConversationId, ownerId, {
        content: "message whose parent conversation is deleted",
      }),
    );
    await ctx.db.insert(
      "sources",
      sourceRow({
        messageId: deletedMessageId,
        conversationId: deletedConversationId,
        userId: ownerId,
        title: DELETED_PARENT_SOURCE_TITLE,
        urlHash: "deleted-parent-hash",
        url: "https://private.example/deleted-parent-3319",
      }),
    );
    await ctx.db.delete(deletedConversationId);

    // Corrupt child reference: an accessible conversation ID points at a
    // message that belongs to another user's conversation.
    await ctx.db.insert(
      "sources",
      sourceRow({
        messageId: outsiderMessageId,
        conversationId: ownerConversationId,
        userId: ownerId,
        title: CORRUPT_SOURCE_TITLE,
        urlHash: "corrupt-hash",
        url: "https://private.example/corrupt-5527",
        position: 2,
      }),
    );

    // Removed message: the source row is orphaned without its parent message.
    const removedMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(ownerConversationId, ownerId, {
        content: "message about to be removed",
      }),
    );
    await ctx.db.insert(
      "sources",
      sourceRow({
        messageId: removedMessageId,
        conversationId: ownerConversationId,
        userId: ownerId,
        title: REMOVED_MESSAGE_SOURCE_TITLE,
        urlHash: "removed-message-hash",
        url: "https://private.example/removed-6631",
        position: 3,
      }),
    );
    await ctx.db.delete(removedMessageId);

    // Public share for the owner's conversation. The public projection exposes
    // the owner ID, which is the ID-discovery path the search boundary must not
    // treat as an access grant.
    await ctx.db.insert("shares", {
      conversationId: ownerConversationId,
      userId: ownerId,
      shareId: "owner-public-share",
      title: "Owner private",
      anonymizeUsernames: false,
      isPublic: true,
      isActive: true,
      viewCount: 0,
      createdAt: now,
    });

    // Bounded-limit corpus with a distinct term.
    const boundsConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(ownerId, { title: "Bounds corpus" }),
    );
    for (let index = 0; index < 105; index++) {
      await ctx.db.insert(
        "messages",
        createTestMessageData(boundsConversationId, ownerId, {
          content: `${BOUND_TERM} corpus entry ${index}`,
        }),
      );
    }

    return {
      ownerId,
      outsiderId,
      collaboratorId,
      revokedId,
      ownerConversationId,
      ownerMessageId,
      emptyConversationId,
      emptyMessageId,
      outsiderConversationId,
      outsiderMessageId,
      collaborativeConversationId,
      collaborativeMessageId,
      deletedConversationId,
      deletedMessageId,
      removedMessageId,
    };
  });

  return { t, ...ids };
}

function identities(t: Fixture["t"]) {
  return {
    owner: t.withIdentity(createMockIdentity({ subject: "search-owner" })),
    outsider: t.withIdentity(
      createMockIdentity({ subject: "search-outsider" }),
    ),
    collaborator: t.withIdentity(
      createMockIdentity({ subject: "search-collaborator" }),
    ),
    revoked: t.withIdentity(createMockIdentity({ subject: "search-revoked" })),
  };
}

async function enableHybridSearch(t: Fixture["t"], ownerId: Id<"users">) {
  await t.run(async (ctx) => {
    await ctx.db.insert("adminSettings", {
      autoMemoryExtractEnabled: true,
      autoMemoryExtractInterval: 5,
      enableHybridSearch: true,
      defaultMonthlyBudget: 10,
      defaultBudgetAlertThreshold: 0.8,
      budgetHardLimitEnabled: false,
      defaultDailyMessageLimit: 50,
      alertEmail: "blah.chat@bhekani.com",
      transcriptProvider: "groq",
      transcriptCostPerMinute: 0.0067,
      updatedBy: ownerId,
      updatedAt: Date.now(),
    });
  });
}

beforeEach(() => {
  embedMock.mockResolvedValue({ embedding: new Array(1536).fill(0) });
});

afterEach(() => {
  embedMock.mockReset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("full-text search authorization", () => {
  it("serves the owner through nested and root aliases while denying anonymous and foreign callers", async () => {
    const fixture = await seedFixture();
    const { t, ownerId, outsiderId } = fixture;
    const { owner, outsider } = identities(t);

    // Public share discloses the owner ID; it is not an access grant.
    const share = await t.query(api.shares.get, {
      shareId: "owner-public-share",
    });
    if (!share || !("userId" in share)) {
      throw new Error("The public share did not expose its owner ID");
    }
    const discoveredOwnerId = share.userId;
    expect(discoveredOwnerId).toBe(ownerId);

    const aliases = [
      api.search.hybrid.fullTextSearch,
      api.search.fullTextSearch,
    ];

    for (const ref of aliases) {
      const ownResults = await owner.query(ref, {
        query: SEARCH_TERM,
        userId: ownerId,
        limit: 20,
      });
      expect(ownResults.length).toBeGreaterThan(0);
      expect(ownResults.every((message) => message.userId === ownerId)).toBe(
        true,
      );
      expect(JSON.stringify(ownResults)).toContain(SEARCH_TERM);

      // Anonymous caller supplying the disclosed owner ID.
      expect(
        await t.query(ref, {
          query: SEARCH_TERM,
          userId: discoveredOwnerId,
          limit: 20,
        }),
      ).toEqual([]);

      // Foreign authenticated caller replaying the owner ID.
      expectNoPrivateSearchData(
        await outsider.query(ref, {
          query: SEARCH_TERM,
          userId: discoveredOwnerId,
          limit: 20,
        }),
      );

      // Owner cannot use the same argument to read someone else's rows.
      expect(
        await owner.query(ref, {
          query: SEARCH_TERM,
          userId: outsiderId,
          limit: 20,
        }),
      ).toEqual([]);
    }
  });

  it("bounds query length and limit before reading messages", async () => {
    const fixture = await seedFixture();
    const { t, ownerId } = fixture;
    const { owner } = identities(t);

    expect(
      await owner.query(api.search.hybrid.fullTextSearch, {
        query: "   ",
        userId: ownerId,
        limit: 20,
      }),
    ).toEqual([]);

    const withinBound = `${BOUND_TERM} ${"x".repeat(400)}`;
    expect(withinBound.length).toBeLessThanOrEqual(500);
    expect(
      (
        await owner.query(api.search.hybrid.fullTextSearch, {
          query: withinBound,
          userId: ownerId,
          limit: 20,
        })
      ).length,
    ).toBeGreaterThan(0);

    const oversized = `${BOUND_TERM} ${"x".repeat(600)}`;
    expect(oversized.length).toBeGreaterThan(500);
    expect(
      await owner.query(api.search.hybrid.fullTextSearch, {
        query: oversized,
        userId: ownerId,
        limit: 20,
      }),
    ).toEqual([]);

    const read = (limit: number) =>
      owner.query(api.search.hybrid.fullTextSearch, {
        query: BOUND_TERM,
        userId: ownerId,
        limit,
      });

    expect(await read(100_000)).toHaveLength(100);
    expect(await read(0)).toHaveLength(1);
    expect(await read(2.9)).toHaveLength(2);
  });

  it("denies non-readable conversation filters", async () => {
    const fixture = await seedFixture();
    const { t, ownerId, ownerConversationId } = fixture;
    const { outsider } = identities(t);

    expect(
      await outsider.query(api.search.hybrid.fullTextSearch, {
        query: SEARCH_TERM,
        userId: (await t.run((ctx) => ctx.db.get(ownerId)))!._id,
        conversationId: ownerConversationId,
        limit: 20,
      }),
    ).toEqual([]);
  });
});

describe("hybrid search paid work", () => {
  it("keeps identity-derived scoping and spends no embedding on denial", async () => {
    const fixture = await seedFixture();
    vi.useFakeTimers();
    const { t, ownerId, ownerConversationId } = fixture;
    const { owner, outsider } = identities(t);
    await enableHybridSearch(t, ownerId);

    // Anonymous caller: no rows and no embedding spend.
    expect(
      await t.action(api.search.hybridSearch, { query: SEARCH_TERM }),
    ).toEqual([]);
    expect(
      await t.action(api.search.hybrid.hybridSearch, { query: SEARCH_TERM }),
    ).toEqual([]);
    expect(embedMock).not.toHaveBeenCalled();

    // Foreign caller requesting the owner's conversation: denied before spend.
    expect(
      await outsider.action(api.search.hybrid.hybridSearch, {
        query: SEARCH_TERM,
        conversationId: ownerConversationId,
      }),
    ).toEqual([]);
    expect(embedMock).not.toHaveBeenCalled();

    // Bounded inputs are rejected before spend as well.
    expect(
      await owner.action(api.search.hybridSearch, { query: "   " }),
    ).toEqual([]);
    expect(embedMock).not.toHaveBeenCalled();

    // Legitimate owner search still works through both aliases.
    const viaNested = await owner.action(api.search.hybrid.hybridSearch, {
      query: SEARCH_TERM,
      limit: 5,
    });
    expect(viaNested.length).toBeGreaterThan(0);
    expect(viaNested.every((message) => message.userId === ownerId)).toBe(true);
    expect(embedMock).toHaveBeenCalledTimes(1);

    const viaRoot = await owner.action(api.search.hybridSearch, {
      query: SEARCH_TERM,
      limit: 5,
    });
    expect(viaRoot.length).toBeGreaterThan(0);
    expect(viaRoot.every((message) => message.userId === ownerId)).toBe(true);
    expect(embedMock).toHaveBeenCalledTimes(2);

    // Drain the cost-accounting mutations scheduled by the two successful
    // embeddings so convex-test does not leave background writes in flight.
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });
});

describe("source query authorization", () => {
  it("returns sources to the owner and to an active collaborator", async () => {
    const fixture = await seedFixture();
    const { t, ownerMessageId, ownerConversationId } = fixture;
    const { owner, collaborator } = identities(t);

    const ownerSources = await owner.query(api.sources.operations.getSources, {
      messageId: ownerMessageId,
    });
    expect(ownerSources).toHaveLength(1);
    expect(ownerSources[0]).toMatchObject({
      position: 1,
      title: OWNER_SOURCE_TITLE,
      snippet: OWNER_SOURCE_SNIPPET,
      url: OWNER_SOURCE_URL,
      metadata: {
        title: OWNER_SOURCE_TITLE,
        description: OWNER_ONLY_DESCRIPTION,
        enriched: true,
      },
    });

    const byConversation = await owner.query(
      api.sources.operations.getByConversation,
      { conversationId: ownerConversationId },
    );
    expect(byConversation.map((source) => source.title)).toContain(
      OWNER_SOURCE_TITLE,
    );
    expect(byConversation.map((source) => source.title)).not.toContain(
      CORRUPT_SOURCE_TITLE,
    );

    const fallback = await owner.query(
      api.sources.operations.getSourcesWithFallback,
      { messageId: ownerMessageId },
    );
    expect(fallback.source).toBe("normalized");
    expect(fallback.sources).toHaveLength(1);
    expect(fallback.sources[0].title).toBe(OWNER_SOURCE_TITLE);

    const collaboratorSources = await collaborator.query(
      api.sources.operations.getSources,
      { messageId: fixture.collaborativeMessageId },
    );
    expect(collaboratorSources.map((source) => source.title)).toEqual([
      COLLAB_SOURCE_TITLE,
    ]);

    const collaboratorByConversation = await collaborator.query(
      api.sources.operations.getByConversation,
      { conversationId: fixture.collaborativeConversationId },
    );
    expect(collaboratorByConversation.map((source) => source.title)).toEqual([
      COLLAB_SOURCE_TITLE,
    ]);

    const collaboratorFallback = await collaborator.query(
      api.sources.operations.getSourcesWithFallback,
      { messageId: fixture.collaborativeMessageId },
    );
    expect(collaboratorFallback.source).toBe("normalized");
    expect(collaboratorFallback.sources.map((source) => source.title)).toEqual([
      COLLAB_SOURCE_TITLE,
    ]);
  });

  it("returns no source content to anonymous, foreign or revoked callers", async () => {
    const fixture = await seedFixture();
    const {
      t,
      ownerMessageId,
      ownerConversationId,
      collaborativeMessageId,
      collaborativeConversationId,
    } = fixture;
    const { outsider, revoked } = identities(t);

    for (const attempt of [
      () =>
        t.query(api.sources.operations.getSources, {
          messageId: ownerMessageId,
        }),
      () =>
        t.query(api.sources.operations.getByConversation, {
          conversationId: ownerConversationId,
        }),
      () =>
        t.query(api.sources.operations.getSourcesWithFallback, {
          messageId: ownerMessageId,
        }),
      () =>
        outsider.query(api.sources.operations.getSources, {
          messageId: ownerMessageId,
        }),
      () =>
        outsider.query(api.sources.operations.getByConversation, {
          conversationId: ownerConversationId,
        }),
      () =>
        outsider.query(api.sources.operations.getSourcesWithFallback, {
          messageId: ownerMessageId,
        }),
    ]) {
      expectNoPrivateSearchData(await attempt());
    }

    expect(
      await t.query(api.sources.operations.getSources, {
        messageId: ownerMessageId,
      }),
    ).toEqual([]);
    expect(
      await t.query(api.sources.operations.getByConversation, {
        conversationId: ownerConversationId,
      }),
    ).toEqual([]);
    expect(
      await t.query(api.sources.operations.getSourcesWithFallback, {
        messageId: ownerMessageId,
      }),
    ).toEqual({ sources: [], source: "none" });

    expect(
      await outsider.query(api.sources.operations.getByConversation, {
        conversationId: ownerConversationId,
      }),
    ).toEqual([]);
    expect(
      await outsider.query(api.sources.operations.getSources, {
        messageId: ownerMessageId,
      }),
    ).toEqual([]);
    expect(
      await outsider.query(api.sources.operations.getSourcesWithFallback, {
        messageId: ownerMessageId,
      }),
    ).toEqual({ sources: [], source: "none" });

    // Revoked collaborator: no access to the collaborative conversation.
    expect(
      await revoked.query(api.sources.operations.getSources, {
        messageId: collaborativeMessageId,
      }),
    ).toEqual([]);
    expect(
      await revoked.query(api.sources.operations.getByConversation, {
        conversationId: collaborativeConversationId,
      }),
    ).toEqual([]);
    expect(
      await revoked.query(api.sources.operations.getSourcesWithFallback, {
        messageId: collaborativeMessageId,
      }),
    ).toEqual({ sources: [], source: "none" });
  });

  it("fails closed for deleted parents, removed messages and corrupt child references", async () => {
    const fixture = await seedFixture();
    const {
      t,
      ownerConversationId,
      deletedConversationId,
      deletedMessageId,
      removedMessageId,
    } = fixture;
    const { owner } = identities(t);

    expect(
      await owner.query(api.sources.operations.getSources, {
        messageId: deletedMessageId,
      }),
    ).toEqual([]);
    expect(
      await owner.query(api.sources.operations.getSourcesWithFallback, {
        messageId: deletedMessageId,
      }),
    ).toEqual({ sources: [], source: "none" });
    expect(
      await owner.query(api.sources.operations.getByConversation, {
        conversationId: deletedConversationId,
      }),
    ).toEqual([]);

    // Parent message removed but the source row survives.
    expect(
      await owner.query(api.sources.operations.getSources, {
        messageId: removedMessageId,
      }),
    ).toEqual([]);
    const byConversation = await owner.query(
      api.sources.operations.getByConversation,
      { conversationId: ownerConversationId },
    );
    expect(byConversation.map((source) => source.title)).not.toContain(
      REMOVED_MESSAGE_SOURCE_TITLE,
    );
    expect(byConversation.map((source) => source.title)).not.toContain(
      CORRUPT_SOURCE_TITLE,
    );
    expect(JSON.stringify(byConversation)).not.toContain(
      DELETED_PARENT_SOURCE_TITLE,
    );
  });

  it("preserves the empty and fallback contracts for authorized callers", async () => {
    const fixture = await seedFixture();
    const { t, emptyMessageId, emptyConversationId } = fixture;
    const { owner } = identities(t);

    expect(
      await owner.query(api.sources.operations.getSources, {
        messageId: emptyMessageId,
      }),
    ).toEqual([]);
    expect(
      await owner.query(api.sources.operations.getSourcesWithFallback, {
        messageId: emptyMessageId,
      }),
    ).toEqual({ sources: [], source: "none" });
    expect(
      await owner.query(api.sources.operations.getByConversation, {
        conversationId: emptyConversationId,
      }),
    ).toEqual([]);
  });
});
