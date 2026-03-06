import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import { sanitizeAssistantDisplayContent } from "../messages";
import schema from "../schema";

describe("convex/messages", () => {
  describe("assistant display sanitization", () => {
    it("strips a leading temporal prefix from assistant output", () => {
      expect(
        sanitizeAssistantDisplayContent(
          "[Mar 6, 1:59 AM] Going well-chilling in the digital ether.",
        ),
      ).toBe("Going well-chilling in the digital ether.");
    });

    it("hides partial temporal prefixes while streaming", () => {
      expect(sanitizeAssistantDisplayContent("[Mar 6, 1:59")).toBe("");
    });

    it("does not change normal content", () => {
      expect(sanitizeAssistantDisplayContent("How about you? Up late?")).toBe(
        "How about you? Up late?",
      );
    });
  });

  describe("list query", () => {
    it("returns messages for conversation owner", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            content: "Hello",
            role: "user",
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            content: "Hi there!",
            role: "assistant",
            model: "gpt-4o",
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Hello");
      expect(result[1].content).toBe("Hi there!");
    });

    it("returns empty for non-owner", async () => {
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
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
        await ctx.db.insert("messages", createTestMessageData(cId, ownerId));
        return cId;
      });

      const asOther = t.withIdentity(createMockIdentity({ subject: "other" }));
      const result = await asOther.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result).toEqual([]);
    });

    it("returns empty for unauthenticated user", async () => {
      const t = convexTest(schema);

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
        await ctx.db.insert("messages", createTestMessageData(cId, ownerId));
        return cId;
      });

      const result = await t.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result).toEqual([]);
    });

    it("returns messages ordered by creation time ascending", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        // Insert in reverse order to test sorting
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            content: "First",
            createdAt: 1000,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            content: "Second",
            createdAt: 2000,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            content: "Third",
            createdAt: 3000,
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe("First");
      expect(result[1].content).toBe("Second");
      expect(result[2].content).toBe("Third");
    });
  });

  describe("message status states", () => {
    const statuses = [
      "pending",
      "generating",
      "complete",
      "error",
      "stopped",
    ] as const;

    it.each(statuses)("handles status: %s", async (status) => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, { status }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result[0].status).toBe(status);
    });
  });

  describe("partialContent for streaming", () => {
    it("includes partialContent during generation", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            status: "generating",
            content: "",
            partialContent: "Partial response...",
            role: "assistant",
            model: "gpt-4o",
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result[0].status).toBe("generating");
      expect(result[0].partialContent).toBe("Partial response...");
    });

    it("sanitizes temporal prefixes for assistant partial content", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const msgId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            status: "generating",
            content: "",
            role: "assistant",
            model: "gpt-4o",
          }),
        );
      });

      await t.run(async (ctx) => {
        await ctx.runMutation(internal.messages.updatePartialContent, {
          messageId: msgId,
          partialContent:
            "[Mar 6, 1:59 AM] Going well-chilling in the digital ether.",
        });
      });

      const msg = await t.run(async (ctx) => ctx.db.get(msgId));
      expect(msg?.partialContent).toBe(
        "Going well-chilling in the digital ether.",
      );
    });
  });

  describe("collaborative conversation access", () => {
    it("allows participant to view messages", async () => {
      const t = convexTest(schema);
      const participantIdentity = createMockIdentity({
        subject: "participant",
      });

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const participantId = await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId: "participant",
            email: "participant@example.com",
          }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId, { isCollaborative: true }),
        );
        await ctx.db.insert("conversationParticipants", {
          conversationId: cId,
          userId: participantId,
          role: "collaborator",
          joinedAt: Date.now(),
        });
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, ownerId, { content: "Owner message" }),
        );
        return cId;
      });

      const asParticipant = t.withIdentity(participantIdentity);
      const result = await asParticipant.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Owner message");
    });
  });

  describe("message roles", () => {
    it("supports user, assistant, and system roles", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "system",
            content: "System prompt",
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "user",
            content: "User message",
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "assistant",
            content: "Assistant response",
            model: "gpt-4o",
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.messages.list, {
        conversationId: convId,
      });

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.role)).toEqual([
        "system",
        "user",
        "assistant",
      ]);
    });
  });

  describe("getLastAssistantMessage query", () => {
    it("returns the most recent assistant message", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "assistant",
            content: "First response",
            model: "gpt-4o",
            createdAt: 1000,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "user",
            content: "Follow up",
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "assistant",
            content: "Second response",
            model: "gpt-4o",
            createdAt: 3000,
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.messages.getLastAssistantMessage, {
        conversationId: convId,
      });

      expect(result?.content).toBe("Second response");
    });

    it("returns null when no assistant messages exist", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(cId, userId, {
            role: "user",
            content: "User message",
          }),
        );
        return cId;
      });

      const asUser = t.withIdentity(identity);
      const result = await asUser.query(api.messages.getLastAssistantMessage, {
        conversationId: convId,
      });

      expect(result).toBeNull();
    });
  });
});
