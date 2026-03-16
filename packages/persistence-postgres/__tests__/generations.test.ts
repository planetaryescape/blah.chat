import { createConversationRepository } from "../src/repositories/conversations";
import { createGenerationRepository } from "../src/repositories/generations";
import { createUserRepository } from "../src/repositories/users";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("generation repository", () => {
  test("creates the full single-model generation envelope and advances the active leaf", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const generations = createGenerationRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "user_gen",
      email: "gen@example.com",
      name: "Gen User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Generation Chat",
      model: "auto",
    });

    const created = await generations.createSingleModel({
      conversationId: conversation.id,
      userId: user.id,
      content: "Hello there",
      modelId: "openai:gpt-5-mini",
    });
    const activePath = await conversations.getActivePath(conversation.id);

    expect(created.request.requestedModels).toEqual(["openai:gpt-5-mini"]);
    expect(created.session.assistantMessageId).toBe(
      created.assistantMessage.id,
    );
    expect(created.assistantMessage.status).toBe("pending");
    expect(activePath.map((message) => message.id)).toEqual([
      created.userMessage.id,
      created.assistantMessage.id,
    ]);
  });
});
