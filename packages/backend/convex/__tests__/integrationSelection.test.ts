import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

async function fixture() {
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "integration-owner" }),
    );
    const other = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "integration-other" }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(userId),
    );
    const anotherConversation = await ctx.db.insert(
      "conversations",
      createTestConversationData(userId),
    );
    const connectionId = await ctx.db.insert("composioConnections", {
      userId,
      composioConnectionId: "synthetic-owned",
      integrationId: "github",
      integrationName: "GitHub",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const foreignConnection = await ctx.db.insert("composioConnections", {
      userId: other,
      composioConnectionId: "synthetic-foreign",
      integrationId: "gmail",
      integrationName: "Gmail",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return {
      userId,
      other,
      conversationId,
      anotherConversation,
      connectionId,
      foreignConnection,
    };
  });
  return {
    t,
    owner: t.withIdentity(createMockIdentity({ subject: "integration-owner" })),
    ...ids,
  };
}

describe("per-chat integration allowlist", () => {
  it("deletes selections with their conversation without deleting the connection", async () => {
    const { t, owner, conversationId, connectionId } = await fixture();
    await owner.mutation(api.composio.selection.toggle, {
      conversationId,
      connectionId,
    });
    await owner.mutation(api.conversations.deleteConversation, {
      conversationId,
    });
    expect(
      await t.run((ctx) => ctx.db.query("conversationIntegrations").collect()),
    ).toEqual([]);
    expect(await t.run((ctx) => ctx.db.get(connectionId))).not.toBeNull();
  });
  it("defaults off and includes only active owned selections for this chat", async () => {
    const {
      t,
      owner,
      userId,
      conversationId,
      anotherConversation,
      connectionId,
    } = await fixture();
    const read = () =>
      t.query(internal.composio.selection.getSelectedConnectionsInternal, {
        userId,
        conversationId,
      });
    expect(await read()).toEqual([]);
    await owner.mutation(api.composio.selection.toggle, {
      conversationId,
      connectionId,
    });
    expect((await read()).map((connection) => connection._id)).toEqual([
      connectionId,
    ]);
    expect(
      await t.query(
        internal.composio.selection.getSelectedConnectionsInternal,
        { userId, conversationId: anotherConversation },
      ),
    ).toEqual([]);
    await t.run((ctx) => ctx.db.patch(connectionId, { status: "expired" }));
    expect(await read()).toEqual([]);
  });

  it("does not allow anonymous, foreign-user, foreign-connection or incognito selection", async () => {
    const { t, owner, conversationId, connectionId, foreignConnection } =
      await fixture();
    await expect(
      t.mutation(api.composio.selection.toggle, {
        conversationId,
        connectionId,
      }),
    ).rejects.toThrow(/unauthorized/);
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "integration-other" }))
        .mutation(api.composio.selection.toggle, {
          conversationId,
          connectionId,
        }),
    ).rejects.toThrow(/unauthorized/);
    await expect(
      owner.mutation(api.composio.selection.toggle, {
        conversationId,
        connectionId: foreignConnection,
      }),
    ).rejects.toThrow(/unauthorized/);
    await t.run((ctx) => ctx.db.patch(conversationId, { isIncognito: true }));
    await expect(
      owner.mutation(api.composio.selection.toggle, {
        conversationId,
        connectionId,
      }),
    ).rejects.toThrow(/incognito/);
    expect(
      await t.run((ctx) => ctx.db.query("conversationIntegrations").collect()),
    ).toEqual([]);
  });

  it("allows disabling a selection and freezes changes during generation", async () => {
    const { t, owner, userId, conversationId, connectionId } = await fixture();
    await owner.mutation(api.composio.selection.toggle, {
      conversationId,
      connectionId,
    });
    await owner.mutation(api.composio.selection.toggle, {
      conversationId,
      connectionId,
    });
    expect(
      await owner.query(api.composio.selection.getSelectedIds, {
        conversationId,
      }),
    ).toEqual([]);
    await t.run((ctx) =>
      ctx.db.insert("generationLocks", {
        userId,
        conversationId,
        pendingCount: 1,
        lockedAt: Date.now(),
      }),
    );
    await expect(
      owner.mutation(api.composio.selection.toggle, {
        conversationId,
        connectionId,
      }),
    ).rejects.toThrow(/Wait for the current response/);
  });
});
