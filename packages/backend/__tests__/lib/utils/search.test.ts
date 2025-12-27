import { describe, expect, it } from "vitest";

import { applyRRF, mergeMessagesWithRRF } from "../../../convex/lib/utils/search";

// Helper to create mock items with _id
const createItem = (id: string, extra?: Record<string, unknown>) => ({
  _id: { toString: () => id },
  ...extra,
});

describe("applyRRF", () => {
  it("returns empty array for empty inputs", () => {
    const result = applyRRF([], []);
    expect(result).toEqual([]);
  });

  it("scores text-only results using RRF formula", () => {
    const textResults = [createItem("a"), createItem("b"), createItem("c")];
    const result = applyRRF(textResults, [], 60);

    // Score = 1/(k + rank + 1) where k=60, rank starts at 0
    expect(result[0].score).toBeCloseTo(1 / 61); // rank 0
    expect(result[1].score).toBeCloseTo(1 / 62); // rank 1
    expect(result[2].score).toBeCloseTo(1 / 63); // rank 2
    expect(result.map((r) => r._id.toString())).toEqual(["a", "b", "c"]);
  });

  it("scores vector-only results using RRF formula", () => {
    const vectorResults = [createItem("x"), createItem("y")];
    const result = applyRRF([], vectorResults, 60);

    expect(result[0].score).toBeCloseTo(1 / 61);
    expect(result[1].score).toBeCloseTo(1 / 62);
    expect(result.map((r) => r._id.toString())).toEqual(["x", "y"]);
  });

  it("boosts overlapping results by combining scores", () => {
    const textResults = [createItem("a"), createItem("b")];
    const vectorResults = [createItem("b"), createItem("c")];

    const result = applyRRF(textResults, vectorResults, 60);

    // Find 'b' which appears in both lists
    const itemB = result.find((r) => r._id.toString() === "b");

    // 'b' score = text(rank 1) + vector(rank 0) = 1/62 + 1/61
    expect(itemB?.score).toBeCloseTo(1 / 62 + 1 / 61);
  });

  it("sorts results by descending score", () => {
    const textResults = [createItem("a"), createItem("b")];
    const vectorResults = [createItem("b"), createItem("c")];

    const result = applyRRF(textResults, vectorResults, 60);

    // 'b' should be first (boosted), then 'a' and 'c'
    expect(result[0]._id.toString()).toBe("b");
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it("uses custom k parameter", () => {
    const textResults = [createItem("a")];
    const result = applyRRF(textResults, [], 10);

    // With k=10, score = 1/(10 + 0 + 1) = 1/11
    expect(result[0].score).toBeCloseTo(1 / 11);
  });

  it("preserves item properties in output", () => {
    const textResults = [createItem("a", { content: "hello", role: "user" })];
    const result = applyRRF(textResults, [], 60);

    expect(result[0]).toMatchObject({
      content: "hello",
      role: "user",
    });
    expect(result[0]).toHaveProperty("score");
  });
});

describe("mergeMessagesWithRRF", () => {
  // Create mock message docs
  const createMessage = (id: string, content: string) =>
    ({
      _id: { toString: () => id } as unknown,
      content,
      role: "user",
      status: "complete",
    }) as any;

  it("returns limited results", () => {
    const textResults = [
      createMessage("1", "one"),
      createMessage("2", "two"),
      createMessage("3", "three"),
    ];
    const vectorResults = [createMessage("4", "four")];

    const result = mergeMessagesWithRRF(textResults, vectorResults, 2);

    expect(result).toHaveLength(2);
  });

  it("strips score from output", () => {
    const textResults = [createMessage("1", "test")];
    const result = mergeMessagesWithRRF(textResults, [], 10);

    expect(result[0]).not.toHaveProperty("score");
  });

  it("merges and ranks correctly", () => {
    const textResults = [createMessage("a", "text-first")];
    const vectorResults = [
      createMessage("a", "text-first"),
      createMessage("b", "vector-only"),
    ];

    const result = mergeMessagesWithRRF(textResults, vectorResults, 10);

    // 'a' should be ranked higher due to appearing in both
    expect(result[0]._id.toString()).toBe("a");
  });
});
