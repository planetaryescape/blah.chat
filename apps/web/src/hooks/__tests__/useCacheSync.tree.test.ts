import { describe, expect, it } from "vitest";
import {
  getChildMessagesForParent,
  getSiblingsForMessage,
  orderMessagesByActivePath,
} from "../useCacheSync";

function createMessage(overrides: Partial<any>): any {
  const now = Date.now();
  return {
    _id: `msg-${crypto.randomUUID()}` as string,
    _creationTime: now,
    conversationId: "conv-1" as string,
    userId: "user-1" as string,
    role: "user",
    content: "message",
    status: "complete",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("useCacheSync tree helpers", () => {
  it("orders active-path messages from root to active leaf", () => {
    const root = createMessage({
      _id: "root" as string,
      siblingIndex: 0,
      isActiveBranch: true,
    });
    const branch = createMessage({
      _id: "branch" as string,
      role: "assistant",
      parentMessageIds: [root._id],
      siblingIndex: 0,
      isActiveBranch: true,
    });
    const leaf = createMessage({
      _id: "leaf" as string,
      parentMessageIds: [branch._id],
      siblingIndex: 0,
      isActiveBranch: true,
    });

    const ordered = orderMessagesByActivePath([leaf, branch, root], leaf._id);
    expect(ordered.map((message) => message._id)).toEqual([
      "root",
      "branch",
      "leaf",
    ]);
  });

  it("resolves children from both parentMessageId and parentMessageIds", () => {
    const parentId = "parent" as string;
    const messages = [
      createMessage({ _id: parentId }),
      createMessage({
        _id: "legacy-child" as string,
        role: "assistant",
        parentMessageId: parentId,
        siblingIndex: 1,
      }),
      createMessage({
        _id: "array-child" as string,
        role: "assistant",
        parentMessageIds: [parentId],
        siblingIndex: 0,
      }),
    ];

    const children = getChildMessagesForParent(messages, parentId);
    expect(children.map((message) => message._id)).toEqual([
      "array-child",
      "legacy-child",
    ]);
  });

  it("resolves siblings when message only has parentMessageIds", () => {
    const parentId = "parent" as string;
    const first = createMessage({
      _id: "first" as string,
      role: "assistant",
      parentMessageIds: [parentId],
      siblingIndex: 0,
    });
    const second = createMessage({
      _id: "second" as string,
      role: "assistant",
      parentMessageIds: [parentId],
      siblingIndex: 1,
    });

    const siblings = getSiblingsForMessage([first, second], second);
    expect(siblings.map((message) => message._id)).toEqual(["first", "second"]);
  });
});
