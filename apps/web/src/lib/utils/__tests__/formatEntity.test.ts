/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  formatEntity,
  formatEntityList,
  formatErrorEntity,
} from "../formatEntity";

describe("formatEntity", () => {
  it("wraps data in success envelope with entity type", () => {
    const data = { id: "123", name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("user");
    expect(result.data).toMatchObject({ id: "123", name: "Test" });
  });

  it("includes id in sys when provided", () => {
    const result = formatEntity({ name: "Test" }, "user", "user-123");
    expect(result.sys.id).toBe("user-123");
  });

  it("omits id from sys when not provided", () => {
    const result = formatEntity({ name: "Test" }, "user");
    expect(result.sys.id).toBeUndefined();
  });

  it("converts _creationTime to ISO created timestamp", () => {
    const result = formatEntity(
      { _creationTime: 1703001600000, name: "Test" },
      "user",
    );
    expect(result.sys.timestamps?.created).toBe("2023-12-19T16:00:00.000Z");
  });

  it("converts updatedAt to ISO updated timestamp", () => {
    const result = formatEntity(
      { updatedAt: 1703088000000, name: "Test" },
      "user",
    );
    expect(result.sys.timestamps?.updated).toBe("2023-12-20T16:00:00.000Z");
  });

  it("always includes retrieved timestamp as valid ISO string", () => {
    const before = new Date().toISOString();
    const result = formatEntity({ name: "Test" }, "user");
    const after = new Date().toISOString();
    const retrieved = result.sys.timestamps?.retrieved;
    expect(typeof retrieved).toBe("string");
    expect(retrieved! >= before).toBe(true);
    expect(retrieved! <= after).toBe(true);
  });

  it("compacts null, undefined, and empty string fields from data", () => {
    const data = {
      id: "123",
      name: "Test",
      nullField: null,
      undefinedField: undefined,
      emptyString: "",
    };
    const result = formatEntity(data, "user");

    expect(result.data).toHaveProperty("id", "123");
    expect(result.data).toHaveProperty("name", "Test");
    expect(result.data).not.toHaveProperty("nullField");
    expect(result.data).not.toHaveProperty("undefinedField");
    expect(result.data).not.toHaveProperty("emptyString");
  });

  it("passes through primitive data without compaction", () => {
    const result = formatEntity("simple string", "text");
    expect(result.status).toBe("success");
    expect(result.data).toBe("simple string");
  });

  it("preserves zero and false values during compaction", () => {
    const result = formatEntity({ count: 0, active: false, name: "x" }, "item");
    expect(result.data).toHaveProperty("count", 0);
    expect(result.data).toHaveProperty("active", false);
  });
});

describe("formatEntityList", () => {
  it("wraps items in list envelope with correct count", () => {
    const items = [
      { _id: "1", name: "Item 1" },
      { _id: "2", name: "Item 2" },
    ];
    const result = formatEntityList(items, "item");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("list");
    expect(result.data).toHaveLength(2);
  });

  it("extracts _id into sys.id for each item", () => {
    const items = [
      { _id: "item-1", name: "A" },
      { _id: "item-2", name: "B" },
    ];
    const result = formatEntityList(items, "widget");

    expect(result.data![0]!.sys).toEqual({ entity: "widget", id: "item-1" });
    expect(result.data![1]!.sys).toEqual({ entity: "widget", id: "item-2" });
  });

  it("compacts each item's data", () => {
    const items = [{ _id: "1", name: "Item", nullField: null }];
    const result = formatEntityList(items, "item");

    expect(result.data![0]!.data).not.toHaveProperty("nullField");
    expect(result.data![0]!.data).toHaveProperty("name", "Item");
  });

  it("returns empty data array for empty input", () => {
    const result = formatEntityList([], "item");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("list");
    expect(result.data).toEqual([]);
  });
});

describe("formatErrorEntity", () => {
  it("formats string error into error envelope", () => {
    const result = formatErrorEntity("Something went wrong");

    expect(result.status).toBe("error");
    expect(result.sys.entity).toBe("error");
    expect(result.error).toBe("Something went wrong");
  });

  it("extracts message from Error object", () => {
    const result = formatErrorEntity(new Error("Database connection failed"));
    expect(result.error).toBe("Database connection failed");
  });

  it("passes through structured error object with code", () => {
    const error = { message: "Not found", code: "NOT_FOUND" };
    const result = formatErrorEntity(error);
    expect(result.error).toEqual({ message: "Not found", code: "NOT_FOUND" });
  });

  it("preserves error details when present", () => {
    const error = {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { field: "email", reason: "invalid format" },
    };
    const result = formatErrorEntity(error);
    expect(result.error).toEqual(error);
  });
});
