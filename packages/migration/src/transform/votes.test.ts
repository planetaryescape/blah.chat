import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexVote } from "../types";
import { transformVote } from "./votes";

describe("transformVote", () => {
  it("maps all fields with winner", () => {
    const idMap = new IdMap();
    const doc: ConvexVote = {
      _id: "v1",
      _creationTime: 1700000000000,
      userId: "user1",
      comparisonGroupId: "cg-1",
      winnerId: "msg1",
      rating: "left_better",
      votedAt: 1700000001000,
    };

    const result = transformVote(doc, idMap);
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.comparisonGroupId).toBe("cg-1");
    expect(result.winnerMessageId).toBe(idMap.get("messages", "msg1"));
    expect(result.rating).toBe("left_better");
  });

  it("maps votedAt timestamp", () => {
    const idMap = new IdMap();
    const doc: ConvexVote = {
      _id: "v1b",
      _creationTime: 1700000000000,
      userId: "user1",
      comparisonGroupId: "cg-1",
      winnerId: "msg1",
      rating: "right_better",
      votedAt: 1700000099000,
    };
    const result = transformVote(doc, idMap);
    expect(result.rating).toBe("right_better");
    expect(result.votedAt).toBe(1700000099000);
  });

  it("sets winnerMessageId to null for tie (no winnerId)", () => {
    const idMap = new IdMap();
    const doc: ConvexVote = {
      _id: "v2",
      _creationTime: 1700000000000,
      userId: "user1",
      comparisonGroupId: "cg-2",
      rating: "tie",
      votedAt: 1700000001000,
    };
    const result = transformVote(doc, idMap);
    expect(result.winnerMessageId).toBeNull();
    expect(result.rating).toBe("tie");
  });

  it("sets winnerMessageId to null for both_bad rating", () => {
    const idMap = new IdMap();
    const doc: ConvexVote = {
      _id: "v3",
      _creationTime: 1700000000000,
      userId: "user1",
      comparisonGroupId: "cg-3",
      rating: "both_bad",
      votedAt: 1700000001000,
    };
    const result = transformVote(doc, idMap);
    expect(result.winnerMessageId).toBeNull();
    expect(result.rating).toBe("both_bad");
  });
});
