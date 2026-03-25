import { describe, expect, it } from "vitest";
import { deserializeVector, serializeVector } from "../src/vector-type";

describe("serializeVector", () => {
  it("serializes number array to pgvector literal", () => {
    expect(serializeVector([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });

  it("serializes empty array", () => {
    expect(serializeVector([])).toBe("[]");
  });

  it("handles negative numbers", () => {
    expect(serializeVector([-1, 0, 1])).toBe("[-1,0,1]");
  });

  it("replaces non-finite values with 0", () => {
    expect(serializeVector([1, Number.NaN, Number.POSITIVE_INFINITY])).toBe(
      "[1,0,0]",
    );
  });
});

describe("deserializeVector", () => {
  it("deserializes pgvector string to number array", () => {
    expect(deserializeVector("[0.1,0.2,0.3]")).toEqual([0.1, 0.2, 0.3]);
  });

  it("handles empty string", () => {
    expect(deserializeVector("")).toEqual([]);
  });

  it("handles null/undefined", () => {
    expect(deserializeVector(null)).toEqual([]);
    expect(deserializeVector(undefined)).toEqual([]);
  });

  it("passes through existing number arrays", () => {
    expect(deserializeVector([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("handles brackets with spaces", () => {
    expect(deserializeVector("[ 0.1 , 0.2 ]")).toEqual([0.1, 0.2]);
  });
});
