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
  it("wraps data in success envelope", () => {
    const data = { id: "123", name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("user");
    expect(result.data).toMatchObject({ id: "123", name: "Test" });
  });

  it("includes id in sys when provided", () => {
    const data = { name: "Test" };
    const result = formatEntity(data, "user", "user-123");

    expect(result.sys.id).toBe("user-123");
  });

  it("omits id from sys when not provided", () => {
    const data = { name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.sys.id).toBeUndefined();
  });

  it("includes created timestamp from _creationTime", () => {
    const creationTime = 1703001600000; // 2023-12-19
    const data = { _creationTime: creationTime, name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.sys.timestamps?.created).toBe(
      new Date(creationTime).toISOString(),
    );
  });

  it("includes updated timestamp from updatedAt", () => {
    const updatedAt = 1703088000000; // 2023-12-20
    const data = { updatedAt, name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.sys.timestamps?.updated).toBe(
      new Date(updatedAt).toISOString(),
    );
  });

  it("always includes retrieved timestamp", () => {
    const data = { name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.sys.timestamps?.retrieved).toBeDefined();
    // Should be a valid ISO string
    expect(() => new Date(result.sys.timestamps!.retrieved!)).not.toThrow();
  });

  it("compacts null fields from data", () => {
    const data = { id: "123", name: "Test", nullField: null };
    const result = formatEntity(data, "user");

    expect(result.data).not.toHaveProperty("nullField");
    expect(result.data).toHaveProperty("id", "123");
  });

  it("compacts undefined fields from data", () => {
    const data = { id: "123", name: "Test", undefinedField: undefined };
    const result = formatEntity(data, "user");

    expect(result.data).not.toHaveProperty("undefinedField");
  });

  it("compacts empty string fields from data", () => {
    const data = { id: "123", name: "Test", emptyString: "" };
    const result = formatEntity(data, "user");

    expect(result.data).not.toHaveProperty("emptyString");
  });

  it("handles primitive data types", () => {
    const result = formatEntity("simple string", "text");

    expect(result.status).toBe("success");
    expect(result.data).toBe("simple string");
  });
});

describe("formatEntityList", () => {
  it("wraps items array in list envelope", () => {
    const items = [
      { _id: "1", name: "Item 1" },
      { _id: "2", name: "Item 2" },
    ];
    const result = formatEntityList(items, "item");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("list");
    expect(result.data).toHaveLength(2);
  });

  it("includes entity type and id for each item", () => {
    const items = [
      { _id: "item-1", name: "Item 1" },
      { _id: "item-2", name: "Item 2" },
    ];
    const result = formatEntityList(items, "item");

    expect(result.data![0]!.sys.entity).toBe("item");
    expect(result.data![0]!.sys.id).toBe("item-1");
    expect(result.data![1]!.sys.entity).toBe("item");
    expect(result.data![1]!.sys.id).toBe("item-2");
  });

  it("compacts each item data", () => {
    const items = [{ _id: "1", name: "Item", nullField: null }];
    const result = formatEntityList(items, "item");

    expect(result.data![0]!.data).not.toHaveProperty("nullField");
    expect(result.data![0]!.data).toHaveProperty("name", "Item");
  });

  it("handles empty array", () => {
    const result = formatEntityList([], "item");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("list");
    expect(result.data).toHaveLength(0);
  });
});

describe("formatErrorEntity", () => {
  it("formats string error", () => {
    const result = formatErrorEntity("Something went wrong");

    expect(result.status).toBe("error");
    expect(result.sys.entity).toBe("error");
    expect(result.error).toBe("Something went wrong");
  });

  it("formats Error object", () => {
    const error = new Error("Database connection failed");
    const result = formatErrorEntity(error);

    expect(result.status).toBe("error");
    expect(result.sys.entity).toBe("error");
    expect(result.error).toBe("Database connection failed");
  });

  it("formats error object with message and code", () => {
    const error = { message: "Not found", code: "NOT_FOUND" };
    const result = formatErrorEntity(error);

    expect(result.status).toBe("error");
    expect(result.sys.entity).toBe("error");
    expect(result.error).toEqual({ message: "Not found", code: "NOT_FOUND" });
  });

  it("formats error object with details", () => {
    const error = {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { field: "email", reason: "invalid format" },
    };
    const result = formatErrorEntity(error);

    expect(result.error).toEqual(error);
  });
});
