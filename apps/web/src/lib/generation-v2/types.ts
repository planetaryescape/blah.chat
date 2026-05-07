import type { GenerationEvent } from "@blah-chat/streaming-core";

export interface GenerationPromptMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GenerationSource {
  position: number;
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string;
}

export interface GenerationToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  textPosition?: number;
  isPartial?: boolean;
  timestamp: number;
}

export interface GenerationRequestIntegrationSnapshot {
  integrationId: string;
  integrationName: string;
  composioConnectionId?: string | null;
  connectionStatus?: string | null;
}

export interface GenerationProviderStreamInput {
  modelId: string;
  userId: string;
  conversationId: string;
  requestId: string;
  sessionId: string;
  messages: GenerationPromptMessage[];
  integrations?: GenerationRequestIntegrationSnapshot[];
  tools?: Record<string, unknown>;
  signal?: AbortSignal;
  byokGatewayKey?: string;
}

export type ResolveByokKeysFn = (userId: string) => Promise<{
  enabled: boolean;
  gatewayKey?: string;
  openRouterKey?: string;
  groqKey?: string;
  deepgramKey?: string;
}>;

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  costUsd?: number;
}

export interface GenerationProvider {
  streamText(
    input: GenerationProviderStreamInput,
  ): AsyncIterable<string> | AsyncGenerator<string>;
  getToolCalls?(input: {
    requestId: string;
    sessionId: string;
  }): Promise<GenerationToolCall[]>;
  getSources?(input: {
    requestId: string;
    sessionId: string;
  }): Promise<GenerationSource[]>;
  getUsage?(input: {
    requestId: string;
    sessionId: string;
  }): Promise<GenerationUsage | null>;
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
  clientMessageId?: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: string;
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
  requestStatus: string;
  conversationId: string;
  userId: string;
  userMessageId: string;
  requestedModelIds: string[];
  integrations: GenerationRequestIntegrationSnapshot[];
  promptMessages: Array<{ role: string; content: string }>;
  sessions: PersistedSessionBundle[];
}
