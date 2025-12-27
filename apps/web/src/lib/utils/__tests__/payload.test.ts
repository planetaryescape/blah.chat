/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { compact, omit, pick } from "../payload";

describe("compact", () => {
  describe("removing empty values", () => {
    it("removes null values", () => {
      const result = compact({ a: 1, b: null, c: 3 });

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("removes undefined values", () => {
      const result = compact({ a: 1, b: undefined, c: 3 });

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("removes empty strings", () => {
      const result = compact({ a: "hello", b: "", c: "world" });

      expect(result).toEqual({ a: "hello", c: "world" });
    });

    it("removes empty arrays", () => {
      const result = compact({ a: [1, 2], b: [], c: [3] });

      expect(result).toEqual({ a: [1, 2], c: [3] });
    });
  });

  describe("preserving valid values", () => {
    it("preserves zero", () => {
      const result = compact({ a: 0, b: 1 });

      expect(result).toEqual({ a: 0, b: 1 });
    });

    it("preserves false", () => {
      const result = compact({ a: false, b: true });

      expect(result).toEqual({ a: false, b: true });
    });

    it("preserves whitespace strings", () => {
      const result = compact({ a: "hello", b: " ", c: "world" });

      expect(result).toEqual({ a: "hello", b: " ", c: "world" });
    });

    it("preserves non-empty arrays", () => {
      const result = compact({ items: [1, 2, 3] });

      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe("nested objects", () => {
    it("recursively compacts nested objects", () => {
      const result = compact({
        outer: {
          inner: { a: 1, b: null },
          empty: null,
        },
      });

      expect(result).toEqual({
        outer: {
          inner: { a: 1 },
        },
      });
    });

    it("removes completely empty nested objects", () => {
      const result = compact({
        outer: {
          empty: { a: null, b: undefined },
        },
      });

      expect(result).toEqual({});
    });
  });

  describe("arrays with objects", () => {
    it("compacts objects within arrays", () => {
      const result = compact({
        items: [
          { a: 1, b: null },
          { c: 2, d: "" },
        ],
      });

      expect(result).toEqual({
        items: [{ a: 1 }, { c: 2 }],
      });
    });

    it("filters out empty objects from arrays", () => {
      const result = compact({
        items: [{ a: 1 }, { b: null }, { c: 2 }],
      });

      expect(result).toEqual({
        items: [{ a: 1 }, { c: 2 }],
      });
    });

    it("filters null/undefined from primitive arrays", () => {
      const result = compact({
        nums: [1, null, 2, undefined, 3],
      });

      expect(result).toEqual({
        nums: [1, 2, 3],
      });
    });
  });
});

describe("pick", () => {
  it("picks specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, ["a", "c"]);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("ignores keys that don't exist", () => {
    const obj = { a: 1, b: 2 };
    const result = pick(obj, ["a", "c" as keyof typeof obj]);

    expect(result).toEqual({ a: 1 });
  });

  it("returns empty object for no keys", () => {
    const obj = { a: 1, b: 2 };
    const result = pick(obj, []);

    expect(result).toEqual({});
  });

  it("preserves value types", () => {
    const obj = { name: "test", count: 42, active: true };
    const result = pick(obj, ["name", "active"]);

    expect(result).toEqual({ name: "test", active: true });
    expect(typeof result.name).toBe("string");
    expect(typeof result.active).toBe("boolean");
  });
});

describe("omit", () => {
  it("omits specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, ["b"]);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("handles keys that don't exist", () => {
    const obj = { a: 1, b: 2 };
    const result = omit(obj, ["c" as keyof typeof obj]);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("returns copy when no keys omitted", () => {
    const obj = { a: 1, b: 2 };
    const result = omit(obj, []);

    expect(result).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(obj);
  });

  it("omits multiple keys", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = omit(obj, ["b", "d"]);

    expect(result).toEqual({ a: 1, c: 3 });
  });
});
