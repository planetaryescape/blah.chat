import { MODEL_CONFIG } from "@blah-chat/ai/models";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";
import { dbToModelConfig, modelConfigToDb } from "../transforms";

describe("tiered model pricing transforms", () => {
  it("preserves long-context rates through the database-backed picker", () => {
    const db = modelConfigToDb(MODEL_CONFIG["openrouter:gpt-6.1-sol"]);
    const tiers = [
      { minInputTokens: 272000, input: 4, output: 15, cached: 0.2 },
    ];
    expect(db.pricingTiers).toEqual(tiers);
    const restored = dbToModelConfig({
      ...db,
      // SAFETY: transforms never access storage; only a nominal test document ID.
      _id: "test-model" as Id<"models">,
      _creationTime: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    expect(restored.pricing).toEqual({
      input: 2,
      output: 10,
      cached: 0.1,
      reasoning: undefined,
      tiers,
    });
    expect(restored.actualModelId).toBe("openai/gpt-6.1-sol");
  });
});
