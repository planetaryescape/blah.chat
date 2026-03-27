import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexConversation } from "../types";
import { transformConversation } from "./conversations";

const makeConvo = (
  overrides?: Partial<ConvexConversation>,
): ConvexConversation => ({
  _id: "j57conv1",
  _creationTime: 1700000000000,
  userId: "j57user1",
  title: "Chat about TypeScript",
  model: "gpt-4o",
  pinned: false,
  archived: false,
  starred: true,
  lastMessageAt: 1700000001000,
  createdAt: 1700000000000,
  updatedAt: 1700000001000,
  ...overrides,
});

describe("transformConversation", () => {
  it("maps core fields with ID remapping", () => {
    const idMap = new IdMap();
    const result = transformConversation(makeConvo(), idMap);
    expect(result.userId).toBe(idMap.get("users", "j57user1"));
    expect(result.title).toBe("Chat about TypeScript");
    expect(result.model).toBe("gpt-4o");
    expect(result.starred).toBe(true);
  });

  it("sets activeLeafMessageId to null on first pass", () => {
    const idMap = new IdMap();
    const result = transformConversation(
      makeConvo({ activeLeafMessageId: "msg1" }),
      idMap,
    );
    expect(result.activeLeafMessageId).toBeNull();
  });

  it("resolves activeLeafMessageId on second pass", () => {
    const idMap = new IdMap();
    // Pre-seed the message ID
    idMap.get("messages", "msg1");

    const result = transformConversation(
      makeConvo({ activeLeafMessageId: "msg1" }),
      idMap,
      { resolveActiveLeaf: true },
    );
    expect(result.activeLeafMessageId).toBe(idMap.get("messages", "msg1"));
  });

  it("maps projectId via idMap when present", () => {
    const idMap = new IdMap();
    const result = transformConversation(
      makeConvo({ projectId: "j57proj1" }),
      idMap,
    );
    expect(result.projectId).toBe(idMap.get("projects", "j57proj1"));
  });

  it("sets projectId to null when absent", () => {
    const idMap = new IdMap();
    const result = transformConversation(makeConvo(), idMap);
    expect(result.projectId).toBeNull();
  });

  it("maps incognitoSettings when present", () => {
    const idMap = new IdMap();
    const result = transformConversation(
      makeConvo({
        isIncognito: true,
        incognitoSettings: {
          enableReadTools: true,
          applyCustomInstructions: false,
          lastActivityAt: 1700000000000,
        },
      }),
      idMap,
    );
    expect(result.isIncognito).toBe(true);
    expect(result.incognitoSettings).toEqual({
      enableReadTools: true,
      applyCustomInstructions: false,
      inactivityTimeoutMinutes: undefined,
      lastActivityAt: 1700000000000,
    });
  });

  it("drops legacy fields (messageCount, tokenUsage, mode, systemPrompt)", () => {
    const idMap = new IdMap();
    const result = transformConversation(
      makeConvo({
        messageCount: 42,
        tokenUsage: {
          systemTokens: 100,
          messagesTokens: 200,
          memoriesTokens: 50,
          totalTokens: 350,
          contextLimit: 128000,
          lastCalculatedAt: 1700000000000,
        },
        mode: "document",
        systemPrompt: "You are helpful",
      }),
      idMap,
    );
    expect(result).not.toHaveProperty("messageCount");
    expect(result).not.toHaveProperty("tokenUsage");
    expect(result).not.toHaveProperty("mode");
    expect(result).not.toHaveProperty("systemPrompt");
  });

  it("maps modelRecommendation stripping costReduction", () => {
    const idMap = new IdMap();
    const result = transformConversation(
      makeConvo({
        modelRecommendation: {
          suggestedModelId: "gpt-4o-mini",
          currentModelId: "gpt-4o",
          reasoning: "Cheaper",
          estimatedSavings: {
            costReduction: "$0.30 → $0.02",
            percentSaved: 93,
          },
          createdAt: 1700000000000,
          dismissed: false,
        },
      }),
      idMap,
    );
    const rec = result.modelRecommendation as Record<string, unknown>;
    expect(rec.suggestedModelId).toBe("gpt-4o-mini");
    // PG schema only has percentSaved, not costReduction
    expect((rec.estimatedSavings as Record<string, unknown>).percentSaved).toBe(
      93,
    );
    expect(
      (rec.estimatedSavings as Record<string, unknown>).costReduction,
    ).toBeUndefined();
  });
});
