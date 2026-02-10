import {
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
} from "../src/utils/embeddings";

describe("embeddings", () => {
  test("cosineSimilarity is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 8);
  });

  test("cosineSimilarity is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 8);
  });

  test("cosineSimilarity handles zero magnitude", () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  test("cosineSimilarity throws on length mismatch", () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(/same length/);
  });

  test("euclideanDistance works", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  test("euclideanDistance throws on length mismatch", () => {
    expect(() => euclideanDistance([1], [1, 2])).toThrow(/same length/);
  });

  test("normalizeVector produces unit length", () => {
    const v = normalizeVector([3, 4]);
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    expect(len).toBeCloseTo(1, 8);
  });

  test("normalizeVector handles zero vector", () => {
    expect(normalizeVector([0, 0, 0])).toEqual([0, 0, 0]);
  });
});
