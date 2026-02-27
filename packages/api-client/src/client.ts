import createClient from "openapi-fetch";
import { BlahSDKError, unwrapEnvelope } from "./errors";
import type { paths } from "./generated/openapi";
import { type SSEEvent, type SSEStreamOptions, streamSSE } from "./sse";
import type {
  ApiEnvelope,
  CliRpcMethodMap,
  Conversation,
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
  }): Promise<Conversation> {
    const result = await this.client.POST("/api/v1/conversations", {
      headers: await this.authHeaders("bearer"),
      body: payload,
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

  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload,
  ): Promise<{
    conversationId: string;
    messageId: string;
    assistantMessageId: string;
    status: "pending";
    pollUrl: string;
  }> {
    const result = await this.client.POST(
      "/api/v1/conversations/{id}/messages",
      {
        headers: await this.authHeaders("bearer"),
        params: {
          path: {
            id: conversationId,
          },
        },
        body: payload,
      },
    );

    return this.unwrapFromResult<{
      conversationId: string;
      messageId: string;
      assistantMessageId: string;
      status: "pending";
      pollUrl: string;
    }>(result as RequestResult);
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
