import type { GenerationEvent } from "@blah-chat/streaming-core";

export interface GenerationPromptMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GenerationProviderStreamInput {
  modelId: string;
  userId: string;
  conversationId: string;
  requestId: string;
  sessionId: string;
  messages: GenerationPromptMessage[];
  signal?: AbortSignal;
}

export interface GenerationProvider {
  streamText(
    input: GenerationProviderStreamInput,
  ): AsyncIterable<string> | AsyncGenerator<string>;
}

export interface GenerationEventStore {
  append(requestId: string, event: GenerationEvent): Promise<number>;
  read(
    requestId: string,
    cursor?: number,
  ): Promise<{ events: GenerationEvent[]; nextCursor: number }>;
  setCancelled(requestId: string, cancelled: boolean): Promise<void>;
  isCancelled(requestId: string): Promise<boolean>;
  setSessionCancelled(sessionId: string, cancelled: boolean): Promise<void>;
  isSessionCancelled(sessionId: string): Promise<boolean>;
  setRequestStatus(requestId: string, status: string): Promise<void>;
  getRequestStatus(requestId: string): Promise<string | null>;
}

export interface ClerkUserProfile {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
}

export interface StartGenerationInput {
  clerkUser: ClerkUserProfile;
  conversationId: string;
  content: string;
  modelId?: string;
  models?: string[];
}

export interface StartedGeneration {
  requestId: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageIds: string[];
  modelIds: string[];
}

export interface PersistedSessionBundle {
  sessionId: string;
  assistantMessageId: string;
  modelId: string;
  provider: string | null;
  status: string;
}

export interface PersistedRequestBundle {
  requestId: string;
  conversationId: string;
  userId: string;
  userMessageId: string;
  promptMessages: Array<{ role: string; content: string }>;
  sessions: PersistedSessionBundle[];
}
