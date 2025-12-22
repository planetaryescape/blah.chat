import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import {
  createMockIdentity,
  createTestConversationData,
  createTestUserData,
} from "@/lib/test/factories";
import { api } from "../_generated/api";
import schema from "../schema";

describe("convex/conversations", () => {
  describe("list query", () => {
    it("returns empty array when no conversations", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      // Create user first
      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.conversations.list, {});

      expect(result).toEqual([]);
    });

    it("returns only user's conversations", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity({ subject: "user-1" });

      // Create users and conversations
      await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user-1" }),
        );
        const user2Id = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user-2", email: "user2@example.com" }),
        );

        await ctx.db.insert(
          "conversations",
          createTestConversationData(user1Id, { title: "My Chat" }),
        );
        await ctx.db.insert(
          "conversations",
          createTestConversationData(user2Id, { title: "Other Chat" }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.conversations.list, {});

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("My Chat");
    });

    it("excludes archived by default", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, {
            archived: false,
            title: "Active",
          }),
        );
        await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, {
            archived: true,
            title: "Archived",
          }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.conversations.list, {});

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Active");
    });

    it("returns empty for unauthenticated users", async () => {
      const t = convexTest(schema);

      // No identity - query without authentication
      const result = await t.query(api.conversations.list, {});

      expect(result).toEqual([]);
    });

    it("sorts pinned conversations first", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, {
            title: "Normal",
            pinned: false,
          }),
        );
        await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { title: "Pinned", pinned: true }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.conversations.list, {});

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Pinned");
      expect(result[1].title).toBe("Normal");
    });
  });

  describe("create mutation", () => {
    it("creates conversation for authenticated user", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      // Pre-create user
      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.mutation(api.conversations.create, {
        model: "gpt-4o",
        title: "New Chat",
      });

      expect(result).toBeDefined();

      // Verify in database
      const conversation = await t.run(async (ctx) => {
        return await ctx.db.get(result);
      });

      expect(conversation?.model).toBe("gpt-4o");
      expect(conversation?.title).toBe("New Chat");
      expect(conversation?.pinned).toBe(false);
      expect(conversation?.archived).toBe(false);
    });

    it("creates conversation with default title when not provided", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.mutation(api.conversations.create, {
        model: "gpt-4o",
      });

      const conversation = await t.run(async (ctx) => {
        return await ctx.db.get(result);
      });

      expect(conversation?.title).toBe("New Chat");
    });

    it("creates incognito conversation with correct settings", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.mutation(api.conversations.create, {
        model: "gpt-4o",
        isIncognito: true,
      });

      const conversation = await t.run(async (ctx) => {
        return await ctx.db.get(result);
      });

      expect(conversation?.isIncognito).toBe(true);
      expect(conversation?.title).toBe("Incognito Chat");
    });
  });

  describe("get query", () => {
    it("returns conversation for owner", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { title: "My Chat" }),
        );
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.conversations.get, {
        conversationId: convId,
      });

      expect(result?.title).toBe("My Chat");
    });

    it("returns null for non-owner", async () => {
      const t = convexTest(schema);

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "other", email: "other@example.com" }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
      });

      const asOther = t.withIdentity(createMockIdentity({ subject: "other" }));
      const result = await asOther.query(api.conversations.get, {
        conversationId: convId,
      });

      expect(result).toBeNull();
    });

    it("returns null for unauthenticated user", async () => {
      const t = convexTest(schema);

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
      });

      const result = await t.query(api.conversations.get, {
        conversationId: convId,
      });

      expect(result).toBeNull();
    });
  });

  describe("togglePin mutation", () => {
    it("toggles pin state", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, {
            pinned: false,
            messageCount: 1,
          }),
        );
      });

      const asUser = t.withIdentity(identity);

      // Pin it
      await asUser.mutation(api.conversations.togglePin, {
        conversationId: convId,
      });

      let conversation = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conversation?.pinned).toBe(true);

      // Unpin it
      await asUser.mutation(api.conversations.togglePin, {
        conversationId: convId,
      });

      conversation = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conversation?.pinned).toBe(false);
    });

    it("throws when pinning empty conversation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, {
            pinned: false,
            messageCount: 0,
          }),
        );
      });

      const asUser = t.withIdentity(identity);

      await expect(
        asUser.mutation(api.conversations.togglePin, {
          conversationId: convId,
        }),
      ).rejects.toThrow("Cannot pin empty conversation");
    });
  });

  describe("archive mutation", () => {
    it("archives conversation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { archived: false }),
        );
      });

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.archive, {
        conversationId: convId,
      });

      const conversation = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conversation?.archived).toBe(true);
    });
  });

  describe("rename mutation", () => {
    it("renames conversation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { title: "Old Title" }),
        );
      });

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.rename, {
        conversationId: convId,
        title: "New Title",
      });

      const conversation = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conversation?.title).toBe("New Title");
    });
  });
});
