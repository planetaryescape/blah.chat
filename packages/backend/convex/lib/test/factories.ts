import type { Doc, Id } from "../../_generated/dataModel";

export function createTestUserData(
  overrides: Partial<Omit<Doc<"users">, "_id" | "_creationTime">> = {},
): Omit<Doc<"users">, "_id" | "_creationTime"> {
  const now = Date.now();
  return {
    clerkId: `clerk-${crypto.randomUUID()}`,
    email: "test@example.com",
    name: "Test User",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestConversationData(
  userId: Id<"users">,
  overrides: Partial<
    Omit<Doc<"conversations">, "_id" | "_creationTime" | "userId">
  > = {},
): Omit<Doc<"conversations">, "_id" | "_creationTime"> {
  const now = Date.now();
  return {
    userId,
    title: "Test Conversation",
    model: "gpt-4o",
    pinned: false,
    archived: false,
    starred: false,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestMessageData(
  conversationId: Id<"conversations">,
  userId: Id<"users">,
  overrides: Partial<
    Omit<Doc<"messages">, "_id" | "_creationTime" | "conversationId" | "userId">
  > = {},
): Omit<Doc<"messages">, "_id" | "_creationTime"> {
  const now = Date.now();
  return {
    conversationId,
    userId,
    role: "user",
    content: "Test message",
    status: "complete",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockIdentity(
  overrides: Partial<{
    subject: string;
    email: string;
    name: string;
  }> = {},
) {
  return {
    subject: overrides.subject ?? `clerk-${crypto.randomUUID()}`,
    email: overrides.email ?? "test@example.com",
    name: overrides.name ?? "Test User",
  };
}

export function createTestUsageRecordData(
  userId: Id<"users">,
  overrides: Partial<
    Omit<Doc<"usageRecords">, "_id" | "_creationTime" | "userId">
  > = {},
): Omit<Doc<"usageRecords">, "_id" | "_creationTime"> {
  return {
    userId,
    date: new Date().toISOString().split("T")[0],
    model: "openai:gpt-4o",
    inputTokens: 1000,
    outputTokens: 500,
    cost: 0.05,
    messageCount: 1,
    ...overrides,
  };
}
