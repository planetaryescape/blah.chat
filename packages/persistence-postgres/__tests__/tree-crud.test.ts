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

  test("persists comparison siblings on a branched tree and derives the active path from the chosen sibling", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "user_compare",
      email: "compare@example.com",
      name: "Compare User",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Compare Chat",
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
    const branchedAssistant = await messages.create({
      conversationId: conversation.id,
      role: "assistant",
      content: "Branch answer",
      parentMessageIds: [rootUser.id],
      siblingIndex: 0,
    });
    const followUpUser = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Compare these models",
      parentMessageIds: [branchedAssistant.id],
      siblingIndex: 0,
    });
    const leftAssistant = await messages.create({
      conversationId: conversation.id,
      role: "assistant",
      content: "Model A answer",
      model: "openai:gpt-5",
      comparisonGroupId: "comparison_123",
      parentMessageIds: [followUpUser.id],
      siblingIndex: 0,
    });
    const rightAssistant = await messages.create({
      conversationId: conversation.id,
      role: "assistant",
      content: "Model B answer",
      model: "anthropic:claude-sonnet-4",
      comparisonGroupId: "comparison_123",
      parentMessageIds: [followUpUser.id],
      siblingIndex: 1,
    });

    await conversations.setActiveLeaf({
      conversationId: conversation.id,
      activeLeafMessageId: rightAssistant.id,
    });

    const activePath = await conversations.getActivePath(conversation.id);
    const comparisonSiblings = await messages.listSiblings({
      conversationId: conversation.id,
      parentMessageId: followUpUser.id,
    });

    expect(activePath.map((message) => message.id)).toEqual([
      rootUser.id,
      branchedAssistant.id,
      followUpUser.id,
      rightAssistant.id,
    ]);
    expect(comparisonSiblings.map((message) => message.id)).toEqual([
      leftAssistant.id,
      rightAssistant.id,
    ]);
    expect(
      comparisonSiblings.map((message) => message.comparisonGroupId),
    ).toEqual(["comparison_123", "comparison_123"]);
    expect(comparisonSiblings.map((message) => message.rootMessageId)).toEqual([
      rootUser.id,
      rootUser.id,
    ]);
  });

  test("toggles pin and star state for a conversation", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "user_flags",
      email: "flags@example.com",
      name: "Flag User",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Flags Chat",
      model: "auto",
    });

    const pinned = await conversations.togglePin(conversation.id);
    const starred = await conversations.toggleStar(conversation.id);

    expect(pinned.pinned).toBe(true);
    expect(starred.starred).toBe(true);
  });
});
