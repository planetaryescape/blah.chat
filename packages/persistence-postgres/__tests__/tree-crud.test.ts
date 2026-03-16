import { createConversationRepository } from "../src/repositories/conversations";
import { createMessageRepository } from "../src/repositories/messages";
import { createUserRepository } from "../src/repositories/users";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("tree CRUD repositories", () => {
  test("upserts a user and updates the same row on the second call", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);

    const created = await users.upsertFromClerk({
      clerkId: "user_123",
      email: "first@example.com",
      name: "First Name",
      imageUrl: "https://example.com/a.png",
    });
    const updated = await users.upsertFromClerk({
      clerkId: "user_123",
      email: "second@example.com",
      name: "Second Name",
      imageUrl: "https://example.com/b.png",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.email).toBe("second@example.com");
    expect(updated.name).toBe("Second Name");
  });

  test("creates a conversation tree, switches the active leaf, and derives the active path", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "user_tree",
      email: "tree@example.com",
      name: "Tree User",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Tree Chat",
      model: "auto",
    });

    const rootUser = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Root question",
      parentMessageIds: [],
      siblingIndex: 0,
    });
    const firstAssistant = await messages.create({
      conversationId: conversation.id,
      role: "assistant",
      content: "First answer",
      parentMessageIds: [rootUser.id],
      siblingIndex: 0,
    });
    const secondAssistant = await messages.create({
      conversationId: conversation.id,
      role: "assistant",
      content: "Better answer",
      parentMessageIds: [rootUser.id],
      siblingIndex: 1,
      forkReason: "regenerate",
    });

    await conversations.setActiveLeaf({
      conversationId: conversation.id,
      activeLeafMessageId: secondAssistant.id,
    });

    const activePath = await conversations.getActivePath(conversation.id);
    const siblings = await messages.listSiblings({
      conversationId: conversation.id,
      parentMessageId: rootUser.id,
    });

    expect(activePath.map((message) => message.id)).toEqual([
      rootUser.id,
      secondAssistant.id,
    ]);
    expect(siblings.map((message) => message.id)).toEqual([
      firstAssistant.id,
      secondAssistant.id,
    ]);
    expect(siblings[1]?.forkReason).toBe("regenerate");
  });
});
