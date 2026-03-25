import createClient from "openapi-fetch";
import { BlahSDKError, unwrapEnvelope } from "./errors";
import type { paths } from "./generated/openapi";
import { type SSEEvent, type SSEStreamOptions, streamSSE } from "./sse";
import type {
  ActiveGeneration,
  ApiEnvelope,
  BackgroundJob,
  Bookmark,
  ByokConfig,
  CliApiKey,
  CliApiKeyCreateResult,
  CliRpcMethodMap,
  ComposioConnection,
  Conversation,
  GenerationRequest,
  GenerationStreamEvent,
  KnowledgeSource,
  Memory,
  Message,
  Note,
  Project,
  ProjectStats,
  StarterSuggestionsResponse,
  Task,
  Template,
  ThinkingEffort,
  User,
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

  private async fetchEntityList<T>(
    path: string,
    mode: "bearer" | "api-key",
  ): Promise<T[]> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: await this.authHeaders(mode),
    });

    const payload = (await response.json()) as unknown;
    const envelope = this.toEnvelope<Array<{ data: T }>>(payload);
    const items = unwrapEnvelope<Array<{ data: T }>>(envelope, response.status);

    if (!Array.isArray(items)) {
      throw new BlahSDKError(
        "Malformed list response",
        response.status,
        "MALFORMED_RESPONSE",
      );
    }

    return items.map((item) => item.data);
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

  async getCurrentUser(): Promise<User> {
    return this.fetchEnvelope<User>(
      "/api/v1/user/me",
      { method: "GET" },
      "bearer",
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

  private async fetchMessageList(
    path: string,
    mode: "bearer" | "api-key",
  ): Promise<Message[]> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: await this.authHeaders(mode),
    });

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new BlahSDKError("Malformed messages response", response.status);
    }

    return payload.map((item) => {
      const envelope = this.toEnvelope<Message>(item);
      return unwrapEnvelope(envelope, response.status);
    });
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return this.fetchMessageList(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      "bearer",
    );
  }

  async listCliMessages(conversationId: string): Promise<Message[]> {
    return this.fetchMessageList(
      `/api/v1/cli/conversations/${encodeURIComponent(conversationId)}/messages`,
      "api-key",
    );
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

  async listBookmarks(): Promise<Bookmark[]> {
    return this.fetchEntityList<Bookmark>("/api/v1/bookmarks", "bearer");
  }

  async getBookmarkByMessage(messageId: string): Promise<Bookmark | null> {
    const searchParams = new URLSearchParams({ messageId });
    const response = await this.fetchImpl(
      `${this.baseUrl}/api/v1/bookmarks/by-message?${searchParams.toString()}`,
      {
        method: "GET",
        headers: await this.authHeaders("bearer"),
      },
    );

    if (response.status === 404) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const envelope = this.toEnvelope<Bookmark>(payload);
    return unwrapEnvelope(envelope, response.status);
  }

  async createBookmark(payload: {
    messageId: string;
    conversationId: string;
    note?: string;
    tags?: string[];
  }): Promise<Bookmark> {
    return this.fetchEnvelope<Bookmark>(
      "/api/v1/bookmarks",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async updateBookmark(
    bookmarkId: string,
    payload: { note?: string; tags?: string[] },
  ): Promise<Bookmark> {
    return this.fetchEnvelope<Bookmark>(
      `/api/v1/bookmarks/${encodeURIComponent(bookmarkId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteBookmark(
    bookmarkId: string,
  ): Promise<{ deleted: boolean; bookmarkId: string }> {
    return this.fetchEnvelope<{ deleted: boolean; bookmarkId: string }>(
      `/api/v1/bookmarks/${encodeURIComponent(bookmarkId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async addBookmarkTag(bookmarkId: string, tag: string): Promise<Bookmark> {
    return this.fetchEnvelope<Bookmark>(
      `/api/v1/bookmarks/${encodeURIComponent(bookmarkId)}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tag }),
      },
      "bearer",
    );
  }

  async removeBookmarkTag(bookmarkId: string, tag: string): Promise<Bookmark> {
    return this.fetchEnvelope<Bookmark>(
      `/api/v1/bookmarks/${encodeURIComponent(bookmarkId)}/tags`,
      {
        method: "DELETE",
        body: JSON.stringify({ tag }),
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

  async createFileUploadUrl(payload: {
    conversationId?: string;
    fileName: string;
    contentType: string;
  }): Promise<{
    uploadUrl: string;
    storageId: string;
    method: string;
  }> {
    return this.fetchEnvelope<{
      uploadUrl: string;
      storageId: string;
      method: string;
    }>(
      "/api/v1/files/upload-url",
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

  async sendCliMessage(
    conversationId: string,
    payload: Pick<SendMessagePayload, "content" | "modelId">,
  ): Promise<GenerationRequest> {
    return this.fetchEnvelope<GenerationRequest>(
      `/api/v1/cli/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "api-key",
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

  async editMessage(
    messageId: string,
    payload: { content: string; modelId?: string },
  ): Promise<GenerationRequest> {
    return this.fetchEnvelope<GenerationRequest>(
      `/api/v1/messages/${encodeURIComponent(messageId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteMessage(
    messageId: string,
  ): Promise<{ deleted: boolean; messageId: string }> {
    return this.fetchEnvelope<{ deleted: boolean; messageId: string }>(
      `/api/v1/messages/${encodeURIComponent(messageId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async regenerateMessage(
    messageId: string,
    payload: { modelId?: string } = {},
  ): Promise<GenerationRequest> {
    return this.fetchEnvelope<GenerationRequest>(
      `/api/v1/messages/${encodeURIComponent(messageId)}/regenerate`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async switchConversationBranch(
    conversationId: string,
    targetMessageId: string,
  ): Promise<{ conversationId: string; activeLeafMessageId: string }> {
    return this.fetchEnvelope<{
      conversationId: string;
      activeLeafMessageId: string;
    }>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/switch-branch`,
      {
        method: "POST",
        body: JSON.stringify({ targetMessageId }),
      },
      "bearer",
    );
  }

  async listProjects(): Promise<Project[]> {
    return this.fetchEntityList<Project>("/api/v1/projects", "bearer");
  }

  async getProject(projectId: string): Promise<Project> {
    return this.fetchEnvelope<Project>(
      `/api/v1/projects/${encodeURIComponent(projectId)}`,
      {
        method: "GET",
      },
      "bearer",
    );
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    return this.fetchEnvelope<ProjectStats>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/stats`,
      {
        method: "GET",
      },
      "bearer",
    );
  }

  async listTemplates(params: { category?: string } = {}): Promise<Template[]> {
    const searchParams = new URLSearchParams();
    if (params.category) {
      searchParams.set("category", params.category);
    }

    return this.fetchEntityList<Template>(
      `/api/v1/templates${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      "bearer",
    );
  }

  async getStarterSuggestions(): Promise<StarterSuggestionsResponse> {
    return this.fetchEnvelope<StarterSuggestionsResponse>(
      "/api/v1/starter-suggestions",
      {
        method: "GET",
      },
      "bearer",
    );
  }

  async refreshStarterSuggestions(
    payload: { force?: boolean } = {},
  ): Promise<StarterSuggestionsResponse> {
    return this.fetchEnvelope<StarterSuggestionsResponse>(
      "/api/v1/starter-suggestions/refresh",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async listNotes(params: { projectId?: string | null } = {}): Promise<Note[]> {
    const searchParams = new URLSearchParams();
    if (params.projectId !== undefined) {
      searchParams.set("projectId", params.projectId ?? "");
    }

    return this.fetchEntityList<Note>(
      `/api/v1/notes${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      "bearer",
    );
  }

  async getNote(noteId: string): Promise<Note> {
    return this.fetchEnvelope<Note>(
      `/api/v1/notes/${encodeURIComponent(noteId)}`,
      {
        method: "GET",
      },
      "bearer",
    );
  }

  async createNote(payload: {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
    projectId?: string | null;
    sourceMessageId?: string;
    sourceConversationId?: string;
  }): Promise<Note> {
    return this.fetchEnvelope<Note>(
      "/api/v1/notes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async updateNote(
    noteId: string,
    payload: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      projectId?: string | null;
      suggestedTags?: string[];
      shareId?: string | null;
      isPublic?: boolean;
      shareExpiresAt?: number | null;
    },
  ): Promise<Note> {
    return this.fetchEnvelope<Note>(
      `/api/v1/notes/${encodeURIComponent(noteId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteNote(
    noteId: string,
  ): Promise<{ deleted: boolean; noteId: string }> {
    return this.fetchEnvelope<{ deleted: boolean; noteId: string }>(
      `/api/v1/notes/${encodeURIComponent(noteId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async autoTagNote(noteId: string): Promise<{ appliedTags: string[] }> {
    return this.fetchEnvelope<{ appliedTags: string[] }>(
      `/api/v1/notes/${encodeURIComponent(noteId)}/auto-tag`,
      {
        method: "POST",
      },
      "bearer",
    );
  }

  async createNoteShare(
    noteId: string,
    payload: {
      password?: string;
      expiresIn?: number;
    },
  ): Promise<Note> {
    return this.fetchEnvelope<Note>(
      `/api/v1/notes/${encodeURIComponent(noteId)}/share`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async toggleNoteShare(
    noteId: string,
    payload: {
      isActive: boolean;
    },
  ): Promise<Note> {
    return this.fetchEnvelope<Note>(
      `/api/v1/notes/${encodeURIComponent(noteId)}/share`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async trackSidebarEvent(
    event:
      | "sidebar_open"
      | "sidebar_search"
      | "sidebar_select_conversation"
      | "sidebar_action",
    metadata?: Record<string, unknown>,
    resourceId?: string,
  ): Promise<{ captured: boolean }> {
    return this.fetchEnvelope<{ captured: boolean }>(
      "/api/v1/analytics/sidebar",
      {
        method: "POST",
        body: JSON.stringify({
          event,
          metadata,
          resourceId,
        }),
      },
      "bearer",
    );
  }

  async listTasks(params: { projectId?: string | null } = {}): Promise<Task[]> {
    const searchParams = new URLSearchParams();
    if (params.projectId !== undefined) {
      searchParams.set("projectId", params.projectId ?? "");
    }

    return this.fetchEntityList<Task>(
      `/api/v1/tasks${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      "bearer",
    );
  }

  async createTask(payload: {
    title: string;
    description?: string;
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    tags?: string[];
    projectId?: string | null;
  }): Promise<Task> {
    return this.fetchEnvelope<Task>(
      "/api/v1/tasks",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async updateTask(
    taskId: string,
    payload: {
      title?: string;
      description?: string;
      status?:
        | "suggested"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      urgency?: "low" | "medium" | "high" | "urgent";
      deadline?: number;
      deadlineSource?: string;
      tags?: string[];
    },
  ): Promise<Task> {
    return this.fetchEnvelope<Task>(
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteTask(
    taskId: string,
  ): Promise<{ deleted: boolean; taskId: string }> {
    return this.fetchEnvelope<{ deleted: boolean; taskId: string }>(
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async listKnowledgeSources(
    params: { projectId?: string | null } = {},
  ): Promise<KnowledgeSource[]> {
    const searchParams = new URLSearchParams();
    if (params.projectId !== undefined) {
      searchParams.set("projectId", params.projectId ?? "");
    }

    return this.fetchEntityList<KnowledgeSource>(
      `/api/v1/knowledge/sources${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      "bearer",
    );
  }

  async createKnowledgeSource(
    payload:
      | {
          type: "file";
          title: string;
          projectId?: string | null;
          storageId: string;
          mimeType: string;
          size: number;
        }
      | {
          type: "text";
          title: string;
          projectId?: string | null;
          content: string;
        }
      | {
          type: "web" | "youtube";
          title: string;
          projectId?: string | null;
          url: string;
        },
  ): Promise<KnowledgeSource> {
    return this.fetchEnvelope<KnowledgeSource>(
      "/api/v1/knowledge/sources",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteKnowledgeSource(
    sourceId: string,
  ): Promise<{ deleted: boolean; sourceId: string }> {
    return this.fetchEnvelope<{ deleted: boolean; sourceId: string }>(
      `/api/v1/knowledge/sources/${encodeURIComponent(sourceId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async listCliApiKeys(): Promise<CliApiKey[]> {
    return this.fetchEntityList<CliApiKey>("/api/v1/cli/api-keys", "bearer");
  }

  async createCliApiKey(
    payload: { name?: string } = {},
  ): Promise<CliApiKeyCreateResult> {
    return this.fetchEnvelope<CliApiKeyCreateResult>(
      "/api/v1/cli/api-keys",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async revokeCliApiKey(
    keyId: string,
  ): Promise<{ revoked: boolean; keyId: string }> {
    return this.fetchEnvelope<{ revoked: boolean; keyId: string }>(
      `/api/v1/cli/api-keys/${encodeURIComponent(keyId)}`,
      {
        method: "DELETE",
      },
      "bearer",
    );
  }

  async getByokConfig(): Promise<ByokConfig | null> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/byok`, {
      method: "GET",
      headers: await this.authHeaders("bearer"),
    });

    if (response.status === 404) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const envelope = this.toEnvelope<ByokConfig | null>(payload);
    return unwrapEnvelope(envelope, response.status);
  }

  async saveByokApiKey(payload: {
    keyType: "vercelGateway" | "openRouter" | "groq" | "deepgram";
    apiKey: string;
    skipValidation?: boolean;
  }): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/byok/keys",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async removeByokApiKey(payload: {
    keyType: "vercelGateway" | "openRouter" | "groq" | "deepgram";
  }): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/byok/keys",
      {
        method: "DELETE",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async enableByok(): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/byok/enable",
      {
        method: "POST",
      },
      "bearer",
    );
  }

  async disableByok(): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/byok/disable",
      {
        method: "POST",
      },
      "bearer",
    );
  }

  async listComposioConnections(): Promise<ComposioConnection[]> {
    return this.fetchEntityList<ComposioConnection>(
      "/api/v1/integrations/composio",
      "bearer",
    );
  }

  async initiateComposioConnection(payload: {
    integrationId: string;
    redirectUrl: string;
  }): Promise<{ redirectUrl?: string; connectionId: string; state?: string }> {
    return this.fetchEnvelope<{
      redirectUrl?: string;
      connectionId: string;
      state?: string;
    }>(
      "/api/v1/integrations/composio",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async revokeComposioConnection(payload: {
    integrationId: string;
  }): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/integrations/composio",
      {
        method: "DELETE",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async exportUserData(): Promise<Record<string, unknown>> {
    return this.fetchEnvelope<Record<string, unknown>>(
      "/api/v1/user/export",
      {
        method: "GET",
      },
      "bearer",
    );
  }

  async deleteUserData(payload: {
    confirmationText: string;
  }): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/user/delete-data",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
  }

  async deleteUserAccount(payload: {
    confirmationText: string;
  }): Promise<{ success: boolean }> {
    return this.fetchEnvelope<{ success: boolean }>(
      "/api/v1/user/delete-account",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
    );
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

  async cleanupEmptyConversations(payload: {
    keepOne?: boolean;
  }): Promise<{ deletedCount: number }> {
    return this.fetchEnvelope<{ deletedCount: number }>(
      "/api/v1/conversations/cleanup-empty",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "bearer",
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

  private async fetchActiveGeneration(
    path: string,
    mode: "bearer" | "api-key",
  ): Promise<ActiveGeneration | null> {
    const authHeaders = await this.authHeaders(mode);
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: authHeaders,
    });

    if (response.status === 404) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const envelope = this.toEnvelope<ActiveGeneration>(payload);
    return unwrapEnvelope(envelope, response.status);
  }

  async getActiveGeneration(
    conversationId: string,
  ): Promise<ActiveGeneration | null> {
    return this.fetchActiveGeneration(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/active-generation`,
      "bearer",
    );
  }

  async getCliActiveGeneration(
    conversationId: string,
  ): Promise<ActiveGeneration | null> {
    return this.fetchActiveGeneration(
      `/api/v1/cli/conversations/${encodeURIComponent(conversationId)}/active-generation`,
      "api-key",
    );
  }

  private streamGenerationWithMode(
    path: string,
    mode: "bearer" | "api-key",
    options: SSEStreamOptions = {},
  ): AsyncGenerator<SSEEvent<GenerationStreamEvent>, void, undefined> {
    return streamSSE<GenerationStreamEvent>(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...(this.options.headers || {}),
        ...(options.headers || {}),
      },
      fetch: async (input, init) => {
        const authHeaders = await this.authHeaders(mode);
        return this.fetchImpl(input, {
          ...init,
          headers: {
            ...(init?.headers || {}),
            ...authHeaders,
          },
        });
      },
    });
  }

  streamGeneration(
    requestId: string,
    options: SSEStreamOptions = {},
  ): AsyncGenerator<SSEEvent<GenerationStreamEvent>, void, undefined> {
    return this.streamGenerationWithMode(
      `/api/v1/generations/${encodeURIComponent(requestId)}/stream`,
      "bearer",
      options,
    );
  }

  streamCliGeneration(
    requestId: string,
    options: SSEStreamOptions = {},
  ): AsyncGenerator<SSEEvent<GenerationStreamEvent>, void, undefined> {
    return this.streamGenerationWithMode(
      `/api/v1/cli/generations/${encodeURIComponent(requestId)}/stream`,
      "api-key",
      options,
    );
  }
}

export function createBlahClient(options: BlahClientOptions = {}): BlahClient {
  return new BlahClient(options);
}
