import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
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
      () => owner.mutation(api.chat.retryMessage, { messageId: userMessageId }),
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
