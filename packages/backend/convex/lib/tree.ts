/**
 * Tree-based message architecture utilities (P7)
 *
 * Provides functions for traversing and manipulating the message tree structure.
 * Messages form a DAG (Directed Acyclic Graph) where:
 * - Each message can have multiple parents (for merges)
 * - Each message can have multiple children (branches)
 * - The "active branch" is the currently displayed path from root to leaf
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type Message = Doc<"messages">;
export type Conversation = Doc<"conversations">;

/**
 * Branch info for UI display
 */
export interface BranchInfo {
  rootMessageId: Id<"messages">;
  leafMessageId: Id<"messages">;
  messageCount: number;
  branchPoint?: Id<"messages">; // Where this branch diverged
  isActive: boolean;
}

/**
 * Get all children of a message (messages that have this as a parent)
 */
export async function getChildren(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
): Promise<Message[]> {
  // Query by legacy parentMessageId first (indexed)
  const legacyChildren = await ctx.db
    .query("messages")
    .withIndex("by_parent", (q) => q.eq("parentMessageId", messageId))
    .collect();

  // For messages using parentMessageIds array, scope to conversation
  // to avoid full table scan (Convex doesn't support array-contains index)
  const parentMessage = await ctx.db.get(messageId);
  let arrayChildren: Message[] = [];

  if (parentMessage) {
    // Only query messages in the same conversation
    const conversationMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", parentMessage.conversationId),
      )
      .collect();

    arrayChildren = conversationMessages.filter(
      (m) => m.parentMessageIds?.includes(messageId) && !m.parentMessageId,
    );
  }

  // Combine and dedupe
  const childMap = new Map<string, Message>();
  for (const child of [...legacyChildren, ...arrayChildren]) {
    childMap.set(child._id, child);
  }

  return Array.from(childMap.values()).sort(
    (a, b) => (a.siblingIndex ?? 0) - (b.siblingIndex ?? 0),
  );
}

/**
 * Get all siblings of a message (messages with the same parent(s))
 */
export async function getSiblings(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
): Promise<Message[]> {
  const message = await ctx.db.get(messageId);
  if (!message) return [];

  // Get parent ID (prefer array, fallback to legacy)
  const parentId = message.parentMessageIds?.[0] ?? message.parentMessageId;
  if (!parentId) return [message]; // Root message has no siblings

  const children = await getChildren(ctx, parentId);
  return children;
}

/**
 * Walk from a message to the root, collecting ancestors
 */
export async function getPathToRoot(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
): Promise<Message[]> {
  const path: Message[] = [];
  let currentId: Id<"messages"> | undefined = messageId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // Cycle detection (shouldn't happen, but safety)
      break;
    }
    visited.add(currentId);

    const message: Message | null = await ctx.db.get(currentId);
    if (!message) break;

    path.push(message);

    // Get parent (prefer array, fallback to legacy)
    currentId = message.parentMessageIds?.[0] ?? message.parentMessageId;
  }

  return path.reverse(); // Root first
}

/**
 * Get the active path for a conversation (root → activeLeaf)
 */
export async function getActivePath(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<Message[]> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation?.activeLeafMessageId) {
    // Fallback: get all messages and return in order
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    return messages.sort((a, b) => a.createdAt - b.createdAt);
  }

  return getPathToRoot(ctx, conversation.activeLeafMessageId);
}

/**
 * Find the common ancestor of two messages
 */
export async function findCommonAncestor(
  ctx: QueryCtx | MutationCtx,
  msg1Id: Id<"messages">,
  msg2Id: Id<"messages">,
): Promise<Message | null> {
  const path1 = await getPathToRoot(ctx, msg1Id);
  const path1Ids = new Set(path1.map((m) => m._id));

  const path2 = await getPathToRoot(ctx, msg2Id);

  // Find first message in path2 that's also in path1
  for (const msg of path2) {
    if (path1Ids.has(msg._id)) {
      return msg;
    }
  }

  return null;
}

/**
 * Get all branch points in a conversation (messages with multiple children)
 */
export async function getBranchPoints(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<Message[]> {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();

  const branchPoints: Message[] = [];

  for (const msg of messages) {
    const children = await getChildren(ctx, msg._id);
    if (children.length > 1) {
      branchPoints.push(msg);
    }
  }

  return branchPoints;
}

/**
 * Count total branches in a conversation
 */
export async function countBranches(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<number> {
  const branchPoints = await getBranchPoints(ctx, conversationId);

  // Total branches = 1 (main) + extra children at each branch point
  let totalBranches = 1;
  for (const bp of branchPoints) {
    const children = await getChildren(ctx, bp._id);
    totalBranches += children.length - 1; // -1 because first child is "main" path
  }

  return totalBranches;
}

/**
 * Get the next sibling index for a parent message
 */
export async function getNextSiblingIndex(
  ctx: QueryCtx | MutationCtx,
  parentMessageId: Id<"messages">,
): Promise<number> {
  const children = await getChildren(ctx, parentMessageId);
  if (children.length === 0) return 0;

  const maxIndex = Math.max(...children.map((c) => c.siblingIndex ?? 0));
  return maxIndex + 1;
}

/**
 * Mark a path as active (from root to target message)
 */
export async function markPathAsActive(
  ctx: MutationCtx,
  targetMessageId: Id<"messages">,
): Promise<void> {
  const message = await ctx.db.get(targetMessageId);
  if (!message) return;

  // Get the active path to this message
  const activePath = await getPathToRoot(ctx, targetMessageId);
  const activeIds = new Set(activePath.map((m) => m._id));

  // Get all messages in this conversation
  const allMessages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversationId", message.conversationId),
    )
    .collect();

  // Update isActiveBranch for all messages
  for (const msg of allMessages) {
    const shouldBeActive = activeIds.has(msg._id);
    if (msg.isActiveBranch !== shouldBeActive) {
      await ctx.db.patch(msg._id, {
        isActiveBranch: shouldBeActive,
        updatedAt: Date.now(),
      });
    }
  }
}

/**
 * Get the leaf message of a branch (follow children until no more)
 */
export async function getLeafMessage(
  ctx: QueryCtx | MutationCtx,
  startMessageId: Id<"messages">,
  followActive: boolean = true,
): Promise<Message> {
  let current = await ctx.db.get(startMessageId);
  if (!current) throw new Error("Message not found");

  const visited = new Set<string>();

  while (true) {
    if (visited.has(current._id)) break;
    visited.add(current._id);

    const children = await getChildren(ctx, current._id);
    if (children.length === 0) break;

    if (followActive) {
      // Follow the active branch
      const activeChild = children.find((c) => c.isActiveBranch);
      current = activeChild ?? children[0];
    } else {
      // Follow first child (by siblingIndex)
      current = children[0];
    }
  }

  return current;
}

/**
 * Build tree structure for visualization
 */
export interface TreeNode {
  message: Message;
  children: TreeNode[];
  isActive: boolean;
  depth: number;
}

export async function buildTree(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<TreeNode | null> {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation_created", (q) =>
      q.eq("conversationId", conversationId),
    )
    .collect();

  if (messages.length === 0) return null;

  // Find root (message with no parents)
  const root = messages.find(
    (m) =>
      !m.parentMessageId &&
      (!m.parentMessageIds || m.parentMessageIds.length === 0),
  );

  if (!root) {
    // Fallback: use first message by createdAt
    const sorted = messages.sort((a, b) => a.createdAt - b.createdAt);
    return buildTreeNode(ctx, sorted[0], 0);
  }

  return buildTreeNode(ctx, root, 0);
}

async function buildTreeNode(
  ctx: QueryCtx | MutationCtx,
  message: Message,
  depth: number,
): Promise<TreeNode> {
  const children = await getChildren(ctx, message._id);
  const childNodes = await Promise.all(
    children.map((c) => buildTreeNode(ctx, c, depth + 1)),
  );

  return {
    message,
    children: childNodes,
    isActive: message.isActiveBranch ?? false,
    depth,
  };
}
