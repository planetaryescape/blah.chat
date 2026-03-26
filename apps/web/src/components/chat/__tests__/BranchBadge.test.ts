import { describe, expect, it } from "vitest";
import { summarizeBranches } from "../BranchBadge";

const messageId = (value: string) => value as string;

describe("summarizeBranches", () => {
  it("returns zero when the conversation is linear", () => {
    const summary = summarizeBranches([
      {
        _id: messageId("msg_1"),
        content: "Hello",
        createdAt: 1,
        parentMessageIds: [],
      },
      {
        _id: messageId("msg_2"),
        content: "Hi",
        createdAt: 2,
        parentMessageIds: [messageId("msg_1")],
      },
    ]);

    expect(summary.totalBranches).toBe(0);
    expect(summary.branchPoints).toEqual([]);
  });

  it("counts extra children from each branch point", () => {
    const summary = summarizeBranches([
      {
        _id: messageId("msg_1"),
        content: "Prompt",
        createdAt: 1,
        parentMessageIds: [],
      },
      {
        _id: messageId("msg_2"),
        content: "Answer A",
        createdAt: 2,
        parentMessageIds: [messageId("msg_1")],
      },
      {
        _id: messageId("msg_3"),
        content: "Answer B",
        createdAt: 3,
        parentMessageIds: [messageId("msg_1")],
      },
      {
        _id: messageId("msg_4"),
        content: "Answer C",
        createdAt: 4,
        parentMessageIds: [messageId("msg_1")],
      },
    ]);

    expect(summary.totalBranches).toBe(2);
    expect(summary.branchPoints).toEqual([
      {
        id: "msg_1",
        createdAt: 1,
        title: "Prompt",
        childCount: 3,
      },
    ]);
  });
});
