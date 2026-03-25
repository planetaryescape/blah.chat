import { describe, expect, it } from "vitest";
import { cosineSimilarity, mergeByRrf } from "../src/search-utils";

describe("cosineSimilarity", () => {
  it("returns 1 for identical unit vectors", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it("returns 0 when either vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [0, 0])).toBe(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("computes correct similarity for non-trivial vectors", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const dot = 4 + 10 + 18;
    const normA = Math.sqrt(1 + 4 + 9);
    const normB = Math.sqrt(16 + 25 + 36);
    expect(cosineSimilarity(a, b)).toBeCloseTo(dot / (normA * normB), 5);
  });
});

describe("mergeByRrf", () => {
  it("merges two non-overlapping sets", () => {
    const text = [{ id: "a" }, { id: "b" }];
    const vector = [{ id: "c" }, { id: "d" }];
    const result = mergeByRrf(text, vector, 10);
    expect(result.map((r) => r.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("boosts items appearing in both sets", () => {
    const text = [{ id: "a" }, { id: "b" }];
    const vector = [{ id: "b" }, { id: "c" }];
    const result = mergeByRrf(text, vector, 10);
    expect(result[0]?.id).toBe("b");
  });

  it("respects limit", () => {
    const text = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const vector = [{ id: "d" }, { id: "e" }];
    const result = mergeByRrf(text, vector, 2);
    expect(result).toHaveLength(2);
  });

  it("returns empty for empty inputs", () => {
    expect(mergeByRrf([], [], 10)).toEqual([]);
  });

  it("handles single set empty", () => {
    const text = [{ id: "a" }];
    const result = mergeByRrf(text, [], 10);
    expect(result).toEqual([{ id: "a" }]);
  });

  it("preserves item properties", () => {
    const text = [{ id: "a", extra: "hello" }];
    const vector = [{ id: "b", extra: "world" }];
    const result = mergeByRrf(text, vector, 10);
    expect(result[0]).toMatchObject({ id: "a", extra: "hello" });
  });
});
