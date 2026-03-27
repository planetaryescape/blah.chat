import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexToolCall } from "../types";
import { transformToolCall } from "./tool-calls";

describe("transformToolCall", () => {
  it("maps all fields with ID remapping", () => {
    const idMap = new IdMap();
    const doc: ConvexToolCall = {
      _id: "tc1",
      _creationTime: 1700000000000,
      messageId: "msg1",
      conversationId: "conv1",
      userId: "user1",
      toolCallId: "call_abc",
      toolName: "searchAll",
      args: { query: "test" },
      result: { results: [] },
      textPosition: 42,
      isPartial: false,
      timestamp: 1700000000000,
      createdAt: 1700000000000,
    };

    const result = transformToolCall(doc, idMap);
    expect(result.messageId).toBe(idMap.get("messages", "msg1"));
    expect(result.toolName).toBe("searchAll");
    expect(result.args).toEqual({ query: "test" });
    expect(result.result).toEqual({ results: [] });
    expect(result.textPosition).toBe(42);
    expect(result.isPartial).toBe(false);
  });

  it("sets optional fields to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexToolCall = {
      _id: "tc2",
      _creationTime: 1700000000000,
      messageId: "msg1",
      conversationId: "conv1",
      userId: "user1",
      toolCallId: "call_xyz",
      toolName: "urlReader",
      args: { url: "https://example.com" },
      isPartial: true,
      timestamp: 1700000000000,
      createdAt: 1700000000000,
    };

    const result = transformToolCall(doc, idMap);
    expect(result.result).toBeNull();
    expect(result.textPosition).toBeNull();
    expect(result.isPartial).toBe(true);
  });

  it("preserves args JSONB shape and maps timestamps", () => {
    const idMap = new IdMap();
    const doc: ConvexToolCall = {
      _id: "tc3",
      _creationTime: 1700000000000,
      messageId: "msg1",
      conversationId: "conv1",
      userId: "user1",
      toolCallId: "call_deep",
      toolName: "codeExecution",
      args: { code: "console.log(1)", language: "js" },
      result: { output: "1\n", exitCode: 0 },
      isPartial: false,
      timestamp: 1700000005000,
      createdAt: 1700000000000,
    };
    const result = transformToolCall(doc, idMap);
    expect(result.args).toEqual({ code: "console.log(1)", language: "js" });
    expect(result.result).toEqual({ output: "1\n", exitCode: 0 });
    expect(result.timestamp).toBe(1700000005000);
    expect(result.createdAt).toBe(1700000000000);
  });
});
