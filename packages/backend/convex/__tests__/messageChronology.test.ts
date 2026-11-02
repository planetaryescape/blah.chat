import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

async function fixture(active?: boolean) {
  vi.useFakeTimers();
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner", name: "Chronology Owner" }),
    );
    const collaborator = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "collaborator" }),
    );
    await ctx.db.insert("users", createTestUserData({ clerkId: "outsider" }));
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(owner, { isCollaborative: true }),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: collaborator,
      role: "collaborator",
      joinedAt: Date.now(),
    });
    // Imports can insert the historically later row first.
    const later = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        content: "Later historical response",
        createdAt: 2000,
        isActiveBranch: active,
      }),
    );
    return { owner, conversationId, later };
  });
  vi.setSystemTime(Date.now() + 10);
  const earlier = await t.run((ctx) =>
    ctx.db.insert(
      "messages",
      createTestMessageData(ids.conversationId, ids.owner, {
        role: "assistant",
        content: "Earlier historical response",
        createdAt: 1000,
        isActiveBranch: active,
      }),
    ),
  );
  const stored = await t.run(async (ctx) => ({
    later: await ctx.db.get(ids.later),
    earlier: await ctx.db.get(earlier),
  }));
  expect(stored.later?._creationTime).toBeLessThan(
    stored.earlier!._creationTime,
  );
  return { t, ...ids, earlier };
}

afterEach(() => vi.useRealTimers());

describe("preserved message chronology after out-of-order insertion", () => {
  it.each([
    "owner",
    "collaborator",
  ])("orders both public lists by createdAt for %s and preserves sender metadata", async (subject) => {
    const { t, conversationId, earlier, later } = await fixture(true);
    const client = t.withIdentity(createMockIdentity({ subject }));
    expect(
      (await client.query(api.messages.list, { conversationId })).map(
        (message) => message._id,
      ),
    ).toEqual([earlier, later]);
    const withUsers = await client.query(api.messages.listWithUsers, {
      conversationId,
    });
    expect(withUsers.map((message) => message._id)).toEqual([earlier, later]);
    expect(withUsers.map((message) => message.senderUser?.name)).toEqual([
      "Chronology Owner",
      "Chronology Owner",
    ]);
  });

  it.each([
    "listPaginated",
    "listActivePathPaginated",
  ] as const)("keeps chronological cursor pages of 1+1 in %s", async (queryName) => {
    const { t, owner, conversationId, earlier, later } = await fixture(true);
    if (queryName === "listActivePathPaginated") {
      await t.run((ctx) =>
        ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, owner, {
            content: "Inactive branch",
            createdAt: 1500,
            isActiveBranch: false,
          }),
        ),
      );
    }
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
    const read = api.messages[queryName];
    const first = await client.query(read, {
      conversationId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    const second = await client.query(read, {
      conversationId,
      paginationOpts: { numItems: 1, cursor: first.continueCursor },
    });
    expect(first.page.map((message) => message._id)).toEqual([earlier]);
    expect(second.page.map((message) => message._id)).toEqual([later]);
  });

  it("retains chronological active-path fallback when no tree flags exist", async () => {
    const { t, conversationId, earlier, later } = await fixture();
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
    const first = await client.query(api.messages.listActivePathPaginated, {
      conversationId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    const second = await client.query(api.messages.listActivePathPaginated, {
      conversationId,
      paginationOpts: { numItems: 1, cursor: first.continueCursor },
    });
    expect(
      [...first.page, ...second.page].map((message) => message._id),
    ).toEqual([earlier, later]);
  });

  it("selects the newest preserved timestamps before applying the internal recent limit", async () => {
    const { t, conversationId, earlier, later } = await fixture(true);
    expect(
      (
        await t.query(internal.messages.listInternal, {
          conversationId,
          limit: 1,
        })
      ).map((message) => message._id),
    ).toEqual([later]);
    expect(
      (
        await t.query(internal.messages.listInternal, {
          conversationId,
          limit: 2,
        })
      ).map((message) => message._id),
    ).toEqual([earlier, later]);
  });

  it.each([
    "owner",
    "collaborator",
  ])("finds the last assistant by preserved chronology for %s, not the newest insertion or user message", async (subject) => {
    const { t, owner, conversationId, later } = await fixture(true);
    await t.run((ctx) =>
      ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          role: "user",
          content: "Newest user message",
          createdAt: 3000,
        }),
      ),
    );
    expect(
      (
        await t
          .withIdentity(createMockIdentity({ subject }))
          .query(api.messages.getLastAssistantMessage, { conversationId })
      )?._id,
    ).toBe(later);
  });

  it("retains anonymous and non-member denials for all public chronological reads", async () => {
    const { t, conversationId } = await fixture(true);
    for (const client of [
      t,
      t.withIdentity(createMockIdentity({ subject: "outsider" })),
    ]) {
      expect(await client.query(api.messages.list, { conversationId })).toEqual(
        [],
      );
      expect(
        await client.query(api.messages.listWithUsers, { conversationId }),
      ).toEqual([]);
      expect(
        await client.query(api.messages.getLastAssistantMessage, {
          conversationId,
        }),
      ).toBeNull();
      for (const read of [
        api.messages.listPaginated,
        api.messages.listActivePathPaginated,
      ])
        expect(
          (
            await client.query(read, {
              conversationId,
              paginationOpts: { numItems: 1, cursor: null },
            })
          ).page,
        ).toEqual([]);
    }
  });
});
