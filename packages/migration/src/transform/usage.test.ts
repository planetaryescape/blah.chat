import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexUsageRecord } from "../types";
import { transformUsageRecord } from "./usage";

describe("transformUsageRecord", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const doc: ConvexUsageRecord = {
      _id: "ur1",
      _creationTime: 1700000000000,
      userId: "user1",
      date: "2024-01-15",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 200,
      cost: 0.005,
      messageCount: 1,
    };
    const result = transformUsageRecord(doc, idMap);
    expect(result.model).toBe("gpt-4o");
    expect(result.inputTokens).toBe(100);
    expect(result.cost).toBe(0.005);
  });

  it("maps deprecated 'slides' feature to 'chat'", () => {
    const idMap = new IdMap();
    const doc: ConvexUsageRecord = {
      _id: "ur2",
      _creationTime: 1700000000000,
      userId: "user1",
      date: "2024-01-15",
      model: "gpt-4o",
      feature: "slides",
      inputTokens: 50,
      outputTokens: 100,
      cost: 0.003,
      messageCount: 1,
    };
    const result = transformUsageRecord(doc, idMap);
    expect(result.feature).toBe("chat");
  });

  it("drops presentationId and warningsSent", () => {
    const idMap = new IdMap();
    const doc: ConvexUsageRecord = {
      _id: "ur3",
      _creationTime: 1700000000000,
      userId: "user1",
      date: "2024-01-15",
      model: "gpt-4o",
      presentationId: "pres123",
      warningsSent: ["budget_80"],
      inputTokens: 50,
      outputTokens: 100,
      cost: 0.003,
      messageCount: 1,
    };
    const result = transformUsageRecord(doc, idMap);
    expect(result).not.toHaveProperty("presentationId");
    expect(result).not.toHaveProperty("warningsSent");
  });

  it("defaults feature to chat and maps optional fields", () => {
    const idMap = new IdMap();
    const doc: ConvexUsageRecord = {
      _id: "ur4",
      _creationTime: 1700000000000,
      userId: "user1",
      date: "2024-01-15",
      model: "anthropic:claude-3-opus",
      conversationId: "conv1",
      inputTokens: 200,
      outputTokens: 400,
      reasoningTokens: 800,
      cost: 0.01,
      messageCount: 1,
      isByok: true,
    };
    const result = transformUsageRecord(doc, idMap);
    expect(result.feature).toBeNull();
    expect(result.conversationId).toBe(idMap.get("conversations", "conv1"));
    expect(result.reasoningTokens).toBe(800);
    expect(result.isByok).toBe(true);
    expect(result.date).toBe("2024-01-15");
    expect(result.outputTokens).toBe(400);
  });
});
