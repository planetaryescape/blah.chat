import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSignedReadUrlMock,
  createNeonDatabaseMock,
  createR2ClientMock,
  parsePersistenceEnvMock,
} = vi.hoisted(() => ({
  createSignedReadUrlMock: vi.fn(),
  createNeonDatabaseMock: vi.fn(),
  createR2ClientMock: vi.fn(),
  parsePersistenceEnvMock: vi.fn(),
}));

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createSignedReadUrl: createSignedReadUrlMock,
    createNeonDatabase: createNeonDatabaseMock,
    createR2Client: createR2ClientMock,
    parsePersistenceEnv: parsePersistenceEnvMock,
  };
});

import { transcribeAudioFromStorage } from "./transcribe";

describe("transcribeAudioFromStorage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    process.env.DATABASE_URL = "postgres://user:pass@host/db";
    process.env.OPENAI_API_KEY = "openai-key";
    delete process.env.GROQ_API_KEY;

    parsePersistenceEnvMock.mockReturnValue({
      databaseUrl: "postgres://user:pass@host/db",
      redis: {
        restUrl: "https://example.upstash.io",
        restToken: "token",
      },
      r2: {
        accountId: "account123",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucket: "blah-chat-prod",
        endpoint: "https://account123.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
      trigger: {
        secretKey: "tr_dev_123",
        apiUrl: "https://api.trigger.dev",
      },
    });

    createR2ClientMock.mockReturnValue({ id: "r2" });
    createSignedReadUrlMock.mockResolvedValue(
      "https://r2.example/users/user_123/audio.webm",
    );
    createNeonDatabaseMock.mockReturnValue({
      query: {
        userPreferences: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ value: true })
            .mockResolvedValueOnce({ value: "openai" }),
        },
      },
    });
  });

  it("downloads from R2 and transcribes directly with the provider API", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "audio/webm" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: "hello from trigger" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await transcribeAudioFromStorage({
      userId: "user_123",
      storageId: "users/user_123/drafts/audio.webm",
      mimeType: "audio/webm",
      model: "whisper-1",
    });

    expect(result).toBe("hello from trigger");
    expect(createSignedReadUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "blah-chat-prod",
        key: "users/user_123/drafts/audio.webm",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://r2.example/users/user_123/audio.webm",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer openai-key" },
        body: expect.any(FormData),
      }),
    );
    const providerCall = fetchMock.mock.calls[1]?.[1];
    expect(providerCall?.body).toBeInstanceOf(FormData);
    expect((providerCall?.body as FormData).get("model")).toBe("whisper-1");
  });

  it("rejects storage keys that do not belong to the requested user", async () => {
    await expect(
      transcribeAudioFromStorage({
        userId: "user_123",
        storageId: "users/other_user/drafts/audio.webm",
        mimeType: "audio/webm",
      }),
    ).rejects.toThrow("File not found");

    expect(createSignedReadUrlMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects user-scoped storage keys when the requested user is missing", async () => {
    await expect(
      transcribeAudioFromStorage({
        storageId: "users/user_123/drafts/audio.webm",
        mimeType: "audio/webm",
      }),
    ).rejects.toThrow("File not found");

    expect(createSignedReadUrlMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
