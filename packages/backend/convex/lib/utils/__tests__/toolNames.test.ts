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
    expect(entries[1][0]).toMatch(/^tool_name_[a-f0-9]{8}$/);
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
    expect(keys[1]).toMatch(/^tool_[a-f0-9]{8}$/);
    expect(normalizedTools.tool).toBe(first);
    expect(normalizedTools[keys[1]]).toBe(second);
    expect(renames).toEqual([
      { from: "!!!", to: "tool", reason: "empty" },
      { from: "???", to: keys[1], reason: "collision" },
    ]);
  });
});
