import createClient from "openapi-fetch";
import { BlahSDKError, unwrapEnvelope } from "./errors";
import type { paths } from "./generated/openapi";
import { type SSEEvent, type SSEStreamOptions, streamSSE } from "./sse";
import type {
  ActiveGeneration,
  ApiEnvelope,
  BackgroundJob,
  CliRpcMethodMap,
  Conversation,
  GenerationRequest,
  GenerationStreamEvent,
  Memory,
  Message,
  ThinkingEffort,
} from "./types";

interface RequestResult<TData = unknown, TError = unknown> {
  data?: TData;
  error?: TError;
  response: Response;
}

export interface BlahClientOptions {
  baseUrl?: string;
  apiKey?: string;
  getAccessToken?: () => Promise<string | null>;
  headers?: HeadersInit;
  fetch?: typeof fetch;
}

export interface SendMessagePayload {
  content: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: string;
  clientMessageId?: string;
  thinkingEffort?: ThinkingEffort;
  attachments?: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
  }>;
}

export class BlahClient {
  private readonly client: ReturnType<typeof createClient<paths>>;

  constructor(private readonly options: BlahClientOptions = {}) {
    this.client = createClient<paths>({
      baseUrl: this.baseUrl,
      fetch: this.fetchImpl,
    });
  }

  private get baseUrl(): string {
    const raw = this.options.baseUrl || "https://blah.chat";
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
  }

  private get fetchImpl(): typeof fetch {
    return this.options.fetch ?? fetch;
  }

  private async authHeaders(mode: "bearer" | "api-key"): Promise<HeadersInit> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.options.headers) {
      Object.assign(
        baseHeaders,
        this.options.headers as Record<string, string>,
      );
    }

    if (mode === "api-key") {
      const key = this.options.apiKey?.trim();
      if (!key) {
        throw new BlahSDKError(
          "API key is required for CLI RPC",
          401,
          "MISSING_API_KEY",
        );
      }

      baseHeaders["x-api-key"] = key;
      baseHeaders.Authorization = `Bearer ${key}`;
      return baseHeaders;
    }

    const token = await this.options.getAccessToken?.();
    if (!token) {
      throw new BlahSDKError(
        "Bearer token is required",
        401,
        "MISSING_BEARER_TOKEN",
      );
    }

    baseHeaders.Authorization = `Bearer ${token}`;
    return baseHeaders;
  }

  private toEnvelope<T>(payload: unknown): ApiEnvelope<T> {
    if (!payload || typeof payload !== "object") {
      throw new BlahSDKError(
        "Malformed API response",
        500,
        "MALFORMED_RESPONSE",
      );
    }

    return payload as ApiEnvelope<T>;
  }

  private unwrapFromResult<T>(result: RequestResult): T {
    const payload = result.data ?? result.error;
    const envelope = this.toEnvelope<T>(payload);

    if (!result.response.ok && envelope.status !== "error") {
      throw new BlahSDKError(
        `Request failed with status ${result.response.status}`,
        result.response.status,
      );
    }

    return unwrapEnvelope(envelope, result.response.status);
  }

  private async fetchEnvelope<T>(
    path: string,
    init: RequestInit,
    mode: "bearer" | "api-key",
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(await this.authHeaders(mode)),
        ...init.headers,
      },
    });

    const payload = (await response.json()) as unknown;
    const envelope = this.toEnvelope<T>(payload);

    if (!response.ok && envelope.status !== "error") {
      throw new BlahSDKError(
        `Request failed with status ${response.status}`,
        response.status,
      );
    }

    return unwrapEnvelope(envelope, response.status);
  }

  async health(): Promise<Record<string, unknown>> {
    const result = await this.client.GET("/api/v1/health");
    return this.unwrapFromResult<Record<string, unknown>>(
      result as RequestResult,
    );
  }

  async listConversations(
    params: { limit?: number; archived?: boolean; projectId?: string } = {},
  ): Promise<{ items: Conversation[]; total: number }> {
    const result = await this.client.GET("/api/v1/conversations", {
      headers: await this.authHeaders("bearer"),
      params: {
        // `projectId` is supported by runtime route; generated OpenAPI types lag.
        query: {
          limit: params.limit,
          archived: params.archived,
          projectId: params.projectId,
        } as any,
      },
    });

    return this.unwrapFromResult<{ items: Conversation[]; total: number }>(
      result as RequestResult,
    );
  }

  async createConversation(payload: {
    model: string;
    title?: string;
    systemPrompt?: string;
    isIncognito?: boolean;
    incognitoSettings?: {
      enableReadTools?: boolean;
      applyCustomInstructions?: boolean;
      inactivityTimeoutMinutes?: number;
    };
  }): Promise<Conversation> {
    const result = await this.client.POST("/api/v1/conversations", {
      headers: await this.authHeaders("bearer"),
      // Generated OpenAPI types can lag the runtime route during migration work.
      body: payload as any,
    });

    return this.unwrapFromResult<Conversation>(result as RequestResult);
  }

  async getConversationById(conversationId: string): Promise<Conversation> {
    const result = await this.client.GET("/api/v1/conversations/{id}", {
      headers: await this.authHeaders("bearer"),
      params: {
        path: {
          id: conversationId,
        },
      },
    });

    return this.unwrapFromResult<Conversation>(result as RequestResult);
  }

  async updateConversation(
    conversationId: string,
    payload: { title?: string; model?: string },
  ): Promise<Conversation> {
    const result = await this.client.PATCH("/api/v1/conversations/{id}", {
      headers: await this.authHeaders("bearer"),
      params: {
        path: {
          id: conversationId,
        },
      },
      body: payload,
    });

    return this.unwrapFromResult<Conversation>(result as RequestResult);
  }

  async archiveConversation(conversationId: string): Promise<Conversation> {
    return this.fetchEnvelope<Conversation>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/archive`,
      {
        method: "POST",
      },
      "bearer",
    );
  }

  async deleteConversation(
    conversationId: string,
  ): Promise<{ deleted: boolean; conversationId: string }> {
    return this.fetchEnvelope<{ deleted: boolean; conversationId: string }>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    const result = await this.client.GET(
      "/api/v1/conversations/{id}/messages",
      {
        headers: await this.authHeaders("bearer"),
        params: {
          path: {
            id: conversationId,
          },
        },
      },
    );

    const payload = (result.data ?? result.error) as unknown;
    if (!Array.isArray(payload)) {
      throw new BlahSDKError(
        "Malformed messages response",
        result.response.status,
      );
    }

    return payload.map((item) => {
      const envelope = this.toEnvelope<Message>(item);
      return unwrapEnvelope(envelope, result.response.status);
    });
  }

  async searchMessages(payload: {
    query: string;
    limit?: number;
    conversationId?: string;
    dateFrom?: number;
    dateTo?: number;
    messageType?: "user" | "assistant";
  }): Promise<Message[]> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/api/v1/search/hybrid`,
      {
        method: "POST",
        headers: await this.authHeaders("bearer"),
        body: JSON.stringify(payload),
      },
    );

    const result = (await response.json()) as unknown;
    const envelope = this.toEnvelope<Array<{ data: Message }>>(result);

    if (!response.ok && envelope.status !== "error") {
      throw new BlahSDKError(
        `Request failed with status ${response.status}`,
        response.status,
      );
    }

    const items = unwrapEnvelope<Array<{ data: Message }>>(
      envelope,
      response.status,
    );

    if (!Array.isArray(items)) {
      throw new BlahSDKError(
        "Malformed search response",
        response.status,
        "MALFORMED_RESPONSE",
      );
    }

    return items.map((item) => item.data);
  }

  async bulkCreateBookmarks(payload: {
    messageIds: string[];
    note?: string;
    tags?: string[];
  }): Promise<{ bookmarkedCount: number; bookmarkIds: string[] }> {
    return this.fetchEnvelope<{
      bookmarkedCount: number;
      bookmarkIds: string[];
    }>(
      "/api/v1/bookmarks/bulk",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async listMemories(
    params: {
      category?: string;
      sortBy?: "date" | "importance" | "confidence";
      searchQuery?: string;
      limit?: number;
    } = {},
  ): Promise<Memory[]> {
    const searchParams = new URLSearchParams();
    if (params.category) {
      searchParams.set("category", params.category);
    }
    if (params.sortBy) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params.searchQuery) {
      searchParams.set("searchQuery", params.searchQuery);
    }
    if (params.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const response = await this.fetchImpl(
      `${this.baseUrl}/api/v1/memories${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: await this.authHeaders("bearer"),
      },
    );

    const result = (await response.json()) as unknown;
    const envelope = this.toEnvelope<Array<{ data: Memory }>>(result);
    const items = unwrapEnvelope<Array<{ data: Memory }>>(
      envelope,
      response.status,
    );

    if (!Array.isArray(items)) {
      throw new BlahSDKError(
        "Malformed memories response",
        response.status,
        "MALFORMED_RESPONSE",
      );
    }

    return items.map((item) => item.data);
  }

  async createMemory(payload: {
    content: string;
    category?: string;
  }): Promise<Memory> {
    return this.fetchEnvelope<Memory>(
      "/api/v1/memories",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteMemory(
    memoryId: string,
  ): Promise<{ deleted: number; ids: string[] }> {
    return this.fetchEnvelope<{ deleted: number; ids: string[] }>(
      `/api/v1/memories/${encodeURIComponent(memoryId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async deleteSelectedMemories(payload: {
    ids: string[];
  }): Promise<{ deleted: number }> {
    return this.fetchEnvelope<{ deleted: number }>(
      "/api/v1/memories/delete-selected",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteAllMemories(): Promise<{ deleted: number }> {
    return this.fetchEnvelope<{ deleted: number }>(
      "/api/v1/memories",
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async consolidateMemories(payload: { ids?: string[] } = {}): Promise<{
    created: number;
    deleted: number;
    original: number;
    consolidated: number;
  }> {
    return this.fetchEnvelope<{
      created: number;
      deleted: number;
      original: number;
      consolidated: number;
    }>(
      "/api/v1/memories/consolidate",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async extractMemories(conversationId: string): Promise<{
    jobId: string;
    status: string;
    pollUrl: string;
  }> {
    return this.fetchEnvelope<{
      jobId: string;
      status: string;
      pollUrl: string;
    }>(
      "/api/v1/memories/extract",
      {
        method: "POST",
        body: JSON.stringify({
          conversationId,
        }),
      },
      "bearer",
    );
  }

  async transcribeAudio(payload: {
    storageId: string;
    mimeType?: string;
    model?: "whisper-1" | "whisper-large-v3";
  }): Promise<{
    jobId: string;
    status: string;
    pollUrl: string;
  }> {
    return this.fetchEnvelope<{
      jobId: string;
      status: string;
      pollUrl: string;
    }>(
      "/api/v1/actions/transcribe",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async generateImage(payload: {
    conversationId: string;
    messageId: string;
    prompt: string;
    model?: string;
    referenceImageStorageId?: string;
    thinkingEffort?: ThinkingEffort;
  }): Promise<{
    jobId: string;
    status: string;
    pollUrl: string;
  }> {
    return this.fetchEnvelope<{
      jobId: string;
      status: string;
      pollUrl: string;
    }>(
      "/api/v1/actions/images/generate",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async getJob<TResult = unknown>(
    jobId: string,
  ): Promise<BackgroundJob<TResult>> {
    return this.fetchEnvelope<BackgroundJob<TResult>>(
      `/api/v1/actions/jobs/${encodeURIComponent(jobId)}`,
      {
        method: "GET",
      },
      "bearer",
    );
  }

  async waitForJob<TResult = unknown>(
    jobId: string,
    options: {
      initialInterval?: number;
      maxInterval?: number;
      backoffMultiplier?: number;
      timeoutMs?: number;
    } = {},
  ): Promise<BackgroundJob<TResult>> {
    const {
      initialInterval = 1000,
      maxInterval = 10000,
      backoffMultiplier = 1.5,
      timeoutMs = 120000,
    } = options;

    const startedAt = Date.now();
    let interval = initialInterval;

    while (Date.now() - startedAt < timeoutMs) {
      const job = await this.getJob<TResult>(jobId);

      if (job.status === "completed") {
        return job;
      }

      if (job.status === "failed" || job.status === "cancelled") {
        throw new BlahSDKError(
          job.error?.message || `Job ${job.status}`,
          500,
          "JOB_FAILED",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
      interval = Math.min(interval * backoffMultiplier, maxInterval);
    }

    throw new BlahSDKError(
      `Job ${jobId} timed out after ${timeoutMs}ms`,
      408,
      "JOB_TIMEOUT",
    );
  }

  async scanRecentConversations(): Promise<{ triggered: number }> {
    return this.fetchEnvelope<{ triggered: number }>(
      "/api/v1/memories/scan-recent",
      {
        method: "POST",
      },
      "bearer",
    );
  }

  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload,
  ): Promise<GenerationRequest> {
    return this.fetchEnvelope<GenerationRequest>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async getMessage(messageId: string): Promise<Message> {
    const result = await this.client.GET("/api/v1/messages/{id}", {
      headers: await this.authHeaders("bearer"),
      params: {
        path: {
          id: messageId,
        },
      },
    });

    return this.unwrapFromResult<Message>(result as RequestResult);
  }

  async getPreferences(key?: string): Promise<Record<string, unknown>> {
    const result = await this.client.GET("/api/v1/preferences", {
      headers: await this.authHeaders("bearer"),
      params: {
        query: {
          key,
        },
      },
    });

    return this.unwrapFromResult<Record<string, unknown>>(
      result as RequestResult,
    );
  }

  async updatePreference(
    key: string,
    value: unknown,
  ): Promise<{ key: string; value: unknown }> {
    const result = await this.client.PATCH("/api/v1/preferences", {
      headers: await this.authHeaders("bearer"),
      body: {
        key,
        value,
      },
    });

    return this.unwrapFromResult<{ key: string; value: unknown }>(
      result as RequestResult,
    );
  }

  async cliRpc<M extends keyof CliRpcMethodMap>(
    method: M,
    params: CliRpcMethodMap[M]["params"],
  ): Promise<CliRpcMethodMap[M]["result"]> {
    const result = await this.client.POST("/api/v1/cli/rpc", {
      headers: await this.authHeaders("api-key"),
      body: {
        method,
        params,
      },
    });

    return this.unwrapFromResult<CliRpcMethodMap[M]["result"]>(
      result as RequestResult,
    );
  }

  streamConversationMessages(
    conversationId: string,
    options: SSEStreamOptions = {},
  ): AsyncGenerator<SSEEvent<{ messages: Message[] }>, void, undefined> {
    return streamSSE<{ messages: Message[] }>(
      `${this.baseUrl}/api/v1/messages/stream/${conversationId}`,
      {
        ...options,
        headers: {
          ...(this.options.headers || {}),
          ...(options.headers || {}),
        },
        fetch: async (input, init) => {
          const authHeaders = await this.authHeaders("bearer");
          return this.fetchImpl(input, {
            ...init,
            headers: {
              ...(init?.headers || {}),
              ...authHeaders,
            },
          });
        },
      },
    );
  }

  async getActiveGeneration(
    conversationId: string,
  ): Promise<ActiveGeneration | null> {
    const authHeaders = await this.authHeaders("bearer");
    const response = await this.fetchImpl(
      `${this.baseUrl}/api/v1/conversations/${encodeURIComponent(conversationId)}/active-generation`,
      {
        method: "GET",
        headers: authHeaders,
      },
    );

    if (response.status === 404) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const envelope = this.toEnvelope<ActiveGeneration>(payload);
    return unwrapEnvelope(envelope, response.status);
  }

  streamGeneration(
    requestId: string,
    options: SSEStreamOptions = {},
  ): AsyncGenerator<SSEEvent<GenerationStreamEvent>, void, undefined> {
    return streamSSE<GenerationStreamEvent>(
      `${this.baseUrl}/api/v1/generations/${encodeURIComponent(requestId)}/stream`,
      {
        ...options,
        headers: {
          ...(this.options.headers || {}),
          ...(options.headers || {}),
        },
        fetch: async (input, init) => {
          const authHeaders = await this.authHeaders("bearer");
          return this.fetchImpl(input, {
            ...init,
            headers: {
              ...(init?.headers || {}),
              ...authHeaders,
            },
          });
        },
      },
    );
  }

  streamCliMessages(
    conversationId: string,
    options: SSEStreamOptions = {},
  ): AsyncGenerator<SSEEvent<{ messages: Message[] }>, void, undefined> {
    return streamSSE<{ messages: Message[] }>(
      `${this.baseUrl}/api/v1/cli/messages/stream/${conversationId}`,
      {
        ...options,
        headers: {
          ...(this.options.headers || {}),
          ...(options.headers || {}),
        },
        fetch: async (input, init) => {
          const authHeaders = await this.authHeaders("api-key");
          return this.fetchImpl(input, {
            ...init,
            headers: {
              ...(init?.headers || {}),
              ...authHeaders,
            },
          });
        },
      },
    );
  }
}

export function createBlahClient(options: BlahClientOptions = {}): BlahClient {
  return new BlahClient(options);
}
