import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import { runMigrationsForUser } from "../byod/migrationRunner";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

describe("follow-up authorization", () => {
  it("keeps the per-user migration worker internal and denies anonymous/non-admin bulk migration", async () => {
    expect(runMigrationsForUser.isInternal).toBe(true);
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", createTestUserData({ clerkId: "ordinary" }));
      await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "admin", isAdmin: true }),
      );
    });
    await expect(
      t.action(api.byod.migrationRunner.runMigrationsForAll, {}),
    ).rejects.toThrow(/admin required/);
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "ordinary" }))
        .action(api.byod.migrationRunner.runMigrationsForAll, {}),
    ).rejects.toThrow(/admin required/);
    expect(
      await t
        .withIdentity(createMockIdentity({ subject: "admin" }))
        .action(api.byod.migrationRunner.runMigrationsForAll, {}),
    ).toMatchObject({ total: 0, succeeded: 0, failed: 0 });
  });

  it("authorizes public single-message polling by actual conversation membership", async () => {
    const t = convexTest(schema);
    const messageId = await t.run(async (ctx) => {
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
        createTestConversationData(owner, { isCollaborative: true }),
      );
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        userId: collaborator,
        role: "collaborator",
        joinedAt: Date.now(),
      });
      return ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          content: "protected message",
        }),
      );
    });
    expect(
      await t.query(api.messages.getForCurrentUser, { messageId }),
    ).toBeNull();
    expect(
      await t
        .withIdentity(createMockIdentity({ subject: "outsider" }))
        .query(api.messages.getForCurrentUser, { messageId }),
    ).toBeNull();
    for (const subject of ["owner", "collaborator"])
      expect(
        (
          await t
            .withIdentity(createMockIdentity({ subject }))
            .query(api.messages.getForCurrentUser, { messageId })
        )?.content,
      ).toBe("protected message");
  });
});
