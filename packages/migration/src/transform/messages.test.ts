import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexMessage } from "../types";
import { transformMessage } from "./messages";

const makeMsg = (overrides?: Partial<ConvexMessage>): ConvexMessage => ({
  _id: "j57msg1",
  _creationTime: 1700000000000,
  conversationId: "j57conv1",
  userId: "j57user1",
  role: "assistant",
  content: "Hello world",
  status: "complete",
  model: "gpt-4o",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformMessage", () => {
  it("maps basic message fields", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(makeMsg(), idMap);
    expect(message.role).toBe("assistant");
    expect(message.content).toBe("Hello world");
    expect(message.status).toBe("complete");
    expect(message.model).toBe("gpt-4o");
    expect(message.conversationId).toBe(idMap.get("conversations", "j57conv1"));
    expect(message.userId).toBe(idMap.get("users", "j57user1"));
  });

  it("preserves comparisonGroupId as string", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(
      makeMsg({ comparisonGroupId: "cg-abc" }),
      idMap,
    );
    expect(message.comparisonGroupId).toBe("cg-abc");
  });

  it("maps consolidatedMessageId via idMap", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(
      makeMsg({ consolidatedMessageId: "j57msg0" }),
      idMap,
    );
    expect(message.consolidatedMessageId).toBe(
      idMap.get("messages", "j57msg0"),
    );
  });

  it("maps rootMessageId via idMap", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(
      makeMsg({ rootMessageId: "j57root" }),
      idMap,
    );
    expect(message.rootMessageId).toBe(idMap.get("messages", "j57root"));
  });

  it("defaults siblingIndex to 0", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(
      makeMsg({ siblingIndex: undefined }),
      idMap,
    );
    expect(message.siblingIndex).toBe(0);
  });

  it("preserves siblingIndex when present", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(makeMsg({ siblingIndex: 2 }), idMap);
    expect(message.siblingIndex).toBe(2);
  });

  it("drops partialContent, partialReasoning, isActiveBranch, branchLabel", () => {
    const idMap = new IdMap();
    const { message } = transformMessage(
      makeMsg({
        partialContent: "partial...",
        partialReasoning: "thinking...",
        isActiveBranch: true,
        branchLabel: "Branch A",
      }),
      idMap,
    );
    expect(message).not.toHaveProperty("partialContent");
    expect(message).not.toHaveProperty("partialReasoning");
    expect(message).not.toHaveProperty("isActiveBranch");
    expect(message).not.toHaveProperty("branchLabel");
  });

  it("extracts embedded votes into a vote row", () => {
    const idMap = new IdMap();
    const { vote } = transformMessage(
      makeMsg({
        comparisonGroupId: "cg-1",
        votes: {
          rating: "left_better",
          isWinner: true,
          votedAt: 1700000001000,
        },
      }),
      idMap,
    );

    expect(vote).toBeDefined();
    expect(vote!.comparisonGroupId).toBe("cg-1");
    expect(vote!.rating).toBe("left_better");
    expect(vote!.winnerMessageId).toBe(idMap.get("messages", "j57msg1"));
    expect(vote!.votedAt).toBe(1700000001000);
  });

  it("sets winnerMessageId to null when isWinner is false", () => {
    const idMap = new IdMap();
    const { vote } = transformMessage(
      makeMsg({
        comparisonGroupId: "cg-1",
        votes: {
          rating: "right_better",
          isWinner: false,
          votedAt: 1700000001000,
        },
      }),
      idMap,
    );
    expect(vote!.winnerMessageId).toBeNull();
  });

  it("does not produce vote when no votes field", () => {
    const idMap = new IdMap();
    const { vote } = transformMessage(makeMsg(), idMap);
    expect(vote).toBeUndefined();
  });

  it("extracts embedding into an embedding row", () => {
    const idMap = new IdMap();
    const { embedding } = transformMessage(
      makeMsg({ embedding: [0.1, 0.2, 0.3] }),
      idMap,
    );

    expect(embedding).toBeDefined();
    expect(embedding!.content).toBe("Hello world");
    expect(embedding!.embedding).toBe("[0.1,0.2,0.3]");
    expect(embedding!.messageId).toBe(idMap.get("messages", "j57msg1"));
  });

  it("does not produce embedding when no embedding field", () => {
    const idMap = new IdMap();
    const { embedding } = transformMessage(makeMsg(), idMap);
    expect(embedding).toBeUndefined();
  });

  it("does not produce embedding for empty array", () => {
    const idMap = new IdMap();
    const { embedding } = transformMessage(makeMsg({ embedding: [] }), idMap);
    expect(embedding).toBeUndefined();
  });
});
