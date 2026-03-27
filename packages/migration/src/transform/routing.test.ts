import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexMessage, ConvexRoutingExample } from "../types";
import {
  transformRoutingDecisionFromMessage,
  transformRoutingExample,
} from "./routing";

describe("transformRoutingDecisionFromMessage", () => {
  it("extracts routing decision from message", () => {
    const idMap = new IdMap();
    const msg: ConvexMessage = {
      _id: "msg1",
      _creationTime: 1700000000000,
      conversationId: "conv1",
      userId: "user1",
      role: "assistant",
      content: "Hello",
      status: "complete",
      routingDecision: {
        selectedModelId: "gpt-4o-mini",
        classification: {
          primaryCategory: "general",
          complexity: "low",
          requiresVision: false,
          requiresLongContext: false,
          requiresReasoning: false,
          confidence: 0.95,
        },
        reasoning: "Simple question",
        routeLabel: "casual",
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformRoutingDecisionFromMessage(msg, idMap);
    expect(result).not.toBeNull();
    expect(result!.selectedModelId).toBe("gpt-4o-mini");
    expect(result!.routeLabel).toBe("casual");
    expect(result!.reasoning).toBe("Simple question");
  });

  it("returns null when no routingDecision", () => {
    const idMap = new IdMap();
    const msg: ConvexMessage = {
      _id: "msg2",
      _creationTime: 1700000000000,
      conversationId: "conv1",
      role: "user",
      content: "Hi",
      status: "complete",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    expect(transformRoutingDecisionFromMessage(msg, idMap)).toBeNull();
  });
});

describe("transformRoutingExample", () => {
  it("maps all fields", () => {
    const idMap = new IdMap();
    const doc: ConvexRoutingExample = {
      _id: "re1",
      _creationTime: 1700000000000,
      text: "What is the weather?",
      route_label: "factual",
      complexity: "low",
      source: "seed",
      embedding: [0.1, 0.2],
      createdAt: 1700000000000,
    };
    const result = transformRoutingExample(doc, idMap);
    expect(result.routeLabel).toBe("factual");
    expect(result.embedding).toBe("[0.1,0.2]");
    expect(result.complexity).toBe("low");
    expect(result.source).toBe("seed");
    expect(result.text).toBe("What is the weather?");
  });
});
