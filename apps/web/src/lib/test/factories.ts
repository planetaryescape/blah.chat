/**
 * Test data factories
 * Uses EXISTING project types - does not create new ones
 */
import type { ApiResponse } from "@/lib/api/types";
import type { OptimisticMessage, QueuedMessage } from "@/types/optimistic";

/**
 * Factory for OptimisticMessage
 * Uses existing type from src/types/optimistic.ts
 */
export function createOptimisticMessage(
  overrides: Partial<OptimisticMessage> = {},
): OptimisticMessage {
  const now = Date.now();
  return {
    _id: `temp-${crypto.randomUUID()}`,
    conversationId: "test-conversation-id" as any,
    role: "user",
    content: "Test message content",
    status: "optimistic",
    createdAt: now,
    updatedAt: now,
    _creationTime: now,
    _optimistic: true,
    ...overrides,
  };
}

/**
 * Factory for API success responses
 * Uses existing ApiResponse<T> type from src/lib/api/types.ts
 */
export function createApiResponse<T>(
  data: T,
  entity: string,
  id?: string,
): ApiResponse<T> {
  return {
    status: "success",
    sys: {
      entity,
      ...(id && { id }),
      timestamps: {
        retrieved: new Date().toISOString(),
      },
    },
    data,
  };
}

/**
 * Factory for API error responses
 * Uses existing ApiResponse<never> type
 */
export function createApiError(
  message: string,
  code?: string,
): ApiResponse<never> {
  return {
    status: "error",
    sys: {
      entity: "error",
    },
    error: code ? { message, code } : message,
  };
}

/**
 * Factory for QueuedMessage (offline mode)
 * Uses existing type from src/types/optimistic.ts
 */
export function createQueuedMessage(
  overrides: Partial<QueuedMessage> = {},
): QueuedMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: "test-conversation-id" as any,
    content: "Queued test message",
    timestamp: Date.now(),
    retries: 0,
    ...overrides,
  };
}

// =============================================================================
// Convex Document Factories (for convex-test)
// =============================================================================

/**
 * Factory for test user (Convex document)
 * Uses existing any type from convex/_generated/dataModel
 */
export function createTestUserData(
  overrides: Partial<Omit<any, "_id" | "_creationTime">> = {},
): Omit<any, "_id" | "_creationTime"> {
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

/**
 * Factory for test conversation (Convex document)
 * Uses existing any type
 */
export function createTestConversationData(
  userId: string,
  overrides: Partial<Omit<any, "_id" | "_creationTime" | "userId">> = {},
): Omit<any, "_id" | "_creationTime"> {
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

/**
 * Factory for test message (Convex document)
 * Uses existing any type
 */
export function createTestMessageData(
  conversationId: string,
  userId: string,
  overrides: Partial<
    Omit<any, "_id" | "_creationTime" | "conversationId" | "userId">
  > = {},
): Omit<any, "_id" | "_creationTime"> {
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

/**
 * Mock Clerk identity for convex-test withIdentity()
 */
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

/**
 * Factory for test usage record (Convex document)
 * Uses existing any type
 */
export function createTestUsageRecordData(
  userId: string,
  overrides: Partial<Omit<any, "_id" | "_creationTime" | "userId">> = {},
): Omit<any, "_id" | "_creationTime"> {
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
