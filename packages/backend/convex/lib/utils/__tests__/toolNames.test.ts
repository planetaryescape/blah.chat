import { describe, expect, it } from "vitest";

import {
  MAX_TOOL_NAME_LENGTH,
  normalizeToolName,
  normalizeToolRecordKeys,
} from "../../toolNames";

describe("normalizeToolName", () => {
  it("keeps valid short names unchanged", () => {
    expect(normalizeToolName("searchFiles_123")).toBe("searchFiles_123");
  });

  it("sanitizes invalid characters", () => {
    expect(normalizeToolName("GITHUB.CREATE ISSUE!!")).toBe(
      "GITHUB_CREATE_ISSUE",
    );
  });

  it("truncates long names with deterministic hash suffix", () => {
    const longName = "a".repeat(80);
    const normalized = normalizeToolName(longName);

    expect(normalized).toMatch(/^a{55}_[a-f0-9]{8}$/);
    expect(normalized).toHaveLength(MAX_TOOL_NAME_LENGTH);
  });

  it("is deterministic for the same long input", () => {
    const longName = "composio-tool-".repeat(8);

    expect(normalizeToolName(longName)).toBe(normalizeToolName(longName));
  });

  it("falls back to tool when name sanitizes to empty", () => {
    expect(normalizeToolName("!!!")).toBe("tool");
  });
});

describe("normalizeToolRecordKeys", () => {
  it("dedupes collisions after normalization", () => {
    const toolA = { id: "a" };
    const toolB = { id: "b" };
    const { normalizedTools, renames } = normalizeToolRecordKeys({
      "tool@name": toolA,
      "tool name": toolB,
    });

    const entries = Object.entries(normalizedTools);
    expect(entries).toHaveLength(2);
    expect(entries[0][0]).toBe("tool_name");
    expect(entries[0][1]).toBe(toolA);
    expect(entries[1][0]).toMatch(/^tool_name_[a-f0-9]{6}[0-9a-z]+$/);
    expect(entries[1][1]).toBe(toolB);

    expect(renames).toEqual([
      { from: "tool@name", to: "tool_name", reason: "invalid_chars" },
      {
        from: "tool name",
        to: entries[1][0],
        reason: "collision",
      },
    ]);
  });

  it("preserves values and reports rename reasons accurately", () => {
    const unchangedTool = { value: 1 };
    const longTool = { value: 2 };
    const invalidTool = { value: 3 };

    const longName = "x".repeat(75);
    const { normalizedTools, renames } = normalizeToolRecordKeys({
      stableTool: unchangedTool,
      [longName]: longTool,
      "invalid name": invalidTool,
    });

    expect(normalizedTools.stableTool).toBe(unchangedTool);
    expect(
      Object.entries(normalizedTools).find(
        ([, value]) => value === longTool,
      )?.[0],
    ).toMatch(/^x{55}_[a-f0-9]{8}$/);
    expect(normalizedTools.invalid_name).toBe(invalidTool);

    expect(renames).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: longName,
          reason: "too_long",
        }),
        {
          from: "invalid name",
          to: "invalid_name",
          reason: "invalid_chars",
        },
      ]),
    );
  });

  it("handles repeated empty fallbacks with collision-safe suffixes", () => {
    const first = { id: 1 };
    const second = { id: 2 };

    const { normalizedTools, renames } = normalizeToolRecordKeys({
      "!!!": first,
      "???": second,
    });

    const keys = Object.keys(normalizedTools);
    expect(keys[0]).toBe("tool");
    expect(keys[1]).toMatch(/^tool_[a-f0-9]{6}[0-9a-z]+$/);
    expect(normalizedTools.tool).toBe(first);
    expect(normalizedTools[keys[1]]).toBe(second);
    expect(renames).toEqual([
      { from: "!!!", to: "tool", reason: "empty" },
      { from: "???", to: keys[1], reason: "collision" },
    ]);
  });

  it("supports more than 128 collisions without throwing", () => {
    const tools = Object.fromEntries(
      Array.from({ length: 200 }, (_value, index) => [
        "!".repeat(index + 1),
        { id: index },
      ]),
    );

    const { normalizedTools } = normalizeToolRecordKeys(tools);
    const keys = Object.keys(normalizedTools);

    expect(keys).toHaveLength(200);
    expect(new Set(keys).size).toBe(200);
    expect(keys.every((key) => key.length <= MAX_TOOL_NAME_LENGTH)).toBe(true);
  });

  it("syncs internal tool.name with normalized key when present", () => {
    const toolA = {
      name: "name with spaces and way too long ".repeat(3),
      execute: () => "ok",
    };
    const toolB = {
      name: "still invalid !!",
      execute: () => "ok",
    };

    const { normalizedTools } = normalizeToolRecordKeys({
      "invalid name": toolA,
      "invalid-name": toolB,
    });

    for (const [key, value] of Object.entries(normalizedTools)) {
      expect((value as { name?: string }).name).toBe(key);
      expect(key.length).toBeLessThanOrEqual(MAX_TOOL_NAME_LENGTH);
    }
  });
});
