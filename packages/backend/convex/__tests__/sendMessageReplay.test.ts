import { DEFAULT_MODEL_ID } from "@blah-chat/ai/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("accepted send replay baseline", () => {
  async function fixture() {
    const t = convexTest(schema);
    const { ownerId, conversationId } = await t.run(async (ctx) => {
      const owner = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "replay-owner" }),
      );
      const conversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(owner, { model: DEFAULT_MODEL_ID }),
      );
      return { ownerId: owner, conversationId };
    });
    const owner = t.withIdentity(
      createMockIdentity({ subject: "replay-owner" }),
    );
    return {
      t,
      owner,
      conversationId,
      ownerId,
      request: {
        conversationId,
        content: "Recover this accepted send",
        modelId: DEFAULT_MODEL_ID,
        clientMessageId: "stable-replay-key",
        thinkingEffort: "medium" as const,
        attachments: [],
      },
    };
  }

  it("returns the accepted IDs for the same existing clientMessageId without new work", async () => {
    const { t, owner, request } = await fixture();
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    const beforeReplay = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      locks: await ctx.db.query("generationLocks").collect(),
      scheduled: (
        await ctx.db.system.query("_scheduled_functions").collect()
      ).map(({ _id, name, args }) => ({ _id, name, args })),
      conversations: await ctx.db.query("conversations").collect(),
      users: await ctx.db.query("users").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, request),
    ).resolves.toEqual(accepted);
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: (
          await ctx.db.system.query("_scheduled_functions").collect()
        ).map(({ _id, name, args }) => ({ _id, name, args })),
        conversations: await ctx.db.query("conversations").collect(),
        users: await ctx.db.query("users").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
      })),
    ).toEqual(beforeReplay);
  });

  it("recovers the same conversation for an accepted create-intent replay", async () => {
    const { t, owner, request } = await fixture();
    const createRequest = { ...request, conversationId: undefined };
    const accepted = await owner.mutation(api.chat.sendMessage, createRequest);
    const before = await t.run(async (ctx) => ({
      conversations: await ctx.db.query("conversations").collect(),
      messages: await ctx.db.query("messages").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, createRequest),
    ).resolves.toEqual(accepted);
    expect(
      await t.run(async (ctx) => ({
        conversations: await ctx.db.query("conversations").collect(),
        messages: await ctx.db.query("messages").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      })),
    ).toEqual(before);
  });

  it("conflicts on changed intent without changing rows or scheduling more work", async () => {
    const { t, owner, request } = await fixture();
    await owner.mutation(api.chat.sendMessage, request);
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      locks: await ctx.db.query("generationLocks").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
    }));

    await expect(
      owner.mutation(api.chat.sendMessage, {
        ...request,
        thinkingEffort: "high",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error) || !("data" in error)) return false;
      const data = error.data;
      return (
        typeof data === "string" &&
        JSON.parse(data).code === "CHAT_SEND_INTENT_CONFLICT"
      );
    });
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
        receipts: await ctx.db.query("chatSendReceipts").collect(),
      })),
    ).toEqual(before);
  });

  it("serializes simultaneous identical admissions into one accepted receipt", async () => {
    const { t, owner, request } = await fixture();
    const results = await Promise.all([
      owner.mutation(api.chat.sendMessage, request),
      owner.mutation(api.chat.sendMessage, request),
    ]);
    expect(results[0]).toEqual(results[1]);
    const persisted = await t.run(async (ctx) => ({
      userMessages: await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", request.conversationId!),
        )
        .filter((q) => q.eq(q.field("role"), "user"))
        .collect(),
      assistants: await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", request.conversationId!),
        )
        .filter((q) => q.eq(q.field("role"), "assistant"))
        .collect(),
      receipts: await ctx.db.query("chatSendReceipts").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(persisted.userMessages).toHaveLength(1);
    expect(persisted.userMessages[0]).toMatchObject({
      clientMessageId: request.clientMessageId,
    });
    expect(persisted.assistants).toHaveLength(1);
    expect(persisted.assistants[0]).toMatchObject({ status: "pending" });
    expect(persisted.receipts).toHaveLength(1);
    expect(persisted.receipts[0].clientMessageId).toBe(request.clientMessageId);
    expect(
      persisted.scheduled.filter(
        ({ name }) => name === "generation:generateResponse",
      ),
    ).toHaveLength(1);
  });

  it("keeps receipt keys owner-scoped and does not persist receipts for incognito", async () => {
    const t = convexTest(schema);
    const { firstConversation, secondConversation } = await t.run(
      async (ctx) => {
        const firstOwner = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "key-scope-first" }),
        );
        const secondOwner = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "key-scope-second" }),
        );
        return {
          firstConversation: await ctx.db.insert(
            "conversations",
            createTestConversationData(firstOwner, { model: DEFAULT_MODEL_ID }),
          ),
          secondConversation: await ctx.db.insert(
            "conversations",
            createTestConversationData(secondOwner, {
              model: DEFAULT_MODEL_ID,
            }),
          ),
        };
      },
    );
    const firstOwner = t.withIdentity(
      createMockIdentity({ subject: "key-scope-first" }),
    );
    const secondOwner = t.withIdentity(
      createMockIdentity({ subject: "key-scope-second" }),
    );
    const request = {
      content: "Owner-scoped key",
      modelId: DEFAULT_MODEL_ID,
      clientMessageId: "same-text-different-owner",
      attachments: [],
    };
    await firstOwner.mutation(api.chat.sendMessage, {
      ...request,
      conversationId: firstConversation,
    });
    await secondOwner.mutation(api.chat.sendMessage, {
      ...request,
      conversationId: secondConversation,
    });

    const incognitoId = await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "key-scope-first"))
        .first();
      if (!user) throw new Error("Missing fixture user");
      return ctx.db.insert(
        "conversations",
        createTestConversationData(user._id, {
          model: DEFAULT_MODEL_ID,
          isIncognito: true,
        }),
      );
    });
    await firstOwner.mutation(api.chat.sendMessage, {
      ...request,
      conversationId: incognitoId,
      clientMessageId: "private-key-not-receipted",
    });
    const receipts = await t.run((ctx) =>
      ctx.db.query("chatSendReceipts").collect(),
    );
    expect(receipts).toHaveLength(2);
    expect(receipts.map((receipt) => receipt.ownerId)).toHaveLength(2);
    expect(
      receipts.some(
        (receipt) => receipt.clientMessageId === "private-key-not-receipted",
      ),
    ).toBe(false);
  });

  it("rechecks collaborator access before returning an accepted receipt", async () => {
    const t = convexTest(schema);
    const { conversationId, participantId } = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "acl-replay-owner" }),
      );
      const participantId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "acl-replay-participant" }),
      );
      const conversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(ownerId, {
          model: DEFAULT_MODEL_ID,
          isCollaborative: true,
        }),
      );
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        userId: participantId,
        role: "collaborator",
        joinedAt: Date.now(),
      });
      return { conversationId, participantId };
    });
    const participant = t.withIdentity(
      createMockIdentity({ subject: "acl-replay-participant" }),
    );
    const request = {
      conversationId,
      content: "Authorized before revocation",
      modelId: DEFAULT_MODEL_ID,
      clientMessageId: "revoked-access-key",
      attachments: [],
    };
    await participant.mutation(api.chat.sendMessage, request);
    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .collect();
      for (const row of rows) {
        if (row.userId === participantId) await ctx.db.delete(row._id);
      }
    });

    await expect(
      participant.mutation(api.chat.sendMessage, request),
    ).rejects.toThrow(/not found or unauthorized/i);
  });

  it("fails closed after a no-ID target is deleted and retains the tombstone receipt", async () => {
    const { t, owner, request } = await fixture();
    const createRequest = { ...request, conversationId: undefined };
    const accepted = await owner.mutation(api.chat.sendMessage, createRequest);
    await owner.mutation(api.conversations.deleteConversation, {
      conversationId: accepted.conversationId,
    });
    const countAfterDelete = await t.run((ctx) =>
      ctx.db.query("conversations").collect(),
    );

    await expect(
      owner.mutation(api.chat.sendMessage, createRequest),
    ).rejects.toThrow(/not found/i);
    expect(
      await t.run((ctx) => ctx.db.query("conversations").collect()),
    ).toEqual(countAfterDelete);
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(1);
  });

  it("fails closed if an accepted message reference disappears while the conversation remains", async () => {
    const { t, owner, request } = await fixture();
    const accepted = await owner.mutation(api.chat.sendMessage, request);
    await t.run((ctx) => ctx.db.delete(accepted.userMessageId));

    await expect(owner.mutation(api.chat.sendMessage, request)).rejects.toThrow(
      /accepted send is no longer available/i,
    );
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.get(accepted.conversationId)),
    ).not.toBeNull();
  });

  it("removes operational receipts during owner data erasure", async () => {
    const { t, owner, ownerId, request } = await fixture();
    await owner.mutation(api.chat.sendMessage, request);
    await t.run(async (ctx) => {
      const { cascadeDeleteUserData } = await import("../lib/utils/cascade");
      await cascadeDeleteUserData(ctx, ownerId);
    });
    expect(
      await t.run((ctx) => ctx.db.query("chatSendReceipts").collect()),
    ).toHaveLength(0);
  });
});
