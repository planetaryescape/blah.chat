import { describe, expect, it, vi } from "vitest";
import { createBlahClient } from "./client";

describe("BlahClient generation request APIs", () => {
  it("sends CLI messages through the Postgres generation request route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: {
            entity: "generationRequest",
            id: "req_cli_1",
          },
          data: {
            requestId: "req_cli_1",
            conversationId: "conv_cli_1",
            userMessageId: "msg_user_cli_1",
            assistantMessageIds: ["msg_assistant_cli_1"],
            modelIds: ["openai:gpt-5-mini"],
            streamUrl: "/api/v1/cli/generations/req_cli_1/stream",
            stopUrl: "/api/v1/generations/req_cli_1/stop",
            status: "pending",
          },
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      apiKey: "blah_cli_token",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        sendCliMessage: (
          conversationId: string,
          payload: { content: string; modelId?: string },
        ) => Promise<{
          requestId: string;
          conversationId: string;
          streamUrl: string;
        }>;
      }
    ).sendCliMessage("conv_cli_1", {
      content: "Hello from CLI",
      modelId: "openai:gpt-5-mini",
    });

    expect(result).toEqual({
      requestId: "req_cli_1",
      conversationId: "conv_cli_1",
      userMessageId: "msg_user_cli_1",
      assistantMessageIds: ["msg_assistant_cli_1"],
      modelIds: ["openai:gpt-5-mini"],
      streamUrl: "/api/v1/cli/generations/req_cli_1/stream",
      stopUrl: "/api/v1/generations/req_cli_1/stop",
      status: "pending",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/cli/conversations/conv_cli_1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer blah_cli_token",
          "x-api-key": "blah_cli_token",
        }),
        body: JSON.stringify({
          content: "Hello from CLI",
          modelId: "openai:gpt-5-mini",
        }),
      }),
    );
  });

  it("fetches current user through the user/me route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "user", id: "usr_1" },
          data: {
            _id: "usr_1",
            clerkId: "clerk_123",
            email: "test@example.com",
            name: "Test User",
            imageUrl: "https://example.com/avatar.png",
            createdAt: 1000,
            updatedAt: 2000,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.getCurrentUser();

    expect(result).toEqual({
      _id: "usr_1",
      clerkId: "clerk_123",
      email: "test@example.com",
      name: "Test User",
      imageUrl: "https://example.com/avatar.png",
      createdAt: 1000,
      updatedAt: 2000,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/user/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
        }),
      }),
    );
  });

  it("falls back to cookie auth when bearer token is temporarily unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "user", id: "usr_1" },
          data: {
            _id: "usr_1",
            clerkId: "clerk_123",
            email: "test@example.com",
            name: "Test User",
            createdAt: 1000,
            updatedAt: 2000,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => null,
      allowCookieAuthFallback: true,
      fetch: fetchMock,
    });

    const result = await client.getCurrentUser();

    expect(result).toMatchObject({
      _id: "usr_1",
      clerkId: "clerk_123",
      email: "test@example.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/user/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it("sends messages through the generation request envelope", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: {
            entity: "generationRequest",
            id: "req_1",
          },
          data: {
            requestId: "req_1",
            conversationId: "conv_1",
            userMessageId: "msg_user_1",
            assistantMessageIds: ["msg_assistant_1"],
            modelIds: ["openai:gpt-5"],
            streamUrl: "/api/v1/generations/req_1/stream",
            stopUrl: "/api/v1/generations/req_1/stop",
            status: "pending",
          },
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.sendMessage("conv_1", {
      content: "Hello",
      parentMessageId: "msg_parent_1",
      clientMessageId: "client_msg_1",
    });

    expect(result).toEqual({
      requestId: "req_1",
      conversationId: "conv_1",
      userMessageId: "msg_user_1",
      assistantMessageIds: ["msg_assistant_1"],
      modelIds: ["openai:gpt-5"],
      streamUrl: "/api/v1/generations/req_1/stream",
      stopUrl: "/api/v1/generations/req_1/stop",
      status: "pending",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://example.com/api/v1/conversations/conv_1/messages",
    );
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      content: "Hello",
      parentMessageId: "msg_parent_1",
      clientMessageId: "client_msg_1",
    });
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer token_123",
      "Content-Type": "application/json",
    });
  });

  it("returns null when no active generation exists", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }));

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        getActiveGeneration: (
          conversationId: string,
        ) => Promise<null | { requestId: string | null }>;
      }
    ).getActiveGeneration("conv_1");

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/conversations/conv_1/active-generation",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
        }),
      }),
    );
  });

  it("reads CLI active generation through the Postgres route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: {
            entity: "generation",
            id: "req_cli_1",
          },
          data: {
            conversationId: "conv_cli_1",
            requestId: "req_cli_1",
            streamUrl: "/api/v1/cli/generations/req_cli_1/stream",
            status: "cancelling",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      apiKey: "blah_cli_token",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        getCliActiveGeneration: (conversationId: string) => Promise<{
          requestId: string | null;
          streamUrl: string | null;
          status: string | null;
          conversationId: string;
        } | null>;
      }
    ).getCliActiveGeneration("conv_cli_1");

    expect(result).toEqual({
      conversationId: "conv_cli_1",
      requestId: "req_cli_1",
      streamUrl: "/api/v1/cli/generations/req_cli_1/stream",
      status: "cancelling",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/cli/conversations/conv_cli_1/active-generation",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer blah_cli_token",
          "x-api-key": "blah_cli_token",
        }),
      }),
    );
  });

  it("searches messages through the REST search envelope", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "list" },
          data: [
            {
              sys: { entity: "message", id: "msg_1" },
              data: {
                _id: "msg_1",
                conversationId: "conv_1",
                conversationTitle: "Search Chat",
                role: "user",
                content: "solar eclipse facts",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        searchMessages: (payload: {
          query: string;
          limit?: number;
          conversationId?: string;
        }) => Promise<
          Array<{
            _id: string;
            conversationId: string;
            conversationTitle?: string | null;
            content: string;
            role: string;
          }>
        >;
      }
    ).searchMessages({
      query: "solar eclipse",
      limit: 20,
      conversationId: "conv_1",
    });

    expect(result).toEqual([
      {
        _id: "msg_1",
        conversationId: "conv_1",
        conversationTitle: "Search Chat",
        role: "user",
        content: "solar eclipse facts",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/search/hybrid",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          query: "solar eclipse",
          limit: 20,
          conversationId: "conv_1",
        }),
      }),
    );
  });

  it("bulk bookmarks messages through the REST bookmarks route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "bookmark" },
          data: {
            bookmarkedCount: 2,
            bookmarkIds: ["bookmark_1", "bookmark_2"],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.bulkCreateBookmarks({
      messageIds: ["msg_1", "msg_2"],
    });

    expect(result).toEqual({
      bookmarkedCount: 2,
      bookmarkIds: ["bookmark_1", "bookmark_2"],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/bookmarks/bulk",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          messageIds: ["msg_1", "msg_2"],
        }),
      }),
    );
  });

  it("lists memories through the REST memories route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "list" },
          data: [
            {
              sys: { entity: "memory", id: "mem_1" },
              data: {
                _id: "mem_1",
                content: "User prefers concise answers",
                category: "preference",
                metadata: {
                  importance: 8,
                },
                createdAt: 123,
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.listMemories({
      category: "preference",
      sortBy: "importance",
      searchQuery: "concise",
    });

    expect(result).toEqual([
      {
        _id: "mem_1",
        content: "User prefers concise answers",
        category: "preference",
        metadata: {
          importance: 8,
        },
        createdAt: 123,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/memories?category=preference&sortBy=importance&searchQuery=concise",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
        }),
      }),
    );
  });

  it("consolidates memories through the REST memories route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "memory" },
          data: {
            created: 1,
            deleted: 1,
            original: 2,
            consolidated: 1,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.consolidateMemories({
      ids: ["mem_1", "mem_2"],
    });

    expect(result).toEqual({
      created: 1,
      deleted: 1,
      original: 2,
      consolidated: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/memories/consolidate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ids: ["mem_1", "mem_2"],
        }),
      }),
    );
  });

  it("starts memory extraction through the REST extraction route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "job", id: "run_123" },
          data: {
            jobId: "run_123",
            status: "pending",
            pollUrl: "/api/v1/actions/jobs/run_123",
          },
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        extractMemories: (conversationId: string) => Promise<{
          jobId: string;
          status: string;
          pollUrl: string;
        }>;
      }
    ).extractMemories("conv_1");

    expect(result).toEqual({
      jobId: "run_123",
      status: "pending",
      pollUrl: "/api/v1/actions/jobs/run_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/memories/extract",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          conversationId: "conv_1",
        }),
      }),
    );
  });

  it("starts transcription through the REST actions route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "job", id: "run_transcribe_123" },
          data: {
            jobId: "run_transcribe_123",
            status: "pending",
            pollUrl: "/api/v1/actions/jobs/run_transcribe_123",
          },
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        transcribeAudio: (payload: {
          storageId: string;
          model?: "whisper-1" | "whisper-large-v3";
        }) => Promise<{
          jobId: string;
          status: string;
          pollUrl: string;
        }>;
      }
    ).transcribeAudio({
      storageId: "storage_123",
      model: "whisper-1",
    });

    expect(result).toEqual({
      jobId: "run_transcribe_123",
      status: "pending",
      pollUrl: "/api/v1/actions/jobs/run_transcribe_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/actions/transcribe",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          storageId: "storage_123",
          model: "whisper-1",
        }),
      }),
    );
  });

  it("requests signed upload urls through the REST files route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "file.upload", id: "users/u1/conversations/c1/a.png" },
          data: {
            uploadUrl: "https://r2.example/upload/a.png",
            storageId: "users/u1/conversations/c1/a.png",
            method: "PUT",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        createFileUploadUrl: (payload: {
          conversationId?: string;
          fileName: string;
          contentType: string;
        }) => Promise<{
          uploadUrl: string;
          storageId: string;
          method: string;
        }>;
      }
    ).createFileUploadUrl({
      conversationId: "conv_1",
      fileName: "a.png",
      contentType: "image/png",
    });

    expect(result).toEqual({
      uploadUrl: "https://r2.example/upload/a.png",
      storageId: "users/u1/conversations/c1/a.png",
      method: "PUT",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/files/upload-url",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          conversationId: "conv_1",
          fileName: "a.png",
          contentType: "image/png",
        }),
      }),
    );
  });

  it("starts image generation through the REST actions route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "job", id: "run_image_123" },
          data: {
            jobId: "run_image_123",
            status: "pending",
            pollUrl: "/api/v1/actions/jobs/run_image_123",
          },
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await (
      client as unknown as {
        generateImage: (payload: {
          conversationId: string;
          messageId: string;
          prompt: string;
          model?: string;
          thinkingEffort?: "none" | "low" | "medium" | "high";
        }) => Promise<{
          jobId: string;
          status: string;
          pollUrl: string;
        }>;
      }
    ).generateImage({
      conversationId: "conv_1",
      messageId: "msg_1",
      prompt: "A bot deleting the last web bridge",
      model: "google:gemini-3-pro-image",
      thinkingEffort: "high",
    });

    expect(result).toEqual({
      jobId: "run_image_123",
      status: "pending",
      pollUrl: "/api/v1/actions/jobs/run_image_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/actions/images/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          conversationId: "conv_1",
          messageId: "msg_1",
          prompt: "A bot deleting the last web bridge",
          model: "google:gemini-3-pro-image",
          thinkingEffort: "high",
        }),
      }),
    );
  });

  it("forwards mimeType for the current upload/transcribe flow", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "job", id: "run_transcribe_456" },
          data: {
            jobId: "run_transcribe_456",
            status: "pending",
            pollUrl: "/api/v1/actions/jobs/run_transcribe_456",
          },
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    await client.transcribeAudio({
      storageId: "storage_456",
      mimeType: "audio/webm",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/actions/transcribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          storageId: "storage_456",
          mimeType: "audio/webm",
        }),
      }),
    );
  });

  it("polls background jobs until completion", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            sys: { entity: "job", id: "run_123" },
            data: {
              _id: "run_123",
              status: "running",
              progress: { current: 50, message: "Working..." },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            sys: { entity: "job", id: "run_123" },
            data: {
              _id: "run_123",
              status: "completed",
              result: { text: "hello world" },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.waitForJob<{ text: string }>("run_123", {
      initialInterval: 1,
      maxInterval: 1,
      backoffMultiplier: 1,
      timeoutMs: 100,
    });

    expect(result).toEqual({
      _id: "run_123",
      status: "completed",
      result: { text: "hello world" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("scans recent conversations through the REST memories route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "memory" },
          data: {
            triggered: 2,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const result = await client.scanRecentConversations();

    expect(result).toEqual({
      triggered: 2,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/memories/scan-recent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("streams generation SSE events from a request stream", async () => {
    const generationEvent = {
      type: "delta",
      requestId: "req_1",
      sessionId: "sess_1",
      assistantMessageId: "msg_assistant_1",
      modelId: "openai:gpt-5",
      seq: 1,
      ts: 123,
      delta: "Hello",
    };

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        `event: generation\ndata: ${JSON.stringify(generationEvent)}\n\n`,
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    const iterator = (
      client as unknown as {
        streamGeneration: (
          requestId: string,
        ) => AsyncGenerator<{ data: unknown; event: string }, void, undefined>;
      }
    ).streamGeneration("req_1");

    const next = await iterator.next();

    expect(next.done).toBe(false);
    expect(next.value).toEqual({
      event: "generation",
      data: generationEvent,
    });
  });

  it("streams CLI generation SSE events from a request stream", async () => {
    const generationEvent = {
      type: "checkpoint",
      requestId: "req_cli_1",
      sessionId: "sess_cli_1",
      assistantMessageId: "msg_assistant_cli_1",
      modelId: "openai:gpt-5-mini",
      seq: 2,
      ts: 456,
      content: "Hello from CLI",
    };

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        `event: generation\ndata: ${JSON.stringify(generationEvent)}\n\n`,
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      apiKey: "blah_cli_token",
      fetch: fetchMock,
    });

    const iterator = (
      client as unknown as {
        streamCliGeneration: (
          requestId: string,
        ) => AsyncGenerator<{ data: unknown; event: string }, void, undefined>;
      }
    ).streamCliGeneration("req_cli_1");

    const next = await iterator.next();

    expect(next.done).toBe(false);
    expect(next.value).toEqual({
      event: "generation",
      data: generationEvent,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/cli/generations/req_cli_1/stream",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "text/event-stream",
          Authorization: "Bearer blah_cli_token",
          "x-api-key": "blah_cli_token",
        }),
      }),
    );
  });

  it("calls note auto-tag and share routes through bearer-auth endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            sys: { entity: "note", id: "note_1" },
            data: {
              appliedTags: ["react", "mobile"],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            sys: { entity: "note", id: "note_1" },
            data: {
              _id: "note_1",
              title: "Offline mobile rewrite",
              content: "body",
              isPinned: false,
              tags: ["react"],
              suggestedTags: [],
              shareId: "share_1",
              isPublic: true,
              shareExpiresAt: 123,
              createdAt: 1,
              updatedAt: 2,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            sys: { entity: "note", id: "note_1" },
            data: {
              _id: "note_1",
              title: "Offline mobile rewrite",
              content: "body",
              isPinned: false,
              tags: ["react"],
              suggestedTags: [],
              shareId: "share_1",
              isPublic: false,
              shareExpiresAt: 123,
              createdAt: 1,
              updatedAt: 2,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    await expect(client.autoTagNote("note_1")).resolves.toEqual({
      appliedTags: ["react", "mobile"],
    });

    await expect(
      client.createNoteShare("note_1", {
        password: "secret",
        expiresIn: 7,
      }),
    ).resolves.toMatchObject({
      _id: "note_1",
      shareId: "share_1",
      isPublic: true,
    });

    await expect(
      client.toggleNoteShare("note_1", {
        isActive: false,
      }),
    ).resolves.toMatchObject({
      _id: "note_1",
      isPublic: false,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/api/v1/notes/note_1/auto-tag",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/api/v1/notes/note_1/share",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          password: "secret",
          expiresIn: 7,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://example.com/api/v1/notes/note_1/share",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          isActive: false,
        }),
      }),
    );
  });

  it("tracks sidebar analytics through the rewrite-native route", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "analytics" },
          data: {
            captured: true,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createBlahClient({
      baseUrl: "https://example.com",
      getAccessToken: async () => "token_123",
      fetch: fetchMock,
    });

    await expect(
      client.trackSidebarEvent(
        "sidebar_action",
        { action: "pin", projectId: "project_1" },
        "conv_1",
      ),
    ).resolves.toEqual({
      captured: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/v1/analytics/sidebar",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          event: "sidebar_action",
          metadata: {
            action: "pin",
            projectId: "project_1",
          },
          resourceId: "conv_1",
        }),
      }),
    );
  });
});
