import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { internal } from "../_generated/api";
import {
  createTestConversationData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

describe("direct text auto-routing fallback", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "GROQ_API_KEY",
    "CEREBRAS_API_KEY",
  ] as const)("routes without embedding or classifier requests when %s is configured", async (key) => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("CEREBRAS_API_KEY", "");
    vi.stubEnv(key, "test-direct-provider-key");
    // Any attempted embedding/classifier HTTP request must fail this test.
    const fetch = vi.fn(() =>
      Promise.reject(new Error("Unexpected auxiliary request")),
    );
    vi.stubGlobal("fetch", fetch);
    try {
      const t = convexTest(schema);
      const { userId, conversationId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", createTestUserData());
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return { userId, conversationId };
      });
      const result = await t.action(internal.ai.autoRouter.routeMessage, {
        userId,
        conversationId,
        userMessage: "Hello, can you help me write a short email?",
        hasAttachments: false,
        preferences: { costBias: 50, speedBias: 50 },
      });
      expect(result.selectedModelId).toBe("openai:gpt-oss-120b");
      expect(result.classification.confidence).toBe(0);
      expect(result.reasoning).toContain(
        "semantic routing is temporarily unavailable",
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
