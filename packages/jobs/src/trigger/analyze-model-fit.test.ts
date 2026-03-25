import { MODEL_CONFIG } from "@blah-chat/ai/models";
import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { analyzeModelFitForConversation } from "./analyze-model-fit";

describe("analyzeModelFitForConversation", () => {
  it("persists a Postgres model recommendation for an expensive conversation model", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_model_triage",
      email: "model-triage@example.com",
      name: "Model Triage",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Expensive model",
      model: "openai:gpt-5",
    });

    const userMessage = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content:
        "Summarize the notes from today's standup and highlight blockers.",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Here is the summary.",
      parentMessageIds: [userMessage.id],
      siblingIndex: 0,
    });

    const result = await analyzeModelFitForConversation(
      {
        conversationId: conversation.id,
        userMessage: userMessage.content,
        currentModelId: "openai:gpt-5",
      },
      {
        db,
        now: () => 123,
        analyzePromptComplexity: async () => ({
          shouldRecommend: true,
          recommendedModel: "openai:gpt-5-mini",
          reasoning:
            "The request is straightforward summarization and does not need the premium model.",
        }),
      },
    );

    expect(result).toMatchObject({
      success: true,
      recommendedModel: "openai:gpt-5-mini",
    });

    const updatedConversation = await db.query.conversations.findFirst({
      where: (table, { eq }) => eq(table.id, conversation.id),
    });

    const currentModel = MODEL_CONFIG["openai:gpt-5"];
    const suggestedModel = MODEL_CONFIG["openai:gpt-5-mini"];
    const currentAvg =
      (currentModel.pricing.input + currentModel.pricing.output) / 2;
    const suggestedAvg =
      (suggestedModel.pricing.input + suggestedModel.pricing.output) / 2;
    const expectedPercentSaved = Math.round(
      ((currentAvg - suggestedAvg) / currentAvg) * 100,
    );

    expect(updatedConversation?.modelRecommendation).toEqual({
      suggestedModelId: "openai:gpt-5-mini",
      currentModelId: "openai:gpt-5",
      reasoning:
        "The request is straightforward summarization and does not need the premium model.",
      estimatedSavings: {
        percentSaved: expectedPercentSaved,
      },
      createdAt: 123,
      dismissed: false,
    });
  });
});
