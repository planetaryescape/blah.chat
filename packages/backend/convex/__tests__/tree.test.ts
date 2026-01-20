import { describe, expect, it } from "vitest";
import {
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "@/lib/test/factories";
import { convexTest } from "../../__tests__/testSetup";
import type { Id } from "../_generated/dataModel";
import {
  buildTree,
  deactivateSubtree,
  findCommonAncestor,
  getChildren,
  getDescendants,
  getLeafMessage,
  getNextSiblingIndex,
  getPathToRoot,
  getSiblings,
  getWithContext,
  markPathAsActive,
} from "../lib/tree";
import schema from "../schema";

describe("convex/lib/tree", () => {
  describe("getChildren", () => {
    it("returns direct children sorted by siblingIndex", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const parentId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Parent",
            siblingIndex: 0,
          }),
        );

        // Insert children in reverse order to test sorting
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 2",
            parentMessageId: parentId,
            siblingIndex: 2,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 0",
            parentMessageId: parentId,
            siblingIndex: 0,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 1",
            parentMessageId: parentId,
            siblingIndex: 1,
          }),
        );

        return getChildren(ctx, parentId);
      });

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe("Child 0");
      expect(result[1].content).toBe("Child 1");
      expect(result[2].content).toBe("Child 2");
    });

    it("returns empty array for leaf message", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const leafId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Leaf" }),
        );

        return getChildren(ctx, leafId);
      });

      expect(result).toEqual([]);
    });

    it("handles parentMessageIds array (new format)", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const parentId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Parent" }),
        );

        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child with array",
            parentMessageIds: [parentId],
            siblingIndex: 0,
          }),
        );

        return getChildren(ctx, parentId);
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Child with array");
    });
  });

  describe("getSiblings", () => {
    it("returns all messages with same parent", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const parentId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Parent" }),
        );

        const targetId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Sibling A",
            parentMessageId: parentId,
            siblingIndex: 0,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Sibling B",
            parentMessageId: parentId,
            siblingIndex: 1,
          }),
        );

        return getSiblings(ctx, targetId);
      });

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.content)).toContain("Sibling A");
      expect(result.map((m) => m.content)).toContain("Sibling B");
    });

    it("returns only self for root message", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Root" }),
        );

        return getSiblings(ctx, rootId);
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Root");
    });
  });

  describe("getPathToRoot", () => {
    it("returns path from message to root (root first)", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Root" }),
        );
        const middleId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Middle",
            parentMessageId: rootId,
          }),
        );
        const leafId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Leaf",
            parentMessageId: middleId,
          }),
        );

        return getPathToRoot(ctx, leafId);
      });

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe("Root");
      expect(result[1].content).toBe("Middle");
      expect(result[2].content).toBe("Leaf");
    });

    it("handles deep trees without cycle detection issues", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        let prevId: Id<"messages"> | undefined;
        for (let i = 0; i < 10; i++) {
          const msgId = await ctx.db.insert(
            "messages",
            createTestMessageData(convId, userId, {
              content: `Level ${i}`,
              parentMessageId: prevId,
            }),
          );
          prevId = msgId;
        }

        return getPathToRoot(ctx, prevId!);
      });

      expect(result).toHaveLength(10);
      expect(result[0].content).toBe("Level 0");
      expect(result[9].content).toBe("Level 9");
    });
  });

  describe("findCommonAncestor", () => {
    it("finds branch point for divergent messages", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Root" }),
        );
        const branchPoint = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Branch Point",
            parentMessageId: rootId,
          }),
        );

        // Two branches from same parent
        const branch1 = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Branch 1",
            parentMessageId: branchPoint,
            siblingIndex: 0,
          }),
        );
        const branch2 = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Branch 2",
            parentMessageId: branchPoint,
            siblingIndex: 1,
          }),
        );

        return findCommonAncestor(ctx, branch1, branch2);
      });

      expect(result?.content).toBe("Branch Point");
    });

    it("returns null for unrelated messages", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const conv1 = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const conv2 = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const msg1 = await ctx.db.insert(
          "messages",
          createTestMessageData(conv1, userId, { content: "Conv 1" }),
        );
        const msg2 = await ctx.db.insert(
          "messages",
          createTestMessageData(conv2, userId, { content: "Conv 2" }),
        );

        return findCommonAncestor(ctx, msg1, msg2);
      });

      expect(result).toBeNull();
    });
  });

  describe("getNextSiblingIndex", () => {
    it("returns 0 for first child", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const parentId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Parent" }),
        );

        return getNextSiblingIndex(ctx, parentId);
      });

      expect(result).toBe(0);
    });

    it("returns max + 1 for subsequent children", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const parentId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Parent" }),
        );

        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child",
            parentMessageId: parentId,
            siblingIndex: 5,
          }),
        );

        return getNextSiblingIndex(ctx, parentId);
      });

      expect(result).toBe(6);
    });
  });

  describe("getWithContext", () => {
    it("returns message with parent, children, and branch info", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const parentId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Parent" }),
        );
        const targetId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Target",
            parentMessageId: parentId,
            siblingIndex: 0,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Sibling",
            parentMessageId: parentId,
            siblingIndex: 1,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child A",
            parentMessageId: targetId,
            siblingIndex: 0,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child B",
            parentMessageId: targetId,
            siblingIndex: 1,
          }),
        );

        return getWithContext(ctx, targetId);
      });

      expect(result).not.toBeNull();
      expect(result?.message.content).toBe("Target");
      expect(result?.parent?.content).toBe("Parent");
      expect(result?.children).toHaveLength(2);
      expect(result?.hasBranches).toBe(true);
      expect(result?.siblingCount).toBe(2);
      expect(result?.siblingIndex).toBe(0);
    });

    it("returns null for non-existent message", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        return getWithContext(ctx, "invalid" as unknown as Id<"messages">);
      });

      expect(result).toBeNull();
    });
  });

  describe("deactivateSubtree", () => {
    it("marks all descendants as inactive", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Root",
            isActiveBranch: true,
          }),
        );
        const childId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child",
            parentMessageId: rootId,
            isActiveBranch: true,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Grandchild",
            parentMessageId: childId,
            isActiveBranch: true,
          }),
        );

        const deactivatedCount = await deactivateSubtree(ctx, rootId);

        // Verify all are now inactive
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
        const activeCount = messages.filter((m) => m.isActiveBranch).length;

        return { deactivatedCount, activeCount };
      });

      expect(result.deactivatedCount).toBe(3);
      expect(result.activeCount).toBe(0);
    });
  });

  describe("getDescendants", () => {
    it("returns all descendant IDs (not including root)", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Root" }),
        );
        const child1 = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 1",
            parentMessageId: rootId,
          }),
        );
        const child2 = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 2",
            parentMessageId: rootId,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Grandchild",
            parentMessageId: child1,
          }),
        );

        const descendants = await getDescendants(ctx, rootId);
        return { descendants, child1, child2 };
      });

      expect(result.descendants).toHaveLength(3);
      expect(result.descendants).toContain(result.child1);
      expect(result.descendants).toContain(result.child2);
    });
  });

  describe("getLeafMessage", () => {
    it("follows active branch when followActive=true", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Root",
            isActiveBranch: true,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Inactive Branch",
            parentMessageId: rootId,
            siblingIndex: 0,
            isActiveBranch: false,
          }),
        );
        const activeChild = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Active Branch",
            parentMessageId: rootId,
            siblingIndex: 1,
            isActiveBranch: true,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Active Leaf",
            parentMessageId: activeChild,
            isActiveBranch: true,
          }),
        );

        return getLeafMessage(ctx, rootId, true);
      });

      expect(result.content).toBe("Active Leaf");
    });

    it("follows first child when followActive=false", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Root" }),
        );
        const firstChild = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "First Child",
            parentMessageId: rootId,
            siblingIndex: 0,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Second Child",
            parentMessageId: rootId,
            siblingIndex: 1,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "First Grandchild",
            parentMessageId: firstChild,
          }),
        );

        return getLeafMessage(ctx, rootId, false);
      });

      expect(result.content).toBe("First Grandchild");
    });
  });

  describe("buildTree", () => {
    it("builds correct tree structure", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Root",
            isActiveBranch: true,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 1",
            parentMessageId: rootId,
            siblingIndex: 0,
            isActiveBranch: true,
          }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Child 2",
            parentMessageId: rootId,
            siblingIndex: 1,
            isActiveBranch: false,
          }),
        );

        return buildTree(ctx, convId);
      });

      expect(result).not.toBeNull();
      expect(result?.message.content).toBe("Root");
      expect(result?.depth).toBe(0);
      expect(result?.children).toHaveLength(2);
      expect(result?.children[0].depth).toBe(1);
      expect(result?.children[0].message.content).toBe("Child 1");
      expect(result?.children[0].isActive).toBe(true);
      expect(result?.children[1].isActive).toBe(false);
    });

    it("returns null for empty conversation", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        return buildTree(ctx, convId);
      });

      expect(result).toBeNull();
    });
  });

  describe("markPathAsActive", () => {
    it("marks path to root and deactivates other branches", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const rootId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Root",
            isActiveBranch: false,
          }),
        );
        const branch1 = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Branch 1",
            parentMessageId: rootId,
            siblingIndex: 0,
            isActiveBranch: true,
          }),
        );
        const branch2 = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Branch 2",
            parentMessageId: rootId,
            siblingIndex: 1,
            isActiveBranch: false,
          }),
        );
        const target = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "Target",
            parentMessageId: branch2,
            isActiveBranch: false,
          }),
        );

        await markPathAsActive(ctx, target);

        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();

        return {
          root: messages.find((m) => m._id === rootId)?.isActiveBranch,
          branch1: messages.find((m) => m._id === branch1)?.isActiveBranch,
          branch2: messages.find((m) => m._id === branch2)?.isActiveBranch,
          target: messages.find((m) => m._id === target)?.isActiveBranch,
        };
      });

      expect(result.root).toBe(true);
      expect(result.branch1).toBe(false);
      expect(result.branch2).toBe(true);
      expect(result.target).toBe(true);
    });
  });
});
