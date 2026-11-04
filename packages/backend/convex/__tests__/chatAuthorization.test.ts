import { MODEL_CONFIG } from "@blah-chat/ai/models";
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

async function fixture(model = "openai:gpt-oss-20b") {
  vi.useFakeTimers();
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    );
    const collaborator = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "collaborator" }),
    );
    await ctx.db.insert("users", createTestUserData({ clerkId: "outsider" }));
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(owner, { model, isCollaborative: true }),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: collaborator,
      role: "collaborator",
      joinedAt: Date.now(),
    });
    const userMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        createdAt: 1,
        isActiveBranch: true,
      }),
    );
    const assistantId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model,
        status: "error",
        createdAt: 2,
        parentMessageId: userMessageId,
        isActiveBranch: true,
      }),
    );
    const siblingId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        model,
        createdAt: 3,
        parentMessageId: userMessageId,
      }),
    );
    return {
      owner,
      collaborator,
      conversationId,
      userMessageId,
      assistantId,
      siblingId,
    };
  });
  return { t, ...ids };
}
afterEach(() => vi.useRealTimers());

describe("alternate chat mutation authorization", () => {
  it("retries the selected failed answer as a sibling and preserves later branch content", async () => {
    const { t, conversationId, userMessageId, assistantId, siblingId, owner } =
      await fixture();
    const { descendantId, extraParentId } = await t.run(async (ctx) => {
      const sibling = await ctx.db.get(siblingId);
      if (!sibling) throw new Error("Missing later sibling");
      const extraParentId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          content: "Additional retained parent",
          createdAt: 0,
          isActiveBranch: false,
        }),
      );
      await ctx.db.patch(assistantId, {
        parentMessageIds: [userMessageId, extraParentId],
        parentMessageId: userMessageId,
        siblingIndex: 0,
      });
      await ctx.db.patch(siblingId, { siblingIndex: 2 });
      const descendantId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          role: "user",
          content: "follow-up on B",
          createdAt: 4,
          parentMessageId: siblingId,
          parentMessageIds: [siblingId],
          isActiveBranch: true,
        }),
      );
      await ctx.db.patch(conversationId, { activeLeafMessageId: assistantId });
      return { descendantId, extraParentId };
    });
    await t.run(async (ctx) => {
      const audioId = await ctx.storage.store(new Blob(["audio artifact"]));
      await ctx.db.insert("attachments", {
        messageId: assistantId,
        conversationId,
        userId: owner,
        type: "audio",
        name: "answer-audio.wav",
        storageId: audioId,
        mimeType: "audio/wav",
        size: 14,
        metadata: { duration: 2.5 },
        createdAt: 11,
      });
      await ctx.db.insert("toolCalls", {
        messageId: assistantId,
        conversationId,
        userId: owner,
        toolCallId: "tool-on-failed-a",
        toolName: "calculator",
        args: { expression: "6 * 7" },
        result: { value: 42 },
        isPartial: false,
        timestamp: 12,
        createdAt: 12,
      });
      await ctx.db.insert("sources", {
        messageId: assistantId,
        conversationId,
        userId: owner,
        position: 1,
        provider: "tool",
        title: "Retained source A",
        urlHash: "retry-source-hash",
        url: "https://example.test/a",
        isPartial: false,
        createdAt: 13,
      });
      await ctx.db.insert("sourceMetadata", {
        urlHash: "retry-source-hash",
        url: "https://example.test/a",
        title: "Retained source metadata A",
        enriched: true,
        firstSeenAt: 13,
        lastAccessedAt: 13,
        accessCount: 1,
      });
      await ctx.db.insert("usageRecords", {
        userId: owner,
        date: "2026-11-04",
        model: "openai:gpt-oss-20b",
        conversationId,
        feature: "chat",
        operationType: "text",
        inputTokens: 17,
        outputTokens: 23,
        cost: 0.001,
        messageCount: 1,
      });
    });
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    const relatedBefore = await t.run(async (ctx) => ({
      attachments: await ctx.db
        .query("attachments")
        .withIndex("by_message", (q) => q.eq("messageId", assistantId))
        .collect(),
      toolCalls: await ctx.db
        .query("toolCalls")
        .withIndex("by_message", (q) => q.eq("messageId", assistantId))
        .collect(),
      sources: await ctx.db
        .query("sources")
        .withIndex("by_message", (q) => q.eq("messageId", assistantId))
        .collect(),
      sourceMetadata: await ctx.db.query("sourceMetadata").collect(),
      usage: await ctx.db.query("usageRecords").collect(),
    }));
    const beforeConversation = await t.run((ctx) => ctx.db.get(conversationId));
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));

    expect(
      await client.mutation(api.chat.retryMessage, {
        messageId: userMessageId,
      }),
    ).toBe(userMessageId);

    const after = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(after).toHaveLength(before.length + 1);
    for (const original of before) {
      const retained = after.find((message) => message._id === original._id);
      if (!retained) throw new Error(`Retry removed message ${original._id}`);
      expect({
        ...retained,
        isActiveBranch: original.isActiveBranch,
        updatedAt: original.updatedAt,
      }).toEqual(original);
    }
    const retry = after.find((message) => message.status === "pending");
    if (!retry) throw new Error("Retry did not create its pending target");
    expect(retry).toMatchObject({
      role: "assistant",
      parentMessageIds: [userMessageId, extraParentId],
      siblingIndex: 3,
      forkReason: "regenerate",
      isActiveBranch: true,
      model: "openai:gpt-oss-20b",
    });
    expect(after.map(({ _id }) => _id)).toContain(descendantId);
    const selectedBranch = await client.query(
      api.messages.listActivePathPaginated,
      {
        conversationId,
        paginationOpts: { numItems: 20, cursor: null },
      },
    );
    expect(selectedBranch.page.map(({ _id }) => _id)).toEqual([
      extraParentId,
      userMessageId,
      retry._id,
    ]);
    expect(
      await t.run(async (ctx) => ({
        attachments: await ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", assistantId))
          .collect(),
        toolCalls: await ctx.db
          .query("toolCalls")
          .withIndex("by_message", (q) => q.eq("messageId", assistantId))
          .collect(),
        sources: await ctx.db
          .query("sources")
          .withIndex("by_message", (q) => q.eq("messageId", assistantId))
          .collect(),
        sourceMetadata: await ctx.db.query("sourceMetadata").collect(),
        usage: await ctx.db.query("usageRecords").collect(),
      })),
    ).toEqual(relatedBefore);
    expect(await t.run((ctx) => ctx.db.get(conversationId))).toMatchObject({
      messageCount: (beforeConversation?.messageCount ?? 0) + 1,
    });
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(2);
  });

  it.each([
    undefined,
    [],
  ])("accepts an explicitly selected adjacent legacy error with parents=%s", async (parentMessageIds) => {
    const { t, userMessageId, assistantId } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.patch(assistantId, {
        parentMessageId: undefined,
        parentMessageIds,
      });
    });
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));
    expect(
      await client.mutation(api.chat.retryMessage, {
        messageId: userMessageId,
        failedMessageId: assistantId,
      }),
    ).toBe(userMessageId);
  });

  it("preserves a visible linear legacy prefix after retrying the retry", async () => {
    const { t, owner, conversationId, userMessageId, assistantId, siblingId } =
      await fixture();
    const { oldUserId, oldAssistantId } = await t.run(async (ctx) => {
      const oldUserId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          content: "Earlier legacy question",
          createdAt: -1,
          isActiveBranch: true,
        }),
      );
      const oldAssistantId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          role: "assistant",
          content: "Earlier legacy answer",
          createdAt: 0,
          isActiveBranch: true,
        }),
      );
      await ctx.db.patch(userMessageId, {
        parentMessageId: undefined,
        parentMessageIds: undefined,
      });
      await ctx.db.patch(assistantId, {
        parentMessageId: undefined,
        parentMessageIds: undefined,
      });
      return { oldUserId, oldAssistantId };
    });
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));

    await client.mutation(api.chat.retryMessage, {
      messageId: userMessageId,
      failedMessageId: assistantId,
    });

    const retry = await t.run((ctx) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first(),
    );
    if (!retry) throw new Error("Retry did not create its pending target");
    const activePath = await client.query(
      api.messages.listActivePathPaginated,
      {
        conversationId,
        paginationOpts: { numItems: 20, cursor: null },
      },
    );

    expect(activePath.page.map(({ _id }) => _id)).toEqual([
      oldUserId,
      oldAssistantId,
      userMessageId,
      retry._id,
    ]);
    expect(activePath.page.map(({ _id }) => _id)).not.toContain(assistantId);
    expect(activePath.page.map(({ _id }) => _id)).not.toContain(siblingId);
    const generationContext = await t.query(
      internal.messages.getContextMessages,
      {
        conversationId,
        messageId: retry._id,
      },
    );
    expect(generationContext.map(({ _id }) => _id)).toEqual([userMessageId]);
    expect(generationContext.map(({ _id }) => _id)).not.toContain(oldUserId);
    expect(generationContext.map(({ _id }) => _id)).not.toContain(
      oldAssistantId,
    );

    const ownedLock = await t.run((ctx) =>
      ctx.db
        .query("generationLocks")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .first(),
    );
    if (!ownedLock) throw new Error("Retry did not retain its generation lock");
    expect(ownedLock.messageId).toBe(retry._id);
    expect(
      await t.mutation(internal.messages.updateStatus, {
        messageId: retry._id,
        status: "generating",
      }),
    ).toBe(true);
    await t.mutation(internal.messages.markError, {
      messageId: retry._id,
      error: "Synthetic terminal failure",
    });
    await t.mutation(internal.lib.generationLock.releaseLock, {
      conversationId,
      lockId: ownedLock._id,
    });

    await client.mutation(api.chat.retryMessage, {
      messageId: userMessageId,
      failedMessageId: retry._id,
    });

    const repeatedRetry = await t.run((ctx) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first(),
    );
    if (!repeatedRetry)
      throw new Error("Explicit retry did not create its pending target");
    expect(repeatedRetry.parentMessageIds).toEqual([userMessageId]);
    const repeatedActivePath = await client.query(
      api.messages.listActivePathPaginated,
      {
        conversationId,
        paginationOpts: { numItems: 20, cursor: null },
      },
    );
    expect(repeatedActivePath.page.map(({ _id }) => _id)).toEqual([
      oldUserId,
      oldAssistantId,
      userMessageId,
      repeatedRetry._id,
    ]);
    expect((await t.run((ctx) => ctx.db.get(assistantId)))?.status).toBe(
      "error",
    );
    expect((await t.run((ctx) => ctx.db.get(retry._id)))?.status).toBe("error");
    expect(await t.run((ctx) => ctx.db.get(siblingId))).not.toBeNull();
  });

  it("does not infer a legacy prefix from ambiguous parentless chronology", async () => {
    const { t, owner, conversationId, userMessageId, assistantId } =
      await fixture();
    const { earlierUserId, extraAssistantId } = await t.run(async (ctx) => {
      const earlierUserId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          content: "Earlier question",
          createdAt: -2,
          isActiveBranch: true,
        }),
      );
      await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          role: "assistant",
          content: "One possible earlier answer",
          createdAt: -1,
          isActiveBranch: true,
        }),
      );
      const extraAssistantId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          role: "assistant",
          content: "Another possible earlier answer",
          createdAt: 0,
          isActiveBranch: true,
        }),
      );
      await ctx.db.patch(userMessageId, {
        parentMessageId: undefined,
        parentMessageIds: undefined,
      });
      await ctx.db.patch(assistantId, {
        parentMessageId: undefined,
        parentMessageIds: undefined,
      });
      return { earlierUserId, extraAssistantId };
    });
    const client = t.withIdentity(createMockIdentity({ subject: "owner" }));

    await client.mutation(api.chat.retryMessage, {
      messageId: userMessageId,
      failedMessageId: assistantId,
    });

    const activePath = await client.query(
      api.messages.listActivePathPaginated,
      {
        conversationId,
        paginationOpts: { numItems: 20, cursor: null },
      },
    );
    const retry = await t.run((ctx) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first(),
    );
    if (!retry) throw new Error("Retry did not create its pending target");
    const activeIds = activePath.page.map(({ _id }) => _id);
    expect(activeIds).toEqual([userMessageId, retry._id]);
    expect(activeIds).not.toContain(earlierUserId);
    expect(activeIds).not.toContain(extraAssistantId);
  });

  it("rejects contradictory legacy and DAG parents without writes", async () => {
    const { t, conversationId, userMessageId, assistantId, owner } =
      await fixture();
    const otherParentId = await t.run((ctx) =>
      ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, { createdAt: 4 }),
      ),
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(assistantId, {
        parentMessageIds: [otherParentId],
        parentMessageId: userMessageId,
      });
    });
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(api.chat.retryMessage, {
          messageId: userMessageId,
          failedMessageId: assistantId,
        }),
    ).rejects.toThrow(/not a child/);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
      before,
    );
  });

  it("does not guess between an adjacent legacy error and a failed DAG child for an old caller", async () => {
    const { t, userMessageId, assistantId, siblingId } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.patch(assistantId, { parentMessageId: undefined });
      await ctx.db.patch(siblingId, {
        status: "error",
        parentMessageIds: [userMessageId],
      });
    });
    const snapshot = () =>
      t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        conversations: await ctx.db.query("conversations").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      }));
    const before = await snapshot();
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(api.chat.retryMessage, { messageId: userMessageId }),
    ).rejects.toThrow(/ambiguous/);
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    "complete",
    "wrong-role",
    "foreign-conversation",
  ] as const)("rejects an explicitly selected %s target without writes", async (kind) => {
    const { t, conversationId, userMessageId, siblingId, owner } =
      await fixture();
    const targetId = await t.run(async (ctx) => {
      if (kind === "complete") return siblingId;
      if (kind === "wrong-role")
        return ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, owner, {
            role: "user",
            status: "error",
            content: "not an assistant",
            createdAt: 4,
          }),
        );
      const otherConversation = await ctx.db.insert(
        "conversations",
        createTestConversationData(owner),
      );
      return ctx.db.insert(
        "messages",
        createTestMessageData(otherConversation, owner, {
          role: "assistant",
          status: "error",
          model: "openai:gpt-oss-20b",
          createdAt: 5,
          parentMessageId: userMessageId,
        }),
      );
    });
    const before = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      conversations: await ctx.db.query("conversations").collect(),
      locks: await ctx.db.query("generationLocks").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(api.chat.retryMessage, {
          messageId: userMessageId,
          failedMessageId: targetId,
        }),
    ).rejects.toThrow();
    expect(
      await t.run(async (ctx) => ({
        messages: await ctx.db.query("messages").collect(),
        conversations: await ctx.db.query("conversations").collect(),
        locks: await ctx.db.query("generationLocks").collect(),
        scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
      })),
    ).toEqual(before);
  });

  it("admits only one racing retry and stops a queued retry without removing prior answers", async () => {
    const { t, conversationId, userMessageId, assistantId, siblingId } =
      await fixture();
    const owner = t.withIdentity(createMockIdentity({ subject: "owner" }));
    const results = await Promise.allSettled([
      owner.mutation(api.chat.retryMessage, {
        messageId: userMessageId,
        failedMessageId: assistantId,
      }),
      owner.mutation(api.chat.retryMessage, {
        messageId: userMessageId,
        failedMessageId: assistantId,
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const pending = await t.run((ctx) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first(),
    );
    if (!pending) throw new Error("Racing retries did not create a target");
    await owner.mutation(api.chat.stopGeneration, { conversationId });
    expect((await t.run((ctx) => ctx.db.get(pending._id)))?.status).toBe(
      "stopped",
    );
    expect((await t.run((ctx) => ctx.db.get(assistantId)))?.status).toBe(
      "error",
    );
    expect(await t.run((ctx) => ctx.db.get(siblingId))).not.toBeNull();
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(2);
    expect(
      await t.run((ctx) => ctx.db.query("generationLocks").collect()),
    ).toHaveLength(0);
  });

  it("rejects retry while an active generation lock owns the conversation", async () => {
    const { t, owner, conversationId, userMessageId, assistantId } =
      await fixture();
    await t.run((ctx) =>
      ctx.db.insert("generationLocks", {
        conversationId,
        userId: owner,
        pendingCount: 1,
        lockedAt: Date.now(),
      }),
    );
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(api.chat.retryMessage, {
          messageId: userMessageId,
          failedMessageId: assistantId,
        }),
    ).rejects.toThrow(/current response/);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
      before,
    );
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.query("generationLocks").collect()),
    ).toHaveLength(1);
  });

  it("fails closed for an explicitly selected answer from another parent", async () => {
    const { t, conversationId, userMessageId, assistantId } = await fixture();
    const foreignParentId = await t.run(async (ctx) => {
      const userMessage = await ctx.db.get(userMessageId);
      if (!userMessage) throw new Error("Missing fixture user message");
      return ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, userMessage.userId, {
          content: "different turn",
          createdAt: 5,
        }),
      );
    });
    const foreignChildId = await t.run(async (ctx) =>
      ctx.db.insert(
        "messages",
        createTestMessageData(
          conversationId,
          (await ctx.db.get(userMessageId))!.userId,
          {
            role: "assistant",
            status: "error",
            createdAt: 6,
            parentMessageId: foreignParentId,
          },
        ),
      ),
    );
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(api.chat.retryMessage, {
          messageId: userMessageId,
          failedMessageId: foreignChildId,
        }),
    ).rejects.toThrow(/not a child/);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
      before,
    );
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.get(assistantId))).not.toBeNull();
  });

  it("rejects mixed-conversation branch IDs and does not cascade deletion across conversations", async () => {
    const { t, conversationId, userMessageId, assistantId } = await fixture();
    const foreignId = await t.run(async (ctx) => {
      const outsider = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "outsider"))
        .unique();
      if (!outsider) throw new Error("Missing outsider fixture");
      const otherConversation = await ctx.db.insert(
        "conversations",
        createTestConversationData(outsider._id),
      );
      return ctx.db.insert(
        "messages",
        createTestMessageData(otherConversation, outsider._id, {
          parentMessageId: userMessageId,
        }),
      );
    });
    const owner = t.withIdentity(createMockIdentity({ subject: "owner" }));
    await expect(
      owner.mutation(api.chat.switchBranch, {
        conversationId,
        targetMessageId: foreignId,
      }),
    ).rejects.toThrow(/not in conversation/);
    await expect(
      owner.mutation(api.chat.mergeBranches, {
        conversationId,
        parentMessageIds: [assistantId, foreignId],
        content: "mixed",
      }),
    ).rejects.toThrow(/not in conversation/);
    expect(
      await owner.mutation(api.chat.branchFromMessage, {
        messageId: userMessageId,
      }),
    ).toMatchObject({ existingSiblings: 2 });
    await owner.mutation(api.chat.deleteMessage, { messageId: userMessageId });
    expect(await t.run((ctx) => ctx.db.get(foreignId))).not.toBeNull();
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });

  it("denies foreign regeneration/retry/edit/branch/switch/merge/delete/stop without changing state or scheduling", async () => {
    const { t, conversationId, userMessageId, assistantId, siblingId } =
      await fixture();
    const outsider = t.withIdentity(
      createMockIdentity({ subject: "outsider" }),
    );
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    const denied = [
      () => outsider.mutation(api.chat.regenerate, { messageId: assistantId }),
      () =>
        outsider.mutation(api.chat.retryMessage, { messageId: userMessageId }),
      () =>
        outsider.mutation(api.chat.editMessage, {
          messageId: userMessageId,
          content: "injected",
        }),
      () =>
        outsider.mutation(api.chat.branchFromMessage, {
          messageId: userMessageId,
        }),
      () =>
        outsider.mutation(api.chat.branchToNewConversation, {
          messageId: userMessageId,
        }),
      () =>
        outsider.mutation(api.chat.switchBranch, {
          conversationId,
          targetMessageId: assistantId,
        }),
      () =>
        outsider.mutation(api.chat.mergeBranches, {
          conversationId,
          parentMessageIds: [assistantId, siblingId],
          content: "injected",
        }),
      () =>
        outsider.mutation(api.chat.deleteMessage, { messageId: userMessageId }),
      () => outsider.mutation(api.chat.stopGeneration, { conversationId }),
    ];
    for (const operation of denied)
      await expect(operation()).rejects.toThrow(/Unauthorized/);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
      before,
    );
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });

  it.each([
    "owner",
    "collaborator",
  ])("allows %s regeneration and charges the initiating user", async (subject) => {
    const { t, assistantId, owner, collaborator } = await fixture();
    const id = await t
      .withIdentity(createMockIdentity({ subject }))
      .mutation(api.chat.regenerate, { messageId: assistantId });
    const message = await t.run((ctx) => ctx.db.get(id));
    expect(message).toMatchObject({
      status: "pending",
      userId: subject === "owner" ? owner : collaborator,
    });
  });

  it.each([
    "owner",
    "collaborator",
  ])("preserves %s retry/edit/branch/merge generation journeys", async (subject) => {
    for (const operation of ["retry", "edit", "branch", "merge"]) {
      const { t, conversationId, userMessageId, assistantId, siblingId } =
        await fixture();
      const client = t.withIdentity(createMockIdentity({ subject }));
      if (operation === "retry")
        expect(
          await client.mutation(api.chat.retryMessage, {
            messageId: userMessageId,
            failedMessageId: assistantId,
          }),
        ).toBe(userMessageId);
      if (operation === "edit")
        expect(
          await client.mutation(api.chat.editMessage, {
            messageId: userMessageId,
            content: "revised",
          }),
        ).toBeTruthy();
      if (operation === "branch")
        expect(
          await client.mutation(api.chat.branchFromMessage, {
            messageId: userMessageId,
          }),
        ).toMatchObject({ conversationId });
      if (operation === "merge")
        expect(
          await client.mutation(api.chat.mergeBranches, {
            conversationId,
            parentMessageIds: [assistantId, siblingId],
            content: "combine",
          }),
        ).toBeTruthy();
    }
  });

  it.each([
    "tier1",
    "tier2",
  ] as const)("enforces %s quotas before regeneration writes", async (tier) => {
    const proModel = Object.entries(MODEL_CONFIG).find(
      ([, model]) => model.pricing.input >= 5,
    )?.[0];
    const { t, owner, assistantId } = await fixture(proModel);
    await t.run(async (ctx) => {
      const today = new Date().toISOString().split("T")[0];
      await ctx.db.patch(owner, {
        tier,
        dailyProModelCount: 1,
        lastProModelDate: today,
        monthlyProModelCount: 1,
        lastProModelMonth: today.substring(0, 7),
      });
      await ctx.db.insert("adminSettings", {
        proModelsEnabled: true,
        tier1DailyProModelLimit: 1,
        tier2MonthlyProModelLimit: 1,
        autoMemoryExtractEnabled: false,
        autoMemoryExtractInterval: 5,
        enableHybridSearch: false,
        defaultMonthlyBudget: 10,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 20,
        alertEmail: "test@example.com",
        updatedBy: owner,
        updatedAt: Date.now(),
      });
    });
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(api.chat.regenerate, { messageId: assistantId }),
    ).rejects.toThrow(/pro model limit reached/);
    expect(
      await t.run((ctx) => ctx.db.query("messages").collect()),
    ).toHaveLength(3);
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });

  it("applies the same pro-model gate before regeneration, retry, edit or merge can write", async () => {
    const proModel = Object.entries(MODEL_CONFIG).find(
      ([, model]) => model.pricing.input >= 5,
    )?.[0];
    expect(proModel).toBeTruthy();
    const { t, conversationId, userMessageId, assistantId, siblingId } =
      await fixture(proModel);
    const owner = t.withIdentity(createMockIdentity({ subject: "owner" }));
    const before = await t.run((ctx) => ctx.db.query("messages").collect());
    for (const operation of [
      () => owner.mutation(api.chat.regenerate, { messageId: assistantId }),
      () =>
        owner.mutation(api.chat.retryMessage, {
          messageId: userMessageId,
          failedMessageId: assistantId,
        }),
      () =>
        owner.mutation(api.chat.editMessage, {
          messageId: userMessageId,
          content: "edit",
        }),
      () =>
        owner.mutation(api.chat.mergeBranches, {
          conversationId,
          parentMessageIds: [assistantId, siblingId],
          content: "merge",
        }),
    ])
      await expect(operation()).rejects.toThrow(
        /Pro models are currently disabled/,
      );
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toEqual(
      before,
    );
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });
});
